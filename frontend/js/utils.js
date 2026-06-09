// ========================================
// SIDEBAR
// ========================================

function toggleSidebar() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );

    if (sidebar) {

        sidebar.classList.toggle(
            "open"
        );
    }
}

// ========================================
// TOASTS
// ========================================

function showToast(
    message,
    type = "success"
) {

    let container =
        document.querySelector(
            ".toast-container"
        );

    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.className =
            "toast-container";

        document.body.appendChild(
            container
        );
    }

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

    container.appendChild(
        toast
    );

    setTimeout(() => {

        toast.remove();

    }, 3000);
}

// ========================================
// STATUS BADGES
// ========================================

function getStatusBadge(
    status
) {

    if (!status) {

        return `
        <span class="badge">
            Unknown
        </span>
        `;
    }

    const value =
        status.toLowerCase();

    let cls =
        "badge-primary";

    if (
        value === "available"
    ) {

        cls =
            "badge-available";
    }

    else if (
        value === "assigned"
    ) {

        cls =
            "badge-assigned";
    }

    else if (
        value === "repair"
    ) {

        cls =
            "badge-repair";
    }

    else if (
        value === "retired"
    ) {

        cls =
            "badge-retired";
    }

    return `
        <span class="badge ${cls}">
            ${status}
        </span>
    `;
}

// ========================================
// DATE FORMATTER
// ========================================

function formatDate(
    date
) {

    if (!date) {

        return "-";
    }

    try {

        return new Date(
            date
        ).toLocaleString();

    }
    catch {

        return date;
    }
}

// ========================================
// ROLE MANAGEMENT
// ========================================

function applyRoleRules() {

    const role =
        localStorage.getItem(
            "role"
        );

    if (
        role !== "ADMIN"
    ) {

        document
            .querySelectorAll(
                ".admin-only"
            )
            .forEach(
                item =>
                    item.remove()
            );
    }
}

// ========================================
// AUTH CHECK
// ========================================

function requireAuth() {

    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {

        window.location.href =
            "login.html";
    }

    return token;
}

// ========================================
// LOGOUT
// ========================================

function logout() {

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "role"
    );

    window.location.href =
        "login.html";
}