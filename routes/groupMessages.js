const express = require("express");

const router = express.Router();

const groupMessageController =
require("../controllers/groupMessageController");

router.post(
    "/group/message/send",
    groupMessageController.sendGroupMessage
);

router.get(
    "/group/messages/:id",
    groupMessageController.getGroupMessages
);

module.exports = router;