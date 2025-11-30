/**
 * Risk Assessment Panel Component
 *
 * Displays and manages risk factors for a site.
 */

import React, { useState, useMemo } from 'react';
import {
  RiskFactor,
  RiskCategory,
  RiskSeverity,
  SiteRiskProfile,
  RISK_CATEGORY_CONFIG,
  SEVERITY_CONFIG,
  getCategoryRiskScore,
  sortBySeverity,
} from './riskTypes';
import { SiteData, getScoreColor } from './types';
import './RiskAssessmentPanel.css';

interface RiskAssessmentPanelProps {
  site: SiteData;
  riskProfile: SiteRiskProfile;
  onAddRisk?: (factor: Omit<RiskFactor, 'id'>) => void;
  onUpdateRisk?: (factor: RiskFactor) => void;
  onRemoveRisk?: (factorId: string) => void;
  readOnly?: boolean;
}

interface RiskFactorCardProps {
  factor: RiskFactor;
  onUpdate?: (factor: RiskFactor) => void;
  onRemove?: () => void;
  readOnly?: boolean;
}

const RiskFactorCard: React.FC<RiskFactorCardProps> = ({
  factor,
  onUpdate,
  onRemove,
  readOnly,
}) => {
  const categoryConfig = RISK_CATEGORY_CONFIG[factor.category];
  const severityConfig = SEVERITY_CONFIG[factor.severity];

  const handleMitigationChange = (status: RiskFactor['mitigationStatus']) => {
    if (onUpdate) {
      onUpdate({ ...factor, mitigationStatus: status });
    }
  };

  return (
    <div className={`risk-factor-card severity-${factor.severity}`}>
      <div className="factor-header">
        <div className="factor-category" style={{ color: categoryConfig.color }}>
          <span className="category-icon">{categoryConfig.icon}</span>
          <span>{categoryConfig.label}</span>
        </div>
        <div className="factor-severity" style={{ backgroundColor: severityConfig.color }}>
          {severityConfig.label}
        </div>
      </div>

      <div className="factor-body">
        <h4 className="factor-name">{factor.name}</h4>
        <p className="factor-description">{factor.description}</p>
      </div>

      <div className="factor-footer">
        <div className="mitigation-status">
          <span className="status-label">Mitigation:</span>
          {readOnly ? (
            <span className={`status-badge ${factor.mitigationStatus || 'not_started'}`}>
              {factor.mitigationStatus === 'mitigated'
                ? 'Mitigated'
                : factor.mitigationStatus === 'in_progress'
                  ? 'In Progress'
                  : 'Not Started'}
            </span>
          ) : (
            <select
              value={factor.mitigationStatus || 'not_started'}
              onChange={(e) =>
                handleMitigationChange(e.target.value as RiskFactor['mitigationStatus'])
              }
              className="mitigation-select"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="mitigated">Mitigated</option>
            </select>
          )}
        </div>

        {!readOnly && onRemove && (
          <button className="remove-factor" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      <div className="factor-weight">Impact: {Math.round(factor.weight * 100)}%</div>
    </div>
  );
};

interface AddRiskFormProps {
  onAdd: (factor: Omit<RiskFactor, 'id'>) => void;
  onCancel: () => void;
}

const AddRiskForm: React.FC<AddRiskFormProps> = ({ onAdd, onCancel }) => {
  const [category, setCategory] = useState<RiskCategory>('regulatory');
  const [severity, setSeverity] = useState<RiskSeverity>('medium');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(0.5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd({
        category,
        severity,
        name: name.trim(),
        description: description.trim(),
        weight,
        mitigationStatus: 'not_started',
      });
    }
  };

  return (
    <form className="add-risk-form" onSubmit={handleSubmit}>
      <h4>Add Risk Factor</h4>

      <div className="form-row">
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as RiskCategory)}>
            {Object.entries(RISK_CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Severity
          <select value={severity} onChange={(e) => setSeverity(e.target.value as RiskSeverity)}>
            {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Risk Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Permitting delays"
          required
        />
      </label>

      <label>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the risk and its potential impact..."
          rows={3}
        />
      </label>

      <label>
        Impact Weight: {Math.round(weight * 100)}%
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(parseFloat(e.target.value))}
        />
      </label>

      <div className="form-actions">
        <button type="button" className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="add-btn" disabled={!name.trim()}>
          Add Risk
        </button>
      </div>
    </form>
  );
};

export const RiskAssessmentPanel: React.FC<RiskAssessmentPanelProps> = ({
  site,
  riskProfile,
  onAddRisk,
  onUpdateRisk,
  onRemoveRisk,
  readOnly = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RiskCategory | 'all'>('all');

  const filteredFactors = useMemo(() => {
    const factors =
      selectedCategory === 'all'
        ? riskProfile.factors
        : riskProfile.factors.filter((f) => f.category === selectedCategory);
    return [...factors].sort(sortBySeverity);
  }, [riskProfile.factors, selectedCategory]);

  const categoryScores = useMemo(() => {
    return Object.keys(RISK_CATEGORY_CONFIG).reduce(
      (acc, cat) => {
        acc[cat as RiskCategory] = getCategoryRiskScore(riskProfile.factors, cat as RiskCategory);
        return acc;
      },
      {} as Record<RiskCategory, number>
    );
  }, [riskProfile.factors]);

  const handleAdd = (factor: Omit<RiskFactor, 'id'>) => {
    onAddRisk?.(factor);
    setShowAddForm(false);
  };

  const baseScoreColor = getScoreColor(site.scores.composite);
  const adjustedScoreColor = getScoreColor(riskProfile.riskAdjustedScore);

  return (
    <div className="risk-assessment-panel">
      <div className="panel-header">
        <h3>Risk Assessment</h3>
        <span className="site-name">{site.name}</span>
      </div>

      <div className="score-comparison">
        <div className="score-card base">
          <span className="score-label">Base Score</span>
          <span className="score-value" style={{ color: baseScoreColor }}>
            {site.scores.composite}
          </span>
        </div>
        <div className="score-arrow">→</div>
        <div className="score-card adjusted">
          <span className="score-label">Risk-Adjusted</span>
          <span className="score-value" style={{ color: adjustedScoreColor }}>
            {riskProfile.riskAdjustedScore}
          </span>
        </div>
        <div className="score-card risk">
          <span className="score-label">Risk Score</span>
          <span
            className="score-value"
            style={{ color: getScoreColor(riskProfile.overallRiskScore) }}
          >
            {riskProfile.overallRiskScore}
          </span>
        </div>
      </div>

      <div className="category-scores">
        <h4>Risk by Category</h4>
        <div className="category-grid">
          {Object.entries(RISK_CATEGORY_CONFIG).map(([cat, config]) => {
            const score = categoryScores[cat as RiskCategory];
            const count = riskProfile.factors.filter((f) => f.category === cat).length;
            return (
              <button
                key={cat}
                className={`category-score ${selectedCategory === cat ? 'selected' : ''}`}
                onClick={() =>
                  setSelectedCategory(selectedCategory === cat ? 'all' : (cat as RiskCategory))
                }
              >
                <span className="cat-icon">{config.icon}</span>
                <span className="cat-name">{config.label}</span>
                <span className="cat-score" style={{ color: getScoreColor(score) }}>
                  {score}
                </span>
                {count > 0 && <span className="cat-count">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="factors-section">
        <div className="factors-header">
          <h4>
            Risk Factors
            {selectedCategory !== 'all' && (
              <span className="filter-badge">
                {RISK_CATEGORY_CONFIG[selectedCategory].label}
                <button onClick={() => setSelectedCategory('all')}>×</button>
              </span>
            )}
          </h4>
          {!readOnly && (
            <button className="add-factor-btn" onClick={() => setShowAddForm(true)}>
              + Add Risk
            </button>
          )}
        </div>

        {showAddForm && <AddRiskForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />}

        <div className="factors-list">
          {filteredFactors.length === 0 ? (
            <div className="no-factors">
              {selectedCategory === 'all'
                ? 'No risk factors identified. Add risks to assess site viability.'
                : `No ${RISK_CATEGORY_CONFIG[selectedCategory].label.toLowerCase()} risks identified.`}
            </div>
          ) : (
            filteredFactors.map((factor) => (
              <RiskFactorCard
                key={factor.id}
                factor={factor}
                onUpdate={onUpdateRisk}
                onRemove={() => onRemoveRisk?.(factor.id)}
                readOnly={readOnly}
              />
            ))
          )}
        </div>
      </div>

      {riskProfile.alerts.length > 0 && (
        <div className="alerts-section">
          <h4>Active Alerts</h4>
          <div className="alerts-list">
            {riskProfile.alerts.map((alert) => (
              <div key={alert.id} className={`alert-item severity-${alert.severity}`}>
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <span className="alert-title">{alert.title}</span>
                  <span className="alert-description">{alert.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAssessmentPanel;
