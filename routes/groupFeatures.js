const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth } = require("../middleware/requireAuth");
const groupFeaturesController = require("../controllers/groupFeaturesController");

const groupAvatarFolder = path.join(
    __dirname,
    "..",
    "public",
    "uploads",
    "group-avatars"
);

if (!fs.existsSync(groupAvatarFolder)) {
    fs.mkdirSync(groupAvatarFolder, { recursive: true });
}

const groupAvatarUpload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, groupAvatarFolder);
        },
        filename(req, file, cb) {
            const uniqueName =
                Date.now() +
                "-" +
                Math.round(Math.random() * 1e9) +
                path.extname(file.originalname);
            cb(null, uniqueName);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(requireAuth);

router.put("/groups/:id/settings", groupFeaturesController.updateGroupSettings);
router.post(
    "/groups/:id/avatar",
    groupAvatarUpload.single("avatar"),
    groupFeaturesController.uploadGroupAvatar
);
router.post("/groups/pin", groupFeaturesController.pinMessage);
router.post("/groups/unpin", groupFeaturesController.unpinMessage);
router.get("/groups/:id/pinned", groupFeaturesController.getPinnedMessages);

module.exports = router;
