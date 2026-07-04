// ================================
// Load all users
// ================================

async function loadUsers() {

    const response = await fetch("/users/all");

    const users = await response.json();

    let html = "";

    users.forEach(user => {

        html += `
            <tr>
                <td>${user.full_name}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteUser(${user.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;

    });

    document.getElementById("usersTable").innerHTML = html;

}

// ================================
// Create User
// ================================

document.getElementById("createUserForm").addEventListener("submit", async (e)=>{

    e.preventDefault();

    const full_name = document.getElementById("full_name").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    const response = await fetch("/users/create",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({

            full_name,
            username,
            password,
            role

        })

    });

    const result = await response.json();

    document.getElementById("message").innerHTML =
        "<div class='alert alert-info'>" + result.message + "</div>";

    if(result.success){

        document.getElementById("createUserForm").reset();

        loadUsers();

    }

});

async function deleteUser(id){

    if(!confirm("Are you sure you want to delete this user?")){
        return;
    }

    const response = await fetch("/users/" + id,{

        method:"DELETE"

    });

    const result = await response.json();

    document.getElementById("message").innerHTML =
        "<div class='alert alert-info'>" + result.message + "</div>";

    loadUsers();

}


// ================================
// Load users when page opens
// ================================

loadUsers();