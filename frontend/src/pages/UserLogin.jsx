import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function UserLogin() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
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
    setLoading(true);

    try {
      const response = await api.post("/auth/login", form);

      localStorage.setItem("swiftlane_token", response.data.token);
      localStorage.setItem(
        "swiftlane_user",
        JSON.stringify(response.data.user)
      );

      navigate("/book");
    } catch (error) {
      setError(
        error.response?.data?.message || "Invalid email or password"
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

        <h2>User Login</h2>

        <p>Login to book and manage your SwiftLane rides.</p>

        {error && <div className="error">{error}</div>}

        <label>Email</label>

        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label>Password</label>

        <input
          type="password"
          name="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button
          className="primary-btn"
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "User Login"}
        </button>

        <p>
          Don't have a user account?{" "}
          <Link to="/user/register">Register here</Link>
        </p>

        <Link className="back-link" to="/">
          ← Back to account selection
        </Link>
      </form>
    </div>
  );
}