const API_BASE_URL =
    "http://127.0.0.1:8000";

const token =
    requireAuth();

let allUsers = [];

// ======================================
// INIT
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        applyRoleRules();

        loadCurrentUser();

        loadUsers();

        document
            .getElementById(
                "userForm"
            )
            .addEventListener(
                "submit",
                createUser
            );

        document
            .getElementById(
                "searchBox"
            )
            .addEventListener(
                "keyup",
                debounce(
                    filterUsers,
                    300
                )
            );
    }
);

// ======================================
// LOAD USERS
// ======================================

async function loadUsers() {

    const table =
        document.getElementById(
            "userTable"
        );

    showTableLoader(
        table,
        7
    );

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/users`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if (!response.ok) {

            throw new Error(
                "Failed to load users"
            );
        }

        allUsers =
            await response.json();

        renderUsers(
            allUsers
        );
    }
    catch (error) {

        console.error(error);

        table.innerHTML =
            emptyTableRow(
                7,
                "Unable to load users"
            );

        showToast(
            "Unable to load users",
            "error"
        );
    }
}

// ======================================
// RENDER USERS
// ======================================

function renderUsers(
    users
) {

    const table =
        document.getElementById(
            "userTable"
        );

    if (
        !users ||
        users.length === 0
    ) {

        table.innerHTML =
            emptyTableRow(
                7,
                "No users found"
            );

        return;
    }

    table.innerHTML =
        users.map(
            user => `

        <tr>

            <td>
                ${user.user_id}
            </td>

            <td>
                ${user.emp_id}
            </td>

            <td>
                ${user.name}
            </td>

            <td>
                ${user.email}
            </td>

            <td>

                <span class="badge badge-primary">

                    ${user.role}

                </span>

            </td>

            <td>
                ${user.dept_id}
            </td>

            <td>
                ${formatDate(
                    user.created_at
                )}
            </td>

        </tr>

        `
        ).join("");
}

// ======================================
// SEARCH
// ======================================

function filterUsers() {

    const search =
        document
            .getElementById(
                "searchBox"
            )
            .value
            .toLowerCase();

    const filtered =
        allUsers.filter(
            user =>

                user.name
                    .toLowerCase()
                    .includes(search)

                ||

                user.email
                    .toLowerCase()
                    .includes(search)

                ||

                user.emp_id
                    .toLowerCase()
                    .includes(search)
        );

    renderUsers(
        filtered
    );
}

// ======================================
// CREATE USER
// ======================================

async function createUser(
    event
) {

    event.preventDefault();

    const payload = {

        emp_id:
            document
                .getElementById(
                    "emp_id"
                )
                .value,

        name:
            document
                .getElementById(
                    "name"
                )
                .value,

        email:
            document
                .getElementById(
                    "email"
                )
                .value,

        password:
            document
                .getElementById(
                    "password"
                )
                .value,

        role:
            document
                .getElementById(
                    "role"
                )
                .value,

        dept_id:
            parseInt(
                document
                    .getElementById(
                        "dept_id"
                    )
                    .value
            )
    };

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/users`,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            showToast(
                data.detail ||
                "User creation failed",
                "error"
            );

            return;
        }

        showToast(
            "User created successfully"
        );

        document
            .getElementById(
                "userForm"
            )
            .reset();

        loadUsers();
    }
    catch (error) {

        console.error(error);

        showToast(
            "Unable to create user",
            "error"
        );
    }
}

// ======================================
// ADMIN PROTECTION
// ======================================

const role =
    localStorage.getItem(
        "role"
    );

if (
    role !== "ADMIN"
) {

    showToast(
        "Access denied",
        "error"
    );

    setTimeout(
        () => {

            window.location.href =
                "dashboard.html";

        },
        500
    );
}