import { ArrowRight, Check, CirclePlus, Download, FileSpreadsheet, Hexagon, Orbit, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const demoChartSnapshots = [
  [35, 52, 42, 68, 56, 82, 64],
  [43, 47, 58, 61, 72, 76, 69],
  [38, 60, 49, 74, 63, 86, 72],
  [48, 55, 66, 70, 59, 80, 77],
];

function Landing() {
  const [totalExpenditure, setTotalExpenditure] = useState(345680);
  const [chartStep, setChartStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTotalExpenditure((total) => total + 1250);
      setChartStep((step) => (step + 1) % demoChartSnapshots.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link to="/" className="brand">
          <span className="brand-mark">S</span>
          <span>
            <strong>Spendora</strong>
            <small>Track. Manage. Export.</small>
          </span>
        </Link>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="login-link">
            Login
          </Link>

          <Link to="/signup" className="primary-button small">
            Get Started
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">
            <span />
            Simple expenditure management
          </div>

          <h1>
            Smarter Spending.
            <br />
            <span>Greater Control.</span>
          </h1>

          <p>
            Record your expenditures quickly, stay organized, and export
            everything to Excel when you need it.
          </p>

          <div className="hero-actions">
            <Link to="/signup" className="primary-button">
              Get Started Free
              <ArrowRight size={18} />
            </Link>

            <a href="#how-it-works" className="secondary-button">
              See How It Works
            </a>
          </div>

          <div className="hero-points">
            <div>
              <Check size={16} />
              <span>Fast entry</span>
            </div>

            <div>
              <Check size={16} />
              <span>Organized records</span>
            </div>

            <div>
              <Check size={16} />
              <span>Excel export</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="glow" />
          <div className="holo-icon holo-icon-one" aria-hidden="true"><Orbit size={25} /></div>
          <div className="holo-icon holo-icon-two" aria-hidden="true"><Hexagon size={21} /></div>
          <div className="holo-icon holo-icon-three" aria-hidden="true"><Sparkles size={20} /></div>

          <div className="floating-card card-one">
            <FileSpreadsheet size={20} />
            <div>
              <strong>Excel Export</strong>
              <small>Ready to download</small>
            </div>
          </div>

          <div className="dashboard-orb">
            <div className="phone">
              <div className="phone-top" />

              <div className="phone-brand">
                <span className="brand-mark">S</span>
                Spendora
              </div>

              <p className="phone-greeting">Good morning 👋</p>

              <div className="phone-total">
                <small>Total Expenditure</small>
                <strong>₦{totalExpenditure.toLocaleString("en-NG")}</strong>
                <span>Live demo · +₦1,250 every few seconds</span>
              </div>

              <div
                className="phone-chart"
                role="img"
                aria-label="Animated sample expenditure chart"
              >
                {demoChartSnapshots[chartStep].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>

              <button>+ Add Expenditure</button>
            </div>

            <div className="coin coin-one">₦</div>
            <div className="coin coin-two">₦</div>
            <div className="excel-badge">X</div>
          </div>

          <div className="floating-card card-two">
            <ShieldCheck size={20} />
            <div>
              <strong>Secure Records</strong>
              <small>Your data stays protected</small>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <Feature
          icon={<Zap />}
          title="Fast & Simple"
          description="Record an expenditure in seconds."
        />

        <Feature
          icon={<ShieldCheck />}
          title="Organized Data"
          description="Keep every transaction structured."
        />

        <Feature
          icon={<FileSpreadsheet />}
          title="Excel Export"
          description="Export your records whenever needed."
        />
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="steps-intro">
          <span className="section-label">A SIMPLE WORKFLOW</span>
          <h2>From record to report<br />in three steps.</h2>
          <p>Keep every expense organized and ready when it is time to review or share.</p>
        </div>

        <div className="steps">
          <div className="step-card step-card-one">
            <div className="step-card-top"><span className="step-icon"><CirclePlus size={20} /></span><span className="step-index">01</span></div>
            <h3>Add an expense</h3>
            <p>Capture the amount, date, category, and payment details in a quick form.</p>
          </div>

          <div className="step-card step-card-two">
            <div className="step-card-top"><span className="step-icon"><ShieldCheck size={20} /></span><span className="step-index">02</span></div>
            <h3>Stay organized</h3>
            <p>Find saved records by date, category, vendor, or reference whenever you need them.</p>
          </div>

          <div className="step-card step-card-three">
            <div className="step-card-top"><span className="step-icon"><Download size={20} /></span><span className="step-index">03</span></div>
            <h3>Export to Excel</h3>
            <p>Choose a date range and download a spreadsheet-ready CSV of your records.</p>
          </div>
        </div>
      </section>

      <section className="about-section" id="about" aria-labelledby="about-heading">
        <div className="about-copy">
          <span className="about-eyebrow"><Sparkles size={14} /> ABOUT SPENDORA</span>
          <h2 id="about-heading">A clearer way to keep track of where it goes.</h2>
          <p>
            Spendora brings your expenditure records into one calm, organized space.
            Capture the details as they happen, find them when you need them, and
            export a clean report for your next review.
          </p>
          <div className="about-points">
            <span><Check size={16} /> Your records, organized by you</span>
            <span><Check size={16} /> Clear totals across supported currencies</span>
            <span><Check size={16} /> Ready-to-download CSV reports</span>
          </div>
          <Link to="/signup" className="about-cta">Start tracking <ArrowRight size={17} /></Link>
        </div>

        <div className="about-visual" aria-hidden="true">
          <div className="about-orbit about-orbit-one" />
          <div className="about-orbit about-orbit-two" />
          <div className="about-core"><span className="brand-mark">S</span><strong>Spendora</strong><small>TRACK · MANAGE · EXPORT</small></div>
          <div className="about-float-card about-float-card-top"><ShieldCheck size={17} /><span>Private by account</span></div>
          <div className="about-float-card about-float-card-bottom"><FileSpreadsheet size={17} /><span>Reports when you need them</span></div>
          <span className="about-spark about-spark-one"><Sparkles size={17} /></span>
          <span className="about-spark about-spark-two"><Orbit size={16} /></span>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default Landing;
