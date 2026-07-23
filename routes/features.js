const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/requireAuth");
const featuresController = require("../controllers/featuresController");

router.use(requireAuth);

router.post("/messages/reaction", featuresController.addReaction);
router.put("/messages/edit", featuresController.editMessage);
router.delete("/messages/:id", featuresController.deleteMessage);
router.post("/messages/forward", featuresController.forwardMessage);
router.get("/messages/:messageId/reactions", featuresController.getReactions);
router.get("/mentions", featuresController.getMentions);
router.put("/mentions/read", featuresController.markMentionsRead);

module.exports = router;
