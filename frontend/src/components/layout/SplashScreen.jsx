function SplashScreen() {
  return (
    <main className="splash-screen" aria-label="Loading Spendora">
      <div className="splash-brand">
        <span className="splash-logo-mark" aria-hidden="true">
          <span>S</span>
        </span>
        <span className="splash-wordmark">Spendora</span>
        <span className="splash-tagline">Track. Manage. Export.</span>
        <div className="splash-preview" aria-hidden="true">
          <div className="splash-preview-bars">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="splash-preview-label">YOUR SPENDING, IN VIEW</span>
        </div>
      </div>
      <div className="splash-progress" role="status" aria-label="Opening Spendora">
        <span />
      </div>
    </main>
  );
}

export default SplashScreen;
