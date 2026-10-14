import { useEffect, useState } from "react";
import { apiGet } from "../../services/api";

const defaultForm = {
  date: new Date().toISOString().split("T")[0],
  categoryId: "",
  subcategoryId: "",
  amount: "",
  currency: "NGN",
  paymentMethod: "",
  description: "",
  vendor: "",
  reference: "",
};

function ExpenditureForm({
  initialData = {},
  onSubmit,
  loading = false,
  submitLabel = "Save expenditure",
}) {
  const [form, setForm] = useState({
    ...defaultForm,
    ...initialData,
  });

  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    apiGet("/categories")
      .then(({ categories: items }) => setCategories(items))
      .catch((error) => setErrors((current) => ({ ...current, categories: error.message })));
  }, []);

  const category = categories.find((item) => item.id === form.categoryId);
  const subcategories = category?.subcategories || [];

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "categoryId" ? { subcategoryId: "" } : {}),
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.date) newErrors.date = "Date is required.";
    if (!form.categoryId) newErrors.categoryId = "Category is required.";
    if (!form.subcategoryId) {
      newErrors.subcategoryId = "Sub-category is required.";
    }

    if (!form.amount || Number(form.amount) <= 0) {
      newErrors.amount = "Enter an amount greater than 0.";
    }

    if (!form.currency) newErrors.currency = "Currency is required.";
    if (!form.paymentMethod) {
      newErrors.paymentMethod = "Payment method is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) return;

    if (onSubmit) {
      onSubmit({
        ...form,
        amount: Number(form.amount),
      });
    }
  };

  return (
    <form className="expenditure-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <div className="form-section-heading">
          <h2>Expenditure details</h2>
          <p>Enter the basic details of your expenditure.</p>
        </div>

        <div className="form-grid">
          {errors.categories && <p className="form-error full-width">{errors.categories}</p>}
          <div className="form-field">
            <label htmlFor="date">
              Date <span>*</span>
            </label>

            <input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
            />

            {errors.date && <small className="form-error">{errors.date}</small>}
          </div>

          <div className="form-field">
            <label             htmlFor="categoryId">
              Category <span>*</span>
            </label>

            <select
              id="categoryId"
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
            >
              <option value="">Select category</option>

              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            {errors.categoryId && (
              <small className="form-error">{errors.categoryId}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="subcategory">
              Sub-category <span>*</span>
            </label>

            <select
              id="subcategory"
              name="subcategoryId"
              value={form.subcategoryId}
              onChange={handleChange}
              disabled={!form.categoryId}
            >
              <option value="">Select sub-category</option>

              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>

            {errors.subcategoryId && (
              <small className="form-error">{errors.subcategoryId}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="amount">
              Amount <span>*</span>
            </label>

            <input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
            />

            {errors.amount && (
              <small className="form-error">{errors.amount}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="currency">
              Currency <span>*</span>
            </label>

            <select
              id="currency"
              name="currency"
              value={form.currency}
              onChange={handleChange}
            >
              <option value="NGN">NGN — Nigerian Naira</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="EUR">EUR — Euro</option>
            </select>

            {errors.currency && (
              <small className="form-error">{errors.currency}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="paymentMethod">
              Mode of payment <span>*</span>
            </label>

            <select
              id="paymentMethod"
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
            >
              <option value="">Select payment method</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Other">Other</option>
            </select>

            {errors.paymentMethod && (
              <small className="form-error">{errors.paymentMethod}</small>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-heading">
          <h2>Additional information</h2>
          <p>These fields are optional.</p>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="vendor">Vendor / Payee</label>

            <input
              id="vendor"
              name="vendor"
              type="text"
              placeholder="Enter vendor or payee"
              value={form.vendor}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="reference">Reference</label>

            <input
              id="reference"
              name="reference"
              type="text"
              placeholder="Invoice or transaction reference"
              value={form.reference}
              onChange={handleChange}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="description">Description</label>

            <textarea
              id="description"
              name="description"
              rows="4"
              placeholder="Add a short description..."
              value={form.description}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => window.history.back()}
        >
          Cancel
        </button>

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default ExpenditureForm;