/* Users page (admin only) */

let allUsers = [];
let departmentsById = {};

document.addEventListener("DOMContentLoaded", function () {
    if (!requireAdmin()) return;

    loadCurrentUser();
    applyRoleRules();
    loadDepartments();
    loadUsers();

    const userForm = document.getElementById("userForm");
    if (userForm) userForm.addEventListener("submit", createUser);

    const searchBox = document.getElementById("searchBox");
    if (searchBox) searchBox.addEventListener("input", debounce(filterUsers, 300));
});

async function loadDepartments() {
    const select = document.getElementById("dept_id");
    if (!select) return;

    try {
        const departments = await apiFetch("/departments");

        departments.forEach(function (d) {
            departmentsById[d.dept_id] = d.dept_name;

            const option = document.createElement("option");
            option.value = d.dept_id;
            option.textContent = d.dept_name;
            select.appendChild(option);
        });

        // Names are known now, so re-render to replace raw ids in the table.
        if (allUsers.length) renderUsers(allUsers);
    } catch (error) {
        showToast("Unable to load departments", "error");
    }
}

async function loadUsers() {
    const table = document.getElementById("userTable");
    showTableLoader(table, 7);

    try {
        allUsers = await apiFetch("/users");
        renderUsers(allUsers);
    } catch (error) {
        if (table) table.innerHTML = emptyTableRow(7, "Unable to load users");
        showToast(error.message, "error");
    }
}

function renderUsers(users) {
    const table = document.getElementById("userTable");
    if (!table) return;

    if (!users || users.length === 0) {
        table.innerHTML = emptyTableRow(7, "No users found");
        return;
    }

    table.innerHTML = users
        .map(function (u) {
            const roleClass = u.role === "ADMIN" ? "badge-primary" : "badge-available";
            return (
                "<tr>" +
                '<td data-label="User ID">' + esc(u.user_id) + "</td>" +
                '<td data-label="Employee ID">' + esc(u.emp_id) + "</td>" +
                '<td data-label="Name">' + esc(u.name) + "</td>" +
                '<td data-label="Email">' + esc(u.email) + "</td>" +
                '<td data-label="Role"><span class="badge ' + roleClass + '">' +
                esc(u.role) + "</span></td>" +
                '<td data-label="Department">' +
                esc(u.dept_id ? departmentsById[u.dept_id] || u.dept_id : null) + "</td>" +
                '<td data-label="Created">' + esc(formatDate(u.created_at)) + "</td>" +
                "</tr>"
            );
        })
        .join("");
}

function filterUsers() {
    const search = document.getElementById("searchBox").value.toLowerCase();

    renderUsers(
        allUsers.filter(function (u) {
            return (
                (u.name && u.name.toLowerCase().includes(search)) ||
                (u.emp_id && u.emp_id.toLowerCase().includes(search)) ||
                (u.email && u.email.toLowerCase().includes(search))
            );
        })
    );
}

async function createUser(event) {
    event.preventDefault();

    const button = event.target.querySelector('button[type="submit"]');
    const original = button ? button.textContent : "";
    if (button) {
        button.disabled = true;
        button.textContent = "Creating...";
    }

    const deptValue = document.getElementById("dept_id").value;

    const payload = {
        emp_id: document.getElementById("emp_id").value.trim(),
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value,
        dept_id: deptValue ? parseInt(deptValue, 10) : null
    };

    const roleEl = document.getElementById("role");
    if (roleEl && roleEl.value) {
        payload.role = roleEl.value;
    }

    try {
        await apiFetch("/register", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        showToast("User created successfully");
        document.getElementById("userForm").reset();
        loadUsers();
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = original;
        }
    }
}
