import { useState, useCallback } from 'react';
import { MapProvider } from '../../context/MapContext';
import { Map } from './Map';
import { LayerControls } from './LayerControls';
import { DrawingToolbar } from './DrawingToolbar';
import { TerrainOverlay } from './TerrainOverlay';
import { ElevationProfile } from './ElevationProfile';
import { ExclusionZonePanel } from '../ExclusionZone/ExclusionZonePanel';
import { ZoneForm } from '../ExclusionZone/ZoneForm';
import { BoundaryPanel, type SiteBoundary } from '../Boundary/BoundaryPanel';
import { HabitatOverlay } from '../Habitat';
import type { MapViewState, ElevationProfilePoint } from '../../types/map';
import type { ExclusionZone } from '../../types/exclusionZone';
import './MapView.css';

interface MapViewProps {
  initialViewState?: Partial<MapViewState>;
  demUrl?: string;
  className?: string;
  showControls?: boolean;
  showElevationProfile?: boolean;
  onFeatureCreate?: (feature: GeoJSON.Feature) => void;
  onFeatureUpdate?: (feature: GeoJSON.Feature) => void;
  onFeatureDelete?: (featureIds: string[]) => void;
}

export function MapView({
  initialViewState,
  demUrl,
  className = '',
  showControls = true,
  showElevationProfile = true,
  onFeatureCreate,
  onFeatureUpdate,
  onFeatureDelete,
}: MapViewProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [elevationData, setElevationData] = useState<ElevationProfilePoint[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'boundary' | 'zones' | 'habitat'>('layers');
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ExclusionZone | null>(null);
  const [drawnGeometry, setDrawnGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [siteBoundary, setSiteBoundary] = useState<SiteBoundary | null>(null);

  // Demo site ID for testing - in production this would come from route/context
  const DEMO_SITE_ID = 'demo-site-001';

  const handleFeatureCreate = useCallback(
    (feature: GeoJSON.Feature) => {
      // If it's a line, generate elevation profile
      if (feature.geometry.type === 'LineString') {
        // Mock elevation data - in production this would come from the DEM
        const coords = feature.geometry.coordinates as [number, number][];
        const mockElevation = coords.map((coord, i) => ({
          distance: i * 100,
          elevation: 100 + Math.sin(i * 0.5) * 50 + Math.random() * 20,
          longitude: coord[0],
          latitude: coord[1],
        }));
        setElevationData(mockElevation);
        setIsProfileOpen(true);
      }

      // Pass polygon features based on active tab
      if (feature.geometry.type === 'Polygon') {
        // If on boundary tab, the BoundaryPanel handles it via its own state
        // Otherwise, open zone form
        if (activeTab !== 'boundary') {
          setDrawnGeometry(feature.geometry as GeoJSON.Polygon);
          setShowZoneForm(true);
          setActiveTab('zones');
        }
      }

      onFeatureCreate?.(feature);
    },
    [onFeatureCreate, activeTab]
  );

  const handleZoneCreate = useCallback(() => {
    setEditingZone(null);
    setShowZoneForm(true);
  }, []);

  const handleZoneEdit = useCallback((zone: ExclusionZone) => {
    setEditingZone(zone);
    setShowZoneForm(true);
  }, []);

  const handleZoneFormClose = useCallback(() => {
    setShowZoneForm(false);
    setEditingZone(null);
    setDrawnGeometry(null);
  }, []);

  const handleBoundaryChange = useCallback((boundary: SiteBoundary | null) => {
    setSiteBoundary(boundary);
  }, []);

  const handleDelete = useCallback(() => {
    // Delete is handled by the Map component via keyboard
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <MapProvider initialViewState={initialViewState}>
      <div className={`map-view ${className}`}>
        {/* Mobile menu toggle */}
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu} aria-label="Toggle menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Main map */}
        <div className="map-view-main">
          <Map
            onFeatureCreate={handleFeatureCreate}
            onFeatureUpdate={onFeatureUpdate}
            onFeatureDelete={onFeatureDelete}
          />
          <TerrainOverlay demUrl={demUrl} />

          {/* Drawing toolbar - positioned at top center */}
          {showControls && (
            <div className="map-view-toolbar">
              <DrawingToolbar onDelete={handleDelete} />
            </div>
          )}

          {/* Sidebar toggle button */}
          {showControls && (
            <button
              className={`sidebar-toggle ${isSidebarOpen ? 'open' : ''}`}
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={isSidebarOpen ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
              </svg>
            </button>
          )}
        </div>

        {/* Sidebar with layer controls and zones */}
        {showControls && (
          <div
            className={`map-view-sidebar ${isSidebarOpen ? 'open' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}
          >
            <div className="sidebar-header">
              <div className="sidebar-tabs">
                <button
                  className={`sidebar-tab ${activeTab === 'layers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('layers')}
                >
                  Layers
                </button>
                <button
                  className={`sidebar-tab ${activeTab === 'boundary' ? 'active' : ''}`}
                  onClick={() => setActiveTab('boundary')}
                >
                  Boundary
                </button>
                <button
                  className={`sidebar-tab ${activeTab === 'zones' ? 'active' : ''}`}
                  onClick={() => setActiveTab('zones')}
                >
                  Zones
                </button>
                <button
                  className={`sidebar-tab ${activeTab === 'habitat' ? 'active' : ''}`}
                  onClick={() => setActiveTab('habitat')}
                >
                  Habitat
                </button>
              </div>
              <button
                className="sidebar-close"
                onClick={() => {
                  setIsSidebarOpen(false);
                  setIsMobileMenuOpen(false);
                }}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {activeTab === 'layers' && <LayerControls />}
            {activeTab === 'boundary' && (
              <BoundaryPanel
                siteId={DEMO_SITE_ID}
                onBoundaryChange={handleBoundaryChange}
              />
            )}
            {activeTab === 'habitat' && (
              <HabitatOverlay
                siteId={DEMO_SITE_ID}
                boundaryGeometry={siteBoundary?.geometry}
              />
            )}
            {activeTab === 'zones' && (
              showZoneForm ? (
                <ZoneForm
                  siteId={DEMO_SITE_ID}
                  zone={editingZone || undefined}
                  geometry={drawnGeometry || undefined}
                  onSave={handleZoneFormClose}
                  onCancel={handleZoneFormClose}
                />
              ) : (
                <ExclusionZonePanel
                  siteId={DEMO_SITE_ID}
                  onZoneCreate={handleZoneCreate}
                  onZoneEdit={handleZoneEdit}
                />
              )
            )}
          </div>
        )}

        {/* Elevation profile panel */}
        {showElevationProfile && isProfileOpen && elevationData.length > 0 && (
          <div className="map-view-profile">
            <button
              className="profile-close"
              onClick={() => setIsProfileOpen(false)}
              aria-label="Close elevation profile"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <ElevationProfile data={elevationData} title="Elevation Profile" unit="meters" />
          </div>
        )}

        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
        )}
      </div>
    </MapProvider>
  );
}

export default MapView;
