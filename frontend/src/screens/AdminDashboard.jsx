import {
  Activity,
  ArrowLeft,
  CreditCard,
  Folder,
  Receipt,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../services/api";

function formatDate(value, options = { dateStyle: "medium" }) {
  if (!value) return "No expenditure recorded";
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

function formatMoney(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${value} ${currency}`;
  }
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshOverview = async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await apiGet("/admin/overview"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    apiGet("/admin/overview")
      .then((result) => {
        if (active) {
          setOverview(result);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="spendora-page admin-screen">
      <header className="spendora-page-header">
        <div className="spendora-page-header-left">
          <button
            type="button"
            className="spendora-back-button"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="spendora-page-heading">
            <p className="page-eyebrow">SPENDORA ADMIN</p>
            <h1>Admin overview</h1>
            <p>Accounts and product activity from saved records.</p>
          </div>
        </div>
        <button
          type="button"
          className="spendora-page-header-action"
          onClick={refreshOverview}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "admin-spin" : ""} />
          Refresh
        </button>
      </header>

      <main className="spendora-page-content">
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        {loading && !overview ? (
          <p className="admin-loading" role="status">Loading admin overview…</p>
        ) : overview ? (
          <>
            <section className="admin-stats-grid" aria-label="Account overview">
              <article className="admin-stat-card">
                <span className="admin-stat-icon purple"><Users size={19} /></span>
                <div><p>Registered accounts</p><strong>{overview.summary.userCount}</strong></div>
              </article>
              <article className="admin-stat-card">
                <span className="admin-stat-icon green"><Activity size={19} /></span>
                <div><p>New accounts · last 30 days</p><strong>{overview.summary.newUsersLast30Days}</strong></div>
              </article>
              <article className="admin-stat-card">
                <span className="admin-stat-icon blue"><Receipt size={19} /></span>
                <div><p>Expenditure records</p><strong>{overview.summary.expenditureCount}</strong></div>
              </article>
              <article className="admin-stat-card">
                <span className="admin-stat-icon amber"><Folder size={19} /></span>
                <div><p>User-created categories</p><strong>{overview.summary.categoryCount}</strong></div>
              </article>
            </section>

            <section className="admin-panels">
              <article className="admin-panel">
                <div className="admin-panel-heading">
                  <div><h2>Spending by currency</h2><p>Totals are kept separate; currencies are not converted.</p></div>
                </div>
                {overview.spendingByCurrency.length ? (
                  <div className="admin-breakdown-list">
                    {overview.spendingByCurrency.map((item) => (
                      <div className="admin-breakdown-row" key={item.currency}>
                        <span className="admin-breakdown-mark">{item.currency}</span>
                        <div className="admin-breakdown-copy"><strong>{formatMoney(item.total, item.currency)}</strong><small>{item.recordCount} records</small></div>
                      </div>
                    ))}
                  </div>
                ) : <p className="admin-empty">No expenditure records yet.</p>}
              </article>

              <article className="admin-panel">
                <div className="admin-panel-heading">
                  <div><h2>Product usage</h2><p>Most-used categories and payment methods.</p></div>
                </div>
                <div className="admin-usage-columns">
                  <div>
                    <h3>Top categories</h3>
                    {overview.topCategories.length ? overview.topCategories.map((item) => (
                      <div className="admin-usage-row" key={item.name}><span>{item.name}</span><strong>{item.recordCount}</strong></div>
                    )) : <p className="admin-empty">No category usage yet.</p>}
                  </div>
                  <div>
                    <h3>Payment methods</h3>
                    {overview.paymentMethods.length ? overview.paymentMethods.map((item) => (
                      <div className="admin-usage-row" key={item.name}><span>{item.name}</span><strong>{item.recordCount}</strong></div>
                    )) : <p className="admin-empty">No payment methods used yet.</p>}
                  </div>
                </div>
              </article>
            </section>

            <section className="admin-panel admin-table-panel">
              <div className="admin-panel-heading">
                <div><h2>Registered users</h2><p>Showing the {overview.users.length} most recently registered accounts.</p></div>
              </div>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Registered</th><th>Preferred currency</th><th>Categories</th><th>Expenditures</th><th>Last expenditure</th></tr></thead>
                  <tbody>
                    {overview.users.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong><span>{user.email}</span></td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>{user.preferredCurrency}</td>
                        <td>{user.categoryCount}</td>
                        <td>{user.expenditureCount}</td>
                        <td>{formatDate(user.lastExpenditureAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                      </tr>
                    ))}
                    {!overview.users.length && <tr><td colSpan="6" className="admin-empty">No registered users found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel admin-table-panel">
              <div className="admin-panel-heading">
                <div><h2>Recent expenditure activity</h2><p>Record activity only—not online presence or login history.</p></div>
              </div>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Category</th><th>Amount</th><th>Expenditure date</th><th>Recorded</th></tr></thead>
                  <tbody>
                    {overview.recentActivity.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.userName}</strong><span>{item.userEmail}</span></td>
                        <td>{item.category}</td>
                        <td>{formatMoney(item.amount, item.currency)}</td>
                        <td>{formatDate(item.expenditureDate)}</td>
                        <td>{formatDate(item.recordedAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                      </tr>
                    ))}
                    {!overview.recentActivity.length && <tr><td colSpan="5" className="admin-empty">No recent expenditure activity.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="admin-future-note">
              <CreditCard size={18} />
              <div><strong>Subscriptions are not enabled yet</strong><p>Plan, renewal, and payment details can be added here when Spendora introduces subscriptions.</p></div>
            </aside>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default AdminDashboard;
