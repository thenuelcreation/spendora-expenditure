package api

import (
	"errors"
	"math"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type monthPoint struct {
	Month  int    `json:"month"`
	Amount string `json:"amount"`
	Count  int64  `json:"count"`
}

type categoryPoint struct {
	CategoryID string `json:"categoryId"`
	Category   string `json:"category"`
	Amount     string `json:"amount"`
	Count      int64  `json:"count"`
}

type currencyCount struct {
	Currency string `json:"currency"`
	Count    int64  `json:"count"`
}

type periodAmount struct {
	Amount string `json:"amount"`
	Count  int64  `json:"count"`
}

type dashboardResponse struct {
	Currency                    string          `json:"currency"`
	Year                        int             `json:"year"`
	TotalAmount                 string          `json:"totalAmount"`
	TotalCount                  int64           `json:"totalCount"`
	CurrentMonth                periodAmount    `json:"currentMonth"`
	PreviousMonthAmount         string          `json:"previousMonthAmount"`
	MonthOverMonthChangePercent *float64        `json:"monthOverMonthChangePercent"`
	YearCount                   int64           `json:"yearCount"`
	MonthlyTrend                []monthPoint    `json:"monthlyTrend"`
	CategoryBreakdown           []categoryPoint `json:"categoryBreakdown"`
	Recent                      []Expense       `json:"recent"`
	OtherCurrencies             []currencyCount `json:"otherCurrencies"`
}

func percentChange(cur, prev string) *float64 {
	c, ok1 := new(big.Rat).SetString(cur)
	p, ok2 := new(big.Rat).SetString(prev)
	if !ok1 || !ok2 || p.Sign() <= 0 {
		return nil
	}
	diff := new(big.Rat).Sub(c, p)
	diff.Quo(diff, p)
	diff.Mul(diff, big.NewRat(100, 1))
	f, _ := diff.Float64()
	f = math.Round(f*10) / 10
	return &f
}

// handleDashboard: every figure is filtered to ONE currency (no conversion).
// Records stored in other currencies are listed in otherCurrencies so nothing is silently hidden.
func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request, userID string) {
	ctx := r.Context()
	now := time.Now().UTC()
	fields := map[string]string{}

	var currency string
	if err := s.pool.QueryRow(ctx, `SELECT preferred_currency FROM users WHERE id = $1::uuid`, userID).Scan(&currency); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "Please sign in to continue.")
			return
		}
		internalError(w, r, err)
		return
	}
	if c := strings.ToUpper(r.URL.Query().Get("currency")); c != "" {
		if !currencies[c] {
			fields["currency"] = "Choose NGN, USD, GBP or EUR."
		} else {
			currency = c
		}
	}

	year := now.Year()
	switch y := r.URL.Query().Get("year"); y {
	case "", "current":
	case "previous":
		year--
	default:
		n, err := strconv.Atoi(y)
		if err != nil || (n != now.Year() && n != now.Year()-1) {
			fields["year"] = "Year must be the current or previous calendar year."
		} else {
			year = n
		}
	}
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	const layout = "2006-01-02"
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	nextMonth := monthStart.AddDate(0, 1, 0)
	prevMonth := monthStart.AddDate(0, -1, 0)
	yearStart := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	nextYear := time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC)

	resp := dashboardResponse{Currency: currency, Year: year}

	// headline figures
	if err := s.pool.QueryRow(ctx,
		`SELECT
		   COALESCE(SUM(amount), 0)::numeric(16,2)::text,
		   COUNT(*),
		   COALESCE(SUM(amount) FILTER (WHERE spent_on >= $3::date AND spent_on < $4::date), 0)::numeric(16,2)::text,
		   COUNT(*) FILTER (WHERE spent_on >= $3::date AND spent_on < $4::date),
		   COALESCE(SUM(amount) FILTER (WHERE spent_on >= $5::date AND spent_on < $3::date), 0)::numeric(16,2)::text,
		   COUNT(*) FILTER (WHERE spent_on >= $6::date AND spent_on < $7::date)
		 FROM expenditures
		 WHERE user_id = $1::uuid AND currency = $2::text`,
		userID, currency, monthStart.Format(layout), nextMonth.Format(layout), prevMonth.Format(layout),
		yearStart.Format(layout), nextYear.Format(layout),
	).Scan(&resp.TotalAmount, &resp.TotalCount, &resp.CurrentMonth.Amount, &resp.CurrentMonth.Count,
		&resp.PreviousMonthAmount, &resp.YearCount); err != nil {
		internalError(w, r, err)
		return
	}
	resp.MonthOverMonthChangePercent = percentChange(resp.CurrentMonth.Amount, resp.PreviousMonthAmount)

	// monthly trend for the selected year (always 12 points)
	resp.MonthlyTrend = make([]monthPoint, 12)
	for i := range resp.MonthlyTrend {
		resp.MonthlyTrend[i] = monthPoint{Month: i + 1, Amount: "0.00"}
	}
	trendRows, err := s.pool.Query(ctx,
		`SELECT EXTRACT(MONTH FROM spent_on)::int, SUM(amount)::numeric(16,2)::text, COUNT(*)
		 FROM expenditures
		 WHERE user_id = $1::uuid AND currency = $2::text AND spent_on >= $3::date AND spent_on < $4::date
		 GROUP BY 1 ORDER BY 1`,
		userID, currency, yearStart.Format(layout), nextYear.Format(layout))
	if err != nil {
		internalError(w, r, err)
		return
	}
	for trendRows.Next() {
		var m int
		var amount string
		var count int64
		if err := trendRows.Scan(&m, &amount, &count); err != nil {
			trendRows.Close()
			internalError(w, r, err)
			return
		}
		if m >= 1 && m <= 12 {
			resp.MonthlyTrend[m-1].Amount = amount
			resp.MonthlyTrend[m-1].Count = count
		}
	}
	trendRows.Close()
	if err := trendRows.Err(); err != nil {
		internalError(w, r, err)
		return
	}

	// category breakdown for the selected year
	resp.CategoryBreakdown = []categoryPoint{}
	catRows, err := s.pool.Query(ctx,
		`SELECT c.id::text, c.name, SUM(e.amount)::numeric(16,2)::text, COUNT(*)
		 FROM expenditures e JOIN categories c ON c.id = e.category_id
		 WHERE e.user_id = $1::uuid AND e.currency = $2::text AND e.spent_on >= $3::date AND e.spent_on < $4::date
		 GROUP BY c.id, c.name
		 ORDER BY SUM(e.amount) DESC, c.name`,
		userID, currency, yearStart.Format(layout), nextYear.Format(layout))
	if err != nil {
		internalError(w, r, err)
		return
	}
	for catRows.Next() {
		var p categoryPoint
		if err := catRows.Scan(&p.CategoryID, &p.Category, &p.Amount, &p.Count); err != nil {
			catRows.Close()
			internalError(w, r, err)
			return
		}
		resp.CategoryBreakdown = append(resp.CategoryBreakdown, p)
	}
	catRows.Close()
	if err := catRows.Err(); err != nil {
		internalError(w, r, err)
		return
	}

	// five most recent records (any currency; each row carries its own currency)
	resp.Recent, err = s.queryExpenses(ctx,
		expenseColumns+expenseFrom+`WHERE e.user_id = $1::uuid
		 ORDER BY e.spent_on DESC, e.created_at DESC LIMIT 5`, userID)
	if err != nil {
		internalError(w, r, err)
		return
	}

	// records excluded because they're in a different currency
	resp.OtherCurrencies = []currencyCount{}
	otherRows, err := s.pool.Query(ctx,
		`SELECT currency, COUNT(*) FROM expenditures
		 WHERE user_id = $1::uuid AND currency <> $2::text GROUP BY currency ORDER BY currency`, userID, currency)
	if err != nil {
		internalError(w, r, err)
		return
	}
	for otherRows.Next() {
		var c currencyCount
		if err := otherRows.Scan(&c.Currency, &c.Count); err != nil {
			otherRows.Close()
			internalError(w, r, err)
			return
		}
		resp.OtherCurrencies = append(resp.OtherCurrencies, c)
	}
	otherRows.Close()
	if err := otherRows.Err(); err != nil {
		internalError(w, r, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
