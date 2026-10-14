function ExpenditureFilters({
  filters,
  onChange,
  onReset,
  categories = [],
}) {
  return (
    <div className="expenditure-filters">
      <div className="filter-search">
        <span>⌕</span>

        <input
          type="search"
          placeholder="Search expenditures..."
          value={filters.search || ""}
          onChange={(event) =>
            onChange("search", event.target.value)
          }
        />
      </div>

      <div className="filter-field">
        <select
          value={filters.category || ""}
          onChange={(event) =>
            onChange("category", event.target.value)
          }
        >
          <option value="">All categories</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <input
          type="date"
          value={filters.dateFrom || ""}
          onChange={(event) =>
            onChange("dateFrom", event.target.value)
          }
        />
      </div>

      <div className="filter-field">
        <input
          type="date"
          value={filters.dateTo || ""}
          onChange={(event) =>
            onChange("dateTo", event.target.value)
          }
        />
      </div>

      <button type="button" className="reset-filter" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}

export default ExpenditureFilters;