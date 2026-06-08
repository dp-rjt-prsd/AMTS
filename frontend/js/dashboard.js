const API_BASE_URL = "http://127.0.0.1:8000";

const token = localStorage.getItem("token");

if (!token) {

    window.location.href = "login.html";
}

loadDashboard();

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/dashboard`,
            {
                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );

        const data =
            await response.json();

        document.getElementById(
            "totalAssets"
        ).innerText =
            data.total_assets;

        document.getElementById(
            "totalUsers"
        ).innerText =
            data.total_users;

        document.getElementById(
            "availableAssets"
        ).innerText =
            data.available_assets;

        document.getElementById(
            "assignedAssets"
        ).innerText =
            data.assigned_assets;

        document.getElementById(
            "repairAssets"
        ).innerText =
            data.repair_assets;

        document.getElementById(
            "retiredAssets"
        ).innerText =
            data.retired_assets;

        loadTransfers(
            data.recent_transfers
        );
    }
    catch (error) {

        console.error(error);
    }
}

function loadTransfers(transfers) {

    const table =
        document.getElementById(
            "transferTable"
        );

    table.innerHTML = "";

    transfers.forEach(transfer => {

        table.innerHTML += `

        <tr>
            <td>${transfer.transfer_id}</td>
            <td>${transfer.asset_id}</td>
            <td>${transfer.from_user_id ?? "-"}</td>
            <td>${transfer.to_user_id ?? "-"}</td>
            <td>${transfer.transferred_at}</td>
        </tr>

        `;
    });
}

function logout() {

    localStorage.removeItem(
        "token"
    );

    window.location.href =
        "login.html";
}