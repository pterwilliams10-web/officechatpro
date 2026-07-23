const db = require("../config/database");
const { logAudit } = require("../utils/audit");

function parseMentions(text, senderId, messageId, messageType) {
    if (!text) return;

    const matches = text.match(/@(\w+)/g);
    if (!matches) return;

    const insert = db.prepare(`
        INSERT INTO mentions (user_id, message_id, mentioned_by, message_type)
        VALUES (?, ?, ?, ?)
    `);

    matches.forEach(tag => {
        const username = tag.slice(1);
        const user = db.prepare(
            "SELECT id FROM users WHERE username = ?"
        ).get(username);

        if (user && user.id !== senderId) {
            insert.run(user.id, messageId, senderId, messageType);
        }
    });
}

function getReactions(messageId, messageType) {
    return db.prepare(`
        SELECT mr.emoji, mr.user_id, u.full_name
        FROM message_reactions mr
        JOIN users u ON u.id = mr.user_id
        WHERE mr.message_id = ? AND mr.message_type = ?
        ORDER BY mr.emoji
    `).all(messageId, messageType);
}

function enrichMessage(msg, messageType) {
    msg.reactions = getReactions(msg.id, messageType);

    if (msg.reply_to_id) {
        const table = messageType === "group" ? "group_messages" : "messages";
        msg.reply_to = db.prepare(`
            SELECT id, message, sender_id, is_deleted
            FROM ${table}
            WHERE id = ?
        `).get(msg.reply_to_id);
    }

    return msg;
}

exports.addReaction = (req, res) => {
    const { message_id, emoji, message_type } = req.body;
    const userId = req.session.user.id;

    if (!message_id || !emoji) {
        return res.json({ success: false, message: "Message and emoji required." });
    }

    const type = message_type || "private";

    try {
        db.prepare(`
            INSERT INTO message_reactions (message_id, user_id, emoji, message_type)
            VALUES (?, ?, ?, ?)
        `).run(message_id, userId, emoji, type);

        logAudit(userId, "reaction_add", { message_id, emoji, type }, req.ip);

        res.json({ success: true, reactions: getReactions(message_id, type) });
    } catch (err) {
        if (err.message.includes("UNIQUE")) {
            db.prepare(`
                DELETE FROM message_reactions
                WHERE message_id = ? AND user_id = ? AND emoji = ? AND message_type = ?
            `).run(message_id, userId, emoji, type);

            return res.json({
                success: true,
                reactions: getReactions(message_id, type),
                toggled: "off"
            });
        }

        res.status(500).json({ success: false, message: err.message });
    }
};

exports.editMessage = (req, res) => {
    const { id, message, message_type } = req.body;
    const userId = req.session.user.id;
    const type = message_type || "private";

    if (!id || !message) {
        return res.json({ success: false, message: "Message required." });
    }

    const table = type === "group" ? "group_messages" : "messages";
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);

    if (!existing || existing.sender_id !== userId) {
        return res.status(403).json({ success: false, message: "Cannot edit this message." });
    }

    db.prepare(`
        UPDATE ${table}
        SET message = ?, edited_at = datetime('now')
        WHERE id = ?
    `).run(message, id);

    logAudit(userId, "message_edit", { id, type }, req.ip);

    res.json({ success: true, message: "Message updated." });
};

exports.deleteMessage = (req, res) => {
    const id = req.params.id;
    const type = req.query.type || "private";
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === "Admin";

    const table = type === "group" ? "group_messages" : "messages";
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);

    if (!existing) {
        return res.json({ success: false, message: "Message not found." });
    }

    if (existing.sender_id !== userId && !isAdmin) {
        return res.status(403).json({ success: false, message: "Cannot delete this message." });
    }

    db.prepare(`
        UPDATE ${table}
        SET is_deleted = 1, message = '[Message deleted]'
        WHERE id = ?
    `).run(id);

    logAudit(userId, "message_delete", { id, type }, req.ip);

    res.json({ success: true });
};

exports.forwardMessage = (req, res) => {
    const {
        message_id,
        message_type,
        receiver_id,
        group_id
    } = req.body;

    const userId = req.session.user.id;
    const type = message_type || "private";

    const table = type === "group" ? "group_messages" : "messages";
    const original = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(message_id);

    if (!original) {
        return res.json({ success: false, message: "Original message not found." });
    }

    const forwardText = original.message
        ? `[Forwarded] ${original.message}`
        : "[Forwarded attachment]";

    if (group_id) {
        db.prepare(`
            INSERT INTO group_messages
            (group_id, sender_id, message, file_name, file_path, file_type, forwarded_from_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            group_id,
            userId,
            forwardText,
            original.file_name,
            original.file_path,
            original.file_type,
            message_id
        );
    } else if (receiver_id) {
        const { computeExpiresAt } = require("../utils/messageExpiry");
        const sender = db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
        const receiver = db.prepare("SELECT role FROM users WHERE id = ?").get(receiver_id);
        const expires_at = computeExpiresAt(sender.role, receiver.role);

        db.prepare(`
            INSERT INTO messages
            (sender_id, receiver_id, message, file_name, file_path, file_type, forwarded_from_id, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            receiver_id,
            forwardText,
            original.file_name,
            original.file_path,
            original.file_type,
            message_id,
            expires_at
        );
    } else {
        return res.json({ success: false, message: "Select a recipient." });
    }

    logAudit(userId, "message_forward", { message_id, type }, req.ip);

    res.json({ success: true, message: "Message forwarded." });
};

exports.getReactions = (req, res) => {
    const { messageId } = req.params;
    const type = req.query.type || "private";

    res.json({
        success: true,
        reactions: getReactions(messageId, type)
    });
};

exports.getMentions = (req, res) => {
    const userId = req.session.user.id;

    const mentions = db.prepare(`
        SELECT m.*, u.full_name AS mentioned_by_name
        FROM mentions m
        JOIN users u ON u.id = m.mentioned_by
        WHERE m.user_id = ? AND m.is_read = 0
        ORDER BY m.created_at DESC
    `).all(userId);

    res.json({ success: true, mentions });
};

exports.markMentionsRead = (req, res) => {
    const userId = req.session.user.id;

    db.prepare(`
        UPDATE mentions SET is_read = 1 WHERE user_id = ?
    `).run(userId);

    res.json({ success: true });
};

exports.enrichMessage = enrichMessage;
exports.parseMentions = parseMentions;
exports.getReactionsForMessage = getReactions;
