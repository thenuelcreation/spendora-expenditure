const currencies = new Set(["NGN", "USD", "GBP", "EUR"]);
const paymentMethods = new Set([
  "Bank Transfer",
  "Transfer",
  "Cash",
  "Card",
  "Mobile Money",
  "POS",
  "Direct Debit",
  "Other",
]);

function validateProfile(name, email) {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return "Name must be between 2 and 100 characters.";
  }
  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "Enter a valid email address.";
  }
  return null;
}

function isDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateExpense(body) {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999.99) {
    return "Amount must be greater than zero and within the supported limit.";
  }
  if (!isDateOnly(body.date)) return "Enter a valid expenditure date.";
  if (typeof body.categoryId !== "string" || !body.categoryId) return "Select a category.";
  if (typeof body.subcategoryId !== "string" || !body.subcategoryId) {
    return "Select a sub-category.";
  }
  if (!currencies.has(body.currency)) return "Select a supported currency.";
  if (!paymentMethods.has(body.paymentMethod)) return "Select a supported payment method.";

  for (const field of ["description", "vendor", "reference"]) {
    if (body[field] != null && (typeof body[field] !== "string" || body[field].length > 1000)) {
      return `${field} must be 1,000 characters or fewer.`;
    }
  }
  return null;
}

function validateExpenseFilters(query) {
  if (query.dateFrom && !isDateOnly(query.dateFrom)) return "Start date is invalid.";
  if (query.dateTo && !isDateOnly(query.dateTo)) return "End date is invalid.";
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    return "Start date must not be after end date.";
  }
  if (query.period && !["all", "month", "3months", "year"].includes(query.period)) {
    return "Select a supported date range.";
  }
  return null;
}

module.exports = {
  currencies,
  validateProfile,
  validateExpense,
  validateExpenseFilters,
};
