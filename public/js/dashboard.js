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

        // -------------------------
        // Load Employees
        // -------------------------

        const response = await fetch("/users");
        const users = await response.json();

        let html = `
            <li class="list-group-item active">
                👥 EMPLOYEES
            </li>
        `;

        users.forEach(user => {

            html += `
                <li
                    class="list-group-item"
                    onclick="selectUser(${user.id}, '${user.full_name}', this)">
                    👤 ${user.full_name}
                </li>
            `;

        });

        // -------------------------
        // Load Groups
        // -------------------------

        const groupResponse = await fetch("/groups");
        const groups = await groupResponse.json();

        html += `
            <li class="list-group-item active mt-2">
                📁 GROUPS
            </li>
        `;

        groups.forEach(group => {

            html += `
                <li
                    class="list-group-item"
                    onclick="openGroup(${group.id}, '${group.name}', this)">
                    👥 ${group.name}
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

        await fetch("/messages/read/" + id, {
    method: "PUT"
});

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

    // ======================
// GROUP CHAT
// ======================
if (currentGroup) {

    await sendGroupMessage();

    return;

}
    if (!selectedUser && !isBroadcastMode) {
        alert("Please select an employee or broadcast mode first.");
        return;
    }

    const messageBox = document.getElementById("messageBox");

messageBox.addEventListener("keypress", function(e){

    if(e.key === "Enter"){

        e.preventDefault();

        if(currentGroup){

            sendGroupMessage();

        }else{

            sendMessage();

        }

    }

});

const message = messageBox.value.trim();

    if (message === "") return;


    // --- HANDLE GLOBAL BROADCAST ---
  if (isBroadcastMode) {

    // Save broadcast in SQLite
    const response = await fetch("/broadcast/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: message
        })
    });

    const result = await response.json();

    if (!result.success) {
        alert(result.message);
        return;
    }

    // Send instantly to everyone
    socket.emit("broadcast_message", {
        sender_name: currentUserName,
        message: message,
        created_at: new Date()
    });

    messageBox.value = "";

    loadBroadcasts();

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

    // Browser Notification
    if (
        Notification.permission === "granted" &&
        document.hidden
    ) {
        new Notification("OfficeChat Pro", {
            body: data.message || "📎 File received"
        });
    }

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

    ${data.message || ""}

    ${
        data.file_path
            ? `
                <br><br>
                📎 <a href="${data.file_path}" target="_blank">
                    ${data.file_name}
                </a>
              `
            : ""
    }

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

    if (!selectedUser) {
        alert("Please select an employee first.");
        input.value = "";
        return;
    }

    const file = input.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {

        // Upload the file
        const uploadResponse = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
            alert(uploadResult.message);
            return;
        }

        // Send the uploaded file as a chat message
        const messageResponse = await fetch("/messages/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                receiver_id: selectedUser,
                message: "",
                file_name: uploadResult.file.originalName,
                file_path: uploadResult.file.path,
                file_type: uploadResult.file.mimetype
            })
        });

        const messageResult = await messageResponse.json();

        if (messageResult.success) {

            socket.emit("send_message", {
                sender_id: Number(document.body.dataset.userid),
                receiver_id: selectedUser,
                message: "",
                file_name: uploadResult.file.originalName,
                file_path: uploadResult.file.path,
                file_type: uploadResult.file.mimetype,
                created_at: new Date()
            });

            const selected = document.querySelector("#employeeList li.selected");

            if (selected) {
                selectUser(
                    selectedUser,
                    document.getElementById("chatTitle").innerText,
                    selected
                );
            }

            input.value = "";

        } else {

            alert(messageResult.message);

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

async function loadBroadcasts() {

    try {

        const response = await fetch("/broadcast/history");

        const result = await response.json();

        if (!result.success) return;

        const chatBox = document.getElementById("chatMessages");

        chatBox.innerHTML = "";

        result.broadcasts.forEach(item => {

            chatBox.innerHTML += `
                <div class="message other" style="justify-content:center;width:100%;">
                    <div class="bubble" style="background:#eff6ff;color:#1e40af;max-width:90%;">
                        <div class="text">
                            📢 <strong>${item.sender_name}</strong><br>
                            ${item.message}
                        </div>
                        <div class="meta">
                            ${item.created_at}
                        </div>
                    </div>
                </div>
            `;

        });

    } catch(err){

        console.error(err);

    }

}

// ===============================
// Start App
// ===============================
// ===============================
// Start App
// ===============================
loadCurrentUser();
loadEmployees();
loadEmployeeManagement();
loadBroadcasts();
loadBroadcastHistory();

console.log("✅ Socket connected");

// ===============================
// Browser Notification Permission
// ===============================
if ("Notification" in window) {
    Notification.requestPermission();
}

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

    document.getElementById("adminPanelModal").style.display =
        show ? "flex" : "none";

    if (show) {
        loadEmployeeManagement();
        loadMessageHistory();
        loadGroupMembers();
        loadGroups();
    }

}

function filterHistory() {

    const search = document.getElementById("historySearch");

    if (!search) return;

    const value = search.value.toLowerCase();

    document.querySelectorAll("#historyTable tr")
        .forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(value)
                ? ""
                : "none";
        });

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

async function loadMessageHistory() {

    const response = await fetch("/history");

    const result = await response.json();

    if (!result.success) return;

    let html = "";

    result.messages.forEach(msg => {

        html += `
            <div class="card mb-2">

                <div class="card-body">

                    <strong>${msg.sender_name}</strong>

                    ➜

                    <strong>${msg.receiver_name}</strong>

                    <br><br>

                    ${msg.message || ""}

                    ${
                        msg.file_path
                        ? `<br><a href="${msg.file_path}" target="_blank">📎 ${msg.file_name}</a>`
                        : ""
                    }

                    <hr>

                    <small>${msg.created_at}</small>

                </div>

            </div>
        `;

    });

    document.getElementById("messageHistory").innerHTML = html;

}
// ======================================
// Load Admin Message History
// ======================================

async function loadMessageHistory() {

    try {

        const response = await fetch("/history");

        const result = await response.json();

        if (!result.success) return;

        const table = document.getElementById("historyTable");

        table.innerHTML = "";

        result.messages.forEach(msg => {

table.innerHTML += `
<tr>

    <td>${msg.created_at}</td>

    <td>${msg.sender_name}</td>

    <td>${msg.receiver_name}</td>

    <td>${msg.message || ""}</td>

    <td>

        <button
            class="btn btn-sm btn-primary"
            onclick="viewConversation(${msg.sender_id}, ${msg.receiver_id})">

            Open

        </button>

    </td>

</tr>
`;

        });

    }

    catch(err){

        console.error(err);

    }

}

async function viewConversation(senderId, receiverId) {

    try {

        const response = await fetch(
            `/history/conversation/${senderId}/${receiverId}`
        );

        const result = await response.json();

        if (!result.success) {
            alert(result.message || "Unable to load conversation.");
            return;
        }

        const title = document.getElementById("adminConversationTitle");
        const box = document.getElementById("adminConversationMessages");

        if (!title || !box) return;

        if (result.messages.length === 0) {
            title.innerText = "Conversation";
            box.innerHTML = "No messages found for this conversation.";
            return;
        }

        const first = result.messages[0];

        title.innerText = `${first.sender_name} and ${first.receiver_name}`;

        box.innerHTML = "";

        result.messages.forEach(msg => {

            box.innerHTML += `
                <div style="border-bottom:1px solid #e5e7eb;padding:8px 0;">
                    <div style="font-weight:600;color:#1e293b;">
                        ${msg.sender_name} to ${msg.receiver_name}
                    </div>
                    <div style="margin:4px 0;">
                        ${msg.message || ""}
                        ${
                            msg.file_path
                                ? `<br><a href="${msg.file_path}" target="_blank">${msg.file_name}</a>`
                                : ""
                        }
                    </div>
                    <small style="color:#64748b;">${msg.created_at}</small>
                </div>
            `;

        });

        box.scrollTop = 0;

    } catch (err) {

        console.error(err);
        alert("Unable to load conversation.");

    }

}

async function loadGroupMembers() {

    try {

        const response = await fetch("/users/all");
        const users = await response.json();
        const list = document.getElementById("groupMemberList");

        if (!list || !Array.isArray(users)) return;

        list.innerHTML = "";

        users.forEach(user => {
            list.innerHTML += `
                <label style="display:block;margin-bottom:6px;">
                    <input type="checkbox" class="group-member-checkbox" value="${user.id}">
                    ${user.full_name} (${user.role})
                </label>
            `;
        });

    } catch (err) {

        console.error(err);

    }

}

async function createGroup() {

    const nameInput = document.getElementById("createGroupName")
    const name = nameInput.value.trim();
    const memberIds = Array
        .from(document.querySelectorAll(".group-member-checkbox:checked"))
        .map(input => Number(input.value));

    if (!name) {
        alert("Please enter a group name.");
        return;
    }

    if (memberIds.length === 0) {
        alert("Please select at least one group member.");
        return;
    }

    try {

        const response = await fetch("/groups", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                member_ids: memberIds
            })
        });

        const result = await response.json();

        alert(result.message);

        if (result.success) {
            nameInput.value = "";
            document
                .querySelectorAll(".group-member-checkbox")
                .forEach(input => {
                    input.checked = false;
                });
            loadGroups();
        }

    } catch (err) {

        console.error(err);
        alert("Unable to create group.");

    }

}

async function loadGroups() {

    try {

        const response = await fetch("/groups");
        const result = await response.json();
        const list = document.getElementById("groupList");

        if (!list || !result.success) return;

        list.innerHTML = "";

        if (result.groups.length === 0) {
            list.innerHTML = "No groups created yet.";
            return;
        }

        result.groups.forEach(group => {
            list.innerHTML += `
                <div style="border-bottom:1px solid #e5e7eb;padding:8px 0;">
                    <strong>${group.name}</strong>
                    <div style="font-size:13px;color:#475569;">
                        ${group.member_count} members
                    </div>
                    <div style="font-size:12px;color:#64748b;">
                        ${group.members || "No members"}
                    </div>
                </div>
            `;
        });

    } catch (err) {

        console.error(err);

    }

}

// =======================================
// Send Broadcast
// =======================================

async function sendBroadcast() {

    const message = document
        .getElementById("broadcastMessage")
        .value
        .trim();

    if (!message) {
        alert("Please enter a broadcast message.");
        return;
    }

    try {

        const response = await fetch("/broadcast/send", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message
            })

        });

        const result = await response.json();

        if (result.success) {

            document.getElementById("broadcastMessage").value = "";

            loadBroadcastHistory();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Unable to send broadcast.");

    }

}

// =======================================
// Load Broadcast History
// =======================================

async function loadBroadcastHistory() {

    try {

        const response = await fetch("/broadcast/history");

        const result = await response.json();

const broadcasts = result.broadcasts;

        const history = document.getElementById("broadcastHistory");

        history.innerHTML = "";

        if (broadcasts.length === 0) {

            history.innerHTML = `
                <div class="text-center text-muted">
                    No broadcasts found.
                </div>
            `;

            return;
        }

        broadcasts.forEach(item => {

            history.innerHTML += `

                <div class="card mb-2">

                    <div class="card-body">

                        <h6 class="card-title">
                            📢 ${item.sender_name}
                        </h6>

                        <p class="card-text">
                            ${item.message}
                        </p>

                        <small class="text-muted">
                            ${item.created_at}
                        </small>

                        <div class="mt-2">

                            <button
                                class="btn btn-warning btn-sm"
                                onclick="pinBroadcast(${item.id})">

                                📌 Pin

                            </button>

                            <button
                                class="btn btn-danger btn-sm"
                                onclick="deleteBroadcast(${item.id})">

                                🗑 Delete

                            </button>

                        </div>

                    </div>

                </div>

            `;

        });

    } catch (err) {

        console.error(err);

    }

}
// =======================================
// Delete Broadcast
// =======================================

async function deleteBroadcast(id) {

    if (!confirm("Delete this broadcast?")) {
        return;
    }

    try {

        const response = await fetch("/broadcasts/" + id, {

            method: "DELETE"

        });

        const result = await response.json();

        if (result.success) {

            loadBroadcastHistory();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

    }

}

function openCreateGroupModal(){

    document.getElementById("createGroupModal").style.display="flex";

    loadGroupUsers();

}

function closeCreateGroupModal(){

    document.getElementById("createGroupModal").style.display="none";

}
async function loadGroupUsers(){

    const response=await fetch("/users");

    const users=await response.json();

    let html="";

    users.forEach(user=>{

        html+=`

<label>

<input
type="checkbox"
value="${user.id}">

${user.full_name}

</label>

<br>

`;

    });

    document.getElementById("createGroupMembersList").innerHTML=html;

}

async function createGroup(){

    const name=document.getElementById("createGroupName").value;

    const description=document.getElementById("createGroupDescription").value;

    const members=[];

    document
    .querySelectorAll("#createGroupMembersList input:checked")
    .forEach(c=>{

        members.push(parseInt(c.value));

    });

    const response=await fetch("/groups/create",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({

            name,
            description,
            members

        })

    });

    const result=await response.json();

    alert(result.message);

    if(result.success){

        closeCreateGroupModal();

        loadGroups();

    }

}async function loadGroups(){

    const response = await fetch("/groups");

    const groups = await response.json();

    let html = "";

    groups.forEach(group => {

        html += `
            <li
                class="list-group-item"
                onclick="openGroup(${group.id}, '${group.name}')">

                👥 ${group.name}

            </li>
        `;

    });
    function openGroup(id, name){

    console.log("Opening group:", id);

    document.getElementById("chatTitle").innerText = name;

}

    document.getElementById("groupList").innerHTML = html;

}
