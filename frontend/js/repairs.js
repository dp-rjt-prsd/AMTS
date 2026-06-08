const API_BASE_URL =
    "http://127.0.0.1:8000";

const token =
    localStorage.getItem("token");

if (!token) {

    window.location.href =
        "login.html";
}

loadRepairLogs();

document
    .getElementById(
        "repairForm"
    )
    .addEventListener(
        "submit",
        sendForRepair
    );

document
    .getElementById(
        "returnRepairForm"
    )
    .addEventListener(
        "submit",
        returnFromRepair
    );


// SEND FOR REPAIR

async function sendForRepair(
    event
) {

    event.preventDefault();

    const assetId =
        document.getElementById(
            "repair_asset_id"
        ).value;

    const issue =
        document.getElementById(
            "issue_description"
        ).value;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/repair/${assetId}?issue_description=${encodeURIComponent(issue)}`,
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (response.ok) {

            alert(
                "Asset Sent For Repair"
            );

            document
                .getElementById(
                    "repairForm"
                )
                .reset();

            loadRepairLogs();
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


// RETURN FROM REPAIR

async function returnFromRepair(
    event
) {

    event.preventDefault();

    const repairId =
        document.getElementById(
            "repair_id"
        ).value;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/repair/${repairId}/return`,
                {
                    method: "PUT",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (response.ok) {

            alert(
                "Asset Returned From Repair"
            );

            document
                .getElementById(
                    "returnRepairForm"
                )
                .reset();

            loadRepairLogs();
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


// LOAD REPAIR LOGS

async function loadRepairLogs() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/repair/logs`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const logs =
            await response.json();

        renderRepairLogs(
            logs
        );

    }
    catch (error) {

        console.error(error);
    }
}


// DISPLAY LOGS

function renderRepairLogs(
    logs
) {

    const table =
        document.getElementById(
            "repairTable"
        );

    table.innerHTML = "";

    logs.forEach(log => {

        table.innerHTML += `

        <tr>

            <td>
                ${log.repair_id}
            </td>

            <td>
                ${log.asset_id}
            </td>

            <td>
                ${log.issue_description}
            </td>

            <td>
                ${log.sent_at}
            </td>

            <td>
                ${log.returned_at ?? "-"}
            </td>

        </tr>

        `;
    });
}


// LOGOUT

function logout() {

    localStorage.removeItem(
        "token"
    );

    window.location.href =
        "login.html";
}

