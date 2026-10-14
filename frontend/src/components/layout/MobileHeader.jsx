import { useLocation, useNavigate } from "react-router-dom";

function MobileHeader({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();

  const getTitle = () => {
    if (location.pathname === "/dashboard") return "Dashboard";
    if (location.pathname === "/expenditures") return "Expenditures";
    if (location.pathname === "/categories") return "Categories";
    if (location.pathname === "/export") return "Export";
    if (location.pathname === "/settings") return "Settings";
    if (location.pathname === "/profile") return "Profile";

    return "Spendora";
  };

  return (
    <header className="mobile-header">
      <button
        type="button"
        className="mobile-header-button"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        ☰
      </button>

      <button
        type="button"
        className="mobile-brand"
        onClick={() => navigate("/dashboard")}
      >
        <span className="mobile-brand-mark">S</span>
        <strong>{getTitle()}</strong>
      </button>

      <button
        type="button"
        className="mobile-add-button"
        onClick={() => navigate("/expenditures/add")}
        aria-label="Add expenditure"
      >
        +
      </button>
    </header>
  );
}

export default MobileHeader;