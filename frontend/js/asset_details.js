/* Asset details page */

const params = new URLSearchParams(window.location.search);
const assetId = params.get("asset_id");

document.addEventListener("DOMContentLoaded", function () {
    if (!requireAuth()) return;

    if (!assetId) {
        window.location.href = "assets.html";
        return;
    }

    loadCurrentUser();
    applyRoleRules();

    loadAsset();
    loadTransferHistory();
    loadRepairHistory();

    const retireBtn = document.getElementById("retireBtn");
    if (retireBtn) retireBtn.addEventListener("click", retireAsset);

    const printBtn = document.getElementById("printQrBtn");
    if (printBtn) printBtn.addEventListener("click", printQRForAsset);
});

async function loadAsset() {
    try {
        const asset = await apiFetch("/assets/" + escUrl(assetId));

        setText("assetId", asset.asset_id);
        setText("assetName", asset.asset_name);
        setText("currentHolder", asset.holder_name || "-");
        setText("assetType", asset.asset_type_name || "-");
        setText("serialNumber", asset.serial_number || "-");
        setText("price", formatPrice(asset.price));
        setText("remarks", asset.remarks || "-");
        setText("procurementBy", asset.procurement_by || "-");
        setText("purchaseOrderId", asset.purchase_order_id || "-");

        const statusEl = document.getElementById("assetStatus");
        if (statusEl) statusEl.innerHTML = getStatusBadge(asset.status_name);

        const qr = document.getElementById("assetQRCode");
        if (qr) {
            qr.src = safeQrSrc(asset.qr_code);
            qr.alt = "QR code for asset " + asset.asset_id;
        }
    } catch (error) {
        showToast(error.message, "error");
        if (String(error.message).toLowerCase().includes("not found")) {
            setTimeout(function () {
                window.location.href = "assets.html";
            }, 1200);
        }
    }
}

async function loadTransferHistory() {
    const table = document.getElementById("transferHistory");
    showTableLoader(table, 5);

    try {
        const transfers = await apiFetch("/assets/" + escUrl(assetId) + "/transfers");

        if (!transfers || transfers.length === 0) {
            table.innerHTML = emptyTableRow(5, "No transfer history");
            return;
        }

        table.innerHTML = transfers
            .map(function (t) {
                return (
                    "<tr>" +
                    '<td data-label="ID">' + esc(t.transfer_id) + "</td>" +
                    '<td data-label="From">' + esc(t.from_user_name) + "</td>" +
                    '<td data-label="To">' + esc(t.to_user_name) + "</td>" +
                    '<td data-label="Remarks">' + esc(t.remarks) + "</td>" +
                    '<td data-label="Date">' + esc(formatDate(t.transferred_at)) + "</td>" +
                    "</tr>"
                );
            })
            .join("");
    } catch (error) {
        table.innerHTML = emptyTableRow(5, "Unable to load transfer history");
    }
}

async function loadRepairHistory() {
    const table = document.getElementById("repairHistory");
    showTableLoader(table, 4);

    try {
        const repairs = await apiFetch("/assets/" + escUrl(assetId) + "/repairs");

        if (!repairs || repairs.length === 0) {
            table.innerHTML = emptyTableRow(4, "No repair history");
            return;
        }

        table.innerHTML = repairs
            .map(function (r) {
                return (
                    "<tr>" +
                    '<td data-label="ID">' + esc(r.repair_id) + "</td>" +
                    '<td data-label="Issue">' + esc(r.issue_description) + "</td>" +
                    '<td data-label="Sent">' + esc(formatDate(r.sent_at)) + "</td>" +
                    '<td data-label="Returned">' +
                    (r.returned_at ? esc(formatDate(r.returned_at)) : "-") +
                    "</td>" +
                    "</tr>"
                );
            })
            .join("");
    } catch (error) {
        table.innerHTML = emptyTableRow(4, "Unable to load repair history");
    }
}

function printQRForAsset() {
    printQrLabel(
        document.getElementById("assetId").textContent,
        document.getElementById("assetName").textContent,
        document.getElementById("assetQRCode").src
    );
}

async function retireAsset() {
    if (!confirm("Retire this asset? It will be unassigned and marked as retired.")) {
        return;
    }

    try {
        await apiFetch("/assets/" + escUrl(assetId) + "/retire", { method: "PUT" });
        showToast("Asset retired successfully");
        loadAsset();
    } catch (error) {
        showToast(error.message, "error");
    }
}
