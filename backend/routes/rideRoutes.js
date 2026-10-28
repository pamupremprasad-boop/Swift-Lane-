const express = require("express");

const rideController = require("../controllers/rideController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get(
  "/drivers",
  auth,
  rideController.getDrivers
);

router.get(
  "/driver/profile",
  auth,
  rideController.getDriverProfile
);

router.get(
  "/driver/requests",
  auth,
  rideController.getDriverRequests
);

router.get(
  "/driver/current",
  auth,
  rideController.getCurrentDriverRide
);

router.patch(
  "/driver/location",
  auth,
  rideController.updateDriverLocation
);

router.patch(
  "/:id/accept",
  auth,
  rideController.acceptRide
);

router.patch(
  "/:id/complete",
  auth,
  rideController.completeRide
);

router.get(
  "/:id/driver-location",
  auth,
  rideController.getRideDriverLocation
);

router.post(
  "/",
  auth,
  rideController.createRide
);

router.get(
  "/my",
  auth,
  rideController.getMyRides
);

router.patch(
  "/:id/cancel",
  auth,
  rideController.cancelRide
);

module.exports = router;