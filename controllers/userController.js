const db = require("../config/database");
const bcrypt = require("bcrypt");

// ======================================
// Current Logged In User
// ======================================

exports.getCurrentUser = (req, res) => {

    if (!req.session.user) {

        return res.status(401).json({
            success: false
        });

    }

    res.json({

        success: true,

        user: req.session.user

    });

};

// Get all users except the logged-in user
exports.getUsers = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const users = db.prepare(`
        SELECT
            id,
            full_name,
            username,
            role
        FROM users
        WHERE id != ?
        ORDER BY full_name
    `).all(req.session.user.id);

    res.json(users);

};

// Create new user
exports.createUser = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const { full_name, username, password, role } = req.body;

    if (!full_name || !username || !password || !role) {
        return res.json({
            success: false,
            message: "Please fill all fields."
        });
    }

    // Check if username exists
    const existing = db.prepare(
        "SELECT id FROM users WHERE username=?"
    ).get(username);

    if (existing) {
        return res.json({
            success: false,
            message: "Username already exists."
        });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(`
        INSERT INTO users
        (
            full_name,
            username,
            password,
            role
        )
        VALUES
        (?, ?, ?, ?)
    `).run(
        full_name,
        username,
        hashedPassword,
        role
    );

    res.json({
        success: true,
        message: "User created successfully."
    });

};

// Get all users (Admin Panel)
exports.getAllUsers = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const users = db.prepare(`
        SELECT
            id,
            full_name,
            username,
            role
        FROM users
        ORDER BY full_name
    `).all();

    res.json(users);

};

// Update User Password
exports.updatePassword = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({
            success: false,
            message: "Username and password are required."
        });
    }

    const user = db.prepare(
        "SELECT id FROM users WHERE username = ?"
    ).get(username);

    if (!user) {
        return res.json({
            success: false,
            message: "User not found."
        });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(
        "UPDATE users SET password=? WHERE username=?"
    ).run(hashedPassword, username);

    res.json({
        success: true,
        message: "Password updated successfully."
    });

};

console.log(
    db.prepare("PRAGMA foreign_key_check").all()
);

exports.deleteUserByUsername = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const { username } = req.body;

    if (!username) {
        return res.json({
            success: false,
            message: "Username is required."
        });
    }

    if (username === req.session.user.username) {
        return res.json({
            success: false,
            message: "You cannot delete your own account."
        });
    }

    
    const result = db.prepare(
        "DELETE FROM users WHERE username=?"
    ).run(username);

    if (result.changes) {

        res.json({
            success: true,
            message: "User deleted successfully."
        });

    } else {

        res.json({
            success: false,
            message: "User not found."
        });

    }

};

// =====================================
// Update Employee
// =====================================

exports.updateUser = (req, res) => {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });

    }

    const {
        id,
        full_name,
        role
    } = req.body;

    if (!id || !full_name || !role) {

        return res.json({
            success: false,
            message: "Please fill all fields."
        });

    }

    const result = db.prepare(`
        UPDATE users
        SET
            full_name=?,
            role=?
        WHERE id=?
    `).run(
        full_name,
        role,
        id
    );

    if (result.changes) {

        res.json({
            success: true,
            message: "Employee updated successfully."
        });

    } else {

        res.json({
            success: false,
            message: "Employee not found."
        });

    }

};
// Update Employee
exports.updateUser = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const { id, full_name, role } = req.body;

    if (!id || !full_name || !role) {
        return res.json({
            success: false,
            message: "Please fill all fields."
        });
    }

    const result = db.prepare(`
        UPDATE users
        SET full_name = ?, role = ?
        WHERE id = ?
    `).run(full_name, role, id);

    if (result.changes) {

        res.json({
            success: true,
            message: "Employee updated successfully."
        });

    } else {

        res.json({
            success: false,
            message: "Employee not found."
        });

    }

};

exports.deleteUser = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const id = req.params.id;

    // Don't allow deleting yourself
    if (parseInt(id) === req.session.user.id) {
        return res.json({
            success: false,
            message: "You cannot delete your own account."
        });
    }

    // <<< REPLACE EVERYTHING FROM HERE >>>

    try {

    console.log("Deleting messages...");
    db.prepare(`
        DELETE FROM messages
        WHERE sender_id = ?
           OR receiver_id = ?
    `).run(id, id);

    console.log("Deleting group members...");
    db.prepare(`
        DELETE FROM group_members
        WHERE user_id = ?
    `).run(id);

    console.log("Deleting group messages...");
    db.prepare(`
        DELETE FROM group_messages
        WHERE sender_id = ?
    `).run(id);

    console.log("Deleting groups...");
    db.prepare(`
        DELETE FROM groups
        WHERE created_by = ?
    `).run(id);

    console.log("Deleting announcements...");
    db.prepare(`
        DELETE FROM announcements
        WHERE created_by = ?
    `).run(id);

    console.log("Deleting chat group members...");
    db.prepare(`
        DELETE FROM chat_group_members
        WHERE user_id = ?
    `).run(id);

    console.log("Deleting chat groups...");
    db.prepare(`
        DELETE FROM chat_groups
        WHERE created_by = ?
    `).run(id);

    console.log("Deleting user...");
    const result = db.prepare(`
        DELETE FROM users
        WHERE id = ?
    `).run(id);

    console.log("Finished");

    if (result.changes) {

        return res.json({
            success: true,
            message: "User deleted successfully."
        });

    }

    return res.json({
        success: false,
        message: "User not found."
    });

} catch (err) {

    console.error("FAILED HERE:");
    console.error(err);

    return res.status(500).json({
        success: false,
        message: err.message
    });

}

};