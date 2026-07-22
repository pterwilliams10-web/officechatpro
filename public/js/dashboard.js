// =========================================
// OfficeChat Pro Dashboard
// =========================================

// Socket Connection
const socket = io();
// =========================================
// Notification Permission
// =========================================

if ("Notification" in window) {

    Notification.requestPermission();

}
// Online users
let onlineUsers = [];



// =========================================
// Global Variables
// =========================================

let currentUser = null;

let selectedEmployee = null;
let selectedGroup = null;

let groupMode = false;
let broadcastMode = false;

let employees = [];
let groups = [];

// =========================================
// Unread Messages
// =========================================

let unreadMessages = {};

// =========================================
// Load Groups
// =========================================
async function loadGroups() {

    try {

        const response = await fetch("/groups");
        const groups = await response.json();

        const groupList = document.getElementById("groupList");

        groupList.innerHTML = "";

        groups.forEach(group => {

            groupList.innerHTML += `

<li
    id="group-${group.id}"
    class="list-group-item d-flex justify-content-between align-items-center"
    onclick="openGroup(${group.id}, '${group.name.replace(/'/g, "\\'")}', this)">

    <span>👥 ${group.name}</span>

    <span
        id="groupBadge-${group.id}"
        class="badge bg-danger"
        style="display:none;">

        0

    </span>

</li>

`;

        });

    } catch (err) {

        console.error("Load Groups Error:", err);

    }

}

// =========================================
// Open Group
// =========================================
async function openGroup(id, name) {

    currentGroup = id;

    document.getElementById("chatTitle").innerText = name;
    document.getElementById("userStatus").innerText = "Group";

    console.log("Opening group:", id);

    // We'll load group messages next
}
// =========================================
// Send Message
// =========================================
async function sendMessage() {

    // If a group is open, send group message instead
if (currentGroup) {

    return sendGroupMessage();

}

    if (!selectedEmployee) {
        alert("Please select an employee first.");
        return;
    }

    const messageBox = document.getElementById("messageBox");
    const chatMessages = document.getElementById("chatMessages");

    const message = messageBox.value.trim();

    if (!message) return;

    try {

        // Save message in database
        const response = await fetch("/messages/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                receiver_id: selectedEmployee,
                message: message
            })
        });

        const result = await response.json();

        if (!result.success) {
            alert(result.message);
            return;
        }

       // Reload conversation after successful save
await loadConversation(selectedEmployee);
        

        // Send real-time notification
        socket.emit("send_message", {
            sender_id: currentUser.id,
            receiver_id: selectedEmployee,
            sender_name: currentUser.full_name,
            message: message,
            created_at: new Date()
        });

        // Clear textbox
        messageBox.value = "";

    } catch (err) {

        console.error(err);

        alert("Unable to send message.");

    }

}

 // =========================================
// Page Loaded
// =========================================

document.addEventListener("DOMContentLoaded", () => {

    initializeDashboard();

});

// =========================================
// Initialize
// =========================================

async function initializeDashboard(){

    await loadCurrentUser();

    await loadEmployees();

    await loadGroups();

    setupEvents();

}

// =========================================
// Load Current User
// =========================================

async function loadCurrentUser() {

    try {

        const response = await fetch("/me");

        const result = await response.json();

        if (!result.success) {

            window.location = "/";

            return;

        }

        currentUser = result.user;

        document.getElementById("userinfo").innerHTML = `
            <strong>${currentUser.full_name}</strong><br>
            ${currentUser.role}
        `;

        if (currentUser.role === "Admin") {

            document.getElementById("adminNavBtn").style.display = "block";

        }

        socket.emit("register", currentUser);

    }
    catch (err) {

        console.error(err);

        window.location = "/";

    }

}
// =========================================
// Events
// =========================================

function setupEvents() {

    document
        .getElementById("logoutBtn")
        .addEventListener("click", logout);

    document
        .getElementById("sendBtn")
        .addEventListener("click", sendMessage);

    let typingTimeout;

document
    .getElementById("messageBox")
    .addEventListener("input", function () {

        if (!selectedEmployee) return;

        socket.emit("typing", {
            sender_id: currentUser.id,
            sender_name: currentUser.full_name,
            receiver_id: selectedEmployee

            
        });

        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {

            socket.emit("stop_typing", {
                sender_id: currentUser.id,
                receiver_id: selectedEmployee
            });

        }, 1000);

    });

    document
    .getElementById("chatSearch")
    .addEventListener("input", searchMessages);

document
    .getElementById("messageBox")
    .addEventListener("keypress", function (e) {

        if (e.key === "Enter") {

            sendMessage();

        }

    });

}


// =========================================
// Logout
// =========================================

async function logout(){

    await fetch("/logout",{
        method:"POST"
    });

    window.location="/";

}

// =========================================
// Load Employees
// =========================================
async function loadEmployees() {

    try {

        const response = await fetch("/users");

        employees = await response.json();

        const list = document.getElementById("employeeList");

        list.innerHTML = "";

        employees.forEach(user => {

    list.innerHTML += `
        <li
    id="employee-${user.id}"
    class="list-group-item employee-card"
            onclick="selectEmployee(${user.id}, '${user.full_name}', this)">

            <div class="employee-avatar">
                👤
            </div>

            <div class="employee-info">

                <div class="employee-top">

                    <span class="employee-name">
                        ${user.full_name}
                    </span>

                    <span
                        id="time-${user.id}"
                        class="employee-time">
                    </span>

                </div>

                <div class="employee-bottom">

                    <span
                        id="last-${user.id}"
                        class="last-message">

                        No messages yet

                    </span>

                    <span
                        id="badge-${user.id}"
                        class="unread-badge"
                        style="display:none;">

                        0

                    </span>

                </div>

            </div>

        </li>
    `;

});

    } catch (err) {

        console.error("Load Employees Error:", err);

    }

}
// =========================================
// Select Employee
// =========================================

function selectEmployee(id, name, element){

    selectedEmployee = id;
    currentGroup = null;
    document.getElementById("manageGroupBtn").style.display = "none";

    selectedGroup = null;

    broadcastMode = false;

    document.getElementById("chatTitle").innerText = name;

    document.getElementById("userStatus").innerHTML =
    onlineUsers.includes(id)
        ? "🟢 Online"
        : "⚪ Offline";

    document
        .querySelectorAll("#employeeList .list-group-item")
        .forEach(item => item.classList.remove("active"));

    element.classList.add("active");
    loadConversation(id);

    unreadMessages[id] = 0;

const badge = document.getElementById(`badge-${id}`);

if (badge) {

    badge.style.display = "none";

}

}

// =========================================
// Load Conversation
// =========================================
async function loadConversation(userId) {

    const chatMessages = document.getElementById("chatMessages");

    chatMessages.innerHTML = `
        <div class="text-center mt-3">
            Loading conversation...
        </div>
    `;

    try {

        const response = await fetch(`/messages/${userId}`);
        const result = await response.json();

        if (!result.success) {

            chatMessages.innerHTML = `
                <div class="text-danger text-center mt-3">
                    Unable to load conversation.
                </div>
            `;

            return;
        }

        chatMessages.innerHTML = "";
        const typingIndicator = document.getElementById("typingIndicator");
if (typingIndicator) {
    typingIndicator.remove();
}

        if (result.messages.length === 0) {

            chatMessages.innerHTML = `
                <div class="text-center text-muted mt-4">
                    No messages yet.
                    <br>
                    Start the conversation 👋
                </div>
            `;

            return;
        }

        result.messages.forEach(msg => {

            const mine = msg.sender_id === currentUser.id;

            const bubble = document.createElement("div");

            bubble.className = mine
                ? "message mine"
                : "message";

                console.log(msg.created_at);

           let content = "";

// Text message
if (msg.message) {

    content = `
        <div class="message-content">
            ${msg.message}
        </div>
    `;

}
// Image
else if (msg.file_type && msg.file_type.startsWith("image/")) {

    content = `
        <div class="message-content">

            <img
                src="${msg.file_path}"
                style="max-width:250px;border-radius:10px;cursor:pointer;">

            <br>

            <a href="${msg.file_path}" target="_blank">
                📷 ${msg.file_name}
            </a>

        </div>
    `;

}
// Any other file
else {

    content = `
        <div class="message-content">

            📎
            <a href="${msg.file_path}" target="_blank">

                ${msg.file_name}

            </a>

        </div>
    `;

}

bubble.innerHTML = `
    ${content}

    <span class="message-time">
        ${formatMessageTime(msg.created_at)}
    </span>
`;

            chatMessages.appendChild(bubble);

        });

        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Mark received messages as read
try {

    await fetch(`/messages/read/${userId}`, {
    method: "PUT"
});

} catch (err) {

    console.error("Mark as read failed:", err);

}

    }

    catch (err) {

        console.error(err);

        chatMessages.innerHTML = `
            <div class="text-danger text-center mt-3">
                Error loading messages.
            </div>
        `;

    }

}
// =========================================
// Receive Real-Time Message
// =========================================

socket.on("receive_message", (data) => {

    // =========================================
// Desktop Notification
// =========================================

if (
    Notification.permission === "granted" &&
    document.hidden
) {

    new Notification(`New message from ${data.sender_name}`, {
        body: data.message,
        icon: "/favicon.ico"
    });

}
    console.log("📩 Incoming Message:", data);

    // Figure out who sent the message
    const otherUser =
        data.sender_id === currentUser.id
            ? data.receiver_id
            : data.sender_id;

    // Update sidebar preview
    updateSidebarMessage(otherUser, data.message);

    // If this conversation is currently open,
    // refresh it immediately
    if (selectedEmployee == otherUser) {

        loadConversation(otherUser);

        // Clear unread badge
        unreadMessages[otherUser] = 0;

        const badge = document.getElementById(`badge-${otherUser}`);

        if (badge) {

            badge.style.display = "none";

        }

    }

    

});

// =========================================
// Receive Real-Time Group Message
// =========================================

socket.on("receive_group_message", (data) => {

    console.log("👥 Incoming Group Message:", data);

    const badge = document.getElementById(`groupBadge-${data.group_id}`);

    console.log("Badge Found:", badge);

    if (currentGroup == data.group_id) {

        console.log("Current group is open");

        loadGroupMessages();

    } else {

        console.log("Incrementing badge...");

        if (badge) {

            let count = parseInt(badge.innerText) || 0;

            console.log("Old Count:", count);

            count++;

            badge.innerText = count;

            badge.style.display = "inline-block";

            console.log("New Count:", badge.innerText);

        }

    }

});

// =========================================
// Update Sidebar Preview
// =========================================
function updateSidebarMessage(userId, message) {

    const last = document.getElementById(`last-${userId}`);
    const time = document.getElementById(`time-${userId}`);
    const badge = document.getElementById(`badge-${userId}`);

    // Update last message preview
    if (last) {

        last.textContent =
            message.length > 35
                ? message.substring(0, 35) + "..."
                : message;

    }

    // Update time
    if (time) {

        time.textContent = new Date().toLocaleTimeString([], {

            hour: "2-digit",
            minute: "2-digit"

        });

    }

    // If chat isn't open, increase unread count
    if (selectedEmployee != userId) {

        unreadMessages[userId] = (unreadMessages[userId] || 0) + 1;

        if (badge) {

            badge.style.display = "flex";
            badge.textContent = unreadMessages[userId];

        }

    } else {

        // Chat is already open
        unreadMessages[userId] = 0;

        if (badge) {

            badge.style.display = "none";

        }

    }

}
// =========================================
// Format Message Time
// =========================================
function formatMessageTime(dateString) {

    console.log("formatMessageTime called:", dateString);

    // Convert SQLite datetime to ISO format
    const date = new Date(dateString.replace(" ", "T"));

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

}
// =========================================
// Live Online Status
// =========================================

socket.on("online_users", (users) => {

    console.log("🟢 Online Users:", users);

    onlineUsers = users;

    updateOnlineStatus();

});

// =========================================

function updateOnlineStatus() {

    employees.forEach(user => {

        const card = document.getElementById(`employee-${user.id}`);

        if (!card) return;

        if (onlineUsers.includes(user.id)) {

    card.classList.add("online");

    // Update chat header if this employee is selected
    if (selectedEmployee === user.id) {

        document.getElementById("userStatus").innerHTML =
            "🟢 Online";

    }

} else {

    card.classList.remove("online");

    // Update chat header if this employee is selected
    if (selectedEmployee === user.id) {

        document.getElementById("userStatus").innerHTML =
            "⚪ Offline";

    }

}

    });

}
// =========================================
// Typing Indicator
// =========================================

socket.on("user_typing", (data) => {

    // Only show if we're chatting with this user
    if (selectedEmployee !== data.sender_id) return;

    let indicator = document.getElementById("typingIndicator");

    if (!indicator) {

        indicator = document.createElement("div");

        indicator.id = "typingIndicator";
        indicator.className = "typing-indicator";

        indicator.innerHTML = `
            <em>${data.sender_name} is typing...</em>
        `;

        document
            .getElementById("chatMessages")
            .appendChild(indicator);

    }

});

socket.on("user_stop_typing", (data) => {

    if (selectedEmployee !== data.sender_id) return;

    const indicator = document.getElementById("typingIndicator");

    if (indicator) {

        indicator.remove();

    }

});

// =========================================
// Search Messages
// =========================================

function searchMessages() {

    const keyword = document
        .getElementById("chatSearch")
        .value
        .toLowerCase();

    const messages = document.querySelectorAll(".message");

    messages.forEach(message => {

        const text = message.innerText.toLowerCase();

        if (text.includes(keyword)) {

            message.style.display = "";

        } else {

            message.style.display = "none";

        }

    });

}
// =========================================
// Open File Picker
// =========================================

function triggerFileUpload() {

    document
        .getElementById("fileAttachmentInput")
        .click();

}
// =========================================
// Upload Selected File
// =========================================

async function handleFileSelected(input) {

    if (!input.files.length) return;

    const file = input.files[0];

    const formData = new FormData();

    formData.append("file", file);

    try {

        const response = await fetch("/upload", {

            method: "POST",

            body: formData

        });

        const result = await response.json();

        if (!result.success) {

            alert(result.message);

            return;

        }

        console.log("✅ File uploaded:", result.file);

        alert("File uploaded successfully!");

        // Clear input so the same file can be selected again

        // Send the uploaded file as a chat message
await fetch("/messages/send", {

    method: "POST",

    headers: {
        "Content-Type": "application/json"
    },

    body: JSON.stringify({

        receiver_id: selectedEmployee,

        file_name: result.file.originalName,

        file_path: result.file.path,

        file_type: result.file.mimetype

    })

});

// Refresh the conversation
await loadConversation(selectedEmployee);

alert("File sent successfully!");

        input.value = "";

    } catch (err) {

        console.error(err);

        alert("File upload failed.");

    }

}
// =========================================
// Admin Panel
// =========================================

function toggleAdminPanel(show) {

    const panel = document.getElementById("adminPanel");

    panel.style.display = show ? "block" : "none";

    if (show) {

        loadUsers();

    }

}

// =========================================
// Load Users into Admin Panel
// =========================================

async function loadUsers() {

    try {

        const response = await fetch("/users");

        const users = await response.json();

        const table = document.getElementById("adminUserTable");

        table.innerHTML = "";

        users.forEach(user => {

            table.innerHTML += `
                <tr>

                    <td>${user.full_name}</td>

                    <td>${user.username}</td>

                    <td>${user.role}</td>

                    <td>

<button
class="btn btn-primary btn-sm"
onclick="editUser(
    ${user.id},
    '${user.full_name}',
    '${user.username}',
    '${user.role}'
)">

✏ Edit

</button>

<br><br>

<button
class="btn btn-warning btn-sm"
onclick="resetUserPassword(${user.id},'${user.full_name}')">

🔑 Reset

</button>

<br><br>

<button
class="btn btn-danger btn-sm"
onclick="deleteUser(${user.id},'${user.username}')">

🗑 Delete

</button>

</td>

                </tr>
            `;

        });

    } catch (err) {

        console.error(err);

    }

}
// =========================================
// Delete User
// =========================================

async function deleteUser(id, username) {

    if (!confirm(`Delete ${username}?`)) return;

    try {

        const response = await fetch(`/users/${id}`, {

            method: "DELETE"

        });

        const result = await response.json();

       if (result.success) {

    alert("✅ User deleted successfully.");

    loadUsers();
    loadEmployees();

} else {

    alert(result.message);

}

    } catch (err) {

        console.error(err);

        alert("Delete failed.");

    }

}

// =========================================
// Admin Tabs
// =========================================

function showAdminTab(tab) {

    document.getElementById("adminUsersTab").style.display = "none";
    document.getElementById("adminMessagesTab").style.display = "none";
    document.getElementById("adminGroupsTab").style.display = "none";
    document.getElementById("adminSystemTab").style.display = "none";

    switch(tab){

        case "users":
            document.getElementById("adminUsersTab").style.display = "block";
            break;

        case "messages":

    document.getElementById("adminMessagesTab").style.display = "block";

    loadAdminMessageUsers();

    break;

        case "groups":

    document.getElementById("adminGroupsTab").style.display = "block";

    loadAdminGroups();

    break;

        case "system":
            document.getElementById("adminSystemTab").style.display = "block";
            break;

    }

}
// =========================================
// Load Admin Message Users
// =========================================

async function loadAdminMessageUsers() {

    try {

        const response = await fetch("/users/all");

        const result = await response.json();

        const user1 = document.getElementById("adminUser1");
        const user2 = document.getElementById("adminUser2");

        user1.innerHTML = "";
        user2.innerHTML = "";

        result.forEach(user => {

            user1.innerHTML += `
                <option value="${user.id}">
                    ${user.full_name}
                </option>
            `;

            user2.innerHTML += `
                <option value="${user.id}">
                    ${user.full_name}
                </option>
            `;

        });

    } catch (err) {

        console.error("Failed to load admin users:", err);

    }

}
// =========================================
// Load Admin Conversation
// =========================================

async function loadAdminConversation() {

    const user1 = document.getElementById("adminUser1").value;
    const user2 = document.getElementById("adminUser2").value;

    try {

        const response = await fetch(
            `/admin/messages/${user1}/${user2}`
        );

        const result = await response.json();

        const div =
            document.getElementById("adminConversation");

        div.innerHTML = "";

        result.messages.forEach(msg => {

            div.innerHTML += `

                <div
                    style="
                        border:1px solid #ddd;
                        margin-bottom:10px;
                        padding:10px;
                        border-radius:8px;">

                    <strong>
                        User ${msg.sender_id}
                    </strong>

                    <br><br>

                    ${msg.message || ""}

                    ${
                        msg.file_path
                        ? `<br><br>
                           <img
                              src="${msg.file_path}"
                              style="max-width:180px;">`
                        : ""
                    }

                    <br><br>

                    <small>

                        ${msg.created_at}

                    </small>

                    <br><br>

<button
    class="btn btn-danger btn-sm"
    onclick="adminDeleteMessage(${msg.id})">

    🗑 Delete Message

</button>

                </div>

            `;

        });

    } catch(err){

        console.error(err);

    }

}

// =========================================
// Admin Delete Message
// =========================================

async function adminDeleteMessage(messageId) {

    if (!confirm("Delete this message?")) {

        return;

    }

    try {

        const response = await fetch(

            `/admin/message/${messageId}`,

            {

                method: "DELETE"

            }

        );

        const result = await response.json();

        if (result.success) {

            alert("✅ Message deleted successfully.");

            loadAdminConversation();

        } else {

            alert(result.message || "Delete failed.");

        }

    } catch (err) {

        console.error(err);

        alert("Delete failed.");

    }

}

// =========================================
// Admin Delete Conversation
// =========================================

async function adminDeleteConversation() {

    const user1 = document.getElementById("adminUser1").value;
    const user2 = document.getElementById("adminUser2").value;

    if (!confirm("Delete the ENTIRE conversation?")) {

        return;

    }

    try {

        const response = await fetch(

            `/admin/conversation/${user1}/${user2}`,

            {

                method: "DELETE"

            }

        );

        const result = await response.json();

        if (result.success) {

            alert(`✅ ${result.deleted} messages deleted.`);

            document.getElementById("adminConversation").innerHTML = "";

        } else {

            alert("Delete failed.");

        }

    } catch (err) {

        console.error(err);

        alert("Delete failed.");

    }

}

// =========================================
// Reset User Password
// =========================================

async function resetUserPassword(id, name) {

    const password = prompt(
        `Enter a new password for ${name}:`
    );

    if (!password) {

        return;

    }

    try {

        const response = await fetch(

            "/admin/reset-password",

            {

                method: "PUT",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    id,

                    password

                })

            }

        );

        const result = await response.json();

        if (result.success) {

            alert("✅ Password updated successfully.");

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Password update failed.");

    }

}
// =========================================
// Edit User
// =========================================

async function editUser(id, fullName, username, role) {

    const newName = prompt("Full Name:", fullName);

    if (!newName) return;

    const newUsername = prompt("Username:", username);

    if (!newUsername) return;

    const newRole = prompt(
        "Role (Admin / Employee):",
        role
    );

    if (!newRole) return;

    try {

        const response = await fetch(

            "/users/update",

            {

                method: "PUT",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    id,
                    full_name: newName,
                    username: newUsername,
                    role: newRole

                })

            }

        );

        const result = await response.json();

        if (result.success) {

            alert("✅ User updated successfully.");

            loadUsers();
            loadEmployees();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Update failed.");

    }

}
// =========================================
// Load Admin Groups
// =========================================

async function loadAdminGroups() {

    try {

        const response = await fetch("/groups");

        const groups = await response.json();

        const container = document.getElementById("adminGroupsList");

        container.innerHTML = "";

        groups.forEach(group => {

            container.innerHTML += `

            <div class="card mb-2">

                <div class="card-body">

                    <h5>${group.name}</h5>

                    <p>${group.description || ""}</p>

                    <button
                        class="btn btn-primary btn-sm"
                        onclick="viewGroup(${group.id})">

                        👥 Members

                    </button>

                    <button
                        class="btn btn-warning btn-sm"
                        onclick="renameGroup(${group.id})">

                        ✏ Rename

                    </button>

                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteGroup(${group.id})">

                        🗑 Delete

                    </button>

                </div>

            </div>

            `;

        });

    } catch (err) {

        console.error(err);

    }

}
// =========================================
// View Group Members
// =========================================

async function viewGroup(groupId) {

    currentGroup = groupId;

    try {

        const response = await fetch(`/groups/${groupId}`);

        const result = await response.json();

        if (!result.success) {

            alert(result.message);

            return;

        }

        let html = "";

        result.members.forEach(member => {

            html += `
                <tr>

                    <td>${member.full_name}</td>

                    <td>${member.role}</td>

                    <td>

                        <button
                            class="btn btn-danger btn-sm"
                            onclick="removeMember(${groupId}, ${member.id})">

                            Remove

                        </button>

                    </td>

                </tr>
            `;

        });

const usersResponse = await fetch("/users");
const employees = await usersResponse.json();

let options = `<option value="">Select Employee</option>`;

employees.forEach(user => {

    const exists = result.members.find(
        member => member.id === user.id
    );

    if (!exists) {

        options += `
<option value="${user.id}">
${user.full_name}
</option>
`;

    }

});

document.getElementById("addMemberSelect").innerHTML = options;


        document.getElementById("groupMembersBody").innerHTML = html;

        document.getElementById("groupMembersModal").style.display = "block";

    } catch(err){

        console.error(err);

        alert("Unable to load group.");

    }

}
// =========================================
// Remove Member
// =========================================

async function removeMember(groupId, userId) {

    console.log("removeMember() called");
    console.log("groupId =", groupId);
    console.log("userId =", userId);

    if (!confirm("Remove this member from the group?")) {
        return;
    }

    try {

        console.log("Sending DELETE request...");

        const response = await fetch("/groups/remove-member", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                group_id: groupId,
                user_id: userId
            })
        });

        console.log("HTTP Status:", response.status);

        const result = await response.json();

        console.log("Server Response:", result);

        if (result.success) {
            alert("✅ Member removed successfully.");
            await openManageGroup();
            loadAdminGroups();
        } else {
            alert(result.message);
        }

    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

// =========================================
// Add Member To Group
// =========================================
async function addMemberToGroup() {

    const userId = document.getElementById("addMemberSelect").value;

    if (userId === "") {

        alert("Please select an employee.");

        return;

    }

    try {

        const response = await fetch("/groups/add-member", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                group_id: currentGroup,
                user_id: parseInt(userId)

            })

        });

        const result = await response.json();

        if (result.success) {

            alert("✅ Member added successfully.");

            // Reload the member list
            await viewGroup(currentGroup);

            // Refresh sidebar/admin list
            loadAdminGroups();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Unable to add member.");

    }

}


// =========================================
// Add Member
// =========================================

async function addMemberToGroup() {

    const userId =
        document.getElementById("addMemberSelect").value;

    if (userId === "") {

        alert("Select an employee.");

        return;

    }

    try {

        const response =
            await fetch("/groups/add-member", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    group_id: currentGroup,
                    user_id: userId

                })

            });

        const result = await response.json();

        if (result.success) {

            alert("✅ Member added successfully.");

            viewGroup(currentGroup);

            loadAdminGroups();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Unable to add member.");

    }

}


// =========================================
// Show Create Group Modal
// =========================================
function showCreateGroupModal() {

    openCreateGroupModal();

}
// =========================================
// Open Create Group Modal
// =========================================
async function openCreateGroupModal() {

    document.getElementById("newGroupName").value = "";
    document.getElementById("newGroupDescription").value = "";

    const response = await fetch("/users");
    const users = await response.json();

    let html = "";

    users.forEach(user => {

        html += `
<label class="d-block mb-2">

    <input
        type="checkbox"
        class="group-member"
        value="${user.id}">

    ${user.full_name}

</label>
`;

    });

    document.getElementById("groupMembersSelection").innerHTML = html;

    document.getElementById("createGroupModal").style.display = "block";

}


// =========================================
// Close Create Group Modal
// =========================================
function closeCreateGroupModal() {

    document.getElementById("createGroupModal").style.display = "none";

}

// =========================================
// Create Group
// =========================================
async function createGroup() {

    const name = document.getElementById("newGroupName").value.trim();
    const description = document.getElementById("newGroupDescription").value.trim();

    if (name === "") {

        alert("Please enter a group name.");

        return;

    }

    const members = [];

    document
        .querySelectorAll(".group-member:checked")
        .forEach(member => {

            members.push(parseInt(member.value));

        });

    try {

        const response = await fetch("/groups/create", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                name,
                description,
                members

            })

        });

        const result = await response.json();

        if (result.success) {

            alert("✅ Group created successfully.");

            closeCreateGroupModal();

            loadGroups();

            loadAdminGroups();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Unable to create group.");

    }

}
// =========================================
// Rename Group
// =========================================
async function renameGroup(groupId) {

    const newName = prompt("Enter the new group name:");

    if (!newName) {
        return;
    }

    try {

        const response = await fetch("/groups/" + groupId, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                name: newName,
                description: ""

            })

        });

        const result = await response.json();

        if (result.success) {

            alert("✅ Group renamed successfully.");

            loadGroups();

            loadAdminGroups();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Unable to rename group.");

    }

}
// =========================================
// Delete Group
// =========================================
async function deleteGroup(groupId) {

    if (!confirm("Are you sure you want to delete this group?")) {
        return;
    }

    try {

        const response = await fetch("/groups/" + groupId, {

            method: "DELETE"

        });

        const result = await response.json();

        if (result.success) {

            alert("✅ Group deleted successfully.");

            loadGroups();
            loadAdminGroups();

        } else {

            alert(result.message);

        }

    } catch (err) {

        console.error(err);

        alert("Unable to delete group.");

    }

}