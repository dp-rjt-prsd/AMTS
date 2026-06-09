const API_BASE_URL = "http://127.0.0.1:8000";

let currentScannedAsset = null;
let videoStream = null;
let scanningActive = false;

// ======================================
// INIT
// ======================================

document.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth()) {
        return;
    }

    applyRoleRules();
    loadCurrentUser();
});

// ======================================
// TAB SWITCHING
// ======================================

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active");
    });

    // Remove active from all buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    // Show selected tab
    document.getElementById(tabName).classList.add("active");

    // Add active to clicked button
    event.target.classList.add("active");

    // Stop scanning if switching away from camera
    if (tabName !== "camera" && scanningActive) {
        stopCamera();
    }
}

// ======================================
// CAMERA SCANNING
// ======================================

async function startCamera() {
    const scanBtn = document.getElementById("scanBtn");
    const video = document.getElementById("video");

    if (scanningActive) {
        stopCamera();
        return;
    }

    try {
        // Request camera access
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
        });

        video.srcObject = videoStream;
        video.style.display = "block";

        scanBtn.innerText = "⏹️ Stop Scanning";

        scanningActive = true;

        // Start scanning loop
        scanQRFromVideo();
    } catch (error) {
        console.error("Error accessing camera:", error);

        showResult(
            "cameraResult",
            "error",
            "Unable to access camera. Please check permissions."
        );

        scanBtn.innerText = "Start Camera";
    }
}

function stopCamera() {
    const video = document.getElementById("video");
    const scanBtn = document.getElementById("scanBtn");

    if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
        videoStream = null;
    }

    video.style.display = "none";
    scanBtn.innerText = "📷 Start Camera";
    scanningActive = false;
}

function scanQRFromVideo() {
    const video = document.getElementById("video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    function scan() {
        if (!scanningActive) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );

            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                handleScannedQR(code.data);
                stopCamera();
                return;
            }
        }

        requestAnimationFrame(scan);
    }

    scan();
}

// ======================================
// FILE UPLOAD SCANNING
// ======================================

async function uploadImage() {
    const fileInput = document.getElementById("imageInput");

    if (!fileInput.files.length) {
        showResult("uploadResult", "error", "Please select an image");
        return;
    }

    const file = fileInput.files[0];

    try {
        const image = new Image();
        image.onload = () => {
            const canvas = document.getElementById("canvas");
            const context = canvas.getContext("2d");

            canvas.width = image.width;
            canvas.height = image.height;

            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

            const code = jsQR(
                imageData.data,
                imageData.width,
                imageData.height
            );

            if (code) {
                handleScannedQR(code.data);
            } else {
                showResult(
                    "uploadResult",
                    "error",
                    "No QR code found in image"
                );
            }
        };

        image.onerror = () => {
            showResult("uploadResult", "error", "Failed to load image");
        };

        image.src = URL.createObjectURL(file);
    } catch (error) {
        console.error("Error processing image:", error);
        showResult("uploadResult", "error", "Error processing image");
    }
}

// ======================================
// HANDLE SCANNED QR
// ======================================

async function handleScannedQR(qrData) {
    try {
        // QR data should be the asset ID
        const assetId = qrData.trim().toUpperCase();

        // Fetch asset details
        const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
            headers: getAuthHeader(),
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error("Session expired");
            }

            if (response.status === 404) {
                showResult(
                    "cameraResult",
                    "error",
                    `Asset ${assetId} not found`
                );
                return;
            }

            throw new Error("Failed to fetch asset");
        }

        const asset = await response.json();

        // Store for confirmation
        currentScannedAsset = asset;

        // Show confirmation modal
        showConfirmationModal(asset);
    } catch (error) {
        console.error("Error handling QR:", error);

        showResult(
            "cameraResult",
            "error",
            "Error processing QR code"
        );
    }
}

// ======================================
// CONFIRMATION MODAL
// ======================================

function showConfirmationModal(asset) {
    document.getElementById("modalAssetId").innerText = asset.asset_id;
    document.getElementById("modalAssetName").innerText = asset.asset_name;

    document.getElementById("confirmModal").classList.add("show");
}

function closeModal() {
    document.getElementById("confirmModal").classList.remove("show");
}

async function confirmCheckout() {
    if (!currentScannedAsset) return;

    try {
        const response = await fetch(`${API_BASE_URL}/scan`, {
            method: "POST",
            headers: {
                ...getAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                asset_id: currentScannedAsset.asset_id,
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error("Session expired");
            }

            throw new Error("Checkout failed");
        }

        const result = await response.json();

        closeModal();

        showToast(result.message, "success");

        // Show success result
        showResult(
            "cameraResult",
            "success",
            `<strong>✓ Checkout Successful!</strong>
            <div class="result-detail">
                <span>Asset ID:</span>
                <span>${result.asset.asset_id}</span>
            </div>
            <div class="result-detail">
                <span>Asset Name:</span>
                <span>${result.asset.asset_name}</span>
            </div>
            <div class="result-detail">
                <span>Assigned to:</span>
                <span>${result.asset.holder_name}</span>
            </div>`
        );

        // Reset for next scan
        currentScannedAsset = null;

        setTimeout(() => {
            document.getElementById("imageInput").value = "";
            // Can optionally restart camera here
        }, 2000);
    } catch (error) {
        console.error("Error during checkout:", error);

        showToast("Checkout failed: " + error.message, "error");

        closeModal();
    }
}

// ======================================
// HELPERS
// ======================================

function showResult(elementId, type, message) {
    const resultBox = document.getElementById(elementId);

    resultBox.className = `result-box ${type} show`;

    resultBox.querySelector(".result-content").innerHTML = message;
}
