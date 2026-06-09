const API_BASE_URL = "http://127.0.0.1:8000";

// ======================================
// INIT
// ======================================

document.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth()) {
        return;
    }

    applyRoleRules();
    loadCurrentUser();

    // Get asset ID from URL params
    const params = new URLSearchParams(window.location.search);
    const assetId = params.get("asset_id");

    if (!assetId) {
        showError("Asset ID not provided");
        return;
    }

    loadAssetQR(assetId);
});

// ======================================
// LOAD ASSET QR
// ======================================

async function loadAssetQR(assetId) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/assets/${assetId}`,
            {
                headers: getAuthHeader(),
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error("Session expired");
            }

            if (response.status === 404) {
                showError(`Asset ${assetId} not found`);
                return;
            }

            throw new Error("Failed to load asset");
        }

        const asset = await response.json();

        displayQR(asset);
    } catch (error) {
        console.error("Error loading asset:", error);
        showError("Failed to load asset details");
    }
}

// ======================================
// DISPLAY QR
// ======================================

function displayQR(asset) {
    // Hide loading, show content
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("qrContent").style.display = "block";

    // Display QR code
    if (asset.qr_code) {
        document.getElementById("qrImage").src = asset.qr_code;
    }

    // Display asset details
    document.getElementById("assetId").innerText = asset.asset_id;
    document.getElementById("assetName").innerText = asset.asset_name;
    document.getElementById("assetType").innerText = asset.asset_type_id || "-";

    // Get status name from asset (if available) or show ID
    document.getElementById("assetStatus").innerText =
        asset.status_name || asset.status_id || "-";
}

// ======================================
// PRINT QR
// ======================================

function printQR() {
    window.print();
}

// ======================================
// NAVIGATION
// ======================================

function goBack() {
    window.location.href = "assets.html";
}

// ======================================
// ERROR HANDLING
// ======================================

function showError(message) {
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("qrContent").style.display = "none";
    document.getElementById("errorState").style.display = "block";
    document.getElementById("errorMessage").innerText = message;
}
