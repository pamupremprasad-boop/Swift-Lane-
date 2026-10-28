import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1>SwiftLane</h1>

        <p className="landing-tagline">
          Ride Smart. Ride Fast.
        </p>

        <p className="landing-description">
          Your simple and reliable cab booking platform.
        </p>

        <div className="role-container">
          <div className="role-card">
            <div className="role-icon">👤</div>

            <h2>User</h2>

            <p>
              Book rides, manage your trips and travel comfortably.
            </p>

            <div className="role-buttons">
              <Link className="primary-btn" to="/user/login">
                User Login
              </Link>

              <Link className="secondary-btn" to="/user/register">
                User Register
              </Link>
            </div>
          </div>

          <div className="role-card">
            <div className="role-icon">🚗</div>

            <h2>Driver</h2>

            <p>
              Register as a driver, manage rides and accept customers.
            </p>

            <div className="role-buttons">
              <Link className="primary-btn" to="/driver/login">
                Driver Login
              </Link>

              <Link className="secondary-btn" to="/driver/register">
                Driver Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}