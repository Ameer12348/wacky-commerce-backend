const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function uploadMainImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "Nema otpremljenih fajlova" });
  }

  // Access the uploaded file
  const uploadedFile = req.file;

  // Respond with the filename
  res.status(200).json({ filename: uploadedFile.filename });
}

module.exports = {
  uploadMainImage,
};
