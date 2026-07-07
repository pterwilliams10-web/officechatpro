const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");

router.post("/messages/send", messageController.sendMessage);

router.put("/messages/read/:id", messageController.markAsRead);

router.get("/messages/:id", messageController.getConversation);

module.exports = router;