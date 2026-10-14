import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

function SignupForm({ onSignup, loading = false }) {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name || !form.email || !form.password) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      if (onSignup) await onSignup(form);
      else await signup(form);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <div className="auth-error">{error}</div>}

      <div className="form-field">
        <label htmlFor="signup-name">Full name</label>

        <input
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Enter your name"
          value={form.name}
          onChange={handleChange}
        />
      </div>

      <div className="form-field">
        <label htmlFor="signup-email">Email address</label>

        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
        />
      </div>

      <div className="form-field">
        <label htmlFor="signup-password">Password</label>

        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={handleChange}
        />
      </div>

      <div className="form-field">
        <label htmlFor="signup-confirm-password">
          Confirm password
        </label>

        <input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={handleChange}
        />
      </div>

      <button
        type="submit"
        className="auth-submit-button"
        disabled={loading}
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

export default SignupForm;