import { useNavigate } from "react-router-dom";

function QuickActionCard({
  title,
  description,
  icon = "+",
  path,
  onClick,
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (path) {
      navigate(path);
    }
  };

  return (
    <button
      type="button"
      className="quick-action-card"
      onClick={handleClick}
    >
      <div className="quick-action-icon">{icon}</div>

      <div className="quick-action-content">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <span className="quick-action-arrow">→</span>
    </button>
  );
}

export default QuickActionCard;