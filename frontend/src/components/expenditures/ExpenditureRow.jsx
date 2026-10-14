import { useNavigate } from "react-router-dom";

function ExpenditureRow({ expenditure, onDelete }) {
  const navigate = useNavigate();

  const {
    id,
    date,
    category,
    subcategory,
    amount,
    currency,
    paymentMethod,
  } = expenditure;

  return (
    <tr className="expenditure-row">
      <td>{date || "—"}</td>

      <td>
        <div className="table-category">
          <span>{category?.charAt(0) || "E"}</span>
          <div>
            <strong>{category || "—"}</strong>
            <small>{subcategory || "—"}</small>
          </div>
        </div>
      </td>

      <td>{subcategory || "—"}</td>

      <td>
        <strong>
          {currency || "NGN"}{" "}
          {Number(amount || 0).toLocaleString()}
        </strong>
      </td>

      <td>{paymentMethod || "—"}</td>

      <td>
        <div className="table-actions">
          <button
            type="button"
            onClick={() => navigate(`/expenditures/edit/${id}`)}
            aria-label="Edit expenditure"
          >
            Edit
          </button>

          <button
            type="button"
            className="danger-action"
            onClick={() => onDelete?.(expenditure)}
            aria-label="Delete expenditure"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default ExpenditureRow;