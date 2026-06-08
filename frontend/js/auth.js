const API_BASE_URL = "http://127.0.0.1:8000";

document
    .getElementById("loginForm")
    .addEventListener("submit", loginUser);

async function loginUser(event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    try {

        const response = await fetch(
            `${API_BASE_URL}/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data =
            await response.json();

        if (response.ok) {

            localStorage.setItem(
                "token",
                data.access_token
            );

            window.location.href =
                "dashboard.html";
        }
        else {

            document.getElementById(
                "message"
            ).innerText =
                data.detail;
        }

    }
    catch (error) {

        document.getElementById(
            "message"
        ).innerText =
            "Unable to connect to server";
    }
}