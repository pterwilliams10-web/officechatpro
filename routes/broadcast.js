const express = require("express");
const router = express.Router();

const broadcastController = require("../controllers/broadcastController");

router.post(
    "/broadcast/send",
    broadcastController.sendBroadcast
);

router.get(
    "/broadcast/history",
    broadcastController.getBroadcasts
);

router.delete(
    "/broadcasts/:id",
    broadcastController.deleteBroadcast
);

module.exports = router;