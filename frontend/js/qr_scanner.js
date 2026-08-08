/* QR scanner */

let videoStream = null;
let scanningActive = false;

/* A QR code is untrusted input from a sticker anyone can print, so validate the
   decoded content before putting it in a URL. Mirrors ASSET_ID_PATTERN in
   backend/app/schemas/asset_schema.py. */
const ASSET_ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,49}$/;

document.addEventListener("DOMContentLoaded", function () {
    if (!requireAuth()) return;

    loadCurrentUser();
    applyRoleRules();
    initTabs();

    const scanBtn = document.getElementById("scanBtn");
    if (scanBtn) scanBtn.addEventListener("click", startCamera);

    const uploadBtn = document.getElementById("uploadBtn");
    if (uploadBtn) uploadBtn.addEventListener("click", uploadImage);

    const manualForm = document.getElementById("manualForm");
    if (manualForm) manualForm.addEventListener("submit", submitManual);

    if (typeof jsQR === "undefined") {
        showResult("cameraResult", "error",
            "QR library failed to load. Check that vendor/jsQR.js is present.");
    }
});

/* ---------- Tabs ---------- */

function initTabs() {
    const tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    tabs.forEach(function (tab, index) {
        tab.addEventListener("click", function () {
            selectTab(tabs, index);
        });

        tab.addEventListener("keydown", function (event) {
            let next = null;

            if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
            else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = tabs.length - 1;
            else return;

            event.preventDefault();
            selectTab(tabs, next);
            tabs[next].focus();
        });
    });

    selectTab(tabs, 0);
}

function selectTab(tabs, activeIndex) {
    tabs.forEach(function (tab, i) {
        const selected = i === activeIndex;
        const panel = document.getElementById(tab.getAttribute("aria-controls"));

        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.setAttribute("tabindex", selected ? "0" : "-1");
        tab.classList.toggle("active", selected);

        if (panel) {
            panel.classList.toggle("active", selected);
            panel.hidden = !selected;
        }
    });

    if (tabs[activeIndex].getAttribute("aria-controls") !== "camera" && scanningActive) {
        stopCamera();
    }
}

/* ---------- Camera ---------- */

async function startCamera() {
    const scanBtn = document.getElementById("scanBtn");
    const video = document.getElementById("video");

    if (scanningActive) {
        stopCamera();
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showResult("cameraResult", "error",
            "This browser does not support camera access. Use image upload or manual entry.");
        return;
    }

    try {
        const cameraSelect = document.getElementById("cameraSelect");

        const constraints =
            cameraSelect && cameraSelect.value
                ? { video: { deviceId: { exact: cameraSelect.value } } }
                : { video: { facingMode: "environment" } };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);

        video.setAttribute("playsinline", "true");
        video.muted = true;
        video.srcObject = videoStream;
        video.hidden = false;

        await populateCameraList(cameraSelect);

        video.onloadedmetadata = async function () {
            try {
                await video.play();
                scanBtn.textContent = "Stop Scanning";
                scanningActive = true;
                scanQRFromVideo();
            } catch (e) {
                showResult("cameraResult", "error", "Unable to start the video preview.");
            }
        };
    } catch (error) {
        const message =
            error && error.name === "NotAllowedError"
                ? "Camera permission was denied. Allow access, or use image upload."
                : "Unable to access the camera. Use image upload or manual entry.";

        showResult("cameraResult", "error", message);
        scanBtn.textContent = "Start Camera";
    }
}

async function populateCameraList(cameraSelect) {
    if (!cameraSelect || cameraSelect.options.length > 0) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(function (d) {
        return d.kind === "videoinput";
    });

    if (cameras.length <= 1) return;

    cameraSelect.hidden = false;

    cameras.forEach(function (cam, i) {
        const option = document.createElement("option");
        option.value = cam.deviceId;
        option.textContent = cam.label || "Camera " + (i + 1);
        cameraSelect.appendChild(option);
    });

    const track = videoStream.getVideoTracks()[0];
    if (track && track.getSettings().deviceId) {
        cameraSelect.value = track.getSettings().deviceId;
    }
}

function stopCamera() {
    const video = document.getElementById("video");
    const scanBtn = document.getElementById("scanBtn");

    if (videoStream) {
        videoStream.getTracks().forEach(function (t) {
            t.stop();
        });
        videoStream = null;
    }

    if (video) {
        video.hidden = true;
        video.srcObject = null;
    }
    if (scanBtn) scanBtn.textContent = "Start Camera";

    scanningActive = false;
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
                const image = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(image.data, image.width, image.height, {
                    inversionAttempts: "dontInvert"
                });

                if (code && code.data) {
                    handleScannedQR(code.data);
                    return;
                }
            } catch (e) {
                // A single unreadable frame is normal; keep scanning.
            }
        }

        requestAnimationFrame(scan);
    }

    scan();
}

/* ---------- Image upload ---------- */

function uploadImage() {
    const fileInput = document.getElementById("imageInput");

    if (!fileInput.files.length) {
        showResult("uploadResult", "error", "Please choose an image first.");
        return;
    }

    const file = fileInput.files[0];

    if (!file.type.startsWith("image/")) {
        showResult("uploadResult", "error", "That file is not an image.");
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = function () {
        const canvas = document.getElementById("canvas");
        const context = canvas.getContext("2d");

        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);

        URL.revokeObjectURL(objectUrl);

        const data = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(data.data, data.width, data.height);

        if (code && code.data) {
            handleScannedQR(code.data, "uploadResult");
        } else {
            showResult("uploadResult", "error", "No QR code found in that image.");
        }
    };

    image.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        showResult("uploadResult", "error", "That image could not be read.");
    };

    image.src = objectUrl;
}

/* ---------- Manual entry ---------- */

function submitManual(event) {
    event.preventDefault();
    handleScannedQR(document.getElementById("manualAssetId").value, "manualResult");
}

/* ---------- Handling a scan ---------- */

function handleScannedQR(rawValue, resultBoxId) {
    resultBoxId = resultBoxId || "cameraResult";

    const assetId = String(rawValue || "").trim().toUpperCase();

    if (!ASSET_ID_PATTERN.test(assetId)) {
        showResult(
            resultBoxId,
            "error",
            "That code is not a valid asset ID. Expected 3-50 characters: " +
                "letters, digits, dashes or underscores."
        );
        return;
    }

    stopCamera();
    window.location.href = "asset_details.html?asset_id=" + encodeURIComponent(assetId);
}

function showResult(elementId, type, message) {
    const box = document.getElementById(elementId);
    if (!box) return;

    box.className = "result-box " + type + " show";

    const content = box.querySelector(".result-content");
    if (content) content.textContent = message;
}
