/* Assets page */

let allAssets = [];

document.addEventListener("DOMContentLoaded", async function () {
    if (!requireAuth()) return;

    loadCurrentUser();
    applyRoleRules();

    await loadDropdowns();
    await loadAssets();

    const assetForm = document.getElementById("assetForm");
    if (assetForm) assetForm.addEventListener("submit", createAsset);

    const searchBox = document.getElementById("searchBox");
    if (searchBox) searchBox.addEventListener("input", debounce(filterAssets, 300));
});

async function loadDropdowns() {
    // Employees get a 403 from /users, which is expected rather than an error.
    const [types, statuses, users] = await Promise.all([
        apiFetch("/asset-types").catch(function () { return []; }),
        apiFetch("/asset-statuses").catch(function () { return []; }),
        apiFetch("/users").catch(function () { return []; })
    ]);

    populateSelect("asset_type_id", types, "asset_type_id", "asset_type_name");
    populateSelect("status_id", statuses, "status_id", "status_name");
    populateSelect("current_holder_id", users, "user_id", "name");
}

/* Builds options with the DOM, so a label containing quotes or markup cannot
   break out of the attribute. Preserves the existing placeholder option. */
function populateSelect(id, items, valueField, labelField) {
    const select = document.getElementById(id);
    if (!select || !Array.isArray(items)) return;

    while (select.options.length > 1) {
        select.remove(1);
    }

    items.forEach(function (item) {
        const option = document.createElement("option");
        option.value = item[valueField];
        option.textContent = item[labelField];
        select.appendChild(option);
    });
}

async function loadAssets() {
    const table = document.getElementById("assetTable");
    showTableLoader(table, 6);

    try {
        allAssets = await apiFetch("/assets?limit=500");
        renderAssets(allAssets);
    } catch (error) {
        if (table) table.innerHTML = emptyTableRow(6, "Unable to load assets");
        showToast(error.message, "error");
    }
}

function renderAssets(assets) {
    const table = document.getElementById("assetTable");
    if (!table) return;

    if (!assets || assets.length === 0) {
        table.innerHTML = emptyTableRow(6, "No assets found");
        return;
    }

    table.innerHTML = assets
        .map(function (a) {
            return (
                "<tr>" +
                '<td data-label="Asset ID">' +
                '<a href="asset_details.html?asset_id=' + escUrl(a.asset_id) + '">' +
                esc(a.asset_id) +
                "</a></td>" +
                '<td data-label="Name">' + esc(a.asset_name) + "</td>" +
                '<td data-label="Status">' + getStatusBadge(a.status_name) + "</td>" +
                '<td data-label="Holder">' + esc(a.holder_name) + "</td>" +
                '<td data-label="Serial">' + esc(a.serial_number) + "</td>" +
                '<td data-label="Price">' + esc(formatPrice(a.price)) + "</td>" +
                "</tr>"
            );
        })
        .join("");
}

function filterAssets() {
    const search = document.getElementById("searchBox").value.toLowerCase();

    renderAssets(
        allAssets.filter(function (a) {
            return (
                (a.asset_id && a.asset_id.toLowerCase().includes(search)) ||
                (a.asset_name && a.asset_name.toLowerCase().includes(search)) ||
                (a.serial_number && a.serial_number.toLowerCase().includes(search))
            );
        })
    );
}

async function createAsset(event) {
    event.preventDefault();

    const button = event.target.querySelector('button[type="submit"]');
    const original = button ? button.textContent : "";
    if (button) {
        button.disabled = true;
        button.textContent = "Creating...";
    }

    const holderValue = document.getElementById("current_holder_id").value;
    const priceValue = document.getElementById("price").value;

    const payload = {
        asset_id: document.getElementById("asset_id").value.trim(),
        asset_name: document.getElementById("asset_name").value.trim(),
        procurement_by: document.getElementById("procurement_by").value.trim(),
        purchase_order_id: document.getElementById("purchase_order_id").value.trim(),
        asset_type_id: parseInt(document.getElementById("asset_type_id").value, 10),
        status_id: parseInt(document.getElementById("status_id").value, 10),
        current_holder_id: holderValue ? parseInt(holderValue, 10) : null,
        serial_number: document.getElementById("serial_number").value.trim(),
        // Sent as a string so DECIMAL(12,2) is not round-tripped through a float.
        price: priceValue ? String(priceValue).trim() : null,
        remarks: document.getElementById("remarks").value.trim()
    };

    try {
        const asset = await apiFetch("/assets", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        showToast("Asset created successfully");
        document.getElementById("assetForm").reset();
        await loadAssets();

        showQRModal(asset);
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = original;
        }
    }
}

function showQRModal(asset) {
    const modal = document.getElementById("qrModal");
    if (!modal || !asset) return;

    document.getElementById("qrModalImage").src = safeQrSrc(asset.qr_code);
    document.getElementById("qrModalImage").alt = "QR code for asset " + asset.asset_id;
    document.getElementById("qrModalAssetId").textContent = asset.asset_id;
    document.getElementById("qrModalAssetName").textContent = asset.asset_name;

    openModal("qrModal");
}

function closeQRModal() {
    closeModal("qrModal");
}

function printCreatedQR() {
    printQrLabel(
        document.getElementById("qrModalAssetId").textContent,
        document.getElementById("qrModalAssetName").textContent,
        document.getElementById("qrModalImage").src
    );
}
