const API_BASE_URL =
    "http://127.0.0.1:8000";

const token =
    localStorage.getItem("token");

if (!token) {

    window.location.href =
        "login.html";
}

loadAssets();

document
    .getElementById("assetForm")
    .addEventListener(
        "submit",
        createAsset
    );

document
    .getElementById("searchBox")
    .addEventListener(
        "keyup",
        filterAssets
    );

let allAssets = [];

async function loadAssets() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/assets`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        allAssets =
            await response.json();

        renderAssets(allAssets);

    }
    catch (error) {

        console.error(error);
    }
}

function renderAssets(assets) {

    const table =
        document.getElementById(
            "assetTable"
        );

    table.innerHTML = "";

    assets.forEach(asset => {

        table.innerHTML += `

        <tr>

            <td>

<a href="asset_details.html?asset_id=${asset.asset_id}">

${asset.asset_id}

</a>

</td>

            <td>${asset.asset_name}</td>

            <td>${asset.status_id}</td>

            <td>
                ${asset.current_holder_id ?? "-"}
            </td>

            <td>
                ${asset.serial_number ?? "-"}
            </td>

            <td>
                ₹${asset.price ?? 0}
            </td>

        </tr>

        `;
    });
}

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

    renderAssets(filtered);
}

async function createAsset(event) {

    event.preventDefault();

    const payload = {

        asset_id:
            document.getElementById(
                "asset_id"
            ).value,

        procurement_by:
            document.getElementById(
                "procurement_by"
            ).value,

        purchase_order_id:
            document.getElementById(
                "purchase_order_id"
            ).value,

        asset_name:
            document.getElementById(
                "asset_name"
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
                ).value
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

        if (response.ok) {

            alert(
                "Asset Created"
            );

            document
                .getElementById(
                    "assetForm"
                )
                .reset();

            loadAssets();
        }
        else {

            const data =
                await response.json();

            alert(data.detail);
        }

    }
    catch (error) {

        console.error(error);
    }
}

function logout() {

    localStorage.removeItem(
        "token"
    );

    window.location.href =
        "login.html";
}