import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  Download,
  Plus,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
  CreditCard,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { apiGet } from "../services/api";

const colors = ["one", "two", "three", "four", "five"];

function money(amount, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function dateLabel(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("year");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currency = user?.preferredCurrency || "NGN";

  useEffect(() => {
    apiGet(`/dashboard?period=${period}&currency=${currency}`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [period, currency]);

  const greeting = new Date().getHours() < 12
    ? "Good morning"
    : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const chartMax = Math.max(1, ...(data?.monthly || []).map((item) => item.amount));

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link to="/dashboard" className="sidebar-brand">
          <span className="sidebar-logo">S</span>
          <span><strong>Spendora</strong><small>Track. Manage. Export.</small></span>
        </Link>
        <nav className="sidebar-nav">
          <p className="nav-label">MENU</p>
          <Link className="nav-item active" to="/dashboard"><Wallet size={18} />Dashboard</Link>
          <Link className="nav-item" to="/expenditures"><Receipt size={18} />Expenditures</Link>
          <Link className="nav-item" to="/categories"><Settings size={18} />Categories</Link>
          <Link className="nav-item" to="/export"><Download size={18} />Export to Excel</Link>
          <p className="nav-label second-label">ACCOUNT</p>
          <Link className="nav-item" to="/profile"><Wallet size={18} />Profile</Link>
          <Link className="nav-item" to="/settings"><Settings size={18} />Settings</Link>
        </nav>
        <Link to="/profile" className="sidebar-user">
          <div className="avatar">{user?.name?.slice(0, 2).toUpperCase()}</div>
          <div><strong>{user?.name}</strong><small>{user?.email}</small></div>
          <ChevronDown size={15} />
        </Link>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-date"><CalendarDays size={14} />{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <h1>{greeting}, {user?.name?.split(" ")[0]}</h1>
            <p className="header-description">Here's your expenditure overview.</p>
          </div>
          <div className="header-actions">
            <Link to="/settings" className="icon-button" aria-label="Settings" title="Settings"><Bell size={19} /></Link>
            <Link to="/profile" className="header-profile">
              <div className="avatar small-avatar">{user?.name?.slice(0, 2).toUpperCase()}</div>
              <div><strong>{user?.name}</strong><small>{user?.email}</small></div>
              <ChevronDown size={15} />
            </Link>
          </div>
        </header>

        {error && <div className="auth-error" role="alert">{error}</div>}
        <section className="dashboard-actions">
          <div><h2>Overview</h2><p>Your spending at a glance in {currency}.</p></div>
          <Link to="/expenditures/add" className="primary-button"><Plus size={18} />Add Expenditure</Link>
        </section>

        <section className="stats-grid">
          <Link to="/expenditures" className="stat-card purple">
            <div className="stat-top"><div><span>Total Expenditure ({currency})</span><strong>{loading ? "…" : money(data?.summary.totalAmount, currency)}</strong></div><div className="stat-icon"><Wallet /></div></div>
            <small>{data?.summary.overallCount ?? 0} records across all currencies</small>
          </Link>
          <Link to="/expenditures" className="stat-card green">
            <div className="stat-top"><div><span>This Month ({currency})</span><strong>{loading ? "…" : money(data?.summary.monthAmount, currency)}</strong></div><div className="stat-icon"><TrendingUp /></div></div>
            <small>{data?.summary.monthChangePercent == null ? "No previous-month comparison" : `${data.summary.monthChangePercent >= 0 ? "+" : ""}${data.summary.monthChangePercent}% from last month`}</small>
          </Link>
          <Link to="/expenditures" className="stat-card blue">
            <div className="stat-top"><div><span>Transactions This Month</span><strong>{loading ? "…" : data?.summary.monthCount ?? 0}</strong></div><div className="stat-icon"><Receipt /></div></div>
            <small>{data?.summary.yearCount ?? 0} {period === "lastYear" ? "recorded last year" : "recorded this year"}</small>
          </Link>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card spending-card">
            <div className="card-header">
              <div><h3>Monthly Spending</h3><p>Track expenditure throughout the year.</p></div>
              <label className="select-button">
                <select value={period} onChange={(event) => {
                  setLoading(true);
                  setPeriod(event.target.value);
                }} aria-label="Spending period">
                  <option value="year">This Year</option>
                  <option value="lastYear">Last Year</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
            {loading ? <p>Loading chart...</p> : (
              <div className="chart">
                <div className="chart-y">
                  <span>{money(chartMax, currency)}</span><span>{money(chartMax * 0.66, currency)}</span><span>{money(chartMax * 0.33, currency)}</span><span>{money(0, currency)}</span>
                </div>
                <div className="chart-area">
                  <div className="chart-lines"><span /><span /><span /><span /></div>
                  <div className="bars">
                    {data?.monthly.map((item) => (
                      <Link key={item.month} to="/expenditures" className="bar-wrapper" title={`${item.month}: ${money(item.amount, currency)}`}>
                        <div className="bar" style={{ height: `${item.amount ? Math.max(2, item.amount / chartMax * 100) : 0}%` }} />
                        <span>{item.month}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-card category-card">
            <div className="card-header"><div><h3>By Category</h3><p>Where your money is going ({currency}).</p></div><Link to="/categories" className="view-button">View all</Link></div>
            <div className="category-content">
              <Link to="/categories" className="donut">              <div className="donut-inner"><strong>{money(data?.categories.reduce((sum, item) => sum + item.amount, 0), currency)}</strong><span>{period === "lastYear" ? "Last year" : "This year"}</span></div></Link>
              <div className="category-list">
                {data?.categories.slice(0, 5).map((category, index) => (
                  <Link to="/categories" className="category-row category-row-link" key={category.name}>
                    <span className={`category-dot ${colors[index % colors.length]}`} />
                    <span className="category-name">{category.name}</span>
                    <strong>{category.percentage}%</strong>
                    <ArrowUpRight size={13} />
                  </Link>
                ))}
                {!data?.categories.length && <p>No category spending recorded this year.</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="dashboard-card latest-card">
            <div className="card-header"><div><h3>Latest Expenditure</h3><p>Your most recent transaction.</p></div><Link to="/expenditures" className="view-button">View all</Link></div>
            {data?.recent[0] ? (
              <Link to={`/expenditures/edit/${data.recent[0].id}`} className="latest-expense">
                <div className="expense-icon"><CreditCard size={19} /></div>
                <div className="expense-info"><strong>{data.recent[0].subcategory.name}</strong><span>{data.recent[0].category.name}</span></div>
                <div className="expense-amount"><strong>{money(data.recent[0].amount, data.recent[0].currency)}</strong><span>{dateLabel(data.recent[0].date)}</span></div>
                <ArrowUpRight size={15} />
              </Link>
            ) : <p>No expenditures recorded yet.</p>}
          </div>
          <div className="dashboard-card quick-card">
            <div className="card-header"><div><h3>Quick Actions</h3><p>Get things done quickly.</p></div></div>
            <div className="quick-actions">
              <Link to="/expenditures/add" className="quick-action primary"><Plus size={18} />Add Expenditure</Link>
              <Link to="/expenditures" className="quick-action"><Receipt size={18} />View Expenditures</Link>
              <Link to="/export" className="quick-action export"><Download size={18} />Export to Excel</Link>
            </div>
          </div>
        </section>

        <section className="dashboard-card recent-table-card">
          <div className="card-header"><div><h3>Recent Expenditures</h3><p>Your latest recorded transactions.</p></div><Link to="/expenditures" className="view-button">See all <ArrowUpRight size={14} /></Link></div>
          <div className="expense-table">
            <div className="table-head"><span>EXPENDITURE</span><span>CATEGORY</span><span>DATE</span><span>AMOUNT</span></div>
            {data?.recent.map((expense) => (
              <Link to={`/expenditures/edit/${expense.id}`} className="table-row" key={expense.id}>
                <div className="table-expense"><div className="table-icon"><CreditCard size={16} /></div><strong>{expense.subcategory.name}</strong></div>
                <span>{expense.category.name}</span><span>{dateLabel(expense.date)}</span>
                <strong className="table-amount">{money(expense.amount, expense.currency)}</strong><ArrowUpRight className="table-row-arrow" size={15} />
              </Link>
            ))}
            {!data?.recent.length && !loading && <p>No expenditures recorded yet.</p>}
          </div>
        </section>
      </main>

      <nav className="mobile-bottom-nav">
        <Link className="mobile-nav-item active" to="/dashboard"><Wallet size={19} /><span>Dashboard</span></Link>
        <Link className="mobile-nav-item" to="/expenditures"><Receipt size={19} /><span>Expenditures</span></Link>
        <Link className="mobile-add" to="/expenditures/add" aria-label="Add expenditure"><Plus size={23} /></Link>
        <Link className="mobile-nav-item" to="/categories"><Settings size={19} /><span>Categories</span></Link>
        <Link className="mobile-nav-item" to="/settings"><Settings size={19} /><span>Settings</span></Link>
      </nav>
    </div>
  );
}

export default Dashboard;
