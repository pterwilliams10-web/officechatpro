const express=require("express");

const router=express.Router();


const controller=
require("../controllers/groupController");



router.post(
"/groups/create",
controller.createGroup
);



router.get(
"/groups",
controller.getGroups
);



module.exports=router;