import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submitLogin(event) {
    event.preventDefault();

    try {
      const { data } = await api.post("/auth/login", form);

      localStorage.setItem("swiftlane_token", data.token);
      localStorage.setItem(
        "swiftlane_user",
        JSON.stringify(data.user)
      );

      navigate("/book");
    } catch (error) {
      setError(
        error.response?.data?.message || "Login failed"
      );
    }
  }

  return (
    <div className="form-page">
      <form className="form-card" onSubmit={submitLogin}>
        <h2>Welcome back</h2>

        <p>Login to your SwiftLane account.</p>

        {error && <div className="error">{error}</div>}

        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(event) =>
            setForm({
              ...form,
              email: event.target.value,
            })
          }
        />

        <input
          type="password"
          placeholder="Password"
          required
          value={form.password}
          onChange={(event) =>
            setForm({
              ...form,
              password: event.target.value,
            })
          }
        />

        <button className="primary-btn" type="submit">
          Login
        </button>

        <small>
          Demo: demo@swiftlane.com / password123
        </small>

        <p>
          New user?{" "}
          <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}