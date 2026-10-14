import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Download,
  Edit3,
  Filter,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiDelete, apiGet } from "../services/api";
import { useAuth } from "../auth/useAuth";

const pageSize = 10;

function money(amount, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function displayTotals(totals) {
  const entries = Object.entries(totals || {}).filter(([, amount]) => Number(amount) !== 0);
  return entries.length
    ? entries.map(([currency, amount]) => money(amount, currency)).join(" · ")
    : money(0, "NGN");
}

function Expenditures() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState({ items: [], total: 0, summary: {} });
  const [monthAmount, setMonthAmount] = useState(null);
  const [filters, setFilters] = useState({ search: "", categoryId: "", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/categories")
      .then(({ categories: items }) => setCategories(items))
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    let active = true;
    apiGet(`/dashboard?currency=${user?.preferredCurrency || "NGN"}`)
      .then(({ summary }) => {
        if (active) setMonthAmount(summary.monthAmount);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [user?.preferredCurrency]);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      apiGet(`/expenses?${params}`, { signal: controller.signal })
        .then((data) => {
          if (!controller.signal.aborted) {
            setResult(data);
            setError("");
          }
        })
        .catch((requestError) => {
          if (!controller.signal.aborted) setError(requestError.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, filters.search ? 250 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [filters, page]);

  const updateFilter = (name, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  };
  const pages = Math.max(1, Math.ceil(result.total / pageSize));

  const deleteExpense = async (expense) => {
    if (!window.confirm("Delete this expenditure? This cannot be undone.")) return;
    try {
      await apiDelete(`/expenses/${expense.id}`);
      setResult((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== expense.id),
        total: Math.max(0, current.total - 1),
        summary: { ...current.summary, totalCount: Math.max(0, current.summary.totalCount - 1) },
      }));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="spendora-page expenditures-screen">
      <header className="spendora-page-header">
        <div className="spendora-page-header-left">
          <button type="button" className="spendora-back-button" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard" title="Back to dashboard">
            <ArrowLeft size={18} />
          </button>
          <div className="spendora-page-heading">
            <p className="page-eyebrow">FINANCIAL RECORDS</p>
            <h1>Expenditures</h1>
            <p>View, search and manage your expenditure records.</p>
          </div>
        </div>
        <Link to="/expenditures/add" className="spendora-page-header-action">
          <Plus size={17} /><span>Add Expenditure</span>
        </Link>
      </header>

      <main className="spendora-page-content">
        {error && <div className="auth-error" role="alert">{error}</div>}
        <section className="summary-strip">
          <div><span>Total records</span><strong>{result.summary.totalCount ?? "—"}</strong></div>
          <div><span>This month ({user?.preferredCurrency || "NGN"})</span><strong>{monthAmount == null ? "—" : money(monthAmount, user?.preferredCurrency || "NGN")}</strong></div>
          <div><span>Total expenditure in view</span><strong>{displayTotals(result.summary.totalsByCurrency)}</strong></div>
        </section>

        <section className="history-card expenditures-card">
          <div className="history-toolbar">
            <div className="search-box">
              <Search size={17} />
              <input type="search" placeholder="Search category, vendor, description, or amount..." value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
            </div>
            <label className="filter-button">
              <CalendarDays size={16} /><span>From</span>
              <input aria-label="Start date" type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
            </label>
            <label className="filter-button">
              <CalendarDays size={16} /><span>To</span>
              <input aria-label="End date" type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
            </label>
            <label className="filter-button">
              <Filter size={16} />
              <select aria-label="Filter by category" value={filters.categoryId} onChange={(event) => updateFilter("categoryId", event.target.value)}>
                <option value="">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <ChevronDown size={14} />
            </label>
            <Link to="/export" className="export-button"><Download size={16} /><span>Export</span></Link>
          </div>

          <div className="records-table expenditures-table-scroll">
            <table className="expenditures-records-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Category</th>
                  <th scope="col">Sub-category</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Payment</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="records-empty" colSpan="6">Loading expenditures...</td></tr>
                ) : result.items.length === 0 ? (
                  <tr><td className="records-empty" colSpan="6">No expenditures match these filters.</td></tr>
                ) : result.items.map((expense) => (
                  <tr key={expense.id}>
                    <td data-label="Date">{new Date(`${expense.date}T00:00:00`).toLocaleDateString()}</td>
                    <td className="category-cell" data-label="Category">{expense.category.name}</td>
                    <td data-label="Sub-category">{expense.subcategory.name}</td>
                    <td className="amount-cell" data-label="Amount">{money(expense.amount, expense.currency)}</td>
                    <td data-label="Payment">{expense.paymentMethod}</td>
                    <td className="expenditure-table-actions-cell" data-label="Actions">
                      <div className="expenditure-table-actions">
                        <Link to={`/expenditures/edit/${expense.id}`} title="Edit expenditure" aria-label="Edit expenditure"><Edit3 size={15} /></Link>
                        <button type="button" title="Delete expenditure" aria-label="Delete expenditure" onClick={() => deleteExpense(expense)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>{result.total ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, result.total)} of ${result.total} records` : "No records"}</span>
            <div>
              <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>‹</button>
              <button type="button" className="current-page" aria-current="page">{page}</button>
              <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>›</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Expenditures;
