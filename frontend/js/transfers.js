const API_BASE_URL =
    "http://127.0.0.1:8000";

let allTransfers = [];

// ======================================
// INIT
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (!requireAuth()) {
            return;
        }

        applyRoleRules();

        loadCurrentUser();

        loadUsers();

        loadTransfers();

        const transferForm = document.getElementById("transferForm");
        if (transferForm) {
            transferForm.addEventListener("submit", transferAsset);
        }

        const searchBox = document.getElementById("searchBox");
        if (searchBox) {
            searchBox.addEventListener("keyup", debounce(filterTransfers, 300));
        }
    }
);

// ======================================
// LOAD USERS
// ======================================

async function loadUsers() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/users`,
                {
                    headers: getAuthHeader()
                }
            );

        if (!response.ok) {

            if (response.status === 401) {
                logout();
                throw new Error("Session expired");
            }

            throw new Error(
                "Failed loading users"
            );
        }

        const users =
            await response.json();

        const select =
            document.getElementById(
                "to_user_id"
            );

        if (select) {

            users.forEach(user => {

                select.innerHTML += `

                <option
                    value="${user.user_id}"
                >

                    ${user.name}

                </option>

                `;
            });
        }

    }
    catch (error) {

        console.error("Error loading users:", error);

        showToast(
            "Unable to load users",
            "error"
        );
    }
}

// ======================================
// LOAD TRANSFERS
// ======================================

async function loadTransfers() {

    const table =
        document.getElementById(
            "transferTable"
        );

    showTableLoader(
        table,
        6
    );

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/transfers`,
                {
                    headers: getAuthHeader()
                }
            );

        if (!response.ok) {

            throw new Error(
                "Failed loading transfers"
            );
        }

        allTransfers =
            await response.json();

        renderTransfers(
            allTransfers
        );
    }
    catch (error) {

        console.error(error);

        table.innerHTML =
            emptyTableRow(
                6,
                "Unable to load transfers"
            );

        showToast(
            "Unable to load transfers",
            "error"
        );
    }
}

// ======================================
// RENDER
// ======================================

function renderTransfers(
    transfers
) {

    const table =
        document.getElementById(
            "transferTable"
        );

    if (
        !transfers ||
        transfers.length === 0
    ) {

        table.innerHTML =
            emptyTableRow(
                6,
                "No transfer records found"
            );

        return;
    }

    table.innerHTML =
        transfers.map(
            transfer => `

        <tr>

            <td>
                ${transfer.transfer_id}
            </td>

            <td>
                ${transfer.asset_id}
            </td>

            <td>
                ${
                    transfer.from_user_name
                    ?? "-"
                }
            </td>

            <td>
                ${
                    transfer.to_user_name
                    ?? "-"
                }
            </td>

            <td>
                ${
                    transfer.remarks
                    ?? "-"
                }
            </td>

            <td>
                ${formatDate(
                    transfer.transferred_at
                )}
            </td>

        </tr>

        `
        ).join("");
}

// ======================================
// SEARCH
// ======================================

function filterTransfers() {

    const search =
        document
            .getElementById(
                "searchBox"
            )
            .value
            .toLowerCase();

    const filtered =
        allTransfers.filter(
            transfer =>

                transfer.asset_id
                    .toLowerCase()
                    .includes(search)

                ||

                (
                    transfer.to_user_name
                    ?? ""
                )
                    .toLowerCase()
                    .includes(search)

                ||

                (
                    transfer.from_user_name
                    ?? ""
                )
                    .toLowerCase()
                    .includes(search)
        );

    renderTransfers(
        filtered
    );
}

// ======================================
// TRANSFER ASSET
// ======================================

async function transferAsset(
    event
) {

    event.preventDefault();

    const payload = {

        asset_id:
            document
                .getElementById(
                    "asset_id"
                )
                .value,

        to_user_id:
            parseInt(
                document
                    .getElementById(
                        "to_user_id"
                    )
                    .value
            ),

        remarks:
            document
                .getElementById(
                    "remarks"
                )
                .value
    };

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/transfer`,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...getAuthHeader()
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
                "Transfer failed",
                "error"
            );

            return;
        }

        showToast(
            "Asset transferred successfully"
        );

        document
            .getElementById(
                "transferForm"
            )
            .reset();

        loadTransfers();

    }
    catch (error) {

        console.error(error);

        showToast(
            "Unable to transfer asset",
            "error"
        );
    }
}