import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Navbar() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("swiftlane_user")
      );
    } catch {
      return null;
    }
  });

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const token = localStorage.getItem("swiftlane_token");

  async function loadNotifications() {
    const currentUser = JSON.parse(
      localStorage.getItem("swiftlane_user")
    );

    if (
      !currentUser ||
      currentUser.role !== "customer" ||
      !localStorage.getItem("swiftlane_token")
    ) {
      setNotifications([]);
      return;
    }

    try {
      const response = await api.get("/rides/my");

      const acceptedRides = response.data.filter(
        (ride) => ride.status === "accepted"
      );

      setNotifications(acceptedRides);
    } catch (error) {
      if (error.response?.status === 401) {
        setNotifications([]);
      }
    }
  }

  useEffect(() => {
    const refreshUser = () => {
      try {
        const currentUser = JSON.parse(
          localStorage.getItem("swiftlane_user")
        );

        setUser(currentUser);
      } catch {
        setUser(null);
      }
    };

    refreshUser();
    loadNotifications();

    const interval = setInterval(() => {
      refreshUser();
      loadNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    localStorage.removeItem("swiftlane_token");
    localStorage.removeItem("swiftlane_user");

    setUser(null);
    setNotifications([]);
    setShowNotifications(false);

    navigate("/");
  };

  const isCustomer =
    token && user?.role === "customer";

  const isDriver =
    token && user?.role === "driver";

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">SwiftLane</Link>
      </div>

      <div className="nav-links">
        <Link className="nav-btn" to="/">
          Home
        </Link>

        {isCustomer && (
          <>
            <Link className="nav-btn" to="/book">
              Book Ride
            </Link>

            <Link className="nav-btn" to="/rides">
              My Rides
            </Link>

            <div className="notification-wrapper">
              <button
                className="notification-btn"
                onClick={() =>
                  setShowNotifications(!showNotifications)
                }
                aria-label="Notifications"
              >
                🔔

                {notifications.length > 0 && (
                  <span className="notification-count">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="notification-panel">
                  <div className="notification-header">
                    <strong>Notifications</strong>

                    <button
                      onClick={() =>
                        setShowNotifications(false)
                      }
                    >
                      ×
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      <span>🔕</span>
                      <p>No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((ride) => (
                      <button
                        className="notification-item"
                        key={ride.id}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate("/rides");
                        }}
                      >
                        <div className="notification-icon">
                          🚕
                        </div>

                        <div>
                          <strong>Ride Accepted!</strong>

                          <p>
                            Your {ride.cab_type} ride has
                            been accepted by{" "}
                            {ride.driver_name ||
                              "your driver"}.
                          </p>

                          <span>
                            Ride #{ride.id}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {isDriver && (
          <Link
            className="nav-btn"
            to="/driver/dashboard"
          >
            Driver Dashboard
          </Link>
        )}

        {token ? (
          <button
            className="nav-btn logout-nav-btn"
            onClick={logout}
          >
            Logout
          </button>
        ) : (
          <>
            <Link className="nav-btn" to="/login">
              Login
            </Link>

            <Link className="nav-btn" to="/register">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}