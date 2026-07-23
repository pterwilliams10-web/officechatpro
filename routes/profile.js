const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth, requireAdmin } = require("../middleware/requireAuth");
const profileController = require("../controllers/profileController");

const avatarFolder = path.join(__dirname, "..", "public", "uploads", "avatars");

if (!fs.existsSync(avatarFolder)) {
    fs.mkdirSync(avatarFolder, { recursive: true });
}

const avatarUpload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, avatarFolder);
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

router.get("/profile/me", profileController.getProfile);
router.get("/profile/:id", profileController.getProfile);
router.put("/profile", profileController.updateProfile);
router.post(
    "/profile/avatar",
    avatarUpload.single("avatar"),
    profileController.uploadAvatar
);
router.get("/departments", profileController.getDepartments);
router.put(
    "/admin/department",
    requireAdmin,
    profileController.updateDepartment
);

module.exports = router;
