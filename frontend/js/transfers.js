/* Transfers page */

let allTransfers = [];

document.addEventListener("DOMContentLoaded", function () {
    if (!requireAuth()) return;

    loadCurrentUser();
    applyRoleRules();

    loadRecipients();
    loadTransfers();

    const transferForm = document.getElementById("transferForm");
    if (transferForm) transferForm.addEventListener("submit", transferAsset);

    const searchBox = document.getElementById("searchBox");
    if (searchBox) searchBox.addEventListener("input", debounce(filterTransfers, 300));
});

async function loadRecipients() {
    const select = document.getElementById("to_user_id");
    if (!select) return;

    try {
        const users = await apiFetch("/users");

        users.forEach(function (user) {
            const option = document.createElement("option");
            option.value = user.user_id;
            option.textContent = user.name + " (" + user.emp_id + ")";
            select.appendChild(option);
        });
    } catch (error) {
        // Employees cannot list users and have no transfer form, so this is fine.
    }
}

async function loadTransfers() {
    const table = document.getElementById("transferTable");
    showTableLoader(table, 6);

    try {
        allTransfers = await apiFetch("/transfers?limit=200");
        renderTransfers(allTransfers);
    } catch (error) {
        if (table) table.innerHTML = emptyTableRow(6, "Unable to load transfers");
        showToast(error.message, "error");
    }
}

function renderTransfers(transfers) {
    const table = document.getElementById("transferTable");
    if (!table) return;

    if (!transfers || transfers.length === 0) {
        table.innerHTML = emptyTableRow(6, "No transfer records found");
        return;
    }

    table.innerHTML = transfers
        .map(function (t) {
            return (
                "<tr>" +
                '<td data-label="ID">' + esc(t.transfer_id) + "</td>" +
                '<td data-label="Asset">' +
                '<a href="asset_details.html?asset_id=' + escUrl(t.asset_id) + '">' +
                esc(t.asset_id) +
                "</a></td>" +
                '<td data-label="From">' + esc(t.from_user_name) + "</td>" +
                '<td data-label="To">' + esc(t.to_user_name) + "</td>" +
                '<td data-label="Remarks">' + esc(t.remarks) + "</td>" +
                '<td data-label="Date">' + esc(formatDate(t.transferred_at)) + "</td>" +
                "</tr>"
            );
        })
        .join("");
}

function filterTransfers() {
    const search = document.getElementById("searchBox").value.toLowerCase();

    renderTransfers(
        allTransfers.filter(function (t) {
            return (
                (t.asset_id && t.asset_id.toLowerCase().includes(search)) ||
                (t.to_user_name && t.to_user_name.toLowerCase().includes(search)) ||
                (t.from_user_name && t.from_user_name.toLowerCase().includes(search))
            );
        })
    );
}

async function transferAsset(event) {
    event.preventDefault();

    const button = event.target.querySelector('button[type="submit"]');
    const original = button ? button.textContent : "";
    if (button) {
        button.disabled = true;
        button.textContent = "Transferring...";
    }

    const payload = {
        asset_id: document.getElementById("asset_id").value.trim(),
        to_user_id: parseInt(document.getElementById("to_user_id").value, 10),
        remarks: document.getElementById("remarks").value.trim() || null
    };

    try {
        await apiFetch("/transfer", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        showToast("Asset transferred successfully");
        document.getElementById("transferForm").reset();
        loadTransfers();
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = original;
        }
    }
}
