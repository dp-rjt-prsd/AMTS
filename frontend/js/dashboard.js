/* =====================================================
   DASHBOARD - ROLE-BASED DYNAMIC RENDERING
===================================================== */

const API_BASE_URL = "http://127.0.0.1:8000";
let currentUser = null;
let currentRole = null;
let dashboardUsers = [];
let dashboardStatuses = { 1: "Available", 2: "Assigned", 3: "Repair", 4: "Retired" };
let dashboardRepairs = [];

// ======================================
// INITIALIZATION
// ======================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔍 [DEBUG] Dashboard initializing...");
    
    if (!requireAuth()) {
        console.log("🔍 [DEBUG] Auth required - no token found");
        return;
    }

    // Load user data
    loadCurrentUser();
    
    // Apply role-based visibility
    applyRoleBasedRender();
    
    // Load dashboard data
    loadDashboardData();
});

// ======================================
// ROLE-BASED RENDERING ENGINE
// ======================================

function applyRoleBasedRender() {
    const role = localStorage.getItem("role") || "EMPLOYEE";
    currentRole = role;

    console.log("🔍 [DEBUG] Applying role-based rendering for:", role);

    // Hide all role-specific sections
    document.querySelectorAll(".admin-only, .department-head-only, .employee-only")
        .forEach(el => el.classList.remove("visible"));

    // Show appropriate sections
    if (role === "ADMIN") {
        document.querySelectorAll(".admin-only").forEach(el => el.classList.add("visible"));
    } else if (role === "DEPARTMENT_HEAD") {
        document.querySelectorAll(".department-head-only").forEach(el => el.classList.add("visible"));
    } else {
        document.querySelectorAll(".employee-only").forEach(el => el.classList.add("visible"));
    }

    // Update header title (optional; only if present in the DOM)
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) {
        if (role === "ADMIN") titleEl.innerText = "Administration Dashboard";
        else if (role === "DEPARTMENT_HEAD") titleEl.innerText = "Department Dashboard";
        else titleEl.innerText = "My Dashboard";
    }
}


// ======================================
// LOAD USER DATA
// ======================================

function loadCurrentUser() {
    const userName = localStorage.getItem("user_name") || "User";
    const userId = localStorage.getItem("user_id") || "0";
    const role = localStorage.getItem("role") || "EMPLOYEE";
    
    currentUser = {
        name: userName,
        id: userId,
        role: role
    };
    
    // Update header (if elements exist)
    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.innerText = userName;
    const userAvatarEl = document.getElementById("userAvatar");
    if (userAvatarEl) userAvatarEl.innerText = userName.charAt(0).toUpperCase();
    
    const sidebarUserName = document.getElementById("sidebarUserName");
    if (sidebarUserName) sidebarUserName.innerText = userName;
    const sidebarUserRole = document.getElementById("sidebarUserRole");
    if (sidebarUserRole) sidebarUserRole.innerText = role;
    
    console.log("✓ User loaded:", userName, "Role:", role);
}

// ======================================
// LOAD DASHBOARD DATA
// ======================================

async function loadDashboardData() {
    console.log("🔍 [DEBUG] Loading dashboard data...");
    
    // Show loading
    const loading = document.getElementById("loadingState");
    if (loading) loading.style.display = "block";
    
    const fetchOpts = { headers: getAuthHeader(), cache: 'no-store' };
    try {
        // Fetch user and status mappings for charts and tables
        try {
            const uRes = await fetch(`${API_BASE_URL}/users`, fetchOpts);
            if (uRes.ok) dashboardUsers = await uRes.json();
            const sRes = await fetch(`${API_BASE_URL}/asset-statuses`, fetchOpts);
            if (sRes.ok) (await sRes.json()).forEach(s => dashboardStatuses[s.status_id] = s.status_name);
                const rRes = await fetch(`${API_BASE_URL}/repair/logs?limit=200`, fetchOpts).catch(() => null);
                if (rRes && rRes.ok) dashboardRepairs = await rRes.json();
        } catch(e) { console.warn("Failed to load mappings"); }

        const role = localStorage.getItem("role");
        
        if (role === "ADMIN") {
            await loadAdminData();
        } 
        else if (role === "DEPARTMENT_HEAD") {
            await loadDepartmentHeadData();
        } 
        else {
            await loadEmployeeData();
        }

        await loadRecentTransfers();
        
        console.log("✓ Dashboard data loaded");
    } 
    catch (error) {
        console.error("✗ Error loading dashboard data:", error);
        showToast("Error loading dashboard data", "error");
    } 
    finally {
        if (loading) loading.style.display = "none";
    }
}

// ======================================
// CHART RENDERING
// ======================================

let statusChartInstance = null;

function getStatusName(asset) {
    const isActiveRepair = dashboardRepairs.some(r => String(r.asset_id) === String(asset.asset_id) && !r.returned_at);
    if (isActiveRepair) return "repair";

    const name = asset.status_name || dashboardStatuses[asset.status_id] || "Available";
    return name.toLowerCase();
}

function renderStatusChart(assets) {
    const canvas = document.getElementById("assetStatusChart");
    if (!canvas) return;
    if (typeof Chart === "undefined") return;

    const counts = { available: 0, assigned: 0, repair: 0, retired: 0 };

    assets.forEach(a => {
        const statusName = getStatusName(a);
        if (counts[statusName] !== undefined) counts[statusName]++;
    });
    
    const displayCounts = {
        "Available": counts.available,
        "Assigned": counts.assigned,
        "Repair": counts.repair,
        "Retired": counts.retired
    };

    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: Object.keys(displayCounts),
            datasets: [{
                data: Object.values(displayCounts),
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#a8b5d1' } } } }
    });
}

// ======================================
// ADMIN DASHBOARD DATA
// ======================================

async function loadAdminData() {
    console.log("🔍 [DEBUG] Loading admin dashboard data...");
    
    const fetchOpts = { headers: getAuthHeader(), cache: 'no-store' };
    try {
        const [assetsRes, usersRes] = await Promise.all([
            fetch(`${API_BASE_URL}/assets?limit=1000`, fetchOpts),
            fetch(`${API_BASE_URL}/users`, fetchOpts)
        ]);

        const assets = assetsRes.ok ? await assetsRes.json() : [];
        const users = usersRes.ok ? await usersRes.json() : [];

        document.getElementById("totalAssets").innerText = assets.length || 0;
        document.getElementById("totalUsers").innerText = users.length || 0;

        const repairCount = assets.filter(a => getStatusName(a) === 'repair').length;
        document.getElementById("repairAssets").innerText = repairCount;

        const retiredCount = assets.filter(a => getStatusName(a) === 'retired').length;
        const retiredEl = document.getElementById("retiredAssets");
        if (retiredEl) retiredEl.innerText = retiredCount;

        renderStatusChart(assets);
        
        console.log("✓ Admin data loaded:", assets.length, "assets");
    } 
    catch (error) {
        console.error("✗ Error loading admin data:", error);
    }
}

// ======================================
// DEPARTMENT HEAD DATA
// ======================================

async function loadDepartmentHeadData() {
    console.log("🔍 [DEBUG] Loading department head data...");
    
    const fetchOpts = { headers: getAuthHeader(), cache: 'no-store' };
    try {
        const [assetsRes, usersRes] = await Promise.all([
            fetch(`${API_BASE_URL}/assets?limit=1000`, fetchOpts),
            fetch(`${API_BASE_URL}/users`, fetchOpts)
        ]);

        const assets = assetsRes.ok ? await assetsRes.json() : [];
        const users = usersRes.ok ? await usersRes.json() : [];

        // Identify current user's department
        const currentUserId = localStorage.getItem("user_id");
        const currentUserObj = users.find(u => String(u.user_id) === String(currentUserId));
        const currentDeptId = currentUserObj ? currentUserObj.dept_id : null;

        // Filter team members based on department ID
        const teamMembers = currentDeptId ? users.filter(u => String(u.dept_id) === String(currentDeptId)) : [];

        document.getElementById("dhDeptAssets").innerText = assets.length || 0;
        document.getElementById("dhAvailableAssets").innerText = assets.filter(a => getStatusName(a) === 'available').length;
        document.getElementById("dhTeamMembers").innerText = teamMembers.length || 0;
        document.getElementById("dhAssignedAssets").innerText = assets.filter(a => getStatusName(a) === 'assigned').length;

        renderStatusChart(assets);

        console.log("✓ Department head data loaded");
    } 
    catch (error) {
        console.error("✗ Error loading department head data:", error);
    }
}

// ======================================
// EMPLOYEE DATA
// ======================================

async function loadEmployeeData() {
    console.log("🔍 [DEBUG] Loading employee data...");
    
    const fetchOpts = { headers: getAuthHeader(), cache: 'no-store' };
    try {
        const userId = localStorage.getItem("user_id");
        
        const assetsRes = await fetch(`${API_BASE_URL}/assets?limit=1000`, fetchOpts);
        if (!assetsRes.ok) throw new Error("Failed to fetch assets");
        const assets = await assetsRes.json();
        
        const userAssets = assets.filter(a => String(a.current_holder_id) === String(userId));
        document.getElementById("empMyAssets").innerText = userAssets.length || 0;
        
        const myRepairs = userAssets.filter(a => getStatusName(a) === 'repair').length;
        document.getElementById("empMyRepairs").innerText = myRepairs;

        document.getElementById("empAvailableAssets").innerText = assets.filter(a => getStatusName(a) === 'available').length;
        const assignedEl = document.getElementById("empAssignedAssets");
        if (assignedEl) {
            assignedEl.innerText = assets.filter(a => getStatusName(a) === 'assigned').length;
        }
        
        renderStatusChart(assets);
        
        console.log("✓ User data loaded:", userAssets.length, "personal assets");
    } 
    catch (error) {
        console.error("✗ Error loading user data:", error);
    }
}

// ======================================
// RECENT TRANSFERS
// ======================================

async function loadRecentTransfers() {
    const fetchOpts = { headers: getAuthHeader(), cache: 'no-store' };
    try {
        const response = await fetch(`${API_BASE_URL}/transfers?limit=5`, fetchOpts);
        
        if (!response.ok) return;
        const transfers = await response.json();
        
        const tbody = document.getElementById("transferTable");
        if (tbody) {
            tbody.innerHTML = transfers.map(t => `
                <tr>
                    <td>${t.transfer_id || '-'}</td>
                    <td>${t.asset_id || '-'}</td>
                    <td>${(dashboardUsers.find(u => u.user_id === t.from_user_id) || {name: t.from_user_name || '-'}).name}</td>
                    <td>${(dashboardUsers.find(u => u.user_id === t.to_user_id) || {name: t.to_user_name || '-'}).name}</td>
                    <td>${formatDate(t.transferred_at) || '-'}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Error loading recent transfers:", error);
    }
}

// ======================================
// NAVIGATION
// ======================================

function navigateTo(page) {
    console.log("🔍 [DEBUG] Navigating to:", page);
    window.location.href = page;
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        sidebar.classList.toggle("open");
        console.log("🔍 [DEBUG] Sidebar toggled");
    }
}

function logout() {
    console.log("🔍 [DEBUG] Logout initiated");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_id");
    window.location.href = "login.html";
}


// ======================================
// TABLE ERROR
// ======================================

function showErrorRow(
    tableId,
    colspan,
    message
) {

    const table =
        document.getElementById(
            tableId
        );

    if (!table) {

        return;
    }

    table.innerHTML =
        emptyTableRow(
            colspan,
            message
        );
}