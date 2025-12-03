import './PlaceholderPage.css';

export function AnalyticsPage() {
  return (
    <div className="placeholder-page">
      <div className="placeholder-content">
        <div className="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 20V10M12 20V4M6 20V14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1>Analytics</h1>
        <p className="placeholder-subtitle">Insights and performance metrics</p>
        <div className="placeholder-features">
          <div className="feature-item">
            <span className="feature-check">&#10003;</span>
            <span>Site performance dashboards</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">&#10003;</span>
            <span>Earthwork cost analysis</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">&#10003;</span>
            <span>Export reports and data</span>
          </div>
        </div>
        <div className="placeholder-badge">Coming Soon</div>
      </div>
    </div>
  );
}
