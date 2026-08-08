/* QR display page */

document.addEventListener("DOMContentLoaded", function () {
    if (!requireAuth()) return;

    loadCurrentUser();
    applyRoleRules();

    const assetId = new URLSearchParams(window.location.search).get("asset_id");

    if (!assetId) {
        showError("No asset ID was provided.");
        return;
    }

    loadAssetQR(assetId);

    const printBtn = document.getElementById("printBtn");
    if (printBtn) printBtn.addEventListener("click", printQR);
});

async function loadAssetQR(assetId) {
    try {
        const asset = await apiFetch("/assets/" + escUrl(assetId));
        displayQR(asset);
    } catch (error) {
        showError(error.message);
    }
}

function displayQR(asset) {
    toggleState({ loading: false, content: true, error: false });

    const image = document.getElementById("qrImage");
    if (image) {
        image.src = safeQrSrc(asset.qr_code);
        image.alt = "QR code for asset " + asset.asset_id;
    }

    setText("assetId", asset.asset_id);
    setText("assetName", asset.asset_name);
    setText("assetType", asset.asset_type_name || "-");
    setText("assetStatus", asset.status_name || "-");
}

function toggleState(state) {
    const map = {
        loadingState: state.loading,
        qrContent: state.content,
        errorState: state.error
    };

    Object.keys(map).forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.hidden = !map[id];
    });
}

function printQR() {
    printQrLabel(
        document.getElementById("assetId").textContent,
        document.getElementById("assetName").textContent,
        document.getElementById("qrImage").src
    );
}

function goBack() {
    window.location.href = "assets.html";
}

function showError(message) {
    toggleState({ loading: false, content: false, error: true });
    setText("errorMessage", message);
}
