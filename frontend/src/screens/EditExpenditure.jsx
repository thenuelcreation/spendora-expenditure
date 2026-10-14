import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Save,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../services/api";

function EditExpenditure() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiGet("/categories"), apiGet(`/expenses/${id}`)])
      .then(([categoryResult, expenseResult]) => {
        setCategories(categoryResult.categories);
        const expense = expenseResult.expenditure;
        setForm({
          date: expense.date,
          categoryId: expense.categoryId,
          subcategoryId: expense.subcategoryId,
          amount: expense.amount,
          currency: expense.currency,
          paymentMethod: expense.paymentMethod,
          description: expense.description,
          vendor: expense.vendor,
          reference: expense.reference,
        });
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);

  const category = categories.find((item) => item.id === form?.categoryId);
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
    setSaving(true);
    setError("");
    try {
      await apiPatch(`/expenses/${id}`, { ...form, amount: Number(form.amount) });
      navigate("/expenditures");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inner-page">
      <header className="inner-header">
        <div>
          <Link to="/expenditures" className="back-link"><ArrowLeft size={17} /> Expenditures</Link>
          <h1>Edit Expenditure</h1>
          <p>Update the information for this expenditure.</p>
        </div>
      </header>

      {error && <div className="auth-error" role="alert">{error}</div>}
      {loading ? <p>Loading expenditure...</p> : form && (
        <form className="expense-form-card" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-title"><h2>Expenditure details</h2></div>
            <div className="form-grid">
              <label>
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
                    <option value="">Select sub-category</option>
                    {category?.subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>
              <label>
                Amount *
                <div className="amount-input">
                  <span>{form.currency === "NGN" ? "₦" : form.currency}</span>
                  <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} required />
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
              <label>
                Payment Method *
                <div className="select-input">
                  <select value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} required>
                    {["Bank Transfer", "Card", "Cash", "Mobile Money", "Other"].map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>
              <label>
                Description
                <textarea rows="4" maxLength="1000" value={form.description} onChange={(event) => update("description", event.target.value)} />
              </label>
              <label>
                Vendor / Payee
                <input className="plain-input" maxLength="1000" value={form.vendor} onChange={(event) => update("vendor", event.target.value)} />
              </label>
              <label>
                Reference
                <input className="plain-input" maxLength="1000" value={form.reference} onChange={(event) => update("reference", event.target.value)} />
              </label>
            </div>
          </div>
          <div className="form-actions">
            <Link to="/expenditures" className="secondary-button">Cancel</Link>
            <button type="submit" className="secondary-save-button" disabled={saving}>
              <Save size={17} />
              {saving ? "Saving..." : "Update Expenditure"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default EditExpenditure;
