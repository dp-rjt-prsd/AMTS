const API_BASE_URL =
    "http://127.0.0.1:8000";

const token =
    requireAuth();

let allAssets = [];

// ======================================
// INIT
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        applyRoleRules();

        loadCurrentUser();

        loadAssets();

        loadDropdowns();

        document
            .getElementById(
                "assetForm"
            )
            .addEventListener(
                "submit",
                createAsset
            );

        document
            .getElementById(
                "searchBox"
            )
            .addEventListener(
                "keyup",
                debounce(
                    filterAssets,
                    300
                )
            );
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

            fetchData(
                "/asset-types"
            ),

            fetchData(
                "/statuses"
            ),

            fetchData(
                "/users"
            )
        ]);

        populateSelect(
            "asset_type_id",
            types,
            "asset_type_id",
            "asset_type_name"
        );

        populateSelect(
            "status_id",
            statuses,
            "status_id",
            "status_name"
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

        console.error(error);

        showToast(
            "Failed loading dropdowns",
            "error"
        );
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

                        Authorization:
                            `Bearer ${token}`
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

            showToast(
                data.detail ||
                "Asset creation failed",
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

async function fetchData(
    endpoint
) {

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    if (!response.ok) {

        throw new Error(
            "Request failed"
        );
    }

    return response.json();
}