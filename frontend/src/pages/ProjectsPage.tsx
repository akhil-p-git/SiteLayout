import './PlaceholderPage.css';

export function ProjectsPage() {
  return (
    <div className="placeholder-page">
      <div className="placeholder-content">
        <div className="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
          </svg>
        </div>
        <h1>Projects</h1>
        <p className="placeholder-subtitle">Manage your site layout projects</p>
        <div className="placeholder-features">
          <div className="feature-item">
            <span className="feature-check">&#10003;</span>
            <span>Create and organize projects</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">&#10003;</span>
            <span>Track project status and progress</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">&#10003;</span>
            <span>Collaborate with team members</span>
          </div>
        </div>
        <div className="placeholder-badge">Coming Soon</div>
      </div>
    </div>
  );
}
