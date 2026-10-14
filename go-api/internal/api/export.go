package api

import (
	"encoding/csv"
	"net/http"
	"strings"
	"time"
)

var csvHeader = []string{"Date", "Category", "Sub-category", "Amount", "Currency", "Payment Method", "Vendor", "Reference", "Description"}

// csvSafe neutralises spreadsheet formula injection by prefixing risky cells with a single quote.
func csvSafe(s string) string {
	if s == "" {
		return s
	}
	switch s[0] {
	case '=', '+', '-', '@', '\t', '\r':
		return "'" + s
	}
	return s
}

// exportFilter reads only the period parameter (export is by period, not search).
func exportFilter(r *http.Request) (expenseFilter, string, map[string]string) {
	period := strings.TrimSpace(r.URL.Query().Get("period"))
	from, to, ok := periodBounds(period, time.Now())
	if !ok {
		return expenseFilter{}, "", map[string]string{"period": "Use all, this_month, last_3_months or this_year."}
	}
	label := period
	switch period {
	case "", "all":
		label = "all"
	case "month":
		label = "this_month"
	case "3months":
		label = "last_3_months"
	case "year":
		label = "this_year"
	}
	return expenseFilter{from: from, to: to}, label, nil
}

type exportSummaryResponse struct {
	Period string          `json:"period"`
	Count  int64           `json:"count"`
	Totals []currencyTotal `json:"totals"`
}

func (s *Server) handleExportSummary(w http.ResponseWriter, r *http.Request, userID string) {
	filter, label, fields := exportFilter(r)
	if fields != nil {
		validationError(w, fields)
		return
	}
	where, args := filter.where(userID)
	totals, count, err := s.currencyTotals(r.Context(), where, args)
	if err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, exportSummaryResponse{Period: label, Count: count, Totals: totals})
}

func (s *Server) handleExport(w http.ResponseWriter, r *http.Request, userID string) {
	filter, label, fields := exportFilter(r)
	if fields != nil {
		validationError(w, fields)
		return
	}
	where, args := filter.where(userID)

	rows, err := s.pool.Query(r.Context(),
		`SELECT to_char(e.spent_on, 'YYYY-MM-DD'), c.name, sc.name, e.amount::text, e.currency,
		        e.payment_method, e.vendor, e.reference, e.description `+expenseFrom+
			`WHERE `+where+` ORDER BY e.spent_on, e.created_at, e.id`, args...)
	if err != nil {
		internalError(w, r, err)
		return
	}
	defer rows.Close()

	filename := "spendora-expenditures-" + label + "-" + time.Now().UTC().Format("20060102") + ".csv"
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.WriteHeader(http.StatusOK)

	_, _ = w.Write([]byte{0xEF, 0xBB, 0xBF}) // UTF-8 BOM so Excel detects the encoding
	cw := csv.NewWriter(w)
	_ = cw.Write(csvHeader)

	for rows.Next() {
		var date, category, sub, amount, currency, method, vendor, ref, desc string
		if err := rows.Scan(&date, &category, &sub, &amount, &currency, &method, &vendor, &ref, &desc); err != nil {
			break
		}
		_ = cw.Write([]string{date, csvSafe(category), csvSafe(sub), amount, currency, method,
			csvSafe(vendor), csvSafe(ref), csvSafe(desc)})
	}
	cw.Flush()
}
