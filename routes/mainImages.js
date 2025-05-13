const express = require("express");
const router = express.Router();
const { uploadMainImage } = require("../controllers/mainImages");
const upload = require("../middlewares/multer");

router.route("/").post(upload.single("uploadedFile"), uploadMainImage);

module.exports = router;
