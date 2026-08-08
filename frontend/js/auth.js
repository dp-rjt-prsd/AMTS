/* Login. Account creation is an admin action on the Users page, so there is no
   registration flow here. */

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    if (getToken() && loginForm) {
        window.location.href = "dashboard.html";
        return;
    }

    if (loginForm) loginForm.addEventListener("submit", login);
});

async function login(event) {
    event.preventDefault();

    const button = document.querySelector("#loginForm button[type='submit']");
    const original = button ? button.textContent : "";
    const errorBox = document.getElementById("loginError");

    if (button) {
        button.disabled = true;
        button.textContent = "Signing in...";
    }
    if (errorBox) errorBox.hidden = true;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const response = await fetch(API_BASE_URL + "/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await response.json().catch(function () {
            return null;
        });

        if (!response.ok) {
            const message =
                response.status === 429
                    ? "Too many sign-in attempts. Please wait a minute and try again."
                    : extractErrorMessage(data, response.status);

            showLoginError(message);
            return;
        }

        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("user_name", data.name);
        localStorage.setItem("user_id", data.user_id);

        window.location.href = "dashboard.html";
    } catch (error) {
        showLoginError("Unable to reach the server. Check your connection and try again.");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = original;
        }
    }
}

function showLoginError(message) {
    const errorBox = document.getElementById("loginError");

    if (errorBox) {
        errorBox.textContent = message;
        errorBox.hidden = false;
    } else {
        showToast(message, "error");
    }
}
