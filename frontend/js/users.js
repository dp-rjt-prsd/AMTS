const API_BASE_URL =
    "http://127.0.0.1:8000";

const token =
    localStorage.getItem("token");

if (!token) {

    window.location.href =
        "login.html";
}

let allUsers = [];

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
        filterUsers
    );


// LOAD USERS

async function loadUsers() {

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

        allUsers =
            await response.json();

        renderUsers(allUsers);

    }
    catch (error) {

        console.error(error);
    }
}


// RENDER USERS

function renderUsers(users) {

    const table =
        document.getElementById(
            "userTable"
        );

    table.innerHTML = "";

    users.forEach(user => {

        table.innerHTML += `

        <tr>

            <td>${user.user_id}</td>

            <td>${user.emp_id}</td>

            <td>${user.name}</td>

            <td>${user.email}</td>

            <td>${user.role}</td>

            <td>${user.dept_id}</td>

            <td>${user.created_at}</td>

        </tr>

        `;
    });
}


// SEARCH USERS

function filterUsers() {

    const search =
        document
            .getElementById(
                "searchBox"
            )
            .value
            .toLowerCase();

    const filtered =
        allUsers.filter(user =>

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

    renderUsers(filtered);
}


// CREATE USER

async function createUser(
    event
) {

    event.preventDefault();

    const payload = {

        emp_id:
            document.getElementById(
                "emp_id"
            ).value,

        name:
            document.getElementById(
                "name"
            ).value,

        email:
            document.getElementById(
                "email"
            ).value,

        password:
            document.getElementById(
                "password"
            ).value,

        role:
            document.getElementById(
                "role"
            ).value,

        dept_id:
            parseInt(
                document.getElementById(
                    "dept_id"
                ).value
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

        if (response.ok) {

            alert(
                "User Created"
            );

            document
                .getElementById(
                    "userForm"
                )
                .reset();

            loadUsers();
        }
        else {

            alert(
                data.detail
            );
        }

    }
    catch (error) {

        console.error(error);
    }
}


// LOGOUT

function logout() {

    localStorage.removeItem(
        "token"
    );

    window.location.href =
        "login.html";
}