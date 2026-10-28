import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function DriverRegister() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    vehicleModel: "",
    vehicleNumber: "",
    cabType: "Mini",
  });

  const [licensePhoto, setLicensePhoto] = useState(null);
  const [licensePreview, setLicensePreview] = useState("");

  const [vehiclePhoto, setVehiclePhoto] = useState(null);
  const [vehiclePreview, setVehiclePreview] = useState("");

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

  function validateImage(file, type) {
    if (!file) {
      return false;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(`${type} must be a JPG, JPEG or PNG image.`);
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(`${type} must be less than 10 MB.`);
      return false;
    }

    return true;
  }

  function handleLicensePhoto(event) {
    const file = event.target.files?.[0];

    setError("");

    if (!file) {
      return;
    }

    if (!validateImage(file, "Driving licence photo")) {
      event.target.value = "";
      return;
    }

    setLicensePhoto(file);

    const previewUrl = URL.createObjectURL(file);
    setLicensePreview(previewUrl);
  }

  function handleVehiclePhoto(event) {
    const file = event.target.files?.[0];

    setError("");

    if (!file) {
      return;
    }

    if (!validateImage(file, "Vehicle photo")) {
      event.target.value = "";
      return;
    }

    setVehiclePhoto(file);

    const previewUrl = URL.createObjectURL(file);
    setVehiclePreview(previewUrl);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!licensePhoto) {
      setError("Please upload a photo of your driving licence.");
      return;
    }

    if (!vehiclePhoto) {
      setError("Please upload a photo of your vehicle.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("password", form.password);
      formData.append("licenseNumber", form.licenseNumber);
      formData.append("vehicleModel", form.vehicleModel);
      formData.append("vehicleNumber", form.vehicleNumber);
      formData.append("cabType", form.cabType);

      formData.append("licensePhoto", licensePhoto);
      formData.append("vehiclePhoto", vehiclePhoto);

      const response = await api.post(
        "/auth/driver/register",
        formData
      );

      localStorage.setItem(
        "swiftlane_token",
        response.data.token
      );

      localStorage.setItem(
        "swiftlane_user",
        JSON.stringify(response.data.user)
      );

      setSuccess("Driver account created successfully!");

      setTimeout(() => {
        navigate("/driver/login");
      }, 1000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Could not create driver account"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-page">
      <form
        className="form-card driver-register-card"
        onSubmit={handleSubmit}
      >
        <div className="form-icon">🚗</div>

        <p className="eyebrow">DRIVER ACCOUNT</p>

        <h2>Become a SwiftLane Driver</h2>

        <p>
          Register your driver account, licence and vehicle details.
        </p>

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

        <label>Driving License Number</label>

        <input
          type="text"
          name="licenseNumber"
          placeholder="Enter driving license number"
          value={form.licenseNumber}
          onChange={handleChange}
          required
        />

        <label>Driving Licence Photo</label>

        <div className="file-upload">
          <input
            id="licensePhoto"
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleLicensePhoto}
            required
          />

          <label htmlFor="licensePhoto">
            📄 Choose Driving Licence Photo
          </label>
        </div>

        {licensePhoto && (
          <div className="selected-file">
            ✓ {licensePhoto.name}
          </div>
        )}

        {licensePreview && (
          <div className="image-preview">
            <p>Licence Preview</p>

            <img
              src={licensePreview}
              alt="Driving licence preview"
            />
          </div>
        )}

        <label>Vehicle Model</label>

        <input
          type="text"
          name="vehicleModel"
          placeholder="e.g. Maruti Swift"
          value={form.vehicleModel}
          onChange={handleChange}
          required
        />

        <label>Vehicle Number</label>

        <input
          type="text"
          name="vehicleNumber"
          placeholder="e.g. TS09AB1234"
          value={form.vehicleNumber}
          onChange={handleChange}
          required
        />

        <label>Cab Type</label>

        <select
          name="cabType"
          value={form.cabType}
          onChange={handleChange}
          required
        >
          <option value="Mini">Mini</option>
          <option value="Sedan">Sedan</option>
          <option value="Prime">Prime</option>
        </select>

        <label>Vehicle Photo</label>

        <div className="file-upload">
          <input
            id="vehiclePhoto"
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleVehiclePhoto}
            required
          />

          <label htmlFor="vehiclePhoto">
            🚘 Choose Vehicle Photo
          </label>
        </div>

        {vehiclePhoto && (
          <div className="selected-file">
            ✓ {vehiclePhoto.name}
          </div>
        )}

        {vehiclePreview && (
          <div className="image-preview">
            <p>Vehicle Preview</p>

            <img
              src={vehiclePreview}
              alt="Vehicle preview"
            />
          </div>
        )}

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
          {loading
            ? "Creating Account..."
            : "Create Driver Account"}
        </button>

        <p>
          Already have a driver account?{" "}
          <Link to="/driver/login">Driver Login</Link>
        </p>

        <Link className="back-link" to="/">
          ← Back to account selection
        </Link>
      </form>
    </div>
  );
}