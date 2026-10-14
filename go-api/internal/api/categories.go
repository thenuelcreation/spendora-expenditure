package api

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

type Subcategory struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Category struct {
	ID            string        `json:"id"`
	Name          string        `json:"name"`
	Description   string        `json:"description"`
	Subcategories []Subcategory `json:"subcategories"`
}

var starterCategories = []struct {
	Name        string
	Description string
	Subs        []string
}{
	{"Operations", "Day-to-day running costs", []string{"Office Supplies", "Rent", "Utilities", "Maintenance"}},
	{"Travel & Transport", "Getting around and business travel", []string{"Fuel", "Flights", "Ride Hailing", "Accommodation"}},
	{"Food & Meals", "Meals and refreshments", []string{"Groceries", "Restaurants", "Team Meals"}},
	{"Marketing", "Promotion and advertising", []string{"Advertising", "Events", "Design & Print"}},
	{"People & Services", "Salaries and outside services", []string{"Salaries", "Contractors", "Professional Fees"}},
	{"Technology", "Software and equipment", []string{"Software", "Hosting & Domains", "Hardware"}},
	{"Miscellaneous", "Everything else", []string{"Other"}},
}

func seedStarterCategories(ctx context.Context, tx pgx.Tx, userID string) error {
	for _, c := range starterCategories {
		var catID string
		if err := tx.QueryRow(ctx,
			`INSERT INTO categories (user_id, name, description) VALUES ($1::uuid, $2, $3) RETURNING id::text`,
			userID, c.Name, c.Description).Scan(&catID); err != nil {
			return err
		}
		for _, sub := range c.Subs {
			if _, err := tx.Exec(ctx,
				`INSERT INTO subcategories (category_id, name) VALUES ($1::uuid, $2)`, catID, sub); err != nil {
				return err
			}
		}
	}
	return nil
}

// loadCategories returns the user's categories with nested sub-categories; onlyID filters to one category.
func (s *Server) loadCategories(ctx context.Context, userID, onlyID string) ([]Category, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.id::text, c.name, c.description, sc.id::text, sc.name
		 FROM categories c
		 LEFT JOIN subcategories sc ON sc.category_id = c.id
		 WHERE c.user_id = $1::uuid AND ($2::text = '' OR c.id::text = $2::text)
		 ORDER BY lower(c.name), c.id, lower(sc.name)`, userID, onlyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Category{}
	for rows.Next() {
		var c Category
		var subID, subName *string
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &subID, &subName); err != nil {
			return nil, err
		}
		if len(out) == 0 || out[len(out)-1].ID != c.ID {
			c.Subcategories = []Subcategory{}
			out = append(out, c)
		}
		if subID != nil && subName != nil {
			last := &out[len(out)-1]
			last.Subcategories = append(last.Subcategories, Subcategory{ID: *subID, Name: *subName})
		}
	}
	return out, rows.Err()
}

func (s *Server) handleListCategories(w http.ResponseWriter, r *http.Request, userID string) {
	cats, err := s.loadCategories(r.Context(), userID, "")
	if err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, cats)
}

type createCategoryRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Subcategories []string `json:"subcategories"`
}

func (s *Server) handleCreateCategory(w http.ResponseWriter, r *http.Request, userID string) {
	var req createCategoryRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	fields := map[string]string{}
	name, ok := cleanName(req.Name, 60)
	if !ok {
		fields["name"] = "Category name is required (max 60 characters)."
	}
	desc, ok := cleanOptional(req.Description, 255)
	if !ok {
		fields["description"] = "Description is too long (max 255 characters)."
	}
	if len(req.Subcategories) > 50 {
		fields["subcategories"] = "At most 50 sub-categories can be created at once."
	}
	subs := make([]string, 0, len(req.Subcategories))
	seen := map[string]bool{}
	for _, raw := range req.Subcategories {
		sub, ok := cleanName(raw, 60)
		if !ok {
			fields["subcategories"] = "Each sub-category needs a name (max 60 characters)."
			break
		}
		key := strings.ToLower(sub)
		if seen[key] {
			fields["subcategories"] = "Sub-category names must be unique within a category."
			break
		}
		seen[key] = true
		subs = append(subs, sub)
	}
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	ctx := r.Context()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		internalError(w, r, err)
		return
	}
	defer tx.Rollback(ctx)

	var id string
	if err := tx.QueryRow(ctx,
		`INSERT INTO categories (user_id, name, description) VALUES ($1::uuid, $2, $3) RETURNING id::text`,
		userID, name, desc).Scan(&id); err != nil {
		if pgCode(err) == pgUniqueViolation {
			writeError(w, http.StatusConflict, "category_exists", "You already have a category with that name.")
			return
		}
		internalError(w, r, err)
		return
	}
	for _, sub := range subs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO subcategories (category_id, name) VALUES ($1::uuid, $2)`, id, sub); err != nil {
			internalError(w, r, err)
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		internalError(w, r, err)
		return
	}

	cats, err := s.loadCategories(ctx, userID, id)
	if err != nil || len(cats) == 0 {
		internalError(w, r, errors.Join(err, errors.New("category missing after create")))
		return
	}
	writeJSON(w, http.StatusCreated, cats[0])
}

type updateCategoryRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

func (s *Server) handleUpdateCategory(w http.ResponseWriter, r *http.Request, userID string) {
	id := r.PathValue("id")
	if !isUUID(id) {
		notFound(w)
		return
	}
	var req updateCategoryRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Name == nil && req.Description == nil {
		validationError(w, map[string]string{"body": "Provide a name or description to update."})
		return
	}
	fields := map[string]string{}
	var name, desc *string
	if req.Name != nil {
		n, ok := cleanName(*req.Name, 60)
		if !ok {
			fields["name"] = "Category name is required (max 60 characters)."
		}
		name = &n
	}
	if req.Description != nil {
		d, ok := cleanOptional(*req.Description, 255)
		if !ok {
			fields["description"] = "Description is too long (max 255 characters)."
		}
		desc = &d
	}
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	ctx := r.Context()
	tag, err := s.pool.Exec(ctx,
		`UPDATE categories SET name = COALESCE($3::text, name), description = COALESCE($4::text, description)
		 WHERE id = $1::uuid AND user_id = $2::uuid`, id, userID, name, desc)
	if err != nil {
		if pgCode(err) == pgUniqueViolation {
			writeError(w, http.StatusConflict, "category_exists", "You already have a category with that name.")
			return
		}
		internalError(w, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	cats, err := s.loadCategories(ctx, userID, id)
	if err != nil || len(cats) == 0 {
		internalError(w, r, errors.Join(err, errors.New("category missing after update")))
		return
	}
	writeJSON(w, http.StatusOK, cats[0])
}

func (s *Server) handleDeleteCategory(w http.ResponseWriter, r *http.Request, userID string) {
	id := r.PathValue("id")
	if !isUUID(id) {
		notFound(w)
		return
	}
	tag, err := s.pool.Exec(r.Context(),
		`DELETE FROM categories WHERE id = $1::uuid AND user_id = $2::uuid`, id, userID)
	if err != nil {
		if pgCode(err) == pgForeignKeyViol {
			writeError(w, http.StatusConflict, "category_in_use", "This category has expenditures and can't be deleted.")
			return
		}
		internalError(w, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type subcategoryRequest struct {
	Name string `json:"name"`
}

func (s *Server) handleCreateSubcategory(w http.ResponseWriter, r *http.Request, userID string) {
	catID := r.PathValue("id")
	if !isUUID(catID) {
		notFound(w)
		return
	}
	var req subcategoryRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	name, ok := cleanName(req.Name, 60)
	if !ok {
		validationError(w, map[string]string{"name": "Sub-category name is required (max 60 characters)."})
		return
	}

	var sub Subcategory
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO subcategories (category_id, name)
		 SELECT c.id, $3::text FROM categories c WHERE c.id = $1::uuid AND c.user_id = $2::uuid
		 RETURNING id::text, name`, catID, userID, name).Scan(&sub.ID, &sub.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		notFound(w)
		return
	}
	if err != nil {
		if pgCode(err) == pgUniqueViolation {
			writeError(w, http.StatusConflict, "subcategory_exists", "This category already has a sub-category with that name.")
			return
		}
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, sub)
}

func (s *Server) handleUpdateSubcategory(w http.ResponseWriter, r *http.Request, userID string) {
	id := r.PathValue("id")
	if !isUUID(id) {
		notFound(w)
		return
	}
	var req subcategoryRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	name, ok := cleanName(req.Name, 60)
	if !ok {
		validationError(w, map[string]string{"name": "Sub-category name is required (max 60 characters)."})
		return
	}

	var sub Subcategory
	err := s.pool.QueryRow(r.Context(),
		`UPDATE subcategories sc SET name = $3::text
		 FROM categories c
		 WHERE sc.id = $1::uuid AND c.id = sc.category_id AND c.user_id = $2::uuid
		 RETURNING sc.id::text, sc.name`, id, userID, name).Scan(&sub.ID, &sub.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		notFound(w)
		return
	}
	if err != nil {
		if pgCode(err) == pgUniqueViolation {
			writeError(w, http.StatusConflict, "subcategory_exists", "This category already has a sub-category with that name.")
			return
		}
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, sub)
}

func (s *Server) handleDeleteSubcategory(w http.ResponseWriter, r *http.Request, userID string) {
	id := r.PathValue("id")
	if !isUUID(id) {
		notFound(w)
		return
	}
	tag, err := s.pool.Exec(r.Context(),
		`DELETE FROM subcategories AS sc USING categories AS c
		 WHERE sc.id = $1::uuid AND c.id = sc.category_id AND c.user_id = $2::uuid`, id, userID)
	if err != nil {
		if pgCode(err) == pgForeignKeyViol {
			writeError(w, http.StatusConflict, "subcategory_in_use", "This sub-category has expenditures and can't be deleted.")
			return
		}
		internalError(w, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
