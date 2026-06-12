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

    // Add active to clicked button (using attribute selector to prevent global event errors)
    const activeBtn = document.querySelector(`.tab-btn[onclick*='${tabName}']`);
    if (activeBtn) activeBtn.classList.add("active");

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
        let constraints = { video: { facingMode: "user" } }; // Default to physical to prevent green virtual screen
        const cameraSelect = document.getElementById("cameraSelect");

        // Use selected camera if available
        if (cameraSelect && cameraSelect.value) {
            constraints = { video: { deviceId: { exact: cameraSelect.value } } };
        }

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);

        video.setAttribute("playsinline", "true");
        video.setAttribute("muted", "true");
        video.srcObject = videoStream;
        video.style.display = "block";

        // Populate camera selector dropdown
        if (cameraSelect && cameraSelect.options.length === 0) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === "videoinput");
            
            if (videoDevices.length > 1) {
                cameraSelect.style.display = "block";
                cameraSelect.innerHTML = videoDevices.map((cam, i) => 
                    `<option value="${cam.deviceId}">${cam.label || 'Camera ' + (i + 1)}</option>`
                ).join('');
                
                // Set dropdown to currently active camera
                const activeTrack = videoStream.getVideoTracks()[0];
                if (activeTrack) {
                    const activeId = activeTrack.getSettings().deviceId;
                    if (activeId) cameraSelect.value = activeId;
                }
            }
        }

        // Wait for the video feed metadata to load before playing
        video.onloadedmetadata = async () => {
            try {
                await video.play();
                scanBtn.innerText = "Stop Scanning";
                scanningActive = true;
                scanQRFromVideo();
            } catch (e) {
                console.error("Video play error:", e);
            }
        };
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
    video.srcObject = null;
    scanBtn.innerText = "Start Camera";
    scanningActive = false;
}

async function switchCamera() {
    if (scanningActive) {
        stopCamera();
        await startCamera();
    }
}

function scanQRFromVideo() {
    const video = document.getElementById("video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    function scan() {
        if (!scanningActive) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
                const imageData = context.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
    
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });
    
                if (code && code.data) {
                    handleScannedQR(code.data);
                    stopCamera();
                    return;
                }
            } catch (e) {
                console.error("QR Scan Error:", e);
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

        // Redirect immediately to full asset details
        window.location.href = `asset_details.html?asset_id=${assetId}`;
        
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
// HELPERS
// ======================================

function showResult(elementId, type, message) {
    const resultBox = document.getElementById(elementId);

    resultBox.className = `result-box ${type} show`;

    resultBox.querySelector(".result-content").innerHTML = message;
}
