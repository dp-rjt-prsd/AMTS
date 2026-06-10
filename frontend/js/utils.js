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

    if (
        role !== "ADMIN" &&
        role !== "DEPARTMENT_HEAD"
    ) {

        document
            .querySelectorAll(
                ".head-only"
            )
            .forEach(
                item =>
                    item.remove()
            );
    }
}

// ========================================
// AUTHENTICATION GUARDS
// ========================================

/**
 * Require authentication - redirect to login if not authenticated
 */
function requireAuth() {

    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {

        window.location.href =
            "login.html";

        return false;
    }

    return true;
}

/**
 * Require Admin role - redirect to dashboard if not admin
 */
function requireAdmin() {

    const token =
        localStorage.getItem(
            "token"
        );

    const role =
        localStorage.getItem(
            "role"
        );

    if (!token) {

        window.location.href =
            "login.html";

        return false;
    }

    if (role !== "ADMIN") {

        showToast(
            "Admin access required",
            "error"
        );

        window.location.href =
            "dashboard.html";

        return false;
    }

    return true;
}

/**
 * Require Admin or Department Head - redirect if insufficient role
 */
function requireHead() {

    const token =
        localStorage.getItem(
            "token"
        );

    const role =
        localStorage.getItem(
            "role"
        );

    if (!token) {

        window.location.href =
            "login.html";

        return false;
    }

    if (
        role !== "ADMIN" &&
        role !== "DEPARTMENT_HEAD"
    ) {

        showToast(
            "Department Head or Admin access required",
            "error"
        );

        window.location.href =
            "dashboard.html";

        return false;
    }

    return true;
}

/**
 * Get authorization header with token
 */
function getAuthHeader() {

    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {

        return {};
    }

    return {
        "Authorization": `Bearer ${token}`
    };
}

/**
 * Make authenticated API call
 */
async function authenticatedFetch(
    url,
    options = {}
) {

    const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
        ...options.headers
    };

    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );

    // If 401, token expired - redirect to login
    if (response.status === 401) {

        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_id");

        showToast(
            "Session expired. Please login again.",
            "error"
        );

        window.location.href =
            "login.html";

        return null;
    }

    return response;
}

// ========================================
// LOGOUT
// ========================================

function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_id");

    showToast("Logged out successfully");

    setTimeout(() => {
        window.location.href = "login.html";
    }, 500);
}

// ========================================
// LOAD CURRENT USER
// ========================================

function loadCurrentUser() {

    const userName =
        localStorage.getItem(
            "user_name"
        );

    const userRole =
        localStorage.getItem(
            "role"
        );

    const sidebarUserName =
        document.getElementById(
            "sidebarUserName"
        );

    const sidebarUserRole =
        document.getElementById(
            "sidebarUserRole"
        );

    if (sidebarUserName && userName) {

        sidebarUserName.innerText =
            userName;
    }

    if (sidebarUserRole && userRole) {

        sidebarUserRole.innerText =
            userRole;
    }
}

// ========================================
// TABLE HELPERS
// ========================================

function showTableLoader(table, colspan) {
    if (!table) return;
    table.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding:30px;"><div class="loader"></div></td></tr>`;
}

function emptyTableRow(colspan, message) {
    return `<tr><td colspan="${colspan}" style="text-align:center; color:var(--muted); padding:30px;">${message}</td></tr>`;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}