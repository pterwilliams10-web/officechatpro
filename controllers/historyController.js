const db = require("../config/database");


// Admin sees all messages

exports.getHistory = (req,res)=>{

    try{

        const messages =
        db.prepare(`
            SELECT *
            FROM messages
            ORDER BY created_at DESC
        `).all();


        res.json({
            success:true,
            messages
        });


    }catch(error){

        console.log(error);

        res.status(500).json({
            success:false,
            message:error.message
        });

    }

};




// Open conversation between 2 employees

exports.getConversation =
(req,res)=>{


const {userA,userB}=req.params;


const messages =
db.prepare(`

SELECT *

FROM messages

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



res.json({

success:true,

messages

});


};