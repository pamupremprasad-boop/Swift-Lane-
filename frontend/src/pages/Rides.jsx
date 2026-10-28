import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";

function DriverMapCenter({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      map.setView(
        [latitude, longitude],
        Math.max(map.getZoom(), 15),
        {
          animate: true,
        }
      );
    }
  }, [latitude, longitude, map]);

  return null;
}

function DriverLiveMap({ ride, location }) {
  if (
    !location ||
    !Number.isFinite(Number(location.latitude)) ||
    !Number.isFinite(Number(location.longitude))
  ) {
    return (
      <div className="live-driver-map waiting-map">
        <div className="live-map-header">
          <div>
            <p className="assigned-label">
              DRIVER LOCATION
            </p>

            <strong>
              🟡 Waiting for driver GPS...
            </strong>
          </div>
        </div>

        <p className="live-map-message">
          Your driver has accepted the ride. The live
          location will appear when GPS coordinates are
          received.
        </p>
      </div>
    );
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  return (
    <div className="live-driver-map">
      <div className="live-map-header">
        <div>
          <p className="assigned-label">
            LIVE DRIVER LOCATION
          </p>

          <strong>
            🟢 Driver is sharing live location
          </strong>
        </div>

        <span className="live-location-badge">
          LIVE
        </span>
      </div>

      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={true}
        className="driver-map"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <DriverMapCenter
          latitude={latitude}
          longitude={longitude}
        />

        <CircleMarker
          center={[latitude, longitude]}
          radius={13}
          pathOptions={{
            color: "#ffffff",
            weight: 4,
            fillColor: "#16a34a",
            fillOpacity: 1,
          }}
        >
          <Popup>
            <strong>
              {location.driver_name ||
                ride.driver_name ||
                "Your Driver"}
            </strong>

            <br />

            {location.vehicle_model ||
              ride.vehicle_model ||
              "Vehicle"}

            <br />

            {location.vehicle_number ||
              ride.vehicle_number ||
              ""}
          </Popup>
        </CircleMarker>
      </MapContainer>

      <div className="live-location-details">
        <span>
          📍 Latitude: {latitude.toFixed(6)}
        </span>

        <span>
          📍 Longitude: {longitude.toFixed(6)}
        </span>

        {location.vehicle_model && (
          <span>
            🚗 {location.vehicle_model}
          </span>
        )}

        {location.vehicle_number && (
          <span>
            🔢 {location.vehicle_number}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Rides() {
  const [rides, setRides] = useState([]);
  const [driverLocations, setDriverLocations] =
    useState({});
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  async function loadRides() {
    try {
      const response = await api.get("/rides/my");
      setRides(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/user/login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadDriverLocation(rideId) {
    try {
      const response = await api.get(
        `/rides/${rideId}/driver-location`
      );

      setDriverLocations((previous) => ({
        ...previous,
        [rideId]: response.data,
      }));
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/user/login");
      }
    }
  }

  useEffect(() => {
    loadRides();

    const interval = setInterval(() => {
      loadRides();
    }, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  useEffect(() => {
    const acceptedRides = rides.filter(
      (ride) => ride.status === "accepted"
    );

    if (acceptedRides.length === 0) {
      return;
    }

    acceptedRides.forEach((ride) => {
      loadDriverLocation(ride.id);
    });

    const interval = setInterval(() => {
      acceptedRides.forEach((ride) => {
        loadDriverLocation(ride.id);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [rides]);

  async function cancelRide(id) {
    try {
      await api.patch(`/rides/${id}/cancel`);

      setDriverLocations((previous) => {
        const updated = { ...previous };
        delete updated[id];
        return updated;
      });

      await loadRides();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Could not cancel ride"
      );
    }
  }

  if (loading) {
    return (
      <div className="content">
        <div className="empty">
          Loading your rides...
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MY RIDES</p>
          <h2>Your Trips</h2>
        </div>

        <Link
          className="primary-btn"
          to="/book"
        >
          Book New Ride
        </Link>
      </div>

      {rides.length === 0 ? (
        <div className="empty">
          <h3>No rides yet</h3>

          <p>
            Book your first SwiftLane ride.
          </p>

          <Link
            className="primary-btn"
            to="/book"
          >
            Book a Ride
          </Link>
        </div>
      ) : (
        rides.map((ride) => {
          const vehicleImage = ride.vehicle_photo
            ? `http://localhost:5000/uploads/${ride.vehicle_photo}`
            : "";

          return (
            <div
              className="ride-card"
              key={ride.id}
            >
              <div className="ride-main">
                <span
                  className={`status ${ride.status}`}
                >
                  {ride.status}
                </span>

                <h3>
                  {ride.pickup}

                  <span className="route-arrow">
                    →
                  </span>

                  {ride.destination}
                </h3>

                <p>
                  {ride.cab_type} •{" "}
                  {Number(
                    ride.distance_km
                  ).toFixed(1)}{" "}
                  km
                </p>

                <small>
                  {new Date(
                    ride.created_at
                  ).toLocaleString()}
                </small>

                {ride.status === "accepted" && (
                  <div className="accepted-ride-banner">
                    <strong>
                      🟢 RIDE ACCEPTED
                    </strong>

                    <span>
                      Your driver has accepted your ride
                      request.
                    </span>

                    <button
                      className="accepted-status-button"
                      onClick={() =>
                        document
                          .getElementById(
                            `driver-${ride.id}`
                          )
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          })
                      }
                    >
                      ✓ Driver Assigned
                    </button>
                  </div>
                )}

                {ride.status === "accepted" &&
                  ride.driver_name && (
                    <div
                      className="assigned-driver"
                      id={`driver-${ride.id}`}
                    >
                      {vehicleImage && (
                        <img
                          src={vehicleImage}
                          alt={ride.vehicle_model}
                        />
                      )}

                      <div>
                        <p className="assigned-label">
                          DRIVER ASSIGNED
                        </p>

                        <strong>
                          {ride.driver_name}
                        </strong>

                        <span>
                          🚗 {ride.vehicle_model}
                        </span>

                        <span>
                          🔢 {ride.vehicle_number}
                        </span>

                        <span>
                          {ride.cab_type} •{" "}
                          {Number(
                            ride.rating || 0
                          ).toFixed(1)}
                          ★
                        </span>

                        {ride.driver_phone && (
                          <span>
                            📞 {ride.driver_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                {ride.status === "accepted" && (
                  <DriverLiveMap
                    ride={ride}
                    location={
                      driverLocations[ride.id]
                    }
                  />
                )}

                {ride.status === "requested" && (
                  <div className="waiting-driver">
                    🔎 Looking for a{" "}
                    {ride.cab_type} driver...
                  </div>
                )}

                {ride.status === "cancelled" && (
                  <div className="waiting-driver">
                    ❌ This ride has been cancelled.
                  </div>
                )}
              </div>

              <div className="ride-fare">
                <strong>
                  ₹{Number(ride.fare).toFixed(0)}
                </strong>

                {(ride.status === "requested" ||
                  ride.status === "accepted") && (
                  <button
                    onClick={() =>
                      cancelRide(ride.id)
                    }
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}