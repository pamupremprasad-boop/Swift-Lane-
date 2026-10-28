const db = require("../config/db");

exports.getDrivers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
        d.id,
        u.name,
        u.phone,
        d.vehicle_model,
        d.vehicle_number,
        d.vehicle_photo,
        d.cab_type,
        d.rating,
        d.available
      FROM drivers d
      JOIN users u ON u.id = d.user_id
      WHERE d.available = 1
      ORDER BY d.rating DESC`
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "Could not load drivers",
      error: error.message,
    });
  }
};

exports.getDriverProfile = async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      return res.status(403).json({
        message: "Driver access required",
      });
    }

    const [rows] = await db.execute(
      `SELECT
        u.id AS user_id,
        u.name,
        u.email,
        u.phone,
        d.id AS driver_id,
        d.license_number,
        d.license_photo,
        d.vehicle_model,
        d.vehicle_number,
        d.vehicle_photo,
        d.cab_type,
        d.rating,
        d.available,
        d.latitude,
        d.longitude
      FROM users u
      JOIN drivers d ON d.user_id = u.id
      WHERE u.id = ? AND u.role = 'driver'`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Driver profile not found",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: "Could not load driver profile",
      error: error.message,
    });
  }
};

exports.getDriverRequests = async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      return res.status(403).json({
        message: "Driver access required",
      });
    }

    const [driverRows] = await db.execute(
      `SELECT
        id,
        cab_type,
        available
      FROM drivers
      WHERE user_id = ?`,
      [req.user.id]
    );

    if (!driverRows.length) {
      return res.status(404).json({
        message: "Driver profile not found",
      });
    }

    const driver = driverRows[0];

    const [rows] = await db.execute(
      `SELECT
        r.id,
        r.customer_id,
        r.driver_id,
        r.pickup,
        r.destination,
        r.cab_type,
        r.distance_km,
        r.fare,
        r.status,
        r.created_at,
        u.name AS customer_name,
        u.phone AS customer_phone
      FROM rides r
      JOIN users u ON u.id = r.customer_id
      WHERE r.status = 'requested'
      AND r.driver_id IS NULL
      AND r.cab_type = ?
      ORDER BY r.created_at DESC`,
      [driver.cab_type]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "Could not load ride requests",
      error: error.message,
    });
  }
};

exports.getCurrentDriverRide = async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      return res.status(403).json({
        message: "Driver access required",
      });
    }

    const [rows] = await db.execute(
      `SELECT
        r.id,
        r.customer_id,
        r.driver_id,
        r.pickup,
        r.destination,
        r.cab_type,
        r.distance_km,
        r.fare,
        r.status,
        r.created_at,
        u.name AS customer_name,
        u.phone AS customer_phone
      FROM rides r
      JOIN drivers d ON d.id = r.driver_id
      JOIN users u ON u.id = r.customer_id
      WHERE d.user_id = ?
      AND r.status = 'accepted'
      ORDER BY r.created_at DESC
      LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.json(null);
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: "Could not load current ride",
      error: error.message,
    });
  }
};

exports.acceptRide = async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (req.user.role !== "driver") {
      return res.status(403).json({
        message: "Driver access required",
      });
    }

    await connection.beginTransaction();

    const [driverRows] = await connection.execute(
      `SELECT
        id,
        cab_type,
        available
      FROM drivers
      WHERE user_id = ?
      FOR UPDATE`,
      [req.user.id]
    );

    if (!driverRows.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Driver profile not found",
      });
    }

    const driver = driverRows[0];

    if (!driver.available) {
      await connection.rollback();

      return res.status(400).json({
        message: "You are currently unavailable",
      });
    }

    const [rideRows] = await connection.execute(
      `SELECT
        id,
        cab_type,
        status,
        driver_id
      FROM rides
      WHERE id = ?
      FOR UPDATE`,
      [req.params.id]
    );

    if (!rideRows.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Ride not found",
      });
    }

    const ride = rideRows[0];

    if (ride.status !== "requested" || ride.driver_id !== null) {
      await connection.rollback();

      return res.status(400).json({
        message:
          "This ride has already been accepted or is unavailable",
      });
    }

    if (ride.cab_type !== driver.cab_type) {
      await connection.rollback();

      return res.status(400).json({
        message: "This ride does not match your cab type",
      });
    }

    await connection.execute(
      `UPDATE rides
       SET driver_id = ?, status = 'accepted'
       WHERE id = ?
       AND status = 'requested'
       AND driver_id IS NULL`,
      [driver.id, ride.id]
    );

    await connection.execute(
      `UPDATE drivers
       SET available = 0
       WHERE id = ?`,
      [driver.id]
    );

    await connection.commit();

    res.json({
      message: "Ride accepted successfully",
      ride_id: ride.id,
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      message: "Could not accept ride",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.completeRide = async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (req.user.role !== "driver") {
      return res.status(403).json({
        message: "Driver access required",
      });
    }

    await connection.beginTransaction();

    const [rides] = await connection.execute(
      `SELECT
        r.id,
        r.driver_id,
        r.status,
        d.user_id
      FROM rides r
      JOIN drivers d ON d.id = r.driver_id
      WHERE r.id = ?
      AND d.user_id = ?
      FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (!rides.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Ride not found",
      });
    }

    const ride = rides[0];

    if (ride.status !== "accepted") {
      await connection.rollback();

      return res.status(400).json({
        message: "Only an accepted ride can be completed",
      });
    }

    await connection.execute(
      `UPDATE rides
       SET status = 'completed'
       WHERE id = ?`,
      [ride.id]
    );

    await connection.execute(
      `UPDATE drivers
       SET available = 1
       WHERE id = ?`,
      [ride.driver_id]
    );

    await connection.commit();

    res.json({
      message: "Ride completed successfully",
      ride_id: ride.id,
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      message: "Could not complete ride",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updateDriverLocation = async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      return res.status(403).json({
        message: "Driver access required",
      });
    }

    const { latitude, longitude } = req.body;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        message: "Valid latitude and longitude are required",
      });
    }

    if (
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        message: "Invalid GPS coordinates",
      });
    }

    const [result] = await db.execute(
      `UPDATE drivers
       SET latitude = ?, longitude = ?
       WHERE user_id = ?`,
      [lat, lng, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Driver profile not found",
      });
    }

    res.json({
      message: "Driver location updated",
      latitude: lat,
      longitude: lng,
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not update driver location",
      error: error.message,
    });
  }
};

exports.getRideDriverLocation = async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Customer access required",
      });
    }

    const [rows] = await db.execute(
      `SELECT
        r.id AS ride_id,
        r.customer_id,
        r.driver_id,
        r.status,
        d.latitude,
        d.longitude,
        d.vehicle_model,
        d.vehicle_number,
        d.cab_type,
        d.rating,
        u.name AS driver_name,
        u.phone AS driver_phone
      FROM rides r
      JOIN drivers d ON d.id = r.driver_id
      JOIN users u ON u.id = d.user_id
      WHERE r.id = ?
      AND r.customer_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Ride or driver not found",
      });
    }

    const ride = rows[0];

    if (ride.driver_id === null) {
      return res.status(400).json({
        message: "No driver assigned to this ride",
      });
    }

    res.json(ride);
  } catch (error) {
    res.status(500).json({
      message: "Could not load driver location",
      error: error.message,
    });
  }
};

exports.createRide = async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Customer access required",
      });
    }

    const {
      pickup,
      destination,
      cab_type,
      distance_km,
      fare,
    } = req.body;

    if (!pickup || !destination) {
      return res.status(400).json({
        message: "Pickup and destination are required",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO rides
      (customer_id, pickup, destination, cab_type, distance_km, fare, status)
      VALUES (?, ?, ?, ?, ?, ?, 'requested')`,
      [
        req.user.id,
        pickup,
        destination,
        cab_type || "Mini",
        Number(distance_km) || 0,
        Number(fare) || 0,
      ]
    );

    const [rows] = await db.execute(
      "SELECT * FROM rides WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: "Could not create ride",
      error: error.message,
    });
  }
};

exports.getMyRides = async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Customer access required",
      });
    }

    const [rows] = await db.execute(
      `SELECT
        r.*,
        d.vehicle_model,
        d.vehicle_number,
        d.vehicle_photo,
        d.cab_type,
        d.rating,
        d.latitude AS driver_latitude,
        d.longitude AS driver_longitude,
        du.name AS driver_name,
        du.phone AS driver_phone
      FROM rides r
      LEFT JOIN drivers d ON d.id = r.driver_id
      LEFT JOIN users du ON du.id = d.user_id
      WHERE r.customer_id = ?
      ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "Could not load rides",
      error: error.message,
    });
  }
};

exports.cancelRide = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rides] = await connection.execute(
      `SELECT
        id,
        driver_id,
        status
      FROM rides
      WHERE id = ?
      AND customer_id = ?
      FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (!rides.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Ride not found",
      });
    }

    const ride = rides[0];

    if (!["requested", "accepted"].includes(ride.status)) {
      await connection.rollback();

      return res.status(400).json({
        message: "Ride cannot be cancelled",
      });
    }

    await connection.execute(
      `UPDATE rides
       SET status = 'cancelled'
       WHERE id = ?`,
      [ride.id]
    );

    if (ride.driver_id) {
      await connection.execute(
        `UPDATE drivers
         SET available = 1
         WHERE id = ?`,
        [ride.driver_id]
      );
    }

    await connection.commit();

    res.json({
      message: "Ride cancelled",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      message: "Could not cancel ride",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};