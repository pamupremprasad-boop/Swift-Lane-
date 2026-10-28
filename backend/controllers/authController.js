const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const token = (u) =>
  jwt.sign(
    {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    },
    process.env.JWT_SECRET || "swiftlane_secret_change_me",
    {
      expiresIn: "7d",
    }
  );

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email=?",
      [email]
    );

    if (existing.length) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      "INSERT INTO users(name,email,password,phone,role) VALUES(?,?,?,?,?)",
      [name, email, hash, phone || null, "customer"]
    );

    const user = {
      id: result.insertId,
      name,
      email,
      role: "customer",
    };

    res.status(201).json({
      user,
      token: token(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

exports.registerDriver = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      name,
      email,
      password,
      phone,
      licenseNumber,
      vehicleModel,
      vehicleNumber,
      cabType,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !licenseNumber ||
      !vehicleModel ||
      !vehicleNumber ||
      !cabType
    ) {
      return res.status(400).json({
        message: "All driver details are required",
      });
    }

    if (!req.files?.licensePhoto || !req.files?.vehiclePhoto) {
      return res.status(400).json({
        message: "Driving licence photo and vehicle photo are required",
      });
    }

    const [existingEmail] = await connection.execute(
      "SELECT id FROM users WHERE email=?",
      [email]
    );

    if (existingEmail.length) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const [existingVehicle] = await connection.execute(
      "SELECT id FROM drivers WHERE vehicle_number=?",
      [vehicleNumber]
    );

    if (existingVehicle.length) {
      return res.status(409).json({
        message: "Vehicle number already registered",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await connection.beginTransaction();

    const [userResult] = await connection.execute(
      "INSERT INTO users(name,email,password,phone,role) VALUES(?,?,?,?,?)",
      [name, email, hash, phone, "driver"]
    );

    const userId = userResult.insertId;

    const licensePhoto = req.files.licensePhoto[0].filename;
    const vehiclePhoto = req.files.vehiclePhoto[0].filename;

    await connection.execute(
      `INSERT INTO drivers
      (user_id, license_number, license_photo, vehicle_model, vehicle_number, vehicle_photo, cab_type, rating, available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        licenseNumber,
        licensePhoto,
        vehicleModel,
        vehicleNumber,
        vehiclePhoto,
        cabType,
        4.5,
        1,
      ]
    );

    await connection.commit();

    const user = {
      id: userId,
      name,
      email,
      role: "driver",
    };

    res.status(201).json({
      message: "Driver account created successfully",
      user,
      token: token(user),
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      message: "Driver registration failed",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email=?",
      [email]
    );

    if (
      !rows.length ||
      !(await bcrypt.compare(password, rows[0].password))
    ) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      role: rows[0].role,
    };

    res.json({
      user,
      token: token(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};