const db = require("../config/database");
const { logAudit } = require("../utils/audit");
const path = require("path");
const fs = require("fs");

exports.updateProfile = (req, res) => {
    const userId = req.session.user.id;
    const { status_message, department } = req.body;

    db.prepare(`
        UPDATE users
        SET status_message = ?, department = ?
        WHERE id = ?
    `).run(
        status_message || "",
        department || "",
        userId
    );

    req.session.user.status_message = status_message || "";
    req.session.user.department = department || "";

    logAudit(userId, "profile_update", { status_message, department }, req.ip);

    res.json({ success: true, message: "Profile updated." });
};

exports.uploadAvatar = (req, res) => {
    if (!req.file) {
        return res.json({ success: false, message: "No file uploaded." });
    }

    const userId = req.session.user.id;
    const avatarPath = "/uploads/avatars/" + req.file.filename;

    const old = db.prepare("SELECT avatar_path FROM users WHERE id = ?").get(userId);

    if (old && old.avatar_path) {
        const oldPath = path.join(__dirname, "..", "public", old.avatar_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    db.prepare(`
        UPDATE users SET avatar_path = ? WHERE id = ?
    `).run(avatarPath, userId);

    req.session.user.avatar_path = avatarPath;

    logAudit(userId, "avatar_upload", { avatarPath }, req.ip);

    res.json({ success: true, avatar_path: avatarPath });
};

exports.getProfile = (req, res) => {
    const userId = req.params.id || req.session.user.id;

    const user = db.prepare(`
        SELECT id, full_name, username, role, avatar_path, status_message, department
        FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
        return res.json({ success: false, message: "User not found." });
    }

    res.json({ success: true, user });
};

exports.updateDepartment = (req, res) => {
    if (req.session.user.role !== "Admin") {
        return res.status(403).json({ success: false, message: "Admins only." });
    }

    const { user_id, department } = req.body;

    db.prepare(`
        UPDATE users SET department = ? WHERE id = ?
    `).run(department || "", user_id);

    logAudit(req.session.user.id, "department_update", { user_id, department }, req.ip);

    res.json({ success: true });
};

exports.getDepartments = (req, res) => {
    const departments = db.prepare(`
        SELECT DISTINCT department
        FROM users
        WHERE department IS NOT NULL AND department != ''
        ORDER BY department
    `).all();

    res.json({
        success: true,
        departments: departments.map(d => d.department)
    });
};
