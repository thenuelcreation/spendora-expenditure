import {
  ArrowLeft,
  ChevronRight,
  Folder,
  MoreHorizontal,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CategoryModal from "../components/categories/CategoryModal";
import { apiDelete, apiGet, apiPatch, apiPost } from "../services/api";

function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState("categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiGet("/categories")
      .then((result) => {
        if (active) {
          setCategories(result.categories);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveCategory = async ({ id, ...data }) => {
    const payload = {
      ...data,
      subcategories: data.subcategories.map((item) => item.name),
    };
    const result = id
      ? await apiPatch(`/categories/${id}`, payload)
      : await apiPost("/categories", payload);
    setCategories((current) => id
      ? current.map((category) => category.id === id ? result.category : category)
      : [...current, result.category].sort((a, b) => a.name.localeCompare(b.name)));
    setModalOpen(false);
    setEditingCategory(null);
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/categories/${category.id}`);
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="spendora-page categories-screen">
      {/* Page Header */}
      <header className="spendora-page-header">
        <div className="spendora-page-header-left">
          <button
            type="button"
            className="spendora-back-button"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="spendora-page-heading">
            <p className="page-eyebrow">CONFIGURATION</p>
            <h1>Categories</h1>
            <p>
              Manage expenditure categories and sub-categories.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="spendora-page-header-action"
          onClick={() => {
            setEditingCategory(null);
            setModalOpen(true);
          }}
        >
          <Plus size={17} />
          <span>Add Category</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="spendora-page-content">
        {error && <div className="auth-error" role="alert">{error}</div>}
        {/* Category Tabs */}
        <div className="category-tabs">
          <button
            type="button"
            className={view === "categories" ? "active" : ""}
            onClick={() => setView("categories")}
          >
            Main Categories
          </button>

          <button type="button" className={view === "subcategories" ? "active" : ""} onClick={() => setView("subcategories")}>
            Sub-categories
          </button>
        </div>

        {/* Categories */}
        <div className="category-management">
          {loading ? <p>Loading categories...</p> : categories.length === 0 ? (
            <p>No categories yet. Add a category to organize your expenditures.</p>
          ) : view === "categories" ? categories.map((category) => (
            <article
              className="management-card"
              key={category.name}
            >
              {/* Card Header */}
              <div className="management-header">
                <div className="management-title">
                  <div className="management-icon">
                    <Folder size={18} />
                  </div>

                  <div>
                    <strong>{category.name}</strong>
                    <span>
                      {category.subcategories.length}{" "}
                      {category.subcategories.length === 1
                        ? "sub-category"
                        : "sub-categories"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="more-button"
                  aria-label={`More options for ${category.name}`}
                  title="More options"
                  onClick={() => {
                    setEditingCategory(category);
                    setModalOpen(true);
                  }}
                >
                  <MoreHorizontal size={18} />
                </button>
                <button
                  type="button"
                  className="more-button"
                  aria-label={`Delete ${category.name}`}
                  title="Delete category"
                  onClick={() => deleteCategory(category)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Subcategories */}
              <div className="subcategory-list">
                {category.subcategories.map((item) => (
                  <div
                    className="subcategory-item"
                    key={item.id}
                  >
                    <span>
                      <Tag size={14} />
                      {item.name}
                    </span>

                    <ChevronRight size={15} />
                  </div>
                ))}
              </div>
            </article>
          )) : categories.flatMap((category) => category.subcategories.map((subcategory) => (
            <article className="management-card" key={subcategory.id}>
              <div className="management-header">
                <div className="management-title">
                  <div className="management-icon"><Tag size={18} /></div>
                  <div><strong>{subcategory.name}</strong><span>{category.name}</span></div>
                </div>
                <button type="button" className="more-button" title={`Edit ${category.name}`} aria-label={`Edit parent category ${category.name}`} onClick={() => {
                  setEditingCategory(category);
                  setModalOpen(true);
                }}>
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </article>
          )))}
        </div>
      </main>
      {modalOpen && (
        <CategoryModal
          key={editingCategory?.id || "new"}
          isOpen={modalOpen}
          category={editingCategory}
          onClose={() => {
            setModalOpen(false);
            setEditingCategory(null);
          }}
          onSave={saveCategory}
        />
      )}
    </div>
  );
}

export default Categories;