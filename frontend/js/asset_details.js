const API_BASE_URL =
    "http://127.0.0.1:8000";

const params =
    new URLSearchParams(
        window.location.search
    );

const assetId =
    params.get(
        "asset_id"
    );

if (!assetId) {

    window.location.href =
        "assets.html";
}

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

        loadAsset();

        loadTransferHistory();

        loadRepairHistory();
    }
);

// ======================================
// ASSET DETAILS
// ======================================

async function loadAsset() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/assets/${assetId}`,
                {
                    headers: getAuthHeader()
                }
            );

        if (!response.ok) {

            if (response.status === 401) {
                logout();
                throw new Error("Session expired");
            }

            if (response.status === 404) {
                window.location.href = "assets.html";
            }

            throw new Error(
                "Failed to load asset"
            );
        }

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

        if (asset.qr_code) {
            document.getElementById(
                "assetName"
            ).innerHTML +=
                ' <span class="qr-badge">QR Enabled</span>';
        }

        document.getElementById(
            "assetStatus"
        ).innerHTML =
            getStatusBadge(
                asset.status_name
            );

        document.getElementById(
            "currentHolder"
        ).innerText =
            asset.holder_name
            ?? "-";

        document.getElementById(
            "assetType"
        ).innerText =
            asset.asset_type_name
            ?? "-";

        document.getElementById(
            "serialNumber"
        ).innerText =
            asset.serial_number
            ?? "-";

        document.getElementById(
            "price"
        ).innerText =
            `₹${asset.price ?? 0}`;

        document.getElementById(
            "remarks"
        ).innerText =
            asset.remarks
            ?? "-";

        document.getElementById(
            "assetQRCode"
        ).src =
            asset.qr_code ??
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    }
    catch (error) {

        console.error(error);

        showToast(
            "Unable to load asset",
            "error"
        );
    }
}

// ======================================
// TRANSFER HISTORY
// ======================================

async function loadTransferHistory() {

    const table =
        document.getElementById(
            "transferHistory"
        );

    showTableLoader(
        table,
        5
    );

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/assets/${assetId}/transfers`,
                {
                    headers: getAuthHeader()
                }
            );

        if (!response.ok) {

            if (response.status === 401) {
                logout();
                throw new Error("Session expired");
            }

            throw new Error("Failed to load transfers");
        }

        const transfers =
            await response.json();

        renderTransfers(
            transfers
        );

    }
    catch (error) {

        console.error("Error loading transfers:", error);

        table.innerHTML =
            emptyTableRow(
                5,
                "Unable to load transfer history"
            );
    }
}

function renderTransfers(
    transfers
) {

    const table =
        document.getElementById(
            "transferHistory"
        );

    if (
        !transfers ||
        transfers.length === 0
    ) {

        table.innerHTML =
            emptyTableRow(
                5,
                "No transfer history found"
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
// REPAIR HISTORY
// ======================================

async function loadRepairHistory() {

    const table =
        document.getElementById(
            "repairHistory"
        );

    showTableLoader(
        table,
        4
    );

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/assets/${assetId}/repairs`,
                {
                    headers: getAuthHeader()
                }
            );

        if (!response.ok) {

            if (response.status === 401) {
                logout();
                throw new Error("Session expired");
            }

            throw new Error("Failed to load repairs");
        }

        const repairs =
            await response.json();

        renderRepairs(
            repairs
        );

    }
    catch (error) {

        console.error("Error loading repairs:", error);

        table.innerHTML =
            emptyTableRow(
                4,
                "Unable to load repair history"
            );
    }
}

function renderRepairs(
    repairs
) {

    const table =
        document.getElementById(
            "repairHistory"
        );

    if (
        !repairs ||
        repairs.length === 0
    ) {

        table.innerHTML =
            emptyTableRow(
                4,
                "No repair history found"
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
                ${
                    repair.issue_description
                }
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

// PRINT QR CODE

function printQRForAsset() {

    const assetId =
        document.getElementById(
            "assetId"
        ).innerText;

    const assetName =
        document.getElementById(
            "assetName"
        ).innerText;

    const qrImage =
        document.getElementById(
            "assetQRCode"
        ).src;

    const printWindow =
        window.open(
            "",
            "print_qr",
            "height=400,width=600"
        );

    printWindow.document.write(
        `
        <html>
            <head>
                <title>
                    Print QR Code
                </title>
                <style>
                    body {
                        text-align: center;
                        font-family: Arial;
                        padding: 20px;
                    }
                    .qr-container {
                        max-width: 400px;
                        margin: 0 auto;
                    }
                    h2 {
                        margin-top: 0;
                    }
                    img {
                        max-width: 300px;
                        margin: 20px 0;
                        border: 1px solid #ddd;
                        padding: 10px;
                    }
                    p {
                        font-size: 14px;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <h2>${assetName}</h2>
                    <p>Asset ID: ${assetId}</p>
                    <img
                        src="${qrImage}"
                        alt="QR Code"
                    />
                </div>
            </body>
        </html>
        `
    );

    printWindow.document.close();

    setTimeout(
        () => {
            printWindow.print();
        },
        250
    );
}