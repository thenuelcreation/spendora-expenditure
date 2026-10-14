function SubcategoryList({ subcategories = [] }) {
  return (
    <div className="subcategory-list">
      <span className="subcategory-label">Sub-categories</span>

      {subcategories.length === 0 ? (
        <p className="no-subcategories">
          No sub-categories added.
        </p>
      ) : (
        <div className="subcategory-tags">
          {subcategories.map((subcategory) => (
            <span className="subcategory-tag" key={subcategory}>
              {typeof subcategory === "string"
                ? subcategory
                : subcategory.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default SubcategoryList;