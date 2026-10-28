import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function UserRegister() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      setSuccess("Account created successfully!");

      setTimeout(() => {
        navigate("/user/login");
      }, 1000);
    } catch (error) {
      setError(
        error.response?.data?.message || "Could not create account"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-page">
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-icon">👤</div>

        <p className="eyebrow">USER ACCOUNT</p>

        <h2>Create User Account</h2>

        <p>Register with SwiftLane and start booking rides.</p>

        {error && <div className="error">{error}</div>}

        {success && <div className="success">{success}</div>}

        <label>Full Name</label>

        <input
          type="text"
          name="name"
          placeholder="Enter your full name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <label>Email</label>

        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label>Phone Number</label>

        <input
          type="tel"
          name="phone"
          placeholder="Enter your phone number"
          value={form.phone}
          onChange={handleChange}
          required
        />

        <label>Password</label>

        <input
          type="password"
          name="password"
          placeholder="Create a password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <label>Confirm Password</label>

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm your password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />

        <button
          className="primary-btn"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create User Account"}
        </button>

        <p>
          Already have an account?{" "}
          <Link to="/user/login">User Login</Link>
        </p>

        <Link className="back-link" to="/">
          ← Back to account selection
        </Link>
      </form>
    </div>
  );
}