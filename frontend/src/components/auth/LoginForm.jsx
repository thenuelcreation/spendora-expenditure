import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

function LoginForm({ onLogin, loading = false }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
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

    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      if (onLogin) await onLogin(form);
      else await login(form);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <div className="auth-error">{error}</div>}

      <div className="form-field">
        <label htmlFor="login-email">Email address</label>

        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
        />
      </div>

      <div className="form-field">
        <div className="field-label-row">
          <label htmlFor="login-password">Password</label>

        </div>

        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
        />
      </div>

      <button
        type="submit"
        className="auth-submit-button"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export default LoginForm;