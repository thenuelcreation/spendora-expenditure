import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Plus,
  Save,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../services/api";

const today = new Date().toISOString().slice(0, 10);
const initialForm = {
  date: today,
  categoryId: "",
  subcategoryId: "",
  amount: "",
  currency: "NGN",
  paymentMethod: "Bank Transfer",
  description: "",
  vendor: "",
  reference: "",
};

function AddExpenditure() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/categories")
      .then((result) => setCategories(result.categories))
      .catch((requestError) => setError(requestError.message));
  }, []);

  const category = categories.find((item) => item.id === form.categoryId);
  const update = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "categoryId" ? { subcategoryId: "" } : {}),
    }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/expenses", { ...form, amount: Number(form.amount) });
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
          <p className="page-eyebrow">NEW RECORD</p>
          <h1>Add Expenditure</h1>
          <p>Record a new expenditure in a few seconds.</p>
        </div>
      </header>

      <main className="spendora-page-content">
        <div className="form-page-layout">
          <form className="expense-form-card" onSubmit={handleSubmit}>
            <div className="quick-entry-banner">
              <div className="quick-entry-icon"><Plus size={18} /></div>
              <div>
                <strong>Quick entry</strong>
                <span>Keep it simple. You can add more details later.</span>
              </div>
            </div>

            {error && <div className="auth-error" role="alert">{error}</div>}

            <div className="form-section">
              <div className="form-section-title">
                <h2>Expenditure details</h2>
                <span>Required fields *</span>
              </div>
              <div className="form-grid">
                <label className="full-field">
                  Date *
                  <div className="form-input">
                    <CalendarDays size={17} />
                    <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} required />
                  </div>
                </label>
                <label>
                  Category *
                  <div className="select-input">
                    <select value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)} required>
                      <option value="">Select category</option>
                      {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </label>
                <label>
                  Sub-category *
                  <div className="select-input">
                    <select value={form.subcategoryId} onChange={(event) => update("subcategoryId", event.target.value)} required disabled={!category}>
                      <option value="">{category ? "Select sub-category" : "Select category first"}</option>
                      {category?.subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </label>
                <label>
                  Amount *
                  <div className="amount-input">
                    <span>{form.currency === "NGN" ? "₦" : form.currency}</span>
                    <input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(event) => update("amount", event.target.value)} required />
                  </div>
                </label>
                <label>
                  Currency *
                  <div className="select-input">
                    <select value={form.currency} onChange={(event) => update("currency", event.target.value)} required>
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
                    <select value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} required>
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
            </div>

            <div className="form-section">
              <div className="form-section-title">
                <h2>Additional information</h2>
                <span>Optional</span>
              </div>
              <div className="form-grid">
                <label>
                  Description
                  <textarea rows="4" maxLength="1000" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What was this expenditure for?" />
                </label>
                <label>
                  Vendor / Payee
                  <input className="plain-input" type="text" maxLength="1000" value={form.vendor} onChange={(event) => update("vendor", event.target.value)} placeholder="e.g. Figma" />
                </label>
                <label>
                  Reference
                  <input className="plain-input" type="text" maxLength="1000" value={form.reference} onChange={(event) => update("reference", event.target.value)} placeholder="Invoice or transaction reference" />
                </label>
              </div>
            </div>

            <div className="form-actions">
              <Link to="/expenditures" className="secondary-button">Cancel</Link>
              <button className="secondary-save-button" type="submit" disabled={loading || !categories.length}>
                <Save size={17} />
                {loading ? "Saving..." : "Save Expenditure"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AddExpenditure;
