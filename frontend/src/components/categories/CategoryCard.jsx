import SubcategoryList from "./SubcategoryList";

function CategoryCard({ category, onEdit, onDelete }) {
  const {
    name,
    description,
    subcategories = [],
  } = category;

  return (
    <article className="category-card">
      <div className="category-card-header">
        <div className="category-card-icon">
          {name?.charAt(0) || "C"}
        </div>

        <div className="category-card-actions">
          <button type="button" onClick={() => onEdit?.(category)}>
            Edit
          </button>

          <button
            type="button"
            className="danger-text"
            onClick={() => onDelete?.(category)}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="category-card-content">
        <h3>{name}</h3>

        {description && <p>{description}</p>}

        <SubcategoryList subcategories={subcategories} />
      </div>
    </article>
  );
}

export default CategoryCard;