const express = require("express");
const router = express.Router();

const broadcastController = require("../controllers/broadcastController");

// Send a broadcast
router.post("/broadcasts/send", broadcastController.sendBroadcast);

// Load broadcasts
router.get("/broadcasts", broadcastController.getBroadcasts);

module.exports = router;