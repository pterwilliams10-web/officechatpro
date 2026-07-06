const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Storage configuration
const fs = require("fs");

const uploadFolder = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({

    destination(req, file, cb) {
        cb(null, uploadFolder);
    },

    filename(req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});

const upload = multer({
    storage: storage
});

// Upload Route
router.post("/", upload.single("file"), (req, res) => {

    if (!req.file) {

        return res.json({
            success: false,
            message: "No file uploaded."
        });

    }

    res.json({

        success: true,

        file: {

            originalName: req.file.originalname,

            filename: req.file.filename,

            path: "/uploads/" + req.file.filename,

            size: req.file.size,

            mimetype: req.file.mimetype

        }

    });

});

module.exports = router;