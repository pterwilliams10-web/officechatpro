exports.getHistory = (req, res) => {

    try {

        const messages = db.prepare(`
            SELECT
                m.*,
                sender.full_name AS sender_name,
                receiver.full_name AS receiver_name
            FROM messages m

            LEFT JOIN users sender
                ON sender.id = m.sender_id

            LEFT JOIN users receiver
                ON receiver.id = m.receiver_id

            ORDER BY m.created_at DESC
        `).all();

        res.json({
            success: true,
            messages
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};