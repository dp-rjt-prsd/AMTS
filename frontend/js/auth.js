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

        // If on login/register page and already logged in, redirect to dashboard
        if (token && (document.getElementById("loginForm") || document.getElementById("registerForm"))) {
            window.location.href = "dashboard.html";
            return;
        }

        // Login form handler
        if (document.getElementById("loginForm")) {
            document
                .getElementById(
                    "loginForm"
                )
                .addEventListener(
                    "submit",
                    login
                );
        }

        // Register form handler
        if (document.getElementById("registerForm")) {
            document
                .getElementById(
                    "registerForm"
                )
                .addEventListener(
                    "submit",
                    register
                );
        }
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

        localStorage.setItem(
            "user_id",
            data.user_id
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

// ======================================
// REGISTER
// ======================================

async function register(
    event
) {

    event.preventDefault();

    const button =
        document.querySelector(
            "#registerForm button"
        );

    const originalText =
        button.innerText;

    button.disabled = true;
    button.innerText = "Creating Account...";

    const emp_id =
        document
            .getElementById("emp_id")
            .value
            .trim();

    const name =
        document
            .getElementById("name")
            .value
            .trim();

    const email =
        document
            .getElementById("email")
            .value
            .trim();

    const password =
        document
            .getElementById("password")
            .value;

    const role =
        document
            .getElementById("role")
            .value;
            
    const dept_id_el = document.getElementById("dept_id");
    const dept_id = dept_id_el && dept_id_el.value ? parseInt(dept_id_el.value) : null;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            emp_id,
                            name,
                            email,
                            password,
                            role,
                            dept_id
                        })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            showToast(
                data.detail ||
                "Registration Failed",
                "error"
            );

            button.disabled = false;
            button.innerText = originalText;

            return;
        }

        showToast(
            "Account created successfully! Redirecting to login...",
            "success"
        );

        setTimeout(
            () => {

                window.location.href =
                    "login.html";

            },
            2000
        );

    }
    catch (error) {

        console.error(error);

        showToast(
            "Unable to connect to server",
            "error"
        );

        button.disabled = false;
        button.innerText = originalText;
    }
}

// ======================================
// LOGOUT
// ======================================

function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_id");

    showToast("Logged out successfully");

    setTimeout(
        () => {
            window.location.href = "login.html";
        },
        500
    );
}