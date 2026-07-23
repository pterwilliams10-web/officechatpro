const db = require("../config/database");
const { logAudit } = require("../utils/audit");
const path = require("path");
const fs = require("fs");

exports.updateGroupSettings = (req, res) => {
    const groupId = req.params.id;
    const { admin_only_post } = req.body;
    const userId = req.session.user.id;

    const member = db.prepare(`
        SELECT role FROM group_members
        WHERE group_id = ? AND user_id = ?
    `).get(groupId, userId);

    if (!member || (member.role !== "Owner" && req.session.user.role !== "Admin")) {
        return res.status(403).json({ success: false, message: "Only group owners can change settings." });
    }

    db.prepare(`
        UPDATE groups SET admin_only_post = ? WHERE id = ?
    `).run(admin_only_post ? 1 : 0, groupId);

    logAudit(userId, "group_settings_update", { groupId, admin_only_post }, req.ip);

    res.json({ success: true });
};

exports.uploadGroupAvatar = (req, res) => {
    if (!req.file) {
        return res.json({ success: false, message: "No file uploaded." });
    }

    const groupId = req.params.id;
    const userId = req.session.user.id;
    const avatarPath = "/uploads/group-avatars/" + req.file.filename;

    const member = db.prepare(`
        SELECT role FROM group_members
        WHERE group_id = ? AND user_id = ?
    `).get(groupId, userId);

    if (!member || member.role !== "Owner") {
        return res.status(403).json({ success: false, message: "Only group owners can set avatar." });
    }

    const old = db.prepare("SELECT avatar_path FROM groups WHERE id = ?").get(groupId);

    if (old && old.avatar_path) {
        const oldPath = path.join(__dirname, "..", "public", old.avatar_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    db.prepare(`
        UPDATE groups SET avatar_path = ? WHERE id = ?
    `).run(avatarPath, groupId);

    logAudit(userId, "group_avatar_upload", { groupId, avatarPath }, req.ip);

    res.json({ success: true, avatar_path: avatarPath });
};

exports.pinMessage = (req, res) => {
    const { group_id, message_id } = req.body;
    const userId = req.session.user.id;

    const member = db.prepare(`
        SELECT role FROM group_members
        WHERE group_id = ? AND user_id = ?
    `).get(group_id, userId);

    if (!member || (member.role !== "Owner" && member.role !== "Admin" && req.session.user.role !== "Admin")) {
        return res.status(403).json({ success: false, message: "Cannot pin messages." });
    }

    db.prepare(`
        UPDATE group_messages SET is_pinned = 0 WHERE group_id = ?
    `).run(group_id);

    db.prepare(`
        UPDATE group_messages SET is_pinned = 1 WHERE id = ? AND group_id = ?
    `).run(message_id, group_id);

    logAudit(userId, "message_pin", { group_id, message_id }, req.ip);

    res.json({ success: true });
};

exports.unpinMessage = (req, res) => {
    const { message_id } = req.body;

    db.prepare(`
        UPDATE group_messages SET is_pinned = 0 WHERE id = ?
    `).run(message_id);

    res.json({ success: true });
};

exports.getPinnedMessages = (req, res) => {
    const groupId = req.params.id;

    const messages = db.prepare(`
        SELECT gm.*, u.full_name
        FROM group_messages gm
        JOIN users u ON u.id = gm.sender_id
        WHERE gm.group_id = ? AND gm.is_pinned = 1
        ORDER BY gm.created_at DESC
    `).all(groupId);

    res.json({ success: true, messages });
};

exports.canPostInGroup = (groupId, userId, userRole) => {
    const group = db.prepare(`
        SELECT admin_only_post FROM groups WHERE id = ?
    `).get(groupId);

    if (!group || !group.admin_only_post) return true;
    if (userRole === "Admin") return true;

    const member = db.prepare(`
        SELECT role FROM group_members
        WHERE group_id = ? AND user_id = ?
    `).get(groupId, userId);

    return member && (member.role === "Owner" || member.role === "Admin");
};
