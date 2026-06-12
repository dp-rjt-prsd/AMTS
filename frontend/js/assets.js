const API_BASE_URL =
    "http://127.0.0.1:8000";

let allAssets = [];
let globalStatuses = [];
let globalUsers = [];

// ======================================
// INIT
// ======================================

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuth()) return;

    applyRoleRules();
    loadCurrentUser();

    // Load mappings before loading assets
    await loadDropdowns();
    await loadAssets();

        const assetForm = document.getElementById("assetForm");
        if (assetForm) {
            assetForm.addEventListener("submit", createAsset);
        }

        const searchBox = document.getElementById("searchBox");
        if (searchBox) {
            searchBox.addEventListener("keyup", debounce(filterAssets, 300));
        }
    }
);

// ======================================
// LOAD DROPDOWNS
// ======================================

async function loadDropdowns() {

    try {

        const [
            types,
            statuses,
            users
        ] = await Promise.all([

            fetchData("/asset-types").catch(e => {
                console.error("Failed to load asset types:", e);
                return [];
            }),

            fetchData("/asset-statuses").catch(e => {
                console.error("Failed to load statuses:", e);
                return [];
            }),

            fetchData("/users").catch(e => {
                console.error("Failed to load users:", e);
                return [];
            })
        ]);

        globalStatuses = statuses;
        globalUsers = users;

        populateSelect(
            "asset_type_id",
            types,
            "asset_type_id",
            "asset_type_name",
            true
        );

        populateSelect(
            "status_id",
            statuses,
            "status_id",
            "status_name",
            true
        );

        populateSelect(
            "current_holder_id",
            users,
            "user_id",
            "name",
            true
        );

    }
    catch (error) {

        console.error("Error loading dropdowns:", error);
        showToast("Failed to load dropdown data", "error");
    }
}

function populateSelect(
    id,
    data,
    valueField,
    labelField,
    keepFirst = false
) {

    const select =
        document.getElementById(
            id
        );

    const first =
        keepFirst
            ? select.innerHTML
            : "";

    select.innerHTML =
        first;

    if (!Array.isArray(data)) return;

    data.forEach(item => {

        select.innerHTML += `

        <option
            value="${item[valueField]}"
        >

            ${item[labelField]}

        </option>

        `;
    });
}

// ======================================
// LOAD ASSETS
// ======================================

async function loadAssets() {

    const table =
        document.getElementById(
            "assetTable"
        );

    showTableLoader(
        table,
        6
    );

    try {

        allAssets =
            await fetchData(
                "/assets"
            );

        // Map IDs to actual names for the table
        allAssets = allAssets.map(asset => {
            const statusObj = globalStatuses.find(s => s.status_id === asset.status_id);
            const userObj = globalUsers.find(u => u.user_id === asset.current_holder_id);
            return {
                ...asset,
                status_name: asset.status_name || (statusObj ? statusObj.status_name : "Unknown"),
                holder_name: asset.holder_name || (userObj ? userObj.name : "-")
            };
        });

        renderAssets(
            allAssets
        );

    }
    catch (error) {

        console.error(error);

        table.innerHTML =
            emptyTableRow(
                6,
                "Unable to load assets"
            );

        showToast(
            "Unable to load assets",
            "error"
        );
    }
}

// ======================================
// RENDER ASSETS
// ======================================

function renderAssets(
    assets
) {

    const table =
        document.getElementById(
            "assetTable"
        );

    if (
        !assets ||
        assets.length === 0
    ) {

        table.innerHTML =
            emptyTableRow(
                6,
                "No assets found"
            );

        return;
    }

    table.innerHTML =
        assets.map(asset => `

        <tr>

            <td>

                <a href="asset_details.html?asset_id=${asset.asset_id}">

                    ${asset.asset_id}

                </a>

            </td>

            <td>

                ${asset.asset_name}

            </td>

            <td>

                ${getStatusBadge(
                    asset.status_name
                )}

            </td>

            <td>

                ${
                    asset.holder_name
                    ?? "-"
                }

            </td>

            <td>

                ${
                    asset.serial_number
                    ?? "-"
                }

            </td>

            <td>

                ₹${asset.price ?? 0}

            </td>

        </tr>

        `
        ).join("");
}

// ======================================
// SEARCH
// ======================================

function filterAssets() {

    const search =
        document
            .getElementById(
                "searchBox"
            )
            .value
            .toLowerCase();

    const filtered =
        allAssets.filter(asset =>

            asset.asset_id
                .toLowerCase()
                .includes(search)

            ||

            asset.asset_name
                .toLowerCase()
                .includes(search)
        );

    renderAssets(
        filtered
    );
}

// ======================================
// CREATE ASSET
// ======================================

async function createAsset(
    event
) {

    event.preventDefault();

    const payload = {

        asset_id:
            document.getElementById(
                "asset_id"
            ).value,

        asset_name:
            document.getElementById(
                "asset_name"
            ).value,

        procurement_by:
            document.getElementById(
                "procurement_by"
            ).value,

        purchase_order_id:
            document.getElementById(
                "purchase_order_id"
            ).value,

        asset_type_id:
            parseInt(
                document.getElementById(
                    "asset_type_id"
                ).value
            ),

        status_id:
            parseInt(
                document.getElementById(
                    "status_id"
                ).value
            ),

        current_holder_id:
            document.getElementById(
                "current_holder_id"
            ).value
                ? parseInt(
                    document.getElementById(
                        "current_holder_id"
                    ).value
                )
                : null,

        serial_number:
            document.getElementById(
                "serial_number"
            ).value,

        price:
            parseFloat(
                document.getElementById(
                    "price"
                ).value || 0
            ),

        remarks:
            document.getElementById(
                "remarks"
            ).value
    };

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/assets`,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...getAuthHeader()
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            let errorMsg = data.detail || "Asset creation failed";
            
            // Handle FastAPI validation error array gracefully
            if (Array.isArray(data.detail)) {
                errorMsg = data.detail.map(e => `${e.loc[e.loc.length-1]}: ${e.msg}`).join(", ");
            }

            showToast(
                errorMsg,
                "error"
            );

            return;
        }

        showToast(
            "Asset created successfully"
        );

        document
            .getElementById(
                "assetForm"
            )
            .reset();

        loadAssets();

        // Show QR Code modal
        if (data.qr_code) {
            showQRModal(data);
        } else {
            // Fetch full asset details to get the QR code if not in the initial POST response
            fetchData(`/assets/${payload.asset_id}`).then(assetDetails => {
                if (assetDetails && assetDetails.qr_code) {
                    showQRModal(assetDetails);
                }
            }).catch(e => console.error("Could not fetch QR code:", e));
        }

    }
    catch (error) {

        console.error(error);

        showToast(
            "Unable to create asset",
            "error"
        );
    }
}

// ======================================
// HELPER
// ======================================

function showQRModal(asset) {
    const modal = document.getElementById("qrModal");
    if (!modal) return;
    
    document.getElementById("qrModalImage").src = asset.qr_code;
    document.getElementById("qrModalAssetId").innerText = asset.asset_id;
    document.getElementById("qrModalAssetName").innerText = asset.asset_name;
    
    modal.classList.add("show");
}

function printCreatedQR() {
    const qrSrc = document.getElementById("qrModalImage").src;
    const assetId = document.getElementById("qrModalAssetId").innerText;
    
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
        <html>
            <head><title>Print QR - ${assetId}</title></head>
            <body style="text-align:center; padding:50px; font-family:sans-serif;">
                <h2>${assetId}</h2>
                <img src="${qrSrc}" style="width:300px; height:300px; margin-top: 20px;">
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

async function fetchData(
    endpoint
) {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                            headers: getAuthHeader(),
                            cache: "no-store"
                }
            );

        if (!response.ok) {

            if (response.status === 401) {
                logout();
                throw new Error("Session expired");
            }

            throw new Error(
                `API Error: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error("Fetch error:", error);
        throw error;
    }
}