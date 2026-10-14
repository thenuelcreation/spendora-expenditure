function SpendingChart({ data = [] }) {
  const hasData = data.length > 0;
  const maxValue = Math.max(...data.map((item) => Number(item.value) || 0), 1);

  return (
    <section className="dashboard-panel spending-chart">
      <div className="panel-header">
        <div>
          <h2>Spending overview</h2>
          <p>Your expenditure activity.</p>
        </div>

        <select className="chart-select" defaultValue="monthly">
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {!hasData ? (
        <div className="chart-empty">
          <div className="chart-placeholder">
            <span>No spending data</span>
          </div>
          <p>Charts will appear once you start recording expenditures.</p>
        </div>
      ) : (
        <div className="chart-container">
          <div className="chart-bars">
            {data.map((item) => {
              const height = Math.max(
                (Number(item.value) / maxValue) * 100,
                4
              );

              return (
                <div className="chart-bar-wrapper" key={item.label}>
                  <div className="chart-value">
                    {Number(item.value).toLocaleString()}
                  </div>

                  <div className="chart-bar-track">
                    <div
                      className="chart-bar"
                      style={{ height: `${height}%` }}
                    />
                  </div>

                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default SpendingChart;