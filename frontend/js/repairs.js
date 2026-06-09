const API_BASE_URL =
    "http://127.0.0.1:8000";

let allRepairs = [];

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

        loadRepairLogs();

        const repairForm = document.getElementById("repairForm");
        if (repairForm) {
            repairForm.addEventListener("submit", sendForRepair);
        }

        const returnForm = document.getElementById("returnRepairForm");
        if (returnForm) {
            returnForm.addEventListener("submit", returnFromRepair);
        }

        const searchBox = document.getElementById("searchBox");
        if (searchBox) {
            searchBox.addEventListener("keyup", debounce(filterRepairs, 300));
        }
    }
);

// ======================================
// LOAD REPAIR LOGS
// ======================================

async function loadRepairLogs() {

    const table =
        document.getElementById(
            "repairTable"
        );

    showTableLoader(
        table,
        5
    );

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/repair/logs`,
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
                "Failed loading repairs"
            );
        }

        allRepairs =
            await response.json();

        renderRepairs(
            allRepairs
        );
    }
    catch (error) {

        console.error("Error loading repairs:", error);

        table.innerHTML =
            emptyTableRow(
                5,
                "Unable to load repairs"
            );

        showToast(
            "Unable to load repairs",
            "error"
        );
    }
}

// ======================================
// RENDER
// ======================================

function renderRepairs(
    repairs
) {

    const table =
        document.getElementById(
            "repairTable"
        );

    if (
        !repairs ||
        repairs.length === 0
    ) {

        table.innerHTML =
            emptyTableRow(
                5,
                "No repair records found"
            );

        return;
    }

    table.innerHTML =
        repairs.map(
            repair => `

        <tr>

            <td>
                ${repair.repair_id}
            </td>

            <td>
                ${repair.asset_id}
            </td>

            <td>
                ${repair.issue_description}
            </td>

            <td>
                ${formatDate(
                    repair.sent_at
                )}
            </td>

            <td>
                ${
                    repair.returned_at
                    ? formatDate(
                        repair.returned_at
                    )
                    : "-"
                }
            </td>

        </tr>

        `
        ).join("");
}

// ======================================
// SEARCH
// ======================================

function filterRepairs() {

    const search =
        document
            .getElementById(
                "searchBox"
            )
            .value
            .toLowerCase();

    const filtered =
        allRepairs.filter(
            repair =>

                repair.asset_id
                    .toString()
                    .toLowerCase()
                    .includes(search)

                ||

                repair.repair_id
                    .toString()
                    .toLowerCase()
                    .includes(search)
        );

    renderRepairs(
        filtered
    );
}

// ======================================
// SEND FOR REPAIR
// ======================================

async function sendForRepair(
    event
) {

    event.preventDefault();

    const assetId =
        document
            .getElementById(
                "repair_asset_id"
            )
            .value;

    const issue =
        document
            .getElementById(
                "issue_description"
            )
            .value;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/repair/${assetId}?issue_description=${encodeURIComponent(issue)}`,
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            showToast(
                data.detail ||
                "Repair request failed",
                "error"
            );

            return;
        }

        showToast(
            "Asset sent for repair"
        );

        document
            .getElementById(
                "repairForm"
            )
            .reset();

        loadRepairLogs();
    }
    catch (error) {

        console.error(error);

        showToast(
            "Unable to send asset for repair",
            "error"
        );
    }
}

// ======================================
// RETURN FROM REPAIR
// ======================================

async function returnFromRepair(
    event
) {

    event.preventDefault();

    const repairId =
        document
            .getElementById(
                "repair_id"
            )
            .value;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/repair/${repairId}/return`,
                {
                    method: "PUT",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            showToast(
                data.detail ||
                "Return failed",
                "error"
            );

            return;
        }

        showToast(
            "Asset returned successfully"
        );

        document
            .getElementById(
                "returnRepairForm"
            )
            .reset();

        loadRepairLogs();
    }
    catch (error) {

        console.error(error);

        showToast(
            "Unable to return asset",
            "error"
        );
    }
}