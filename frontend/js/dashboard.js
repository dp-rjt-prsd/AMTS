/* Dashboard. All figures come from GET /dashboard, which aggregates in SQL
   and scopes to what the caller may see. */

let statusChartInstance = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!requireAuth()) return;

    loadCurrentUser();
    applyRoleRules();
    applyRoleBasedRender();
    loadDashboard();
});

function applyRoleBasedRender() {
    const role = getRole() || "EMPLOYEE";

    document
        .querySelectorAll(".admin-only, .department-head-only, .employee-only")
        .forEach(function (el) {
            el.classList.remove("visible");
        });

    const selector =
        role === "ADMIN"
            ? ".admin-only"
            : role === "DEPARTMENT_HEAD"
              ? ".department-head-only"
              : ".employee-only";

    document.querySelectorAll(selector).forEach(function (el) {
        el.classList.add("visible");
    });

    const title = document.getElementById("pageTitle");
    if (title) {
        title.textContent =
            role === "ADMIN"
                ? "Administration Dashboard"
                : role === "DEPARTMENT_HEAD"
                  ? "Department Dashboard"
                  : "My Dashboard";
    }
}

async function loadDashboard() {
    const loading = document.getElementById("loadingState");
    if (loading) loading.style.display = "block";

    try {
        const summary = await apiFetch("/dashboard");

        setStat("totalAssets", summary.total_assets);
        setStat("totalUsers", summary.total_users);
        setStat("repairAssets", summary.repair_assets);
        setStat("retiredAssets", summary.retired_assets);
        setStat("availableAssets", summary.available_assets);
        setStat("assignedAssets", summary.assigned_assets);

        setStat("dhDeptAssets", summary.total_assets);
        setStat("dhAvailableAssets", summary.available_assets);
        setStat("dhAssignedAssets", summary.assigned_assets);
        setStat("dhTeamMembers", summary.team_members);

        setStat("empMyAssets", summary.my_assets);
        setStat("empMyRepairs", summary.open_repairs);
        setStat("empAvailableAssets", summary.available_assets);
        setStat("empAssignedAssets", summary.assigned_assets);

        renderStatusChart(summary);
        renderRecentTransfers(summary.recent_transfers || []);
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        if (loading) loading.style.display = "none";
    }
}

function setStat(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
        el.textContent = value;
    }
}

function renderStatusChart(summary) {
    const canvas = document.getElementById("assetStatusChart");
    if (!canvas) return;

    // Chart.js is vendored locally, so this only trips if the file is missing.
    if (typeof Chart === "undefined") {
        const fallback = document.getElementById("chartFallback");
        if (fallback) fallback.hidden = false;
        return;
    }

    const counts = {
        Available: summary.available_assets || 0,
        Assigned: summary.assigned_assets || 0,
        Repair: summary.repair_assets || 0,
        Retired: summary.retired_assets || 0
    };

    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: Object.keys(counts),
            datasets: [
                {
                    data: Object.values(counts),
                    backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"],
                    borderWidth: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom", labels: { color: "#a8b5d1" } }
            }
        }
    });
}

function renderRecentTransfers(transfers) {
    const table = document.getElementById("transferTable");
    if (!table) return;

    if (!transfers.length) {
        table.innerHTML = emptyTableRow(5, "No recent transfers");
        return;
    }

    table.innerHTML = transfers
        .map(function (t) {
            return (
                "<tr>" +
                '<td data-label="ID">' + esc(t.transfer_id) + "</td>" +
                '<td data-label="Asset">' + esc(t.asset_id) + "</td>" +
                '<td data-label="From">' + esc(t.from_user_name) + "</td>" +
                '<td data-label="To">' + esc(t.to_user_name) + "</td>" +
                '<td data-label="Date">' + esc(formatDate(t.transferred_at)) + "</td>" +
                "</tr>"
            );
        })
        .join("");
}

function navigateTo(page) {
    window.location.href = page;
}
