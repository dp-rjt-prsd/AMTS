/* Repairs page */

let allRepairs = [];

document.addEventListener("DOMContentLoaded", function () {
    if (!requireAuth()) return;

    loadCurrentUser();
    applyRoleRules();
    loadRepairLogs();

    const repairForm = document.getElementById("repairForm");
    if (repairForm) repairForm.addEventListener("submit", sendForRepair);

    const returnForm = document.getElementById("returnRepairForm");
    if (returnForm) returnForm.addEventListener("submit", returnFromRepair);

    const searchBox = document.getElementById("searchBox");
    if (searchBox) searchBox.addEventListener("input", debounce(filterRepairs, 300));
});

async function loadRepairLogs() {
    const table = document.getElementById("repairTable");
    showTableLoader(table, 5);

    try {
        allRepairs = await apiFetch("/repair/logs?limit=200");
        renderRepairs(allRepairs);
    } catch (error) {
        if (table) table.innerHTML = emptyTableRow(5, "Unable to load repairs");
        showToast(error.message, "error");
    }
}

function renderRepairs(repairs) {
    const table = document.getElementById("repairTable");
    if (!table) return;

    if (!repairs || repairs.length === 0) {
        table.innerHTML = emptyTableRow(5, "No repair records found");
        return;
    }

    table.innerHTML = repairs
        .map(function (r) {
            return (
                "<tr>" +
                '<td data-label="ID">' + esc(r.repair_id) + "</td>" +
                '<td data-label="Asset">' +
                '<a href="asset_details.html?asset_id=' + escUrl(r.asset_id) + '">' +
                esc(r.asset_id) +
                "</a></td>" +
                '<td data-label="Issue">' + esc(r.issue_description) + "</td>" +
                '<td data-label="Sent">' + esc(formatDate(r.sent_at)) + "</td>" +
                '<td data-label="Returned">' +
                (r.returned_at ? esc(formatDate(r.returned_at)) : "-") +
                "</td>" +
                "</tr>"
            );
        })
        .join("");
}

function filterRepairs() {
    const search = document.getElementById("searchBox").value.toLowerCase();

    renderRepairs(
        allRepairs.filter(function (r) {
            return (
                String(r.asset_id).toLowerCase().includes(search) ||
                String(r.repair_id).toLowerCase().includes(search) ||
                (r.issue_description && r.issue_description.toLowerCase().includes(search))
            );
        })
    );
}

async function sendForRepair(event) {
    event.preventDefault();

    const button = event.target.querySelector('button[type="submit"]');
    const original = button ? button.textContent : "";
    if (button) {
        button.disabled = true;
        button.textContent = "Submitting...";
    }

    const assetId = document.getElementById("repair_asset_id").value.trim();
    const issue = document.getElementById("issue_description").value.trim();

    try {
        await apiFetch("/repair/" + escUrl(assetId), {
            method: "POST",
            body: JSON.stringify({ issue_description: issue })
        });

        showToast("Asset sent for repair");
        document.getElementById("repairForm").reset();
        loadRepairLogs();
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = original;
        }
    }
}

async function returnFromRepair(event) {
    event.preventDefault();

    const button = event.target.querySelector('button[type="submit"]');
    const original = button ? button.textContent : "";
    if (button) {
        button.disabled = true;
        button.textContent = "Returning...";
    }

    const repairId = document.getElementById("repair_id").value.trim();

    try {
        await apiFetch("/repair/" + escUrl(repairId) + "/return", { method: "PUT" });

        showToast("Asset returned from repair");
        document.getElementById("returnRepairForm").reset();
        loadRepairLogs();
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = original;
        }
    }
}
