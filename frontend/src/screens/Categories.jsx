import {
  ArrowLeft,
  Folder,
  MoreHorizontal,
  Pencil,
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
  const [menuCategoryId, setMenuCategoryId] = useState(null);
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
      setMenuCategoryId(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setMenuCategoryId(null);
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setMenuCategoryId(null);
    setModalOpen(true);
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
          onClick={openCreateModal}
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
        {loading ? (
          <p className="category-table-message">Loading categories...</p>
        ) : categories.length === 0 ? (
          <div className="category-table-empty">
            <Folder size={24} />
            <p>No categories yet. Add a category to organize your expenditures.</p>
            <button type="button" className="spendora-page-header-action" onClick={openCreateModal}>
              <Plus size={17} />
              Add Category
            </button>
          </div>
        ) : (
          <div className="category-table-container">
            <table className="category-table">
              <thead>
                <tr>
                  <th>{view === "categories" ? "Category" : "Sub-category"}</th>
                  <th>{view === "categories" ? "Description" : "Parent category"}</th>
                  {view === "categories" && <th>Sub-categories</th>}
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {view === "categories" ? categories.map((category) => (
                  <tr key={category.id}>
                    <td data-label="Category">
                      <div className="category-table-name">
                        <span className="category-table-icon"><Folder size={17} /></span>
                        <strong>{category.name}</strong>
                      </div>
                    </td>
                    <td data-label="Description">{category.description || <span className="category-table-muted">No description</span>}</td>
                    <td data-label="Sub-categories">
                      <span className="subcategory-count">
                        {category.subcategories.length}{" "}
                        {category.subcategories.length === 1 ? "sub-category" : "sub-categories"}
                      </span>
                    </td>
                    <td className="category-table-actions-cell" data-label="Actions">
                      <div className="management-actions">
                        <button
                          type="button"
                          className="more-button"
                          aria-label={`More options for ${category.name}`}
                          title="More options"
                          aria-expanded={menuCategoryId === category.id}
                          onClick={() => setMenuCategoryId((current) => current === category.id ? null : category.id)}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuCategoryId === category.id && (
                          <div className="category-menu">
                            <button type="button" onClick={() => openEditModal(category)}>
                              <Pencil size={14} />
                              Edit category
                            </button>
                            <button type="button" className="danger" onClick={() => deleteCategory(category)}>
                              <Trash2 size={14} />
                              Delete category
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : categories.flatMap((category) => category.subcategories.map((subcategory) => (
                  <tr key={subcategory.id}>
                    <td data-label="Sub-category">
                      <div className="category-table-name">
                        <span className="category-table-icon subcategory-table-icon"><Tag size={16} /></span>
                        <strong>{subcategory.name}</strong>
                      </div>
                    </td>
                    <td data-label="Parent category">{category.name}</td>
                    <td className="category-table-actions-cell" data-label="Actions">
                      <button type="button" className="category-table-edit" onClick={() => openEditModal(category)}>
                        <Pencil size={14} />
                        Edit parent
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
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