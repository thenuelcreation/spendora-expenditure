package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type Expense struct {
	ID              string    `json:"id"`
	Date            string    `json:"date"`
	CategoryID      string    `json:"categoryId"`
	CategoryName    string    `json:"categoryName"`
	SubcategoryID   string    `json:"subcategoryId"`
	SubcategoryName string    `json:"subcategoryName"`
	Amount          string    `json:"amount"`
	Currency        string    `json:"currency"`
	PaymentMethod   string    `json:"paymentMethod"`
	Vendor          string    `json:"vendor"`
	Reference       string    `json:"reference"`
	Description     string    `json:"description"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

const expenseColumns = `SELECT e.id::text, to_char(e.spent_on, 'YYYY-MM-DD'), c.id::text, c.name, sc.id::text, sc.name,
	e.amount::text, e.currency, e.payment_method, e.vendor, e.reference, e.description, e.created_at, e.updated_at `

const expenseFrom = `FROM expenditures e
	JOIN categories c ON c.id = e.category_id
	JOIN subcategories sc ON sc.id = e.subcategory_id `

func scanExpense(row rowScanner) (Expense, error) {
	var e Expense
	err := row.Scan(&e.ID, &e.Date, &e.CategoryID, &e.CategoryName, &e.SubcategoryID, &e.SubcategoryName,
		&e.Amount, &e.Currency, &e.PaymentMethod, &e.Vendor, &e.Reference, &e.Description, &e.CreatedAt, &e.UpdatedAt)
	return e, err
}

func (s *Server) queryExpenses(ctx context.Context, sql string, args ...any) ([]Expense, error) {
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Expense{}
	for rows.Next() {
		e, err := scanExpense(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Server) getExpense(ctx context.Context, userID, id string) (Expense, error) {
	return scanExpense(s.pool.QueryRow(ctx,
		expenseColumns+expenseFrom+`WHERE e.id = $1::uuid AND e.user_id = $2::uuid`, id, userID))
}

// ---- filtering ----

type expenseFilter struct {
	q          string
	categoryID string
	currency   string
	from       string // inclusive, YYYY-MM-DD
	to         string // exclusive, YYYY-MM-DD
}

const likeEscape = ` ESCAPE '\'`

// where builds a parameterised WHERE clause; $1 is always the user id.
func (f expenseFilter) where(userID string) (string, []any) {
	args := []any{userID}
	clauses := []string{"e.user_id = $1::uuid"}
	add := func(clause string, v any) {
		args = append(args, v)
		clauses = append(clauses, strings.ReplaceAll(clause, "?", "$"+strconv.Itoa(len(args))))
	}
	if f.categoryID != "" {
		add("e.category_id = ?::uuid", f.categoryID)
	}
	if f.currency != "" {
		add("e.currency = ?::text", f.currency)
	}
	if f.from != "" {
		add("e.spent_on >= ?::date", f.from)
	}
	if f.to != "" {
		add("e.spent_on < ?::date", f.to)
	}
	if f.q != "" {
		args = append(args, "%"+escapeLike(f.q)+"%")
		p := "$" + strconv.Itoa(len(args))
		cols := []string{"e.vendor", "e.reference", "e.description", "c.name", "sc.name"}
		parts := make([]string, len(cols))
		for i, col := range cols {
			parts[i] = col + " ILIKE " + p + likeEscape
		}
		clauses = append(clauses, "("+strings.Join(parts, " OR ")+")")
	}
	return strings.Join(clauses, " AND "), args
}

// periodBounds converts a named period into [from, to) dates in UTC.
func periodBounds(period string, now time.Time) (from, to string, ok bool) {
	const layout = "2006-01-02"
	now = now.UTC()
	y, m, _ := now.Date()
	monthStart := time.Date(y, m, 1, 0, 0, 0, 0, time.UTC)

	switch period {
	case "", "all":
		return "", "", true
	case "this_month", "month":
		return monthStart.Format(layout), monthStart.AddDate(0, 1, 0).Format(layout), true
	case "last_3_months", "3months":
		// the current month plus the two before it
		return monthStart.AddDate(0, -2, 0).Format(layout), monthStart.AddDate(0, 1, 0).Format(layout), true
	case "this_year", "year":
		return time.Date(y, 1, 1, 0, 0, 0, 0, time.UTC).Format(layout),
			time.Date(y+1, 1, 1, 0, 0, 0, 0, time.UTC).Format(layout), true
	}
	return "", "", false
}

func parseExpenseFilter(r *http.Request, now time.Time) (expenseFilter, map[string]string) {
	qs := r.URL.Query()
	fields := map[string]string{}
	var f expenseFilter

	f.q = strings.TrimSpace(qs.Get("q"))
	if len([]rune(f.q)) > 100 {
		fields["q"] = "Search text is too long (max 100 characters)."
	}
	if v := qs.Get("category_id"); v != "" {
		if !isUUID(v) {
			fields["category_id"] = "Invalid category."
		} else {
			f.categoryID = v
		}
	}
	if v := strings.ToUpper(qs.Get("currency")); v != "" {
		if !currencies[v] {
			fields["currency"] = "Choose NGN, USD, GBP or EUR."
		} else {
			f.currency = v
		}
	}

	fromRaw, toRaw := qs.Get("from"), qs.Get("to")
	if fromRaw != "" || toRaw != "" {
		if fromRaw != "" {
			if d, ok := parseDate(fromRaw); ok {
				f.from = d
			} else {
				fields["from"] = "Enter a valid date (YYYY-MM-DD)."
			}
		}
		if toRaw != "" {
			if d, ok := parseDate(toRaw); ok {
				t, _ := time.Parse("2006-01-02", d)
				f.to = t.AddDate(0, 0, 1).Format("2006-01-02") // make the end date inclusive
			} else {
				fields["to"] = "Enter a valid date (YYYY-MM-DD)."
			}
		}
		if f.from != "" && f.to != "" && f.from >= f.to {
			fields["to"] = "End date must not be before the start date."
		}
	} else {
		from, to, ok := periodBounds(qs.Get("period"), now)
		if !ok {
			fields["period"] = "Use all, this_month, last_3_months or this_year."
		}
		f.from, f.to = from, to
	}
	return f, fields
}

type currencyTotal struct {
	Currency string `json:"currency"`
	Total    string `json:"total"`
	Count    int64  `json:"count"`
}

// currencyTotals returns per-currency totals for a filter and the overall record count.
func (s *Server) currencyTotals(ctx context.Context, where string, args []any) ([]currencyTotal, int64, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT e.currency, SUM(e.amount)::text, COUNT(*) `+expenseFrom+` WHERE `+where+
			` GROUP BY e.currency ORDER BY e.currency`, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	totals := []currencyTotal{}
	var count int64
	for rows.Next() {
		var t currencyTotal
		if err := rows.Scan(&t.Currency, &t.Total, &t.Count); err != nil {
			return nil, 0, err
		}
		count += t.Count
		totals = append(totals, t)
	}
	return totals, count, rows.Err()
}

func intParam(r *http.Request, name string, def, min, max int) (int, bool) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return def, true
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < min || n > max {
		return 0, false
	}
	return n, true
}

// ---- handlers ----

type listExpensesResponse struct {
	Items      []Expense       `json:"items"`
	Page       int             `json:"page"`
	PageSize   int             `json:"pageSize"`
	TotalItems int64           `json:"totalItems"`
	TotalPages int             `json:"totalPages"`
	Totals     []currencyTotal `json:"totals"`
}

func (s *Server) handleListExpenses(w http.ResponseWriter, r *http.Request, userID string) {
	filter, fields := parseExpenseFilter(r, time.Now())
	page, ok := intParam(r, "page", 1, 1, 1_000_000)
	if !ok {
		fields["page"] = "Page must be a positive whole number."
	}
	pageSize, ok := intParam(r, "page_size", 20, 1, 100)
	if !ok {
		fields["page_size"] = "Page size must be between 1 and 100."
	}
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	ctx := r.Context()
	where, args := filter.where(userID)

	totals, totalItems, err := s.currencyTotals(ctx, where, args)
	if err != nil {
		internalError(w, r, err)
		return
	}

	listArgs := append(append([]any{}, args...), pageSize, (page-1)*pageSize)
	limitIdx, offsetIdx := len(args)+1, len(args)+2
	items, err := s.queryExpenses(ctx,
		expenseColumns+expenseFrom+`WHERE `+where+
			` ORDER BY e.spent_on DESC, e.created_at DESC, e.id`+
			` LIMIT $`+strconv.Itoa(limitIdx)+` OFFSET $`+strconv.Itoa(offsetIdx), listArgs...)
	if err != nil {
		internalError(w, r, err)
		return
	}

	totalPages := int((totalItems + int64(pageSize) - 1) / int64(pageSize))
	writeJSON(w, http.StatusOK, listExpensesResponse{
		Items: items, Page: page, PageSize: pageSize,
		TotalItems: totalItems, TotalPages: totalPages, Totals: totals,
	})
}

func (s *Server) handleGetExpense(w http.ResponseWriter, r *http.Request, userID string) {
	id := r.PathValue("id")
	if !isUUID(id) {
		notFound(w)
		return
	}
	e, err := s.getExpense(r.Context(), userID, id)
	if errors.Is(err, pgx.ErrNoRows) {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, e)
}

type expenseInput struct {
	Date          *string      `json:"date"`
	CategoryID    *string      `json:"categoryId"`
	SubcategoryID *string      `json:"subcategoryId"`
	Amount        *json.Number `json:"amount"`
	Currency      *string      `json:"currency"`
	PaymentMethod *string      `json:"paymentMethod"`
	Vendor        *string      `json:"vendor"`
	Reference     *string      `json:"reference"`
	Description   *string      `json:"description"`
}

type expenseValues struct {
	Date, CategoryID, SubcategoryID, Amount, Currency, PaymentMethod, Vendor, Reference, Description string
}

func (v expenseValues) apply(in expenseInput) expenseValues {
	if in.Date != nil {
		v.Date = *in.Date
	}
	if in.CategoryID != nil {
		v.CategoryID = *in.CategoryID
	}
	if in.SubcategoryID != nil {
		v.SubcategoryID = *in.SubcategoryID
	}
	if in.Amount != nil {
		v.Amount = in.Amount.String()
	}
	if in.Currency != nil {
		v.Currency = *in.Currency
	}
	if in.PaymentMethod != nil {
		v.PaymentMethod = *in.PaymentMethod
	}
	if in.Vendor != nil {
		v.Vendor = *in.Vendor
	}
	if in.Reference != nil {
		v.Reference = *in.Reference
	}
	if in.Description != nil {
		v.Description = *in.Description
	}
	return v
}

func validateExpense(v expenseValues) (expenseValues, map[string]string) {
	fields := map[string]string{}
	if d, ok := parseDate(v.Date); ok {
		v.Date = d
	} else {
		fields["date"] = "Enter a valid date (YYYY-MM-DD)."
	}
	if !isUUID(v.CategoryID) {
		fields["categoryId"] = "Choose a category."
	}
	if !isUUID(v.SubcategoryID) {
		fields["subcategoryId"] = "Choose a sub-category."
	}
	if a, ok := parseAmount(v.Amount); ok {
		v.Amount = a
	} else {
		fields["amount"] = "Enter a positive amount with up to 2 decimal places."
	}
	if !currencies[v.Currency] {
		fields["currency"] = "Choose NGN, USD, GBP or EUR."
	}
	if !paymentMethods[v.PaymentMethod] {
		fields["paymentMethod"] = "Choose Bank Transfer, Cash, Card, Mobile Money or Other."
	}
	var ok bool
	if v.Vendor, ok = cleanOptional(v.Vendor, 150); !ok {
		fields["vendor"] = "Vendor/payee is too long (max 150 characters)."
	}
	if v.Reference, ok = cleanOptional(v.Reference, 100); !ok {
		fields["reference"] = "Reference is too long (max 100 characters)."
	}
	if v.Description, ok = cleanOptional(v.Description, 1000); !ok {
		fields["description"] = "Description is too long (max 1000 characters)."
	}
	return v, fields
}

const badCategoryMsg = "Choose a sub-category that belongs to the selected category."

func (s *Server) handleCreateExpense(w http.ResponseWriter, r *http.Request, userID string) {
	var in expenseInput
	if !decodeJSON(w, r, &in) {
		return
	}
	v, fields := validateExpense(expenseValues{}.apply(in))
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	ctx := r.Context()
	var id string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO expenditures (user_id, spent_on, category_id, subcategory_id, amount, currency,
		                           payment_method, vendor, reference, description)
		 SELECT $1::uuid, $2::date, c.id, sc.id, $5::numeric, $6::text, $7::text, $8::text, $9::text, $10::text
		 FROM categories c JOIN subcategories sc ON sc.category_id = c.id
		 WHERE c.id = $3::uuid AND sc.id = $4::uuid AND c.user_id = $1::uuid
		 RETURNING id::text`,
		userID, v.Date, v.CategoryID, v.SubcategoryID, v.Amount, v.Currency, v.PaymentMethod,
		v.Vendor, v.Reference, v.Description).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		validationError(w, map[string]string{"subcategoryId": badCategoryMsg})
		return
	}
	if err != nil {
		internalError(w, r, err)
		return
	}

	e, err := s.getExpense(ctx, userID, id)
	if err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

func (s *Server) handleUpdateExpense(w http.ResponseWriter, r *http.Request, userID string) {
	id := r.PathValue("id")
	if !isUUID(id) {
		notFound(w)
		return
	}
	var in expenseInput
	if !decodeJSON(w, r, &in) {
		return
	}

	ctx := r.Context()
	current, err := s.getExpense(ctx, userID, id)
	if errors.Is(err, pgx.ErrNoRows) {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, r, err)
		return
	}

	base := expenseValues{
		Date: current.Date, CategoryID: current.CategoryID, SubcategoryID: current.SubcategoryID,
		Amount: current.Amount, Currency: current.Currency, PaymentMethod: current.PaymentMethod,
		Vendor: current.Vendor, Reference: current.Reference, Description: current.Description,
	}
	v, fields := validateExpense(base.apply(in))
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	var updatedID string
	err = s.pool.QueryRow(ctx,
		`UPDATE expenditures e
		 SET spent_on = $3::date, category_id = c.id, subcategory_id = sc.id, amount = $6::numeric,
		     currency = $7::text, payment_method = $8::text, vendor = $9::text, reference = $10::text,
		     description = $11::text, updated_at = now()
		 FROM categories c, subcategories sc
		 WHERE e.id = $1::uuid AND e.user_id = $2::uuid
		   AND c.id = $4::uuid AND sc.id = $5::uuid AND sc.category_id = c.id AND c.user_id = $2::uuid
		 RETURNING e.id::text`,
		id, userID, v.Date, v.CategoryID, v.SubcategoryID, v.Amount, v.Currency, v.PaymentMethod,
		v.Vendor, v.Reference, v.Description).Scan(&updatedID)
	if errors.Is(err, pgx.ErrNoRows) {
		validationError(w, map[string]string{"subcategoryId": badCategoryMsg})
		return
	}
	if err != nil {
		internalError(w, r, err)
		return
	}

	e, err := s.getExpense(ctx, userID, id)
	if err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (s *Server) handleDeleteExpense(w http.ResponseWriter, r *http.Request, userID string) {
	id := r.PathValue("id")
	if !isUUID(id) {
		notFound(w)
		return
	}
	tag, err := s.pool.Exec(r.Context(),
		`DELETE FROM expenditures WHERE id = $1::uuid AND user_id = $2::uuid`, id, userID)
	if err != nil {
		internalError(w, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
