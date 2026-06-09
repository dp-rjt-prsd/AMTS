const API_BASE_URL =
    "http://127.0.0.1:8000";

// ======================================
// INIT
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const token =
            localStorage.getItem(
                "token"
            );

        if (token) {

            window.location.href =
                "dashboard.html";
        }

        document
            .getElementById(
                "loginForm"
            )
            .addEventListener(
                "submit",
                login
            );
    }
);

// ======================================
// LOGIN
// ======================================

async function login(
    event
) {

    event.preventDefault();

    const button =
        document.querySelector(
            "#loginForm button"
        );

    const originalText =
        button.innerText;

    button.disabled =
        true;

    button.innerText =
        "Signing In...";

    const email =
        document
            .getElementById(
                "email"
            )
            .value
            .trim();

    const password =
        document
            .getElementById(
                "password"
            )
            .value;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            email,

                            password

                        })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            showToast(
                data.detail ||
                "Login Failed",
                "error"
            );

            button.disabled =
                false;

            button.innerText =
                originalText;

            return;
        }

        // ==================================
        // SAVE SESSION
        // ==================================

        localStorage.setItem(
            "token",
            data.access_token
        );

        localStorage.setItem(
            "role",
            data.role
        );

        localStorage.setItem(
            "user_name",
            data.name
        );

        showToast(
            "Login Successful"
        );

        setTimeout(
            () => {

                window.location.href =
                    "dashboard.html";

            },
            500
        );

    }
    catch (error) {

        console.error(error);

        showToast(
            "Unable to connect to server",
            "error"
        );

        button.disabled =
            false;

        button.innerText =
            originalText;
    }
}