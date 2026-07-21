// ======================================
// Groups
// ======================================

let currentGroup = null;

async function openGroup(groupId, groupName, element){

    currentGroup = groupId;
    socket.emit("join_group", groupId);
    document.getElementById("manageGroupBtn").style.display = "block";

    // Remove active class from all sidebar items
    document
        .querySelectorAll("#employeeList .list-group-item")
        .forEach(item => item.classList.remove("active"));

    // Highlight selected group
    if(element){
        element.classList.add("active");
    }

    document.getElementById("chatTitle").innerText =
        "👥 " + groupName;
document.getElementById("manageGroupBtn").style.display = "block";

    await loadGroupMessages();

}

async function loadGroupMessages(){

    if(!currentGroup) return;

    const response =
        await fetch("/group/messages/" + currentGroup);

    const result = await response.json();

    console.log("Group Details Response:", result);




let html = "";

    result.messages.forEach(msg=>{

    const messageTime = new Date(msg.created_at).toLocaleString();

const mine = msg.sender_id == currentUser.id;

html += `
<div class="${mine ? 'my-message' : 'their-message'}">

    ${!mine ? `
    <div class="sender">
        ${msg.full_name}
    </div>
    ` : ""}

    <div class="chat-bubble ${mine ? 'bubble-me' : 'bubble-them'}">

        <div class="text">
            ${msg.message}
        </div>

        <div class="message-time">
            ${messageTime}
        </div>

    </div>

</div>
`;

});

// 👇 These lines are missing
document.getElementById("chatMessages").innerHTML = html;

const chat = document.getElementById("chatMessages");
chat.scrollTop = chat.scrollHeight;

}
async function sendGroupMessage(){

    console.log("sendGroupMessage called");

    if(!currentGroup){

        alert("Select a group first.");

        return;

    }

    const box =
        document.getElementById("messageBox");

    const message = box.value.trim();

    if(message==="") return;

    const response =
        await fetch("/group/message/send",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                group_id:currentGroup,

                message

            })

        });

    const result =
        await response.json();

    if(result.success){

        socket.emit("group_message", {

    group_id: currentGroup,

    sender_id: currentUser.id,

    sender_name: currentUser.full_name,

    message: message,

    created_at: new Date()

});

box.value = "";

    }

}

async function deleteCurrentGroup(){

    if(!currentGroup) return;

    if(!confirm("Delete this group?"))
        return;

    const response =
        await fetch("/groups/" + currentGroup,{

            method:"DELETE"

        });

    const result =
        await response.json();

    alert(result.message);

    if(result.success){

        currentGroup = null;

        document.getElementById("manageGroupBtn").style.display = "none";

        document.getElementById("chatTitle").innerText =
            "OfficeChat Pro";

        document.getElementById("chatMessages").innerHTML = "";

        loadEmployees();

    }

}

async function saveGroupChanges(){

    const name =
        document.getElementById("editGroupName").value.trim();

    const description =
        document.getElementById("editGroupDescription").value.trim();

    const response =
        await fetch("/groups/" + currentGroup, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                description
            })

        });

    const result = await response.json();

    alert(result.message);

    if(result.success){

        loadEmployees();

        closeManageGroup();

    }

}

async function openManageGroup(){

    if(!currentGroup){

        alert("Please select a group first.");

        return;

    }


    
    const response = await fetch("/groups/" + currentGroup);

    const result = await response.json();

    console.log("Group:", result.group);
console.log("Members:", result.members);


if(!result.success){

        alert(result.message);

        return;

    }



    document.getElementById("editGroupName").value =
        result.group.name;

    document.getElementById("editGroupDescription").value =
        result.group.description || "";


               const usersResponse = await fetch("/users");
const employees = await usersResponse.json();

console.log("Employees Response:", employees);

let options = '<option value="">Select Employee</option>';

employees.forEach(user => {

    const exists = result.members.find(
        m => m.id === user.id
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

    let html = "";

    result.members.forEach(member=>{

      html += `
<div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2">

    <div>

        👤 <strong>${member.full_name}</strong>

        <span class="text-muted">
            (${member.role})
        </span>

    </div>

    <button
        class="btn btn-outline-danger btn-sm"
        onclick="removeMember(${currentGroup}, ${member.id})">

        Remove

    </button>

</div>
`;

    });

    document.getElementById("groupMembersList").innerHTML = html;

    document.getElementById("manageGroupModal").style.display = "block";

}

async function addMemberToGroup(){

    if(!currentGroup){

        alert("Please select a group first.");

        return;

    }

    const userId =
        document.getElementById("addMemberSelect").value;

    if(userId === ""){

        alert("Please select an employee.");
        document.getElementById("manageGroupBtn").style.display = "none";

        return;

    }

    const response =
        await fetch("/groups/add-member",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                group_id:currentGroup,

                user_id:userId

            })

        });

    const result =
        await response.json();

    alert(result.message);

    if(result.success){

        openManageGroup();

    }

}
function closeManageGroup(){

    document.getElementById("manageGroupModal").style.display = "none";

}