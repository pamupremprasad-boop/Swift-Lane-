import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <div>
          <h1>SwiftLane</h1>
          <h2>Ride Smart. Ride Fast.</h2>
          <p>
            Book reliable rides, get transparent fares, and travel comfortably
            with SwiftLane.
          </p>

          <Link className="primary-btn" to="/book">
            Book a Ride
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="card">
          <h3>🚕 Easy Booking</h3>
          <p>Book your cab quickly with just a few details.</p>
        </div>

        <div className="card">
          <h3>💰 Transparent Fare</h3>
          <p>See your estimated fare before confirming your ride.</p>
        </div>

        <div className="card">
          <h3>📍 Reliable Drivers</h3>
          <p>Choose from available drivers and comfortable vehicles.</p>
        </div>
      </section>
    </div>
  );
}