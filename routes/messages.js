const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");

router.post("/messages/send", messageController.sendMessage);

router.delete(
    "/admin/message/:id",
    messageController.adminDeleteMessage
);

router.delete(
    "/admin/conversation/:user1/:user2",
    messageController.adminDeleteConversation
);

router.put("/messages/read/:id", messageController.markAsRead);

// Admin Route
router.get(
    "/admin/messages/:user1/:user2",
    messageController.adminConversation
);

router.get("/messages/:id", messageController.getConversation);

module.exports = router;