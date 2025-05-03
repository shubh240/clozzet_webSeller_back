import multer from "multer";
import path from "path";
import fs from "fs";

// Set disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";

    // Create 'uploads' directory if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Validate file types (image and video)
const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png|mp4|mov|avi/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = fileTypes.test(file.mimetype);

  if (mimeType && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only JPEG, JPG, PNG, MP4, MOV, and AVI files are allowed!"));
  }
};

// Multer config for multiple uploads
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter,
});

export default upload;
