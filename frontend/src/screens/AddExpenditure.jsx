import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../services/api";

const today = new Date().toISOString().slice(0, 10);
const createEntry = () => ({
  id: crypto.randomUUID(),
  date: today,
  categoryId: "",
  subcategoryId: "",
  amount: "",
  currency: "NGN",
  paymentMethod: "Bank Transfer",
  description: "",
  vendor: "",
  reference: "",
  showAdditionalInfo: false,
});

function AddExpenditure() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([createEntry()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/categories")
      .then((result) => setCategories(result.categories))
      .catch((requestError) => setError(requestError.message));
  }, []);

  const update = (id, name, value) => {
    setEntries((previous) =>
      previous.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              [name]: value,
              ...(name === "categoryId" ? { subcategoryId: "" } : {}),
            }
          : entry,
      ),
    );
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/expenses/bulk", {
        expenses: entries.map((entry) => ({
          date: entry.date,
          categoryId: entry.categoryId,
          subcategoryId: entry.subcategoryId,
          amount: Number(entry.amount),
          currency: entry.currency,
          paymentMethod: entry.paymentMethod,
          description: entry.description,
          vendor: entry.vendor,
          reference: entry.reference,
        })),
      });
      navigate("/expenditures");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="spendora-page add-expenditure-screen">
      <header className="add-expenditure-page-header">
        <button
          className="spendora-back-button add-expenditure-back-button"
          onClick={() => navigate("/expenditures")}
          aria-label="Go back to expenditures"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="add-expenditure-page-heading">
          <p className="page-eyebrow">NEW RECORDS</p>
          <h1>Quick Entry</h1>
          <p>Add one or more expenditures with only the details you need.</p>
        </div>
      </header>

      <main className="spendora-page-content">
        <div className="form-page-layout">
          <form className="expense-form-card" onSubmit={handleSubmit}>
            <button
              className="quick-entry-banner"
              type="button"
              onClick={() => setEntries((previous) => [...previous, createEntry()])}
              disabled={loading || !categories.length}
            >
              <span className="quick-entry-icon"><Plus size={18} /></span>
              <span className="quick-entry-copy">
                <strong>Quick entry</strong>
                <span>Click to add another record. Optional details are hidden by default.</span>
              </span>
            </button>

            {error && <div className="auth-error" role="alert">{error}</div>}

            {entries.map((entry, index) => {
              const category = categories.find((item) => item.id === entry.categoryId);
              return (
                <section className="form-section quick-entry-record" key={entry.id}>
                  <div className="form-section-title">
                    <h2>Record {index + 1}</h2>
                    <div className="quick-entry-record-actions">
                      {entries.length > 1 && (
                        <button
                          className="quick-entry-remove"
                          type="button"
                          onClick={() => setEntries((previous) => previous.filter((item) => item.id !== entry.id))}
                          aria-label={`Remove record ${index + 1}`}
                          disabled={loading}
                        >
                          <Trash2 size={15} />
                          Remove
                        </button>
                      )}
                      <button
                        className="quick-entry-details-toggle"
                        type="button"
                        aria-expanded={entry.showAdditionalInfo}
                        aria-controls={`additional-information-${entry.id}`}
                        onClick={() => update(entry.id, "showAdditionalInfo", !entry.showAdditionalInfo)}
                        disabled={loading}
                      >
                        {entry.showAdditionalInfo ? "Hide optional details" : "Add optional details"}
                        <ChevronDown size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label className="full-field">
                      Date *
                      <div className="form-input">
                        <CalendarDays size={17} />
                        <input type="date" value={entry.date} onChange={(event) => update(entry.id, "date", event.target.value)} required />
                      </div>
                    </label>
                    <label>
                      Category *
                      <div className="select-input">
                        <select value={entry.categoryId} onChange={(event) => update(entry.id, "categoryId", event.target.value)} required>
                          <option value="">Select category</option>
                          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                        <ChevronDown size={16} />
                      </div>
                    </label>
                    <label>
                      Sub-category *
                      <div className="select-input">
                        <select value={entry.subcategoryId} onChange={(event) => update(entry.id, "subcategoryId", event.target.value)} required disabled={!category}>
                          <option value="">{category ? "Select sub-category" : "Select category first"}</option>
                          {category?.subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                        <ChevronDown size={16} />
                      </div>
                    </label>
                    <label>
                      Amount *
                      <div className="amount-input">
                        <span>{entry.currency === "NGN" ? "₦" : entry.currency}</span>
                        <input type="number" min="0.01" step="0.01" placeholder="0.00" value={entry.amount} onChange={(event) => update(entry.id, "amount", event.target.value)} required />
                      </div>
                    </label>
                    <label>
                      Currency *
                      <div className="select-input">
                        <select value={entry.currency} onChange={(event) => update(entry.id, "currency", event.target.value)} required>
                          <option value="NGN">NGN — Nigerian Naira</option>
                          <option value="USD">USD — US Dollar</option>
                          <option value="GBP">GBP — British Pound</option>
                          <option value="EUR">EUR — Euro</option>
                        </select>
                        <ChevronDown size={16} />
                      </div>
                    </label>
                    <label className="full-field">
                      Mode of Payment *
                      <div className="select-input">
                        <select value={entry.paymentMethod} onChange={(event) => update(entry.id, "paymentMethod", event.target.value)} required>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Card">Card</option>
                          <option value="Cash">Cash</option>
                          <option value="Mobile Money">Mobile Money</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown size={16} />
                      </div>
                    </label>
                  </div>

                  <div
                    className="quick-entry-additional-info"
                    id={`additional-information-${entry.id}`}
                    hidden={!entry.showAdditionalInfo}
                  >
                    <div className="form-grid">
                      <label>
                        Description
                        <textarea rows="4" maxLength="1000" value={entry.description} onChange={(event) => update(entry.id, "description", event.target.value)} placeholder="What was this expenditure for?" />
                      </label>
                      <label>
                        Vendor / Payee
                        <input className="plain-input" type="text" maxLength="1000" value={entry.vendor} onChange={(event) => update(entry.id, "vendor", event.target.value)} placeholder="e.g. Figma" />
                      </label>
                      <label>
                        Reference
                        <input className="plain-input" type="text" maxLength="1000" value={entry.reference} onChange={(event) => update(entry.id, "reference", event.target.value)} placeholder="Invoice or transaction reference" />
                      </label>
                    </div>
                  </div>
                </section>
              );
            })}

            <div className="form-actions">
              <Link to="/expenditures" className="secondary-button">Cancel</Link>
              <button className="secondary-save-button" type="submit" disabled={loading || !categories.length}>
                <Save size={17} />
                {loading ? "Saving..." : `Save ${entries.length} ${entries.length === 1 ? "Record" : "Records"}`}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AddExpenditure;
