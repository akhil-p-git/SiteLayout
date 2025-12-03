import './PlaceholderPage.css';

export function HelpPage() {
  return (
    <div className="placeholder-page">
      <div className="placeholder-content">
        <div className="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <h1>Help & Support</h1>
        <p className="placeholder-subtitle">Get help using Site Layouts</p>
        <div className="placeholder-features">
          <div className="feature-item">
            <span className="feature-check">&#10003;</span>
            <span>Documentation and guides</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">&#10003;</span>
            <span>Video tutorials</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">&#10003;</span>
            <span>Contact support team</span>
          </div>
        </div>
        <div className="placeholder-badge">Coming Soon</div>
      </div>
    </div>
  );
}
