function applyRoleRules() {
    const role = localStorage.getItem("role");

    // Users page is admin-only
    if (role !== "ADMIN") {
        document.querySelectorAll(".admin-only").forEach(item => item.remove());
    }
}


