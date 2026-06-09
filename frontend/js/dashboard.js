const API_BASE_URL =
    "http://127.0.0.1:8000";

let dashboardChart;

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

        loadDashboard();
    }
);

// ======================================
// DASHBOARD
// ======================================

async function loadDashboard() {

    showLoadingState();

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/dashboard`,
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
                "Dashboard fetch failed"
            );
        }

        const data =
            await response.json();

        updateKPIs(data);

        renderTransfers(
            data.recent_transfers || []
        );

        renderChart(data);

    }
    catch (error) {

        console.error(error);

        showToast(
            "Failed to load dashboard",
            "error"
        );

        showErrorRow(
            "transferTable",
            5,
            "Unable to load data"
        );
    }
}

// ======================================
// KPI CARDS
// ======================================

function updateKPIs(
    data
) {

    setValue(
        "totalAssets",
        data.total_assets
    );

    setValue(
        "totalUsers",
        data.total_users
    );

    setValue(
        "availableAssets",
        data.available_assets
    );

    setValue(
        "assignedAssets",
        data.assigned_assets
    );

    setValue(
        "repairAssets",
        data.repair_assets
    );

    setValue(
        "retiredAssets",
        data.retired_assets
    );
}

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (element) {

        element.innerText =
            value ?? 0;
    }
}

// ======================================
// CHART
// ======================================

function renderChart(
    data
) {

    const canvas =
        document.getElementById(
            "assetStatusChart"
        );

    if (!canvas) {

        return;
    }

    if (
        dashboardChart
    ) {

        dashboardChart.destroy();
    }

    dashboardChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: [

                        "Available",

                        "Assigned",

                        "Repair",

                        "Retired"
                    ],

                    datasets: [

                        {

                            data: [

                                data.available_assets,

                                data.assigned_assets,

                                data.repair_assets,

                                data.retired_assets

                            ]
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: true
                }
            }
        );
}

// ======================================
// TRANSFERS
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
                5,
                "No recent transfers"
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
                ${formatDate(
                    transfer.transferred_at
                )}
            </td>

        </tr>

        `
        ).join("");
}

// ======================================
// LOADING
// ======================================

function showLoadingState() {

    [

        "totalAssets",
        "totalUsers",
        "availableAssets",
        "assignedAssets",
        "repairAssets",
        "retiredAssets"

    ].forEach(id => {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            element.innerText =
                "...";
        }
    });

    const table =
        document.getElementById(
            "transferTable"
        );

    if (table) {

        showTableLoader(
            table,
            5
        );
    }
}

// ======================================
// TABLE ERROR
// ======================================

function showErrorRow(
    tableId,
    colspan,
    message
) {

    const table =
        document.getElementById(
            tableId
        );

    if (!table) {

        return;
    }

    table.innerHTML =
        emptyTableRow(
            colspan,
            message
        );
}