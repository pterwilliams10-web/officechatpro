const db = require("../config/database");

// ====================================
// Send Group Message
// ====================================

exports.sendGroupMessage = (req, res) => {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });

    }

    const sender_id = req.session.user.id;

    const {
        group_id,
        message,
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

    db.prepare(`
        INSERT INTO group_messages
        (
            group_id,
            sender_id,
            message,
            file_name,
            file_path,
            file_type
        )
        VALUES
        (?, ?, ?, ?, ?, ?)
    `).run(
        group_id,
        sender_id,
        message || null,
        file_name || null,
        file_path || null,
        file_type || null
    );

    res.json({
        success: true,
        message: "Message sent."
    });

};


// ====================================
// Load Group Messages
// ====================================

exports.getGroupMessages = (req, res) => {

    if (!req.session.user) {

        return res.status(401).json({
            success: false
        });

    }

    const groupId = req.params.id;

    const messages = db.prepare(`

        SELECT

            gm.*,

            u.full_name

        FROM group_messages gm

        JOIN users u

        ON gm.sender_id = u.id

        WHERE gm.group_id = ?

        ORDER BY gm.created_at ASC

    `).all(groupId);

    res.json({

        success: true,

        messages

    });

};