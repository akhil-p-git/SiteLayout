import { AuthProvider, useAuth } from './context/AuthContext';
import { MapView } from './components/Map';
import { LoginForm } from './components/Auth';
import './App.css';

function AppContent() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // Default view centered on US
  const initialViewState = {
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4,
    pitch: 0,
    bearing: 0,
  };

  const handleFeatureCreate = (feature: GeoJSON.Feature) => {
    console.log('Feature created:', feature);
  };

  const handleFeatureUpdate = (feature: GeoJSON.Feature) => {
    console.log('Feature updated:', feature);
  };

  const handleFeatureDelete = (featureIds: string[]) => {
    console.log('Features deleted:', featureIds);
  };

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <h1>Site Layouts</h1>
          <span className="header-subtitle">MVP+ by Pacifico Energy</span>
        </div>
        <nav className="header-nav">
          <button className="nav-button active">Map</button>
          <button className="nav-button">Projects</button>
          <button className="nav-button">Analytics</button>
        </nav>
        <div className="header-actions">
          <button className="action-button" title="Help">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
          <button className="action-button" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <div className="user-menu">
            <div className="user-avatar" title={user?.name || 'User'}>
              <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <div className="user-dropdown">
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className="user-email">{user?.email}</span>
                <span className="user-role">{user?.role}</span>
              </div>
              <hr />
              <button onClick={logout} className="logout-button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="app-main">
        <MapView
          initialViewState={initialViewState}
          onFeatureCreate={handleFeatureCreate}
          onFeatureUpdate={handleFeatureUpdate}
          onFeatureDelete={handleFeatureDelete}
        />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
