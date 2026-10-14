function DeleteModal({
  isOpen,
  expenditure,
  onCancel,
  onConfirm,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >
        <div className="delete-modal-icon">!</div>

        <h2 id="delete-title">Delete expenditure?</h2>

        <p>
          Are you sure you want to delete this expenditure?
          This action cannot be undone.
        </p>

        {expenditure && (
          <div className="delete-summary">
            <strong>
              {expenditure.category || "Expenditure"}
            </strong>

            <span>
              {expenditure.currency || "NGN"}{" "}
              {Number(expenditure.amount || 0).toLocaleString()}
            </span>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;