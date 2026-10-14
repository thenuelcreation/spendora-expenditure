import { useNavigate } from "react-router-dom";

function RecentExpenditure({ expenditures = [] }) {
  const navigate = useNavigate();

  const formatAmount = (amount, currency) => {
    return `${currency || "USD"} ${Number(amount || 0).toLocaleString()}`;
  };

  return (
    <section className="dashboard-panel recent-expenditure">
      <div className="panel-header">
        <div>
          <h2>Recent expenditures</h2>
          <p>Your latest recorded expenditures.</p>
        </div>

        <button
          type="button"
          className="panel-link"
          onClick={() => navigate("/expenditures")}
        >
          View all
        </button>
      </div>

      {expenditures.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <h3>No expenditures yet</h3>
          <p>Your recent expenditures will appear here.</p>

          <button
            type="button"
            onClick={() => navigate("/expenditures/add")}
          >
            Add expenditure
          </button>
        </div>
      ) : (
        <div className="recent-list">
          {expenditures.slice(0, 5).map((item) => (
            <div className="recent-item" key={item.id}>
              <div className="recent-item-icon">
                {item.category?.charAt(0) || "E"}
              </div>

              <div className="recent-item-info">
                <strong>{item.category || "Uncategorized"}</strong>
                <span>
                  {item.subcategory || "No sub-category"} ·{" "}
                  {item.date || "No date"}
                </span>
              </div>

              <strong className="recent-item-amount">
                {formatAmount(item.amount, item.currency)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default RecentExpenditure;