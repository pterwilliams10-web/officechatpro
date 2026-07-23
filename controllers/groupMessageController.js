const db = require("../config/database");
const { parseMentions, enrichMessage } = require("./featuresController");
const { canPostInGroup } = require("./groupFeaturesController");

exports.sendGroupMessage = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const sender_id = req.session.user.id;
    const userRole = req.session.user.role;

    const {
        group_id,
        message,
        reply_to_id,
        file_name,
        file_path,
        file_type
    } = req.body;

    if (!group_id) {
        return res.json({
            success: false,
            message: "Group not selected."
        });
    }

    if (!canPostInGroup(group_id, sender_id, userRole)) {
        return res.status(403).json({
            success: false,
            message: "Only group admins can post in this group."
        });
    }

    if (!message && !file_path) {
        return res.json({
            success: false,
            message: "Message or file is required."
        });
    }

    const result = db.prepare(`
        INSERT INTO group_messages
        (
            group_id,
            sender_id,
            message,
            reply_to_id,
            file_name,
            file_path,
            file_type
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `).run(
        group_id,
        sender_id,
        message || null,
        reply_to_id || null,
        file_name || null,
        file_path || null,
        file_type || null
    );

    if (message) {
        parseMentions(message, sender_id, result.lastInsertRowid, "group");
    }

    res.json({
        success: true,
        message: "Message sent.",
        id: result.lastInsertRowid
    });

};

exports.getGroupMessages = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false
        });
    }

    const groupId = req.params.id;

    const rows = db.prepare(`
        SELECT
            gm.*,
            u.full_name
        FROM group_messages gm
        JOIN users u ON gm.sender_id = u.id
        WHERE gm.group_id = ?
        ORDER BY gm.is_pinned DESC, gm.created_at ASC
    `).all(groupId);

    const messages = rows.map(msg => enrichMessage(msg, "group"));

    res.json({
        success: true,
        messages
    });

};
