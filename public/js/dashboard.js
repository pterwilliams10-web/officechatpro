const socket = io();

let selectedUser = null;
let isBroadcastMode = false; // Tracks if user is sending a global broadcast
let currentUserName = "Someone"; // Stores the logged-in user's name for the broadcast header

// ===============================
// Load Logged In User
// ===============================
async function loadCurrentUser() {
    try {
        const response = await fetch("/auth/me");
        const result = await response.json();

        if (!result.success) {
            window.location = "/";
            return;
        }

        document.getElementById("userinfo").innerHTML = `
            <strong>${result.user.full_name}</strong><br>
            ${result.user.role}
        `;

// Role-based navigation
if (result.user.role === "Admin") {

    // Admin sees everything
    document.getElementById("adminNavBtn").style.display = "block";
    document.getElementById("navEmployees").style.display = "block";
    document.getElementById("navSettings").style.display = "block";

} else {

    // Employee sees only Chats
    document.getElementById("adminNavBtn").style.display = "none";
    document.getElementById("navEmployees").style.display = "none";
    document.getElementById("navSettings").style.display = "none";

}

        document.body.dataset.userid = result.user.id;
        
        // Save the current user's name to label their global broadcasts
        currentUserName = result.user.full_name;

        // ======= THIS IS THE NEW PART STATED IN STEP A =======
        // If the user's role is 'admin', reveal the hidden Admin Controls button
        if (result.user.role.toLowerCase() === 'admin') {
            const adminBtn = document.getElementById("adminNavBtn");
            if (adminBtn) adminBtn.style.display = "block";
        }
        // =====================================================

        // Register socket
        socket.emit("register", result.user);

    } catch (err) {
        console.error(err);
    }
}

// ===============================
// Load Employees
// ===============================
async function loadEmployees() {
    try {
        const response = await fetch("/users");
        const users = await response.json();

        let html = "";

        users.forEach(user => {
            html += `
                <li
                    class="list-group-item"
                    onclick="selectUser(${user.id}, '${user.full_name}', this)">
                    👤 ${user.full_name}
                </li>
            `;
        });

        document.getElementById("employeeList").innerHTML = html;

    } catch (err) {
        console.error(err);
    }
}

// ===============================
// Select Broadcast Mode
// ===============================
function selectBroadcastMode(element) {
    selectedUser = null;
    isBroadcastMode = true;

    // Clear selections across all lists
    document.querySelectorAll(".employee-list li").forEach(li => li.classList.remove("selected"));
    element.classList.add("selected");

    document.getElementById("chatTitle").innerText = "📢 Global Broadcast";
    document.getElementById("userStatus").innerText = "Sending a message to everyone";
    
    document.getElementById("chatMessages").innerHTML = `
        <div class="text-center text-muted mt-5">
            You are now broadcasting a message to all employees in the company.
        </div>
    `;
}

// ===============================
// Select Employee
// ===============================
async function selectUser(id, name, element) {
    isBroadcastMode = false; // Turn off broadcast mode when an individual is selected
    selectedUser = id;

    document
        .querySelectorAll(".employee-list li")
        .forEach(li => li.classList.remove("selected"));

    element.classList.add("selected");

    document.getElementById("chatTitle").innerText = name;
    document.getElementById("userStatus").innerText = "Online";

    try {
        const response = await fetch("/messages/" + id);
        const result = await response.json();

        let html = "";

        if (result.messages.length === 0) {
            html = `
                <div class="text-center text-muted mt-5">
                    No messages yet.
                </div>
            `;
        } else {
            const currentUser = Number(document.body.dataset.userid);

            result.messages.forEach(msg => {
                const mine = msg.sender_id == currentUser;

                html += `
                    <div class="message ${mine ? "me" : "other"}">
                        <div class="bubble">
                            <div class="text">

    ${msg.message || ""}

    ${
        msg.file_path
            ? `
                <br><br>
                📎
                <a href="${msg.file_path}"
                   target="_blank">
                    ${msg.file_name}
                </a>
              `
            : ""
    }

</div>
                            <div class="meta">
                                ${msg.created_at}
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        document.getElementById("chatMessages").innerHTML = html;

        const chatBox = document.getElementById("chatMessages");
        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (err) {
        console.error(err);
    }
}

// ===============================
// Send Message / Broadcast
// ===============================
document.getElementById("sendBtn").addEventListener("click", async () => {
    if (!selectedUser && !isBroadcastMode) {
        alert("Please select an employee or broadcast mode first.");
        return;
    }

    const messageBox = document.getElementById("messageBox");
    const message = messageBox.value.trim();

    if (message === "") return;


    // --- HANDLE GLOBAL BROADCAST ---
    if (isBroadcastMode) {
        socket.emit("broadcast_message", {
            sender_name: currentUserName,
            message: message,
            created_at: new Date()
        });
        
        // Render instantly inside the sender's own UI
        const chatBox = document.getElementById("chatMessages");
        chatBox.innerHTML += `
            <div class="message me">
                <div class="bubble" style="background: #2563eb;">
                    <div class="text"><strong>[Broadcast by You]</strong> ${message}</div>
                    <div class="meta">${new Date().toLocaleTimeString()}</div>
                </div>
            </div>
        `;
        messageBox.value = "";
        chatBox.scrollTop = chatBox.scrollHeight;
        return;
    }

    // --- EXISTING DIRECT MESSAGE LOGIC ---
    try {
        const response = await fetch("/messages/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                receiver_id: selectedUser,
                message: message
            })
        });

        const result = await response.json();

        if (result.success) {
            socket.emit("send_message", {
                sender_id: Number(document.body.dataset.userid),
                receiver_id: selectedUser,
                message: message,
                created_at: new Date()
            });

            messageBox.value = "";

            // Reload current conversation
            const selected = document.querySelector("#employeeList li.selected");

            if (selected) {
                selectUser(selectedUser, document.getElementById("chatTitle").innerText, selected);
            }
        }

    } catch (err) {
        console.error(err);
    }
});

// ===============================
// Receive Individual Message
// ===============================
socket.on("receive_message", (data) => {
    if (!selectedUser) return;

    const currentUser = Number(document.body.dataset.userid);

    const isChatOpen =
        selectedUser == data.sender_id ||
        selectedUser == data.receiver_id;

    if (!isChatOpen) return;

    const mine = data.sender_id == currentUser;

    const chatBox = document.getElementById("chatMessages");

    chatBox.innerHTML += `
        <div class="message ${mine ? "me" : "other"}">
            <div class="bubble">
                <div class="text">
                    ${data.message}
                </div>
                <div class="meta">
                    ${new Date(data.created_at || Date.now()).toLocaleTimeString()}
                </div>
            </div>
        </div>
    `;

    chatBox.scrollTop = chatBox.scrollHeight;
});

// ===============================
// Receive Incoming Global Broadcast
// ===============================
socket.on("receive_broadcast", (data) => {
    const chatBox = document.getElementById("chatMessages");
    
    // Injects a beautifully styled global notice inside everyone's active chat screen
    chatBox.innerHTML += `
        <div class="message other" style="justify-content: center; width: 100%; margin: 15px 0;">
            <div class="bubble" style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; max-width: 90%; border-radius: 8px;">
                <div class="text">📢 <strong>Broadcast from ${data.sender_name}:</strong> ${data.message}</div>
                <div class="meta" style="color: #2563eb; text-align: right; font-size: 11px;">${new Date(data.created_at).toLocaleTimeString()}</div>
            </div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;
});

    function triggerFileUpload() {
    document.getElementById("fileAttachmentInput").click();
}

async function handleFileSelected(input) {

    const file = input.files[0];

    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);

    try {

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        console.log(result);

        if (result.success) {

            alert("✅ File uploaded successfully!");

            console.log(result.file);

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Upload failed.");

    }

}


// ===============================
// Logout
// ===============================
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetch("/auth/logout");
    window.location = "/";
});

// ===============================
// Start App
// ===============================
loadCurrentUser();
loadEmployees();
loadEmployeeManagement();

console.log("✅ Socket connected");

document.getElementById("messageBox").addEventListener("keypress", function(e){
    if(e.key === "Enter"){
        e.preventDefault();
        document.getElementById("sendBtn").click();
    }
});

// ===============================
// Employee Search
// ===============================
document.getElementById("searchInput").addEventListener("keyup", function () {
    const value = this.value.toLowerCase();

    document.querySelectorAll("#employeeList li").forEach(li => {
        if (li.innerText.toLowerCase().includes(value)) {
            li.style.display = "";
        } else {
            li.style.display = "none";
        }
    });
});

// ===============================
// Admin Modal Controllers
// ===============================
function toggleAdminPanel(show) {
    document.getElementById("adminPanelModal").style.display = show ? "flex" : "none";
}

// 1. Add User Account
async function adminAddUser() {
    const name = document.getElementById("adminAddName").value.trim();
    const role = document.getElementById("adminAddRole").value.trim() || "employee";
    const password = document.getElementById("adminAddPassword").value.trim();

    if (!name || !password) {
        alert("Name and Password are required fields.");
        return;
    }

    try {
        const response = await fetch("/users/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
    full_name: name,
    username: name.toLowerCase().replace(/\s+/g, ""),
    password: password,
    role: role
})
        });
        const result = await response.json();

        if (result.success) {
            alert("✅ User account successfully provisioned!");
            // Reset fields
            document.getElementById("adminAddName").value = "";
            document.getElementById("adminAddRole").value = "";
            document.getElementById("adminAddPassword").value = "";
            loadEmployees(); // Reload list to see changes
        } else {
            alert("❌ Failed: " + (result.error || "Unknown server error"));
        }
    } catch (err) {
        console.error(err);
    }
}

// 2. Change User Password
async function adminChangePassword() {
    const userId = document.getElementById("adminTargetUserId").value;
    const newPassword = document.getElementById("adminNewPassword").value.trim();

    if (!userId || !newPassword) {
        alert("Please input both the target User ID and the new Password.");
        return;
    }

    try {
       const response = await fetch("/users/password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
    username: userId,
    password: newPassword
})
        });
        const result = await response.json();

        if (result.success) {
            alert("🔑 Password updated successfully!");
            document.getElementById("adminNewPassword").value = "";
        } else {
            alert("❌ Failed: " + (result.error || "Unknown error"));
        }
    } catch (err) {
        console.error(err);
    }
}

// Delete User Account
async function adminRemoveUser() {

    const userId = document.getElementById("adminTargetUserId").value.trim();

    if (!userId) {
        alert("Please enter a User ID.");
        return;
    }

    if (!confirm("Are you sure you want to delete this user?")) {
        return;
    }

    try {

        const response = await fetch("/users/" + userId, {

            method: "DELETE"

        });

        const result = await response.json();

        if (result.success) {

            alert(result.message);

            document.getElementById("adminTargetUserId").value = "";

            loadEmployees();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Server connection failed.");

    }

}
// =======================================
// Load Employee Management Table
// =======================================

async function loadEmployeeManagement() {

    try {

        const response = await fetch("/users/all");

        const users = await response.json();

        const table = document.getElementById("employeeManagementTable");

        if (!table) return;

        table.innerHTML = "";

        users.forEach(user => {

            table.innerHTML += `
                <tr>

                    <td>${user.full_name}</td>

                    <td>${user.username}</td>

                    <td>${user.role}</td>

                    <td>

                        <button
                            class="btn btn-sm btn-warning"
                           onclick="editEmployee(${user.id}, '${user.full_name}', '${user.role}')"

                            ✏️

                        </button>

                        <button
    class="btn btn-sm btn-secondary"
    onclick="resetEmployeePassword('${user.username}')">
    🔑
</button>

                        <button
                            class="btn btn-sm btn-danger"
                            onclick="deleteEmployee(${user.id})">

                            🗑

                        </button>

                    </td>

                </tr>
            `;

        });

    } catch (err) {

        console.error(err);

    }

}
function editEmployee(id){

    alert("Edit Employee: " + id);

}

async function resetEmployeePassword(username) {

    const newPassword = prompt(
        `Enter a new password for "${username}":`
    );

    if (!newPassword) {
        return;
    }

    try {

        const response = await fetch("/users/password", {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                username: username,
                password: newPassword

            })

        });

        const result = await response.json();

        alert(result.message);

    } catch (err) {

        console.error(err);

        alert("Unable to connect to server.");

    }

}

async function deleteEmployee(id) {

    if (!confirm("Delete this employee?")) {
        return;
    }

    try {

        const response = await fetch("/users/" + id, {

            method: "DELETE"

        });

        const result = await response.json();

        alert(result.message);

        if (result.success) {

            loadEmployeeManagement();

            loadEmployees();

        }

    } catch (err) {

        console.error(err);

        alert("Unable to connect to server.");

    }

}