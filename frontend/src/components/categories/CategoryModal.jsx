import { useState } from "react";

function CategoryModal({
  isOpen,
  category,
  onClose,
  onSave,
}) {
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");
  const [subcategories, setSubcategories] = useState(
    category?.subcategories?.length
      ? category.subcategories.map((item) => typeof item === "string"
        ? { name: item }
        : { id: item.id, name: item.name })
      : [{ name: "" }]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const updateSubcategory = (index, value) => {
    setSubcategories((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, name: value } : item
      )
    );
  };

  const addSubcategory = () => {
    setSubcategories((previous) => [...previous, { name: "" }]);
  };

  const removeSubcategory = (index) => {
    setSubcategories((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave?.({
        id: category?.id,
        name: name.trim(),
        description: description.trim(),
        subcategories: subcategories
          .map((item) => ({ ...item, name: item.name.trim() }))
          .filter((item) => item.name),
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="category-modal">
        <div className="modal-header">
          <div>
            <h2>{category ? "Edit category" : "Add category"}</h2>
            <p>Create and manage your expenditure categories.</p>
          </div>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="categoryName">
              Category name <span>*</span>
            </label>

            <input
              id="categoryName"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder="e.g. Office Operations"
            />

            {error && <small className="form-error">{error}</small>}
          </div>

          <div className="form-field">
            <label htmlFor="categoryDescription">
              Description
            </label>

            <textarea
              id="categoryDescription"
              rows="3"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Describe this category..."
            />
          </div>

          <div className="form-field">
            <div className="field-label-row">
              <label>Sub-categories</label>

              <button
                type="button"
                className="small-add-button"
                onClick={addSubcategory}
              >
                + Add
              </button>
            </div>

            <div className="modal-subcategories">
              {subcategories.map((subcategory, index) => (
                <div
                  className="subcategory-input-row"
                  key={subcategory.id || `new-${index}`}
                >
                  <input
                    value={subcategory.name}
                    onChange={(event) =>
                      updateSubcategory(index, event.target.value)
                    }
                    placeholder="Sub-category name"
                  />

                  {subcategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubcategory(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving..." : category ? "Save changes" : "Create category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal;