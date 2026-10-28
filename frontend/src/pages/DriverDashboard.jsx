import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function DriverDashboard() {
  const [driver, setDriver] = useState(null);
  const [requests, setRequests] = useState([]);
  const [currentRide, setCurrentRide] = useState(null);
  const [error, setError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [accepting, setAccepting] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [newRequest, setNewRequest] = useState(false);

  const [gpsActive, setGpsActive] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");
  const [gpsError, setGpsError] = useState("");

  const navigate = useNavigate();
  const watchIdRef = useRef(null);

  async function loadDriver() {
    try {
      const response = await api.get("/rides/driver/profile");
      setDriver(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/driver/login");
      } else {
        setError(
          error.response?.data?.message ||
            "Could not load driver profile"
        );
      }
    }
  }

  async function loadRequests() {
    try {
      const response = await api.get("/rides/driver/requests");

      const newRequests = response.data;

      setRequests((oldRequests) => {
        if (newRequests.length > oldRequests.length) {
          setNewRequest(true);
          setRequestMessage(
            "🔔 New ride request received!"
          );
        }

        return newRequests;
      });
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/driver/login");
      }
    }
  }

  async function loadCurrentRide() {
    try {
      const response = await api.get(
        "/rides/driver/current"
      );

      setCurrentRide(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/driver/login");
      }
    }
  }

  useEffect(() => {
    loadDriver();
    loadRequests();
    loadCurrentRide();

    const interval = setInterval(() => {
      loadDriver();
      loadRequests();
      loadCurrentRide();
    }, 2000);

    return () => clearInterval(interval);
  }, [navigate]);

  async function sendDriverLocation(latitude, longitude) {
    try {
      await api.patch("/rides/driver/location", {
        latitude,
        longitude,
      });

      setGpsMessage(
        `Live location active • ${latitude.toFixed(
          5
        )}, ${longitude.toFixed(5)}`
      );

      setGpsError("");
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/driver/login");
        return;
      }

      setGpsError(
        error.response?.data?.message ||
          "Could not update driver location"
      );
    }
  }

  function startDriverGPS() {
    setGpsError("");
    setGpsMessage("");

    if (!navigator.geolocation) {
      setGpsError(
        "GPS is not supported by this browser."
      );
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    setGpsActive(true);
    setGpsMessage(
      "Getting your current location..."
    );

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          sendDriverLocation(
            latitude,
            longitude
          );
        },
        (error) => {
          setGpsActive(false);
          watchIdRef.current = null;

          if (error.code === 1) {
            setGpsError(
              "Location permission denied. Please allow location access."
            );
          } else if (error.code === 2) {
            setGpsError(
              "Unable to determine your current location."
            );
          } else if (error.code === 3) {
            setGpsError(
              "GPS request timed out. Please try again."
            );
          } else {
            setGpsError(
              "Unable to access your GPS location."
            );
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
  }

  function stopDriverGPS() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    setGpsActive(false);
    setGpsMessage("");
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }
    };
  }, []);

  useEffect(() => {
    if (driver && !driver.available) {
      startDriverGPS();
    }

    if (driver && driver.available) {
      stopDriverGPS();
    }
  }, [driver]);

  async function acceptRide(rideId) {
    setAccepting(rideId);
    setRequestMessage("");

    try {
      const response = await api.patch(
        `/rides/${rideId}/accept`
      );

      setRequestMessage(
        response.data.message ||
          "Ride accepted successfully"
      );

      setNewRequest(false);

      await loadRequests();
      await loadDriver();
      await loadCurrentRide();

      startDriverGPS();
    } catch (error) {
      setRequestMessage(
        error.response?.data?.message ||
          "Could not accept ride"
      );

      await loadRequests();
    } finally {
      setAccepting(null);
    }
  }

  async function completeRide() {
    if (!currentRide) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to complete this ride?"
    );

    if (!confirmed) {
      return;
    }

    setCompleting(true);
    setRequestMessage("");

    try {
      const response = await api.patch(
        `/rides/${currentRide.id}/complete`
      );

      stopDriverGPS();

      setCurrentRide(null);

      setRequestMessage(
        response.data.message ||
          "Ride completed successfully"
      );

      await loadDriver();
      await loadRequests();
      await loadCurrentRide();
    } catch (error) {
      setRequestMessage(
        error.response?.data?.message ||
          "Could not complete ride"
      );
    } finally {
      setCompleting(false);
    }
  }

  function logout() {
    stopDriverGPS();

    localStorage.removeItem("swiftlane_token");
    localStorage.removeItem("swiftlane_user");

    navigate("/");
  }

  if (error) {
    return (
      <div className="form-page">
        <div className="form-card">
          <div className="error">{error}</div>

          <Link
            className="primary-btn"
            to="/driver/login"
          >
            Back to Driver Login
          </Link>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="form-page">
        <div className="form-card">
          <h2>Loading Driver Dashboard...</h2>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  const vehicleImage = driver.vehicle_photo
    ? `http://localhost:5000/uploads/${driver.vehicle_photo}`
    : "";

  const licenseImage = driver.license_photo
    ? `http://localhost:5000/uploads/${driver.license_photo}`
    : "";

  return (
    <div className="driver-dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">
            SWIFTLANE DRIVER
          </p>

          <h1>Welcome, {driver.name}</h1>

          <p>
            Manage your vehicle and customer ride
            requests.
          </p>
        </div>

        <button
          className="logout-btn"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      {newRequest && (
        <div className="new-ride-alert">
          <div>
            <strong>
              🔔 NEW RIDE REQUEST
            </strong>

            <span>
              A customer has requested a{" "}
              {driver.cab_type} ride.
            </span>
          </div>

          <button
            onClick={() => {
              setNewRequest(false);

              document
                .getElementById("ride-requests")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
            }}
          >
            View Request
          </button>
        </div>
      )}

      {!driver.available && (
        <div className="driver-gps-status">
          <div>
            <strong>
              {gpsActive
                ? "🟢 LIVE GPS ACTIVE"
                : "📍 Starting GPS..."}
            </strong>

            <span>
              Your location is being shared with the
              customer for this active ride.
            </span>
          </div>

          {gpsMessage && (
            <small>{gpsMessage}</small>
          )}

          {gpsError && (
            <small className="gps-status-error">
              {gpsError}
            </small>
          )}
        </div>
      )}

      {currentRide && (
        <div className="current-ride-card">
          <div className="current-ride-header">
            <div>
              <p className="eyebrow">
                ACTIVE RIDE
              </p>

              <h2>
                Ride #{currentRide.id}
              </h2>
            </div>

            <span className="on-ride-badge">
              ● ON RIDE
            </span>
          </div>

          <div className="current-ride-route">
            <div>
              <span>Pickup</span>

              <strong>
                {currentRide.pickup}
              </strong>
            </div>

            <div className="current-route-arrow">
              ↓
            </div>

            <div>
              <span>Destination</span>

              <strong>
                {currentRide.destination}
              </strong>
            </div>
          </div>

          <div className="current-ride-details">
            <div>
              <span>Customer</span>

              <strong>
                {currentRide.customer_name}
              </strong>
            </div>

            <div>
              <span>Phone</span>

              <strong>
                {currentRide.customer_phone ||
                  "No phone"}
              </strong>
            </div>

            <div>
              <span>Distance</span>

              <strong>
                {Number(
                  currentRide.distance_km
                ).toFixed(1)}{" "}
                km
              </strong>
            </div>

            <div>
              <span>Fare</span>

              <strong>
                ₹
                {Number(
                  currentRide.fare
                ).toFixed(0)}
              </strong>
            </div>
          </div>

          <button
            className="complete-ride-btn"
            disabled={completing}
            onClick={completeRide}
          >
            {completing
              ? "Completing Ride..."
              : "✓ Complete Ride"}
          </button>
        </div>
      )}

      <div className="driver-dashboard-grid">
        <div className="dashboard-card driver-profile-card">
          <div className="dashboard-card-header">
            <div>
              <p className="eyebrow">
                DRIVER PROFILE
              </p>

              <h2>{driver.name}</h2>
            </div>

            <span
              className={
                driver.available
                  ? "available-badge"
                  : "busy-badge"
              }
            >
              ●{" "}
              {driver.available
                ? "Available"
                : "On Ride"}
            </span>
          </div>

          <div className="driver-details">
            <div>
              <span>Email</span>

              <strong>
                {driver.email}
              </strong>
            </div>

            <div>
              <span>Phone</span>

              <strong>
                {driver.phone ||
                  "Not provided"}
              </strong>
            </div>

            <div>
              <span>Driving Licence</span>

              <strong>
                {driver.license_number}
              </strong>
            </div>

            <div>
              <span>Rating</span>

              <strong>
                {Number(
                  driver.rating || 0
                ).toFixed(1)}{" "}
                ★
              </strong>
            </div>
          </div>
        </div>

        <div className="dashboard-card vehicle-card">
          <p className="eyebrow">
            YOUR VEHICLE
          </p>

          <h2>{driver.vehicle_model}</h2>

          <p className="vehicle-number">
            {driver.vehicle_number}
          </p>

          <div className="vehicle-info">
            <span>Cab Type</span>

            <strong>
              {driver.cab_type}
            </strong>
          </div>

          {vehicleImage && (
            <div className="dashboard-image">
              <img
                src={vehicleImage}
                alt="Driver vehicle"
              />
            </div>
          )}
        </div>

        <div
          className="dashboard-card requests-card full-width-card"
          id="ride-requests"
        >
          <div className="requests-heading">
            <div>
              <p className="eyebrow">
                CUSTOMER REQUESTS
              </p>

              <h2>Ride Requests</h2>

              <p>
                New {driver.cab_type} ride
                requests will appear here
                automatically.
              </p>
            </div>

            <div className="request-count">
              {requests.length}
            </div>
          </div>

          {requestMessage && (
            <div className="success">
              {requestMessage}
            </div>
          )}

          {!driver.available && (
            <div className="busy-message">
              You are currently on an
              accepted ride.
            </div>
          )}

          {requests.length === 0 ? (
            <div className="empty-request">
              <div className="empty-request-icon">
                🚕
              </div>

              <h3>
                No new ride requests
              </h3>

              <p>
                Keep this dashboard open.
                New matching customer
                requests will appear
                automatically.
              </p>
            </div>
          ) : (
            <div className="request-list">
              {requests.map((ride) => (
                <div
                  className="request-card"
                  key={ride.id}
                >
                  <div className="request-main">
                    <div className="request-id">
                      NEW RIDE #{ride.id}
                    </div>

                    <h3>
                      {ride.pickup}

                      <span>→</span>

                      {ride.destination}
                    </h3>

                    <div className="request-details">
                      <span>
                        👤{" "}
                        {ride.customer_name}
                      </span>

                      <span>
                        📞{" "}
                        {ride.customer_phone ||
                          "No phone"}
                      </span>

                      <span>
                        📏{" "}
                        {Number(
                          ride.distance_km
                        ).toFixed(1)}{" "}
                        km
                      </span>

                      <span>
                        🚗{" "}
                        {ride.cab_type}
                      </span>
                    </div>
                  </div>

                  <div className="request-action">
                    <strong>
                      ₹
                      {Number(
                        ride.fare
                      ).toFixed(0)}
                    </strong>

                    <button
                      className="accept-btn"
                      disabled={
                        !driver.available ||
                        accepting === ride.id
                      }
                      onClick={() =>
                        acceptRide(
                          ride.id
                        )
                      }
                    >
                      {accepting === ride.id
                        ? "Accepting..."
                        : "Accept Ride"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-card license-card">
          <p className="eyebrow">
            DRIVING LICENCE
          </p>

          <h2>
            Licence Document
          </h2>

          {licenseImage && (
            <div className="dashboard-image license-image">
              <img
                src={licenseImage}
                alt="Driving licence"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}