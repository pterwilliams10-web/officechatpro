const socket = io();

let selectedUser = null;

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

        document.body.dataset.userid = result.user.id;

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
// Select Employee
// ===============================
async function selectUser(id, name, element) {

    selectedUser = id;

    document
        .querySelectorAll("#employeeList li")
        .forEach(li => li.classList.remove("selected"));

    element.classList.add("selected");

    document.getElementById("chatTitle").innerText = name;

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
                                ${msg.message}
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
// Send Message
// ===============================
document.getElementById("sendBtn").addEventListener("click", async () => {

    if (!selectedUser) {
        alert("Please select an employee first.");
        return;
    }

    const messageBox = document.getElementById("messageBox");
    const message = messageBox.value.trim();

    if (message === "") return;

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
// Receive Message
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