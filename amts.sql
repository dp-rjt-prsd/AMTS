USE asset_management_system;

INSERT INTO departments (dept_name)
VALUES
('IT'),
('HR'),
('Finance'),
('Operations');

INSERT INTO asset_types (category_name)
VALUES
('Laptop'),
('Monitor'),
('Chair'),
('Printer'),
('Vehicle');

INSERT INTO users (
    emp_id,
    name,
    email,
    pw_hash,
    role,
    dept_id
)
VALUES (
    'EMP001',
    'Admin User',
    'admin@test.com',
    'hashed_password_here',
    'ADMIN',
    1
);

INSERT INTO assets (
    asset_id,
    procurement_by,
    purchase_order_id,
    asset_name,
    asset_type_id,
    status_id,
    current_holder_id,
    serial_number,
    price,
    remarks
)
VALUES (
    'AST-0001',
    'Dell Supplier',
    'PO-2025-001',
    'Dell Latitude 5440',
    1,
    1,
    1,
    'SN123456',
    78000.00,
    'New condition'
);

INSERT INTO asset_transfer_logs (
    asset_id,
    from_user_id,
    to_user_id,
    remarks
)
VALUES (
    'AST-0001',
    NULL,
    1,
    'Initial assignment'
);

INSERT INTO repair_logs (
    asset_id,
    issue_description,
    sent_at,
    returned_at
)
VALUES (
    'AST-0001',
    'Keyboard issue',
    NOW(),
    NULL
);

SHOW TABLES;

DESCRIBE assets;

SHOW CREATE TABLE assets;

SELECT * FROM departments;

SELECT * FROM users;

SELECT * FROM asset_types;

SELECT * FROM asset_statuses;

SELECT * FROM assets;

SELECT * FROM asset_transfer_logs;

SELECT * FROM repair_logs;
