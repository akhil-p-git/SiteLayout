/**
 * HabitatOverlay Component
 *
 * Displays habitat overlay data including endangered species,
 * wetlands, impact scores, and required environmental permits.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  HabitatOverlayData,
  HabitatImpactScore,
  EndangeredSpecies,
  Wetland,
  EnvironmentalPermit,
} from '../../types/habitat';
import {
  getImpactSeverity as getSeverity,
  getImpactColor as getColor,
  formatArea as formatAreaUtil,
  STATUS_LABELS as StatusLabels,
  WETLAND_SYSTEM_LABELS as WetlandLabels,
} from '../../types/habitat';
import './HabitatOverlay.css';

interface HabitatOverlayProps {
  siteId: string;
  boundaryGeometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

const HabitatOverlay: React.FC<HabitatOverlayProps> = ({ siteId, boundaryGeometry }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [habitatData, setHabitatData] = useState<HabitatOverlayData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    impact: true,
    permits: true,
    species: false,
    wetlands: false,
  });

  const fetchHabitatData = useCallback(async () => {
    if (!boundaryGeometry) {
      setHabitatData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/habitat/site/${siteId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ boundaryGeometry }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch habitat data');
      }

      const data = await response.json();
      setHabitatData(data.overlay);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [siteId, boundaryGeometry]);

  useEffect(() => {
    fetchHabitatData();
  }, [fetchHabitatData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!boundaryGeometry) {
    return (
      <div className="habitat-overlay">
        <div className="habitat-empty-state">
          <div className="habitat-empty-icon">🌿</div>
          <h3>Habitat Analysis</h3>
          <p>Draw a site boundary to analyze habitat impacts, endangered species, and wetlands in the area.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="habitat-overlay">
        <div className="habitat-loading">
          <div className="habitat-spinner"></div>
          <p>Analyzing habitat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="habitat-overlay">
        <div className="habitat-error">
          <div className="habitat-error-icon">⚠️</div>
          <h3>Analysis Error</h3>
          <p>{error}</p>
          <button onClick={fetchHabitatData} className="habitat-retry-btn">
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!habitatData) {
    return null;
  }

  // habitatData is used directly in render - these destructured values are for potential future use
  void habitatData;

  return (
    <div className="habitat-overlay">
      <div className="habitat-header">
        <h2>🌿 Habitat Analysis</h2>
        <span className="habitat-timestamp">
          Updated: {new Date(habitatData.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Impact Score Section */}
      {habitatData.impactScore && (
        <div className="habitat-section">
          <button
            className="habitat-section-header"
            onClick={() => toggleSection('impact')}
          >
            <span className="section-title">Impact Score</span>
            <span className={`section-toggle ${expandedSections.impact ? 'expanded' : ''}`}>▼</span>
          </button>

          {expandedSections.impact && (
            <div className="habitat-section-content">
              <ImpactScoreDisplay score={habitatData.impactScore} />
            </div>
          )}
        </div>
      )}

      {/* Required Permits Section */}
      {habitatData.impactScore?.requiredPermits && habitatData.impactScore.requiredPermits.length > 0 && (
        <div className="habitat-section">
          <button
            className="habitat-section-header"
            onClick={() => toggleSection('permits')}
          >
            <span className="section-title">
              Required Permits ({habitatData.impactScore.requiredPermits.filter(p => p.required).length})
            </span>
            <span className={`section-toggle ${expandedSections.permits ? 'expanded' : ''}`}>▼</span>
          </button>

          {expandedSections.permits && (
            <div className="habitat-section-content">
              <PermitsList permits={habitatData.impactScore.requiredPermits} />
            </div>
          )}
        </div>
      )}

      {/* Species Section */}
      {habitatData.impactScore?.speciesAtRisk && habitatData.impactScore.speciesAtRisk.length > 0 && (
        <div className="habitat-section">
          <button
            className="habitat-section-header"
            onClick={() => toggleSection('species')}
          >
            <span className="section-title">
              Species at Risk ({habitatData.impactScore.speciesAtRisk.length})
            </span>
            <span className={`section-toggle ${expandedSections.species ? 'expanded' : ''}`}>▼</span>
          </button>

          {expandedSections.species && (
            <div className="habitat-section-content">
              <SpeciesList species={habitatData.impactScore.speciesAtRisk} />
            </div>
          )}
        </div>
      )}

      {/* Wetlands Section */}
      {habitatData.impactScore?.wetlandsAffected && habitatData.impactScore.wetlandsAffected.length > 0 && (
        <div className="habitat-section">
          <button
            className="habitat-section-header"
            onClick={() => toggleSection('wetlands')}
          >
            <span className="section-title">
              Wetlands Affected ({habitatData.impactScore.wetlandsAffected.length})
            </span>
            <span className={`section-toggle ${expandedSections.wetlands ? 'expanded' : ''}`}>▼</span>
          </button>

          {expandedSections.wetlands && (
            <div className="habitat-section-content">
              <WetlandsList wetlands={habitatData.impactScore.wetlandsAffected} />
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {habitatData.impactScore?.recommendations && habitatData.impactScore.recommendations.length > 0 && (
        <div className="habitat-recommendations">
          <h3>Recommendations</h3>
          <ul>
            {habitatData.impactScore.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Impact Score Display Component
const ImpactScoreDisplay: React.FC<{ score: HabitatImpactScore }> = ({ score }) => {
  const severity = getSeverity(score.overall);
  const color = getColor(score.overall);

  return (
    <div className="impact-score-display">
      <div className="impact-score-main">
        <div
          className="impact-score-circle"
          style={{ borderColor: color }}
        >
          <span className="impact-score-value">{Math.round(score.overall)}</span>
          <span className="impact-score-label">/ 100</span>
        </div>
        <div className={`impact-severity impact-severity-${severity}`}>
          {severity.toUpperCase()} IMPACT
        </div>
      </div>

      <div className="impact-factors">
        <h4>Impact Factors</h4>
        {score.factors.map((factor) => (
          <div key={factor.factorId} className="impact-factor">
            <div className="factor-header">
              <span className="factor-name">{factor.name}</span>
              <span className="factor-value">{Math.round(factor.value * factor.weight)}</span>
            </div>
            <div className="factor-bar-container">
              <div
                className="factor-bar"
                style={{
                  width: `${Math.min(factor.value, 100)}%`,
                  backgroundColor: getColor(factor.value)
                }}
              />
            </div>
            <p className="factor-description">{factor.description}</p>
          </div>
        ))}
      </div>

      <div className="impact-overlaps">
        <div className="overlap-stat">
          <span className="overlap-label">Critical Habitat Overlap</span>
          <span className="overlap-value">{score.criticalHabitatOverlap.toFixed(1)}%</span>
        </div>
        <div className="overlap-stat">
          <span className="overlap-label">Wetland Overlap</span>
          <span className="overlap-value">{score.wetlandOverlap.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

// Permits List Component
const PermitsList: React.FC<{ permits: EnvironmentalPermit[] }> = ({ permits }) => {
  const requiredPermits = permits.filter(p => p.required);
  const potentialPermits = permits.filter(p => !p.required);

  return (
    <div className="permits-list">
      {requiredPermits.length > 0 && (
        <>
          <h4 className="permits-required-header">Required</h4>
          {requiredPermits.map((permit, index) => (
            <div key={index} className="permit-card permit-required">
              <div className="permit-header">
                <span className="permit-name">{permit.name}</span>
                <span className="permit-timeline">{permit.estimatedTimeline}</span>
              </div>
              <div className="permit-authority">{permit.authority}</div>
              <div className="permit-trigger">{permit.triggerReason}</div>
              {permit.notes && <div className="permit-notes">{permit.notes}</div>}
            </div>
          ))}
        </>
      )}

      {potentialPermits.length > 0 && (
        <>
          <h4 className="permits-potential-header">Potentially Required</h4>
          {potentialPermits.map((permit, index) => (
            <div key={index} className="permit-card permit-potential">
              <div className="permit-header">
                <span className="permit-name">{permit.name}</span>
                <span className="permit-timeline">{permit.estimatedTimeline}</span>
              </div>
              <div className="permit-authority">{permit.authority}</div>
              {permit.notes && <div className="permit-notes">{permit.notes}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// Species List Component
const SpeciesList: React.FC<{ species: EndangeredSpecies[] }> = ({ species }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'endangered': return '#dc2626';
      case 'threatened': return '#f97316';
      case 'candidate': return '#eab308';
      case 'proposed_endangered': return '#ec4899';
      case 'proposed_threatened': return '#f472b6';
      default: return '#a3a3a3';
    }
  };

  const getGroupIcon = (group: string): string => {
    switch (group) {
      case 'mammal': return '🦊';
      case 'bird': return '🦅';
      case 'reptile': return '🦎';
      case 'amphibian': return '🐸';
      case 'fish': return '🐟';
      case 'invertebrate': return '🦋';
      case 'plant': return '🌱';
      default: return '🌿';
    }
  };

  return (
    <div className="species-list">
      {species.map((sp) => (
        <div key={sp.id} className="species-card">
          <div className="species-icon">{getGroupIcon(sp.group)}</div>
          <div className="species-info">
            <div className="species-common-name">{sp.commonName}</div>
            <div className="species-scientific-name">{sp.scientificName}</div>
            <div className="species-details">
              <span
                className="species-status"
                style={{ backgroundColor: getStatusColor(sp.status) }}
              >
                {StatusLabels[sp.status] || sp.status}
              </span>
              {sp.criticalHabitat && (
                <span className="species-critical-habitat">Critical Habitat</span>
              )}
            </div>
            <div className="species-buffer">
              Buffer: {sp.bufferDistance}m recommended
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Wetlands List Component
const WetlandsList: React.FC<{ wetlands: Wetland[] }> = ({ wetlands }) => {
  const getSystemColor = (system: string): string => {
    switch (system) {
      case 'marine': return '#0369a1';
      case 'estuarine': return '#0284c7';
      case 'riverine': return '#0ea5e9';
      case 'lacustrine': return '#38bdf8';
      case 'palustrine': return '#7dd3fc';
      default: return '#60a5fa';
    }
  };

  return (
    <div className="wetlands-list">
      {wetlands.map((wetland) => (
        <div key={wetland.id} className="wetland-card">
          <div
            className="wetland-system-badge"
            style={{ backgroundColor: getSystemColor(wetland.system) }}
          >
            {WetlandLabels[wetland.system] || wetland.system}
          </div>
          <div className="wetland-info">
            <div className="wetland-code">NWI: {wetland.nwiCode}</div>
            <div className="wetland-class">
              Class: {wetland.wetlandClass.replace(/_/g, ' ')}
            </div>
            <div className="wetland-area">
              Area: {formatAreaUtil(wetland.area)}
            </div>
            <div className="wetland-regime">
              Water Regime: {wetland.waterRegime}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HabitatOverlay;
