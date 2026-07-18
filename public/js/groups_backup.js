// ======================================
// Groups
// ======================================

let currentGroup = null;

async function openGroup(groupId, groupName, element){

    currentGroup = groupId;

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

    html += `
<div class="message">

    <strong>${msg.full_name}</strong>

    <br>

    ${msg.message ?? ""}

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

        box.value="";

        loadGroupMessages();

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

    if(!result.success){

        alert(result.message);

        return;

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

    <span>

        👤 ${member.full_name}

        <small class="text-muted">
            (${member.role})
        </small>

    </span>

    <button
        class="btn btn-danger btn-sm"
        onclick="removeMember(${member.id})">

        Remove

    </button>

</div>
`;

    });

    document.getElementById("groupMembersList").innerHTML = html;

    document.getElementById("manageGroupModal").style.display = "block";

}