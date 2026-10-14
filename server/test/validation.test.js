const assert = require("node:assert/strict");
const test = require("node:test");
const {
  validateExpense,
  validateExpenseFilters,
  validateProfile,
} = require("../src/validation");

const validExpense = {
  date: "2026-08-20",
  categoryId: "category-1",
  subcategoryId: "subcategory-1",
  amount: 15.5,
  currency: "NGN",
  paymentMethod: "Transfer",
};

test("profile validation accepts trimmed names and valid emails", () => {
  assert.equal(validateProfile(" Ada Lovelace ", "ada@example.com"), null);
  assert.match(validateProfile("A", "ada@example.com"), /Name/);
  assert.match(validateProfile("Ada", "not-an-email"), /email/);
});

test("expenditure validation accepts supported records", () => {
  assert.equal(validateExpense(validExpense), null);
});

test("expenditure validation rejects invalid amounts, dates, and currency", () => {
  assert.match(validateExpense({ ...validExpense, amount: 0 }), /Amount/);
  assert.match(validateExpense({ ...validExpense, date: "2026-02-29" }), /date/);
  assert.match(validateExpense({ ...validExpense, currency: "XYZ" }), /currency/);
});

test("expense filters reject invalid and inverted date ranges", () => {
  assert.equal(validateExpenseFilters({ period: "3months", dateFrom: "2026-06-01" }), null);
  assert.match(validateExpenseFilters({ dateFrom: "2026-06-31" }), /Start date/);
  assert.match(validateExpenseFilters({ dateFrom: "2026-09-01", dateTo: "2026-08-01" }), /after end/);
  assert.match(validateExpenseFilters({ period: "forever" }), /date range/);
});
