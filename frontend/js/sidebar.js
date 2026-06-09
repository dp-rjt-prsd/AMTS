function applyRoleRules() {

    const role =
        localStorage.getItem(
            "role"
        );

    if (
        role !== "ADMIN"
    ) {

        document
            .querySelectorAll(
                ".admin-only"
            )
            .forEach(
                item =>
                    item.remove()
            );
    }
}