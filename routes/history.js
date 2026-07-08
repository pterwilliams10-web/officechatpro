const express=require("express");

const router=express.Router();


const historyController=
require("../controllers/historyController");



router.get(
"/history",
historyController.getHistory
);



router.get(
"/history/conversation/:userA/:userB",
historyController.getConversation
);



module.exports=router;