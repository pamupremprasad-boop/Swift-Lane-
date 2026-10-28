import React, { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap
} from "react-leaflet";
import L from "leaflet";
import api from "../services/api";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

function MapCenter({ position, destination }) {
  const map = useMap();

  useEffect(() => {
    if (position && destination) {
      const bounds = L.latLngBounds([position, destination]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (position) {
      map.setView(position, 15);
    }
  }, [position, destination, map]);

  return null;
}

function BookRide() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [cabType, setCabType] = useState("Mini");

  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const [location, setLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);

  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fare, setFare] = useState(45);

  const [route, setRoute] = useState([]);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  const [gpsError, setGpsError] = useState("");
  const [routeError, setRouteError] = useState("");

  const [message, setMessage] = useState("");

  const estimateFare = (km, type) => {
    const rates = {
      Mini: {
        base: 45,
        perKm: 14
      },
      Sedan: {
        base: 60,
        perKm: 18
      },
      Prime: {
        base: 80,
        perKm: 22
      }
    };

    const selected = rates[type];

    if (!selected) {
      return 0;
    }

    return Math.round(selected.base + km * selected.perKm);
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (distance > 0) {
      setFare(estimateFare(distance, cabType));
    }
  }, [distance, cabType]);

  const loadDrivers = async () => {
    try {
      const response = await api.get("/rides/drivers");
      setDrivers(response.data.drivers || []);
    } catch (error) {
      console.error(error);
    }
  };

  const useMyLocation = () => {
    setGpsLoading(true);
    setGpsError("");
    setMessage("");

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLocation([lat, lng]);
        setPickup(
          `Current Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`
        );

        setGpsLoading(false);
      },
      (error) => {
        if (error.code === 1) {
          setGpsError(
            "Location permission denied. Please allow location access."
          );
        } else if (error.code === 2) {
          setGpsError("Unable to determine your location.");
        } else if (error.code === 3) {
          setGpsError("Location request timed out. Try again.");
        } else {
          setGpsError("Unable to get your location.");
        }

        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const calculateRoute = async () => {
    setRouteError("");
    setMessage("");

    if (!location) {
      setRouteError("First click 'Use My Location'.");
      return;
    }

    if (!destination.trim()) {
      setRouteError("Please enter your destination.");
      return;
    }

    setRouteLoading(true);
    setDestinationLocation(null);
    setRoute([]);

    try {
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          destination.trim()
        )}`
      );

      if (!geocodeResponse.ok) {
        throw new Error("Destination search failed.");
      }

      const geocodeData = await geocodeResponse.json();

      if (!geocodeData.length) {
        throw new Error(
          "Destination not found. Try entering a more specific location."
        );
      }

      const destinationLat = parseFloat(geocodeData[0].lat);
      const destinationLng = parseFloat(geocodeData[0].lon);

      const destinationPoint = [destinationLat, destinationLng];

      setDestinationLocation(destinationPoint);

      const startLng = location[1];
      const startLat = location[0];

      const endLng = destinationLng;
      const endLat = destinationLat;

      const routeResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );

      if (!routeResponse.ok) {
        throw new Error("Route service failed.");
      }

      const routeData = await routeResponse.json();

      if (
        !routeData.routes ||
        !routeData.routes.length
      ) {
        throw new Error("No driving route found.");
      }

      const selectedRoute = routeData.routes[0];

      const distanceKm = selectedRoute.distance / 1000;
      const durationMinutes = selectedRoute.duration / 60;

      const routeCoordinates =
        selectedRoute.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );

      setDistance(Number(distanceKm.toFixed(2)));
      setDuration(Math.round(durationMinutes));
      setRoute(routeCoordinates);
      setFare(estimateFare(distanceKm, cabType));

      setMessage("Route calculated successfully.");
    } catch (error) {
      console.error(error);
      setRouteError(
        error.message ||
          "Unable to calculate route. Please try again."
      );
    } finally {
      setRouteLoading(false);
    }
  };

  const handleCabChange = (type) => {
    setCabType(type);

    if (distance > 0) {
      setFare(estimateFare(distance, type));
    }
  };

  const bookRide = async () => {
    setMessage("");
    setRouteError("");

    if (!pickup.trim()) {
      setMessage("Please select your pickup location.");
      return;
    }

    if (!destination.trim()) {
      setMessage("Please enter your destination.");
      return;
    }

    if (!location) {
      setMessage("Please use your current location first.");
      return;
    }

    if (!destinationLocation || !route.length) {
      setMessage("Please calculate the route before booking.");
      return;
    }

    if (distance <= 0) {
      setMessage("Unable to calculate distance.");
      return;
    }

    try {
      const response = await api.post("/rides", {
        pickup,
        destination,
        cab_type: cabType,
        distance_km: distance,
        fare,
        driver_id: selectedDriver ? selectedDriver.id : null
      });

      setMessage(
        response.data.message || "Ride booked successfully."
      );

      setPickup("");
      setDestination("");
      setLocation(null);
      setDestinationLocation(null);
      setRoute([]);
      setDistance(0);
      setDuration(0);
      setFare(45);
      setSelectedDriver(null);

      await loadDrivers();
    } catch (error) {
      console.error(error);

      setMessage(
        error.response?.data?.message ||
          "Unable to book ride. Please try again."
      );
    }
  };

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-left">
          <div className="booking-card">
            <h1>Book Your Ride</h1>
            <p className="booking-subtitle">
              Choose your pickup, destination and cab
            </p>

            <div className="form-group">
              <label>Pickup Location</label>

              <div className="location-input-row">
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Enter pickup location"
                />

                <button
                  type="button"
                  className="gps-btn"
                  onClick={useMyLocation}
                  disabled={gpsLoading}
                >
                  {gpsLoading
                    ? "Locating..."
                    : "📍 Use My Location"}
                </button>
              </div>

              {gpsError && (
                <p className="error-text">{gpsError}</p>
              )}
            </div>

            <div className="form-group">
              <label>Destination</label>

              <input
                type="text"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setRouteError("");
                  setMessage("");
                }}
                placeholder="Enter destination"
              />
            </div>

            <button
              type="button"
              className="route-btn"
              onClick={calculateRoute}
              disabled={routeLoading}
            >
              {routeLoading
                ? "Calculating Route..."
                : "🛣️ Calculate Route & Fare"}
            </button>

            {routeError && (
              <p className="error-text">{routeError}</p>
            )}

            {message && (
              <p className="booking-message">{message}</p>
            )}

            <div className="cab-selection">
              <h3>Select Cab Type</h3>

              <div className="cab-options">
                {["Mini", "Sedan", "Prime"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`cab-option ${
                      cabType === type ? "selected" : ""
                    }`}
                    onClick={() => handleCabChange(type)}
                  >
                    <span className="cab-icon">🚕</span>
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="fare-card">
              <div>
                <span>Distance</span>
                <strong>
                  {distance > 0
                    ? `${distance} km`
                    : "--"}
                </strong>
              </div>

              <div>
                <span>Estimated Time</span>
                <strong>
                  {duration > 0
                    ? `${duration} min`
                    : "--"}
                </strong>
              </div>

              <div>
                <span>Estimated Fare</span>
                <strong>
                  ₹{fare}
                </strong>
              </div>
            </div>

            <div className="driver-selection">
              <h3>Available Drivers</h3>

              {drivers.filter(
                (driver) =>
                  driver.cab_type === cabType &&
                  Number(driver.available) === 1
              ).length === 0 ? (
                <p className="no-drivers">
                  No {cabType} drivers available right now.
                </p>
              ) : (
                drivers
                  .filter(
                    (driver) =>
                      driver.cab_type === cabType &&
                      Number(driver.available) === 1
                  )
                  .map((driver) => (
                    <div
                      key={driver.id}
                      className={`driver-option ${
                        selectedDriver?.id === driver.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedDriver(driver)
                      }
                    >
                      <div className="driver-info">
                        <strong>
                          {driver.name}
                        </strong>

                        <span>
                          ⭐ {driver.rating || "4.50"}
                        </span>
                      </div>

                      <div className="driver-vehicle">
                        {driver.vehicle_model} •{" "}
                        {driver.vehicle_number}
                      </div>
                    </div>
                  ))
              )}
            </div>

            <button
              type="button"
              className="book-ride-btn"
              onClick={bookRide}
            >
              🚕 Book Ride
            </button>
          </div>
        </div>

        <div className="booking-right">
          <div className="gps-map-card">
            <div className="gps-map-heading">
              <div>
                <h3>Live Route Map</h3>
                <p>
                  {location
                    ? destinationLocation
                      ? "Pickup and destination connected"
                      : "Your current location is active"
                    : "Use your location to start"}
                </p>
              </div>

              {location && (
                <span className="gps-active">
                  ● GPS Active
                </span>
              )}
            </div>

            <div className="map-container">
              {location ? (
                <MapContainer
                  center={location}
                  zoom={15}
                  className="leaflet-map"
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapCenter
                    position={location}
                    destination={destinationLocation}
                  />

                  <Marker position={location}>
                    <Popup>
                      <strong>Your Pickup Location</strong>
                      <br />
                      Latitude: {location[0].toFixed(6)}
                      <br />
                      Longitude: {location[1].toFixed(6)}
                    </Popup>
                  </Marker>

                  {destinationLocation && (
                    <Marker position={destinationLocation}>
                      <Popup>
                        <strong>Destination</strong>
                        <br />
                        {destination}
                      </Popup>
                    </Marker>
                  )}

                  {route.length > 0 && (
                    <Polyline
                      positions={route}
                      pathOptions={{
                        weight: 6
                      }}
                    />
                  )}
                </MapContainer>
              ) : (
                <div className="map-placeholder">
                  <div className="map-placeholder-icon">
                    📍
                  </div>

                  <h3>Location Not Selected</h3>

                  <p>
                    Click "Use My Location" to show your
                    pickup location on the map.
                  </p>

                  <button
                    type="button"
                    className="gps-large-btn"
                    onClick={useMyLocation}
                    disabled={gpsLoading}
                  >
                    {gpsLoading
                      ? "Getting Location..."
                      : "📍 Use My Location"}
                  </button>
                </div>
              )}
            </div>

            {location && (
              <div className="coordinates">
                <span>
                  📍 Pickup:{" "}
                  {location[0].toFixed(5)},{" "}
                  {location[1].toFixed(5)}
                </span>

                {destinationLocation && (
                  <span>
                    🏁 Destination:{" "}
                    {destinationLocation[0].toFixed(5)},{" "}
                    {destinationLocation[1].toFixed(5)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookRide;