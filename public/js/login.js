document.getElementById("loginForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {

        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = "/dashboard";
        } else {
            document.getElementById("message").innerText = result.message;
        }

    } catch (error) {
        console.error(error);
        document.getElementById("message").innerText = "Unable to connect to the server.";
    }

});