function CategoryBreakdown({ categories = [] }) {
  const total = categories.reduce(
    (sum, category) => sum + Number(category.amount || 0),
    0
  );

  return (
    <section className="dashboard-panel category-breakdown">
      <div className="panel-header">
        <div>
          <h2>Category breakdown</h2>
          <p>Where your money is going.</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state compact">
          <div className="empty-state-icon">◈</div>
          <p>No category data available yet.</p>
        </div>
      ) : (
        <div className="category-breakdown-list">
          {categories.map((category) => {
            const percentage =
              total > 0 ? (Number(category.amount) / total) * 100 : 0;

            return (
              <div className="category-breakdown-item" key={category.name}>
                <div className="category-breakdown-header">
                  <div>
                    <span className="category-dot" />
                    <strong>{category.name}</strong>
                  </div>

                  <span>{percentage.toFixed(0)}%</span>
                </div>

                <div className="category-progress">
                  <div
                    className="category-progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="category-amount">
                  {Number(category.amount).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CategoryBreakdown;