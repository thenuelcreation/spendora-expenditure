import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Wallet } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/useAuth";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
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
          <p className="eyebrow">EXPENDITURE MANAGEMENT</p>
          <h1>
            Your spending.
            <br />
            <span>Under control.</span>
          </h1>

          <p>
            Record expenditures instantly, stay organized, and export
            everything to Excel when you need it.
          </p>

          <div className="auth-feature">
            <Wallet size={18} />
            <span>Simple. Fast. Organized.</span>
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
            <h2>Welcome back!</h2>
            <p>Log in to continue to your Spendora account.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error" role="alert">{error}</div>}
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
              <ArrowRight size={17} />
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;