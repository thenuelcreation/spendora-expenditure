import { Link } from "react-router-dom";

function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLink,
}) {
  return (
    <main className="auth-page">
      <div className="auth-visual">
        <div className="auth-brand">
          <div className="auth-brand-mark">S</div>
          <strong>Spendora</strong>
        </div>

        <div className="auth-visual-content">
          <span className="auth-badge">SMART EXPENSE MANAGEMENT</span>

          <h2>
            Keep your spending
            <br />
            <span>under control.</span>
          </h2>

          <p>
            Record expenditures quickly, understand where
            your money goes, and export your records whenever
            you need them.
          </p>

          <div className="auth-visual-card">
            <div className="auth-card-top">
              <span>Total expenditure</span>
              <span>↗</span>
            </div>

            <strong>₦2,450,000</strong>

            <div className="auth-card-chart">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <div className="auth-brand-mark">S</div>
            <strong>Spendora</strong>
          </div>

          <div className="auth-heading">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          {children}

          {footerText && footerLink && (
            <p className="auth-footer">
              {footerText}{" "}
              <Link to={footerLink}>{footerLinkText}</Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default AuthLayout;