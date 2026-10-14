import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiDownload, apiGet } from "../services/api";

function totalsLabel(totals) {
  const values = Object.entries(totals || {}).filter(([, amount]) => Number(amount) > 0);
  if (!values.length) return "—";
  return values.map(([currency, amount]) => new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount))).join(" · ");
}

function ExportExcel() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("all");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet(`/expenses?period=${period}&page=1&pageSize=1`)
      .then((result) => {
        setSummary(result);
        setError("");
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [period]);

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await apiDownload(`/expenses/export?period=${period}`, `spendora-expenditures-${period}.csv`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="spendora-page export-screen">
      <header className="export-page-header">
        <button className="spendora-back-button export-back-button" onClick={() => navigate("/expenditures")} aria-label="Go back to expenditures">
          <ArrowLeft size={18} />
        </button>
        <div className="export-page-heading">
          <p className="page-eyebrow">DATA EXPORT</p>
          <h1>Export to Excel</h1>
          <p>Export your expenditure records into an Excel-compatible spreadsheet.</p>
        </div>
      </header>

      <main className="spendora-page-content">
        {error && <div className="auth-error" role="alert">{error}</div>}
        <section className="export-card">
          <div className="export-icon"><FileSpreadsheet size={30} /></div>
          <div className="export-card-content">
            <h2>Export Expenditures</h2>
            <p>Download your expenditure records as a CSV file that opens in Excel. Choose the period below.</p>
          </div>
          <div className="export-options">
            <label className="export-field">
              <span>Date range</span>
              <div className="export-input">
                <CalendarDays size={16} />
                <select value={period} onChange={(event) => {
                  setLoading(true);
                  setPeriod(event.target.value);
                }}>
                  <option value="all">All expenditures</option>
                  <option value="month">This month</option>
                  <option value="3months">Last 3 months</option>
                  <option value="year">This year</option>
                </select>
              </div>
            </label>
          </div>
          <div className="export-summary">
            <div><span>Records to export</span><strong>{loading ? "…" : summary?.total ?? 0}</strong></div>
            <div><span>Estimated total</span><strong>{loading ? "…" : totalsLabel(summary?.summary.totalsByCurrency)}</strong></div>
          </div>
          <button className="export-download-button" onClick={download} disabled={loading || downloading}>
            <Download size={17} />
            {downloading ? "Preparing download..." : "Download spreadsheet"}
          </button>
        </section>
      </main>
    </div>
  );
}

export default ExportExcel;
