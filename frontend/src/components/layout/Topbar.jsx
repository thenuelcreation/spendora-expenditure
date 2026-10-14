import { useLocation, useNavigate } from "react-router-dom";

const pageTitles = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Here's what's happening with your spending.",
  },
  "/expenditures": {
    title: "Expenditures",
    subtitle: "Track and manage your expenditures.",
  },
  "/categories": {
    title: "Categories",
    subtitle: "Organize your expenditures.",
  },
  "/export": {
    title: "Export Excel",
    subtitle: "Export your expenditure records.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Manage your Spendora preferences.",
  },
  "/profile": {
    title: "Profile",
    subtitle: "Manage your profile information.",
  },
};

function Topbar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = pageTitles[location.pathname] || {
    title: "Spendora",
    subtitle: "Manage your expenditures with ease.",
  };

  return (
    <header className="spendora-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-button"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          ☰
        </button>

        <div>
          <h1>{currentPage.title}</h1>
          <p>{currentPage.subtitle}</p>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-add-button"
          onClick={() => navigate("/expenditures/add")}
        >
          <span>+</span>
          <span>Add expenditure</span>
        </button>

        <button
          type="button"
          className="topbar-profile"
          onClick={() => navigate("/profile")}
          aria-label="Open profile"
        >
          <span className="topbar-avatar">U</span>
        </button>
      </div>
    </header>
  );
}

export default Topbar;