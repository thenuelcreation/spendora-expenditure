import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../auth/useAuth";

const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "▦",
  },
  {
    label: "Expenditures",
    path: "/expenditures",
    icon: "↕",
  },
  {
    label: "Categories",
    path: "/categories",
    icon: "◈",
  },
  {
    label: "Export Excel",
    path: "/export",
    icon: "↓",
  },
];

const secondaryNavigation = [
  {
    label: "Settings",
    path: "/settings",
    icon: "⚙",
  },
  {
    label: "Profile",
    path: "/profile",
    icon: "◯",
  },
];

function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [error, setError] = useState("");

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <aside className="spendora-sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">S</div>
        <span>Spendora</span>

        {onClose && (
          <button
            className="sidebar-close"
            type="button"
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        )}
      </div>

      <nav className="sidebar-navigation">
        <p className="sidebar-section-title">MENU</p>

        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <p className="sidebar-section-title secondary">ACCOUNT</p>

        {secondaryNavigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="sidebar-logout" type="button" onClick={handleLogout}>
          <span className="sidebar-icon">↪</span>
          <span>Log out</span>
        </button>

        <div className="sidebar-footer">
          <strong>Spendora</strong>
          <span>Expense management made simple.</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;