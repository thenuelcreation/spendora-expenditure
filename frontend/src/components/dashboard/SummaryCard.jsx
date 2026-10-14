function SummaryCard({
  title,
  value,
  description,
  icon = "◈",
  trend,
  variant = "default",
}) {
  return (
    <article className={`summary-card summary-card-${variant}`}>
      <div className="summary-card-top">
        <div className="summary-card-icon">{icon}</div>

        {trend && (
          <span className={`summary-card-trend ${trend.type || ""}`}>
            {trend.value}
          </span>
        )}
      </div>

      <div className="summary-card-content">
        <p>{title}</p>
        <h2>{value}</h2>

        {description && <span>{description}</span>}
      </div>
    </article>
  );
}

export default SummaryCard;