const db = require("../config/database");
const { computeExpiresAt, purgeExpiredMessages } = require("../utils/messageExpiry");
const { parseMentions, enrichMessage } = require("./featuresController");

exports.sendMessage = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const sender_id = req.session.user.id;

    const {
        receiver_id,
        message,
        reply_to_id,
        file_name,
        file_path,
        file_type
    } = req.body;

    if (!receiver_id) {
        return res.json({
            success: false,
            message: "Receiver is required."
        });
    }

    if (!message && !file_path) {
        return res.json({
            success: false,
            message: "Message or file is required."
        });
    }

    const sender = db.prepare(`
        SELECT role FROM users WHERE id = ?
    `).get(sender_id);

    const receiver = db.prepare(`
        SELECT role FROM users WHERE id = ?
    `).get(receiver_id);

    if (!receiver) {
        return res.json({
            success: false,
            message: "Receiver not found."
        });
    }

    const expires_at = computeExpiresAt(sender.role, receiver.role);

    const created_at = new Date()
        .toLocaleString("sv-SE")
        .replace(" ", " ");

    const result = db.prepare(`
        INSERT INTO messages
        (
            sender_id,
            receiver_id,
            message,
            reply_to_id,
            file_name,
            file_path,
            file_type,
            created_at,
            expires_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        sender_id,
        receiver_id,
        message || null,
        reply_to_id || null,
        file_name || null,
        file_path || null,
        file_type || null,
        created_at,
        expires_at
    );

    if (message) {
        parseMentions(message, sender_id, result.lastInsertRowid, "private");
    }

    res.json({
        success: true,
        message: "Message sent successfully.",
        id: result.lastInsertRowid
    });

};

exports.getConversation = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    purgeExpiredMessages();

    const currentUser = req.session.user.id;
    const otherUser = req.params.id;

    const rows = db.prepare(`
        SELECT *
        FROM messages
        WHERE
        (
            (sender_id = ? AND receiver_id = ?)
            OR
            (sender_id = ? AND receiver_id = ?)
        )
        ORDER BY created_at ASC
    `).all(
        currentUser,
        otherUser,
        otherUser,
        currentUser
    );

    const messages = rows.map(msg => enrichMessage(msg, "private"));

    res.json({
        success: true,
        messages
    });

};

exports.markAsRead = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false
        });
    }

    const senderId = req.params.id;
    const receiverId = req.session.user.id;

    db.prepare(`
        UPDATE messages
        SET is_read = 1
        WHERE sender_id = ?
        AND receiver_id = ?
        AND is_read = 0
    `).run(senderId, receiverId);

    res.json({
        success: true
    });

};

exports.adminConversation = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    if (req.session.user.role !== "Admin") {
        return res.status(403).json({
            success: false,
            message: "Admins only."
        });
    }

    const user1 = req.params.user1;
    const user2 = req.params.user2;

    const messages = db.prepare(`
        SELECT *
        FROM messages
        WHERE
        (
            (sender_id = ? AND receiver_id = ?)
            OR
            (sender_id = ? AND receiver_id = ?)
        )
        ORDER BY created_at ASC
    `).all(
        user1,
        user2,
        user2,
        user1
    );

    res.json({
        success: true,
        messages
    });

};

exports.adminDeleteMessage = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false
        });
    }

    if (req.session.user.role !== "Admin") {
        return res.status(403).json({
            success: false,
            message: "Admins only."
        });
    }

    const id = req.params.id;

    const result = db.prepare(`
        DELETE FROM messages WHERE id = ?
    `).run(id);

    res.json({
        success: result.changes > 0
    });

};

exports.adminDeleteConversation = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false
        });
    }

    if (req.session.user.role !== "Admin") {
        return res.status(403).json({
            success: false,
            message: "Admins only."
        });
    }

    const user1 = req.params.user1;
    const user2 = req.params.user2;

    const result = db.prepare(`
        DELETE FROM messages
        WHERE
        (sender_id = ? AND receiver_id = ?)
        OR
        (sender_id = ? AND receiver_id = ?)
    `).run(
        user1,
        user2,
        user2,
        user1
    );

    res.json({
        success: true,
        deleted: result.changes
    });

};
