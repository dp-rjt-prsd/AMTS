const API_BASE_URL =
    "http://127.0.0.1:8000";

const token =
    localStorage.getItem("token");

if (!token) {

    window.location.href =
        "login.html";
}

loadTransfers();

document
    .getElementById(
        "transferForm"
    )
    .addEventListener(
        "submit",
        transferAsset
    );

async function loadTransfers() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/transfers`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const transfers =
            await response.json();

        renderTransfers(
            transfers
        );

    }
    catch (error) {

        console.error(error);
    }
}

function renderTransfers(
    transfers
) {

    const table =
        document.getElementById(
            "transferTable"
        );

    table.innerHTML = "";

    transfers.forEach(
        transfer => {

            table.innerHTML += `

            <tr>

                <td>
                    ${transfer.transfer_id}
                </td>

                <td>
                    ${transfer.asset_id}
                </td>

                <td>
                    ${transfer.from_user_id ?? "-"}
                </td>

                <td>
                    ${transfer.to_user_id ?? "-"}
                </td>

                <td>
                    ${transfer.remarks ?? ""}
                </td>

                <td>
                    ${transfer.transferred_at}
                </td>

            </tr>

            `;
        }
    );
}

async function transferAsset(
    event
) {

    event.preventDefault();

    const payload = {

        asset_id:
            document.getElementById(
                "asset_id"
            ).value,

        to_user_id:
            parseInt(
                document.getElementById(
                    "to_user_id"
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
                `${API_BASE_URL}/transfer`,
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

        if (response.ok) {

            alert(
                "Transfer Successful"
            );

            document
                .getElementById(
                    "transferForm"
                )
                .reset();

            loadTransfers();
        }
        else {

            alert(
                data.detail
            );
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