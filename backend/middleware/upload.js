const multer = require("multer");


const storage = multer.memoryStorage();


const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        const accepted = allowed.includes(file.mimetype);
        callback(accepted ? null : new Error("Unsupported file type."), accepted);
    }
});


module.exports = upload;
