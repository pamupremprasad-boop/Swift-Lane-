require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const auth = require("./routes/authRoutes");
const rides = require("./routes/rideRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(express.json());

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.get("/", (req, res) => {
  res.json({
    message: "SwiftLane API is running",
  });
});

app.use("/api/auth", auth);

app.use("/api/rides", rides);

app.listen(PORT, () => {
  console.log(
    `SwiftLane backend running on http://localhost:${PORT}`
  );
});