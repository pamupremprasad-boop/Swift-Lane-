const express = require("express");
const multer = require("multer");
const path = require("path");
const authController = require("../controllers/authController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const uniqueName =
      `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1000000)}` +
      extension;

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only JPG, JPEG and PNG images are allowed"),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/register", authController.register);

router.post(
  "/driver/register",
  upload.fields([
    {
      name: "licensePhoto",
      maxCount: 1,
    },
    {
      name: "vehiclePhoto",
      maxCount: 1,
    },
  ]),
  authController.registerDriver
);

router.post("/login", authController.login);

module.exports = router;