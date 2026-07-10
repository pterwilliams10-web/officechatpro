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

console.log(result);

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