const db = require("../config/database");


// Admin sees all messages

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




// Open conversation between 2 employees

exports.getConversation =
(req,res)=>{


const {userA,userB}=req.params;


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

WHERE
(sender_id=? AND receiver_id=?)
OR
(sender_id=? AND receiver_id=?)

ORDER BY created_at ASC

`).all(
    userA,
    userB,
    userB,
    userA
);


};