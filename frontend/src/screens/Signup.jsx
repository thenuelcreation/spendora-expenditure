import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/useAuth";

function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signup({ name: form.name, email: form.email, password: form.password });
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <Link to="/" className="auth-logo">
          <span>S</span>
          Spendora
        </Link>

        <div className="auth-brand-content">
          <p className="eyebrow">WELCOME TO SPENDORA</p>

          <h1>
            Smarter spending.
            <br />
            <span>Greater control.</span>
          </h1>

          <p>
            Create your account and start recording your expenditures
            without the hassle of managing Excel manually.
          </p>

          <div className="auth-feature">
            <User size={18} />
            <span>Your financial records, organized.</span>
          </div>
        </div>

        <p className="auth-copyright">© 2026 Spendora</p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <div className="mobile-auth-logo">
            <span>S</span>
            Spendora
          </div>

          <div className="auth-heading">
            <h2>Create your account</h2>
            <p>Get started with Spendora today.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <label>
              Full name
              <div className="input-with-icon">
                <User size={17} />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
            </label>

            <label>
              Email address
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </div>
            </label>

            <label>
              Password
              <div className="input-with-icon">
                <LockKeyhole size={17} />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <label>
              Confirm password
              <div className="input-with-icon">
                <LockKeyhole size={17} />

                <input
                  type="password"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                  required
                />
              </div>
            </label>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
              <ArrowRight size={17} />
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;