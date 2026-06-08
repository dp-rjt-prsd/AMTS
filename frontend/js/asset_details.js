const API_BASE_URL =
    "http://127.0.0.1:8000";

const token =
    localStorage.getItem("token");

if (!token) {

    window.location.href =
        "login.html";
}

const params =
    new URLSearchParams(
        window.location.search
    );

const assetId =
    params.get("asset_id");

if (!assetId) {

    alert("No Asset Selected");

    window.location.href =
        "assets.html";
}

loadAsset();

loadTransferHistory();

loadRepairHistory();


// ASSET INFO

async function loadAsset() {

    const response =
        await fetch(
            `${API_BASE_URL}/assets/${assetId}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    const asset =
        await response.json();

    document.getElementById(
        "assetId"
    ).innerText =
        asset.asset_id;

    document.getElementById(
        "assetName"
    ).innerText =
        asset.asset_name;

    document.getElementById(
        "assetStatus"
    ).innerText =
        asset.status_id;

    document.getElementById(
        "currentHolder"
    ).innerText =
        asset.current_holder_id ?? "-";

    document.getElementById(
        "serialNumber"
    ).innerText =
        asset.serial_number ?? "-";

    document.getElementById(
        "price"
    ).innerText =
        asset.price ?? 0;

    document.getElementById(
        "remarks"
    ).innerText =
        asset.remarks ?? "-";
}


// TRANSFERS

async function loadTransferHistory() {

    const response =
        await fetch(
            `${API_BASE_URL}/assets/${assetId}/transfers`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    const transfers =
        await response.json();

    const table =
        document.getElementById(
            "transferHistory"
        );

    table.innerHTML = "";

    transfers.forEach(
        transfer => {

            table.innerHTML += `

            <tr>

                <td>${transfer.transfer_id}</td>

                <td>${transfer.from_user_id ?? "-"}</td>

                <td>${transfer.to_user_id ?? "-"}</td>

                <td>${transfer.remarks ?? ""}</td>

                <td>${transfer.transferred_at}</td>

            </tr>

            `;
        }
    );
}


// REPAIRS

async function loadRepairHistory() {

    const response =
        await fetch(
            `${API_BASE_URL}/assets/${assetId}/repairs`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    const repairs =
        await response.json();

    const table =
        document.getElementById(
            "repairHistory"
        );

    table.innerHTML = "";

    repairs.forEach(
        repair => {

            table.innerHTML += `

            <tr>

                <td>${repair.repair_id}</td>

                <td>${repair.issue_description}</td>

                <td>${repair.sent_at}</td>

                <td>${repair.returned_at ?? "-"}</td>

            </tr>

            `;
        }
    );
}


// LOGOUT

function logout() {

    localStorage.removeItem(
        "token"
    );

    window.location.href =
        "login.html";
}