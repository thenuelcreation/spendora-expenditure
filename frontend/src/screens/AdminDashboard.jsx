import {
  Activity,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Folder,
  Receipt,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPage, setSelectedPage] = useState(1);
  const [userDetails, setUserDetails] = useState(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [userDetailsError, setUserDetailsError] = useState("");
  const detailRequestId = useRef(0);

  const loadUserDetails = async (userId, page) => {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setUserDetails(null);
    setUserDetailsLoading(true);
    setUserDetailsError("");
    try {
      const result = await apiGet(`/admin/users/${encodeURIComponent(userId)}?page=${page}`);
      if (requestId === detailRequestId.current) setUserDetails(result);
    } catch (requestError) {
      if (requestId === detailRequestId.current) setUserDetailsError(requestError.message);
    } finally {
      if (requestId === detailRequestId.current) setUserDetailsLoading(false);
    }
  };

  const searchUsers = async (event) => {
    event.preventDefault();
    const search = userSearch.trim();
    if (search.length < 2) {
      setUserSearchError("Enter at least two characters to search for an account.");
      return;
    }

    setUserSearchLoading(true);
    setUserSearchError("");
    detailRequestId.current += 1;
    setUserDetails(null);
    setUserDetailsLoading(false);
    setUserDetailsError("");
    setSelectedUserId("");
    setSelectedPage(1);
    try {
      setUserSearchResults(await apiGet(`/admin/users?search=${encodeURIComponent(search)}`));
    } catch (requestError) {
      setUserSearchError(requestError.message);
    } finally {
      setUserSearchLoading(false);
    }
  };

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

  const displayedUsers = userSearchResults?.users ?? overview?.users ?? [];
  const selectUser = (userId) => {
    setSelectedPage(1);
    setSelectedUserId(userId);
    loadUserDetails(userId, 1);
  };
  const changeUserPage = (page) => {
    setSelectedPage(page);
    loadUserDetails(selectedUserId, page);
  };

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
                <div><h2>Registered users</h2><p>{userSearchResults
                  ? `Showing ${userSearchResults.users.length} of ${userSearchResults.total} matching accounts.`
                  : `Showing the ${overview.users.length} most recently registered accounts.`}</p></div>
              </div>
              <form className="admin-user-search" onSubmit={searchUsers}>
                <label htmlFor="admin-user-search">Search by name or email</label>
                <div className="admin-user-search-controls">
                  <input
                    id="admin-user-search"
                    type="search"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    maxLength={100}
                    placeholder="Enter at least 2 characters"
                  />
                  <button type="submit" disabled={userSearchLoading}>
                    <Search size={15} />
                    {userSearchLoading ? "Searching…" : "Search"}
                  </button>
                </div>
                {userSearchError && <p className="admin-inline-error" role="alert">{userSearchError}</p>}
                {userSearchResults?.truncated && (
                  <p className="admin-search-note">More than 50 accounts match. Refine the search to narrow the results.</p>
                )}
              </form>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Registered</th><th>Preferred currency</th><th>Categories</th><th>Expenditures</th><th>Last expenditure</th><th>Details</th></tr></thead>
                  <tbody>
                    {displayedUsers.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong><span>{user.email}</span></td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>{user.preferredCurrency || "—"}</td>
                        <td>{user.categoryCount}</td>
                        <td>{user.expenditureCount}</td>
                        <td>{formatDate(user.lastExpenditureAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-view-button"
                            onClick={() => selectUser(user.id)}
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!displayedUsers.length && <tr><td colSpan="7" className="admin-empty">
                      {userSearchResults ? "No accounts matched that search." : "No registered users found."}
                    </td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedUserId && (
              <section className="admin-panel admin-table-panel" aria-live="polite">
                <div className="admin-panel-heading">
                  <div>
                    <h2>Account data</h2>
                    <p>Read-only details for the selected account. Passwords and password hashes are never shown.</p>
                  </div>
                </div>
                {userDetailsLoading && <p className="admin-loading" role="status">Loading account data…</p>}
                {userDetailsError && <div className="admin-inline-error" role="alert">{userDetailsError}</div>}
                {userDetails && (
                  <>
                    <div className="admin-account-summary">
                      <div><span>Name</span><strong>{userDetails.user.name}</strong></div>
                      <div><span>Email</span><strong>{userDetails.user.email}</strong></div>
                      <div><span>Role</span><strong>{userDetails.user.role}</strong></div>
                      <div><span>Preferred currency</span><strong>{userDetails.user.preferredCurrency}</strong></div>
                      <div><span>Appearance</span><strong>{userDetails.user.appearance}</strong></div>
                      <div><span>Notifications</span><strong>{userDetails.user.notifications ? "Enabled" : "Disabled"}</strong></div>
                      <div><span>Registered</span><strong>{formatDate(userDetails.user.createdAt)}</strong></div>
                      <div><span>Last profile update</span><strong>{formatDate(userDetails.user.updatedAt)}</strong></div>
                    </div>

                    <div className="admin-detail-section">
                      <div className="admin-panel-heading">
                        <div><h3>Categories and subcategories</h3><p>{userDetails.user.categories.length} categories</p></div>
                      </div>
                      {userDetails.user.categories.length ? (
                        <div className="admin-category-list">
                          {userDetails.user.categories.map((category) => (
                            <article className="admin-category-card" key={category.id}>
                              <div>
                                <strong>{category.name}</strong>
                                <p>{category.description || "No description"}</p>
                                <small>Created {formatDate(category.createdAt)} · Updated {formatDate(category.updatedAt)}</small>
                              </div>
                              <div className="admin-subcategory-list">
                                {category.subcategories.length
                                  ? category.subcategories.map((subcategory) => (
                                    <span key={subcategory.id}>{subcategory.name}</span>
                                  ))
                                  : <span>No subcategories</span>}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : <p className="admin-empty">No categories recorded.</p>}
                    </div>

                    <div className="admin-detail-section">
                      <div className="admin-panel-heading">
                        <div>
                          <h3>Expenditures</h3>
                          <p>{userDetails.expenditures.total} records · ordered by expenditure date</p>
                        </div>
                      </div>
                      <div className="admin-table-scroll">
                        <table className="admin-table admin-expenditure-table">
                          <thead><tr><th>Date</th><th>Category</th><th>Subcategory</th><th>Amount</th><th>Payment method</th><th>Vendor</th><th>Reference</th><th>Description</th><th>Recorded</th><th>Updated</th></tr></thead>
                          <tbody>
                            {userDetails.expenditures.records.map((item) => (
                              <tr key={item.id}>
                                <td>{formatDate(item.date)}</td>
                                <td>{item.category.name}</td>
                                <td>{item.subcategory.name}</td>
                                <td>{formatMoney(item.amount, item.currency)}</td>
                                <td>{item.paymentMethod}</td>
                                <td>{item.vendor || "—"}</td>
                                <td>{item.reference || "—"}</td>
                                <td>{item.description || "—"}</td>
                                <td>{formatDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                                <td>{formatDate(item.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                              </tr>
                            ))}
                            {!userDetails.expenditures.records.length && (
                              <tr><td colSpan="10" className="admin-empty">No expenditures recorded.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {userDetails.expenditures.pageCount > 1 && (
                        <div className="admin-pagination">
                          <span>
                            Showing {(userDetails.expenditures.page - 1) * userDetails.expenditures.pageSize + 1}–{Math.min(
                              userDetails.expenditures.page * userDetails.expenditures.pageSize,
                              userDetails.expenditures.total,
                            )} of {userDetails.expenditures.total}
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => changeUserPage(selectedPage - 1)}
                              disabled={userDetailsLoading || selectedPage <= 1}
                            >
                              <ChevronLeft size={15} />
                              Previous
                            </button>
                            <span>Page {userDetails.expenditures.page} of {userDetails.expenditures.pageCount}</span>
                            <button
                              type="button"
                              onClick={() => changeUserPage(selectedPage + 1)}
                              disabled={userDetailsLoading || selectedPage >= userDetails.expenditures.pageCount}
                            >
                              Next
                              <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}

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
