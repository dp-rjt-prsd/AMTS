/* Shared helpers. Load order on every page: config.js -> utils.js -> <page>.js */

/* ---------- Output escaping ---------- */

/* Escape a value before interpolating it into an HTML string.
   Use for every interpolated value, including ones that look like numbers. */
function esc(value) {
    if (value === null || value === undefined) {
        return "-";
    }

    return String(value).replace(/[&<>"'`=\/]/g, function (ch) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
            "`": "&#96;",
            "=": "&#61;",
            "/": "&#47;"
        }[ch];
    });
}

/* Escape a value for use inside a URL query parameter. */
function escUrl(value) {
    return encodeURIComponent(value === null || value === undefined ? "" : String(value));
}

const QR_DATA_URI = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

const BLANK_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/* Accept an image source only if it is a base64 PNG data URI. */
function safeQrSrc(value) {
    return typeof value === "string" && QR_DATA_URI.test(value) ? value : BLANK_PNG;
}

/* ---------- Sidebar ---------- */

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    const isOpen = sidebar.classList.toggle("open");

    const toggle = document.querySelector("[data-sidebar-toggle]");
    if (toggle) {
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
}

/* Mark the current page's nav link for both sighted and screen-reader users. */
function markActiveNavLink() {
    const here = window.location.pathname.split("/").pop() || "dashboard.html";

    document.querySelectorAll(".sidebar-nav a").forEach(function (link) {
        const target = link.getAttribute("href");
        if (target === here) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        } else {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
        }
    });
}

/* ---------- Toasts ---------- */

function showToast(message, type) {
    type = type || "success";

    let container = document.querySelector(".toast-container");

    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        container.setAttribute("role", "status");
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "false");
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(function () {
        toast.remove();
    }, 4000);
}

/* ---------- Formatting ---------- */

function getStatusBadge(statusName) {
    if (!statusName) {
        return '<span class="badge">Unknown</span>';
    }

    const known = {
        available: "badge-available",
        assigned: "badge-assigned",
        repair: "badge-repair",
        retired: "badge-retired"
    };

    const cls = known[String(statusName).toLowerCase()] || "badge-primary";

    return '<span class="badge ' + cls + '">' + esc(statusName) + "</span>";
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value === null || value === undefined ? "-" : value;
}

function formatDate(value) {
    if (!value) return "-";

    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleString();
}

/* Prices are DECIMAL(12,2) and arrive as strings, so avoid parseFloat on money. */
function formatPrice(value) {
    if (value === null || value === undefined || value === "") return "-";
    return "₹" + String(value);
}

/* ---------- Session ---------- */

function getToken() {
    return localStorage.getItem("token");
}

function getRole() {
    return localStorage.getItem("role");
}

function clearSession() {
    ["token", "role", "user_name", "user_id"].forEach(function (k) {
        localStorage.removeItem(k);
    });
}

function logout() {
    clearSession();
    showToast("Logged out successfully");
    setTimeout(function () {
        window.location.href = "login.html";
    }, 400);
}

function loadCurrentUser() {
    const name = localStorage.getItem("user_name") || "User";
    const role = getRole() || "EMPLOYEE";

    [
        ["sidebarUserName", name],
        ["sidebarUserRole", role],
        ["userName", name]
    ].forEach(function (pair) {
        const el = document.getElementById(pair[0]);
        if (el) el.textContent = pair[1];
    });

    const avatar = document.getElementById("userAvatar");
    if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
}

/* ---------- Role-based UI ---------- */

/* Hides UI a role cannot use. Presentation only; the API enforces every action. */
function applyRoleRules() {
    const role = getRole();

    if (role !== "ADMIN") {
        document.querySelectorAll(".admin-only").forEach(function (el) {
            el.remove();
        });
    }

    if (role !== "ADMIN" && role !== "DEPARTMENT_HEAD") {
        document.querySelectorAll(".head-only").forEach(function (el) {
            el.remove();
        });
    }

    markActiveNavLink();
}

/* ---------- Auth guards ---------- */

function requireAuth() {
    if (!getToken()) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!requireAuth()) return false;

    if (getRole() !== "ADMIN") {
        window.location.href = "dashboard.html";
        return false;
    }
    return true;
}

function requireHead() {
    if (!requireAuth()) return false;

    const role = getRole();
    if (role !== "ADMIN" && role !== "DEPARTMENT_HEAD") {
        window.location.href = "dashboard.html";
        return false;
    }
    return true;
}

function getAuthHeader() {
    const token = getToken();
    return token ? { Authorization: "Bearer " + token } : {};
}

/* ---------- API access ---------- */

/* Fetch wrapper that attaches auth, handles expiry centrally, and throws on
   non-2xx with the API's message. */
async function apiFetch(endpoint, options) {
    options = options || {};

    const headers = Object.assign(
        { "Content-Type": "application/json" },
        getAuthHeader(),
        options.headers || {}
    );

    const response = await fetch(API_BASE_URL + endpoint,
        Object.assign({}, options, { headers: headers, cache: "no-store" }));

    if (response.status === 401) {
        clearSession();
        showToast("Your session has expired. Please sign in again.", "error");
        setTimeout(function () {
            window.location.href = "login.html";
        }, 800);
        throw new Error("Session expired");
    }

    if (response.status === 204) {
        return null;
    }

    let body = null;
    try {
        body = await response.json();
    } catch (e) {
        body = null;
    }

    if (!response.ok) {
        throw new Error(extractErrorMessage(body, response.status));
    }

    return body;
}

/* Turn an error body into one readable sentence. FastAPI validation failures
   arrive as an array, which would otherwise render as "[object Object]". */
function extractErrorMessage(body, statusCode) {
    if (!body) {
        return "Request failed (" + statusCode + ")";
    }

    const detail = body.detail;

    if (typeof detail === "string") {
        return detail;
    }

    if (Array.isArray(detail)) {
        return detail
            .map(function (item) {
                const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "";
                return field ? field + ": " + item.msg : item.msg;
            })
            .join("; ");
    }

    return "Request failed (" + statusCode + ")";
}

/* ---------- Table helpers ---------- */

function showTableLoader(table, colspan) {
    if (!table) return;
    table.innerHTML =
        '<tr><td colspan="' + Number(colspan) + '" class="table-message">' +
        '<span class="loader" role="status" aria-label="Loading"></span></td></tr>';
}

function emptyTableRow(colspan, message) {
    return (
        '<tr><td colspan="' + Number(colspan) + '" class="table-message">' +
        esc(message) + "</td></tr>"
    );
}

function debounce(fn, wait) {
    let timeout;
    return function () {
        const args = arguments;
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            fn.apply(context, args);
        }, wait);
    };
}

/* ---------- Modal focus management ---------- */

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let lastFocusedBeforeModal = null;

/* Opens a modal with the keyboard behaviour a dialog needs: focus moves in,
   Tab is trapped, Escape closes, focus is restored on close. */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    lastFocusedBeforeModal = document.activeElement;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    const focusable = modal.querySelectorAll(FOCUSABLE);
    if (focusable.length) focusable[0].focus();

    modal.addEventListener("keydown", trapFocus);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    modal.removeEventListener("keydown", trapFocus);

    if (lastFocusedBeforeModal && lastFocusedBeforeModal.focus) {
        lastFocusedBeforeModal.focus();
    }
    lastFocusedBeforeModal = null;
}

function trapFocus(event) {
    const modal = event.currentTarget;

    if (event.key === "Escape") {
        event.preventDefault();
        closeModal(modal.id);
        return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.prototype.slice.call(modal.querySelectorAll(FOCUSABLE));
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

/* ---------- Printing ---------- */

/* Builds the print window with DOM APIs rather than document.write, so an
   asset name containing markup cannot execute in the new document. */
function printQrLabel(assetId, assetName, qrSrc) {
    const win = window.open("", "_blank", "width=600,height=600");
    if (!win) {
        showToast("Unable to open the print window. Check your popup blocker.", "error");
        return;
    }

    const doc = win.document;
    doc.title = "QR label";

    const style = doc.createElement("style");
    style.textContent =
        "body{font-family:Arial,Helvetica,sans-serif;text-align:center;padding:32px;}" +
        "h1{font-size:20px;margin:0 0 8px;}" +
        "p{font-size:14px;margin:0 0 16px;color:#333;}" +
        "img{width:280px;height:280px;border:1px solid #ddd;padding:8px;}";
    doc.head.appendChild(style);

    const heading = doc.createElement("h1");
    heading.textContent = assetName || "";

    const idLine = doc.createElement("p");
    idLine.textContent = "Asset ID: " + (assetId || "");

    const img = doc.createElement("img");
    img.src = safeQrSrc(qrSrc);
    img.alt = "QR code for asset " + (assetId || "");

    doc.body.appendChild(heading);
    doc.body.appendChild(idLine);
    doc.body.appendChild(img);

    // Wait for the image to decode, otherwise the label can print blank.
    const doPrint = function () {
        win.focus();
        win.print();
    };

    if (img.complete) {
        setTimeout(doPrint, 150);
    } else {
        img.onload = function () {
            setTimeout(doPrint, 100);
        };
        img.onerror = doPrint;
    }
}
