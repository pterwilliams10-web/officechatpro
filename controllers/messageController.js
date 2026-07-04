const db = require("../config/database");

// Send Message
exports.sendMessage = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const sender_id = req.session.user.id;
    const { receiver_id, message } = req.body;

    if (!receiver_id || !message) {
        return res.json({
            success: false,
            message: "Receiver and message are required."
        });
    }

    db.prepare(`
        INSERT INTO messages
        (
            sender_id,
            receiver_id,
            message
        )
        VALUES
        (?, ?, ?)
    `).run(
        sender_id,
        receiver_id,
        message
    );

    res.json({
        success: true,
        message: "Message sent successfully."
    });

};

// Load Conversation
exports.getConversation = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const currentUser = req.session.user.id;
    const otherUser = req.params.id;

    const messages = db.prepare(`
        SELECT *
        FROM messages
        WHERE
            (sender_id=? AND receiver_id=?)
            OR
            (sender_id=? AND receiver_id=?)
        ORDER BY created_at ASC
    `).all(
        currentUser,
        otherUser,
        otherUser,
        currentUser
    );

    res.json({
        success: true,
        messages
    });

};