const API_BASE_URL = "http://127.0.0.1:8000";

let allUsers = [];

document.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth() || !requireAdmin()) return;
    
    loadCurrentUser();
    loadUsers();

    const userForm = document.getElementById("userForm");
    if (userForm) {
        userForm.addEventListener("submit", createUser);
    }
    
    const searchBox = document.getElementById("searchBox");
    if (searchBox) {
        searchBox.addEventListener("keyup", debounce(filterUsers, 300));
    }
});

async function loadUsers() {
    const table = document.getElementById("userTable");
    if (table) showTableLoader(table, 7);
    
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: getAuthHeader()
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error("Failed to fetch users");
        }
        
        allUsers = await response.json();
        renderUsers(allUsers);
        
    } catch (error) {
        console.error(error);
        if (table) table.innerHTML = emptyTableRow(7, "Failed to load users");
        showToast("Failed to load users", "error");
    }
}

function renderUsers(users) {
    const table = document.getElementById("userTable");
    if (!table) return;
    
    if (!users || users.length === 0) {
        table.innerHTML = emptyTableRow(7, "No users found");
        return;
    }
    
    table.innerHTML = users.map(u => `
        <tr>
            <td>${u.user_id}</td>
            <td>${u.emp_id || '-'}</td>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td><span class="badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-available'}">${u.role}</span></td>
            <td>${u.dept_id || '-'}</td>
            <td>${formatDate(u.created_at)}</td>
        </tr>
    `).join("");
}

function filterUsers() {
    const search = document.getElementById("searchBox").value.toLowerCase();
    const filtered = allUsers.filter(u => 
        (u.name && u.name.toLowerCase().includes(search)) || 
        (u.emp_id && u.emp_id.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search))
    );
    renderUsers(filtered);
}

async function createUser(e) {
    e.preventDefault();
    
    const payload = {
        emp_id: document.getElementById("emp_id").value,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        role: document.getElementById("role").value,
        dept_id: parseInt(document.getElementById("dept_id").value) || null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || "Failed to create user");
        }
        
        showToast("User created successfully", "success");
        document.getElementById("userForm").reset();
        loadUsers();
        
    } catch (error) {
        console.error(error);
        showToast(error.message, "error");
    }
}