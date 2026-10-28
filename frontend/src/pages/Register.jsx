import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submitRegister(event) {
    event.preventDefault();

    try {
      const { data } = await api.post("/auth/register", form);

      localStorage.setItem("swiftlane_token", data.token);
      localStorage.setItem(
        "swiftlane_user",
        JSON.stringify(data.user)
      );

      navigate("/book");
    } catch (error) {
      setError(
        error.response?.data?.message || "Registration failed"
      );
    }
  }

  return (
    <div className="form-page">
      <form className="form-card" onSubmit={submitRegister}>
        <h2>Create account</h2>

        <p>Join SwiftLane in a few seconds.</p>

        {error && <div className="error">{error}</div>}

        <input
          placeholder="Full name"
          required
          value={form.name}
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
            })
          }
        />

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
          type="tel"
          placeholder="Phone"
          value={form.phone}
          onChange={(event) =>
            setForm({
              ...form,
              phone: event.target.value,
            })
          }
        />

        <input
          type="password"
          minLength="6"
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
          Register
        </button>

        <p>
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}