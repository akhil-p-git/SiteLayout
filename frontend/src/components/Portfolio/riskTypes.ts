/**
 * Risk Scoring Types
 *
 * Types for risk assessment and risk-adjusted scoring.
 */

import { SiteData, SiteScores } from './types';

export type RiskCategory =
  | 'regulatory'
  | 'interconnection'
  | 'community'
  | 'environmental'
  | 'financial'
  | 'construction'
  | 'land';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
  id: string;
  category: RiskCategory;
  name: string;
  description: string;
  weight: number; // 0-1 impact on score
  severity: RiskSeverity;
  mitigationStatus?: 'not_started' | 'in_progress' | 'mitigated';
  notes?: string;
}

export interface SiteRiskProfile {
  siteId: string;
  factors: RiskFactor[];
  overallRiskScore: number; // 0-100, lower is riskier
  riskAdjustedScore: number;
  categoryScores: Record<RiskCategory, number>;
  alerts: RiskAlert[];
  lastAssessedAt: string;
}

export interface RiskAlert {
  id: string;
  siteId: string;
  siteName: string;
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  description: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface RiskConfiguration {
  categoryWeights: Record<RiskCategory, number>;
  severityMultipliers: Record<RiskSeverity, number>;
  alertThresholds: {
    scoreDropPercent: number;
    criticalRiskCount: number;
    highRiskCount: number;
  };
}

export const DEFAULT_RISK_CONFIG: RiskConfiguration = {
  categoryWeights: {
    regulatory: 0.2,
    interconnection: 0.2,
    community: 0.15,
    environmental: 0.15,
    financial: 0.1,
    construction: 0.1,
    land: 0.1,
  },
  severityMultipliers: {
    low: 0.9,
    medium: 0.75,
    high: 0.5,
    critical: 0.25,
  },
  alertThresholds: {
    scoreDropPercent: 20,
    criticalRiskCount: 1,
    highRiskCount: 3,
  },
};

export const RISK_CATEGORY_CONFIG: Record<RiskCategory, { label: string; color: string; icon: string }> = {
  regulatory: { label: 'Regulatory', color: '#3B82F6', icon: '⚖️' },
  interconnection: { label: 'Interconnection', color: '#F59E0B', icon: '⚡' },
  community: { label: 'Community', color: '#10B981', icon: '👥' },
  environmental: { label: 'Environmental', color: '#22C55E', icon: '🌿' },
  financial: { label: 'Financial', color: '#8B5CF6', icon: '💰' },
  construction: { label: 'Construction', color: '#EC4899', icon: '🏗️' },
  land: { label: 'Land', color: '#6366F1', icon: '🗺️' },
};

export const SEVERITY_CONFIG: Record<RiskSeverity, { label: string; color: string; order: number }> = {
  low: { label: 'Low', color: '#10B981', order: 1 },
  medium: { label: 'Medium', color: '#F59E0B', order: 2 },
  high: { label: 'High', color: '#F97316', order: 3 },
  critical: { label: 'Critical', color: '#EF4444', order: 4 },
};

// Risk calculation functions
export function calculateRiskScore(factors: RiskFactor[], config: RiskConfiguration = DEFAULT_RISK_CONFIG): number {
  if (factors.length === 0) return 100;

  let totalImpact = 0;
  let totalWeight = 0;

  factors.forEach((factor) => {
    const categoryWeight = config.categoryWeights[factor.category] || 0.1;
    const severityMultiplier = config.severityMultipliers[factor.severity];

    // Mitigated risks have reduced impact
    const mitigationFactor = factor.mitigationStatus === 'mitigated' ? 0.3 :
      factor.mitigationStatus === 'in_progress' ? 0.7 : 1.0;

    const impact = (1 - severityMultiplier) * categoryWeight * factor.weight * mitigationFactor;
    totalImpact += impact;
    totalWeight += categoryWeight * factor.weight;
  });

  // Normalize and convert to 0-100 scale
  const normalizedImpact = totalWeight > 0 ? totalImpact / totalWeight : 0;
  return Math.max(0, Math.round((1 - normalizedImpact) * 100));
}

export function calculateRiskAdjustedScore(
  baseScore: number,
  riskScore: number,
  riskWeight: number = 0.3
): number {
  // Blend base score with risk score
  const adjusted = baseScore * (1 - riskWeight) + riskScore * riskWeight;
  return Math.round(adjusted);
}

export function getCategoryRiskScore(
  factors: RiskFactor[],
  category: RiskCategory,
  config: RiskConfiguration = DEFAULT_RISK_CONFIG
): number {
  const categoryFactors = factors.filter((f) => f.category === category);
  if (categoryFactors.length === 0) return 100;

  let totalImpact = 0;
  categoryFactors.forEach((factor) => {
    const severityMultiplier = config.severityMultipliers[factor.severity];
    const mitigationFactor = factor.mitigationStatus === 'mitigated' ? 0.3 :
      factor.mitigationStatus === 'in_progress' ? 0.7 : 1.0;
    totalImpact += (1 - severityMultiplier) * factor.weight * mitigationFactor;
  });

  return Math.max(0, Math.round((1 - totalImpact / categoryFactors.length) * 100));
}

export function generateRiskAlerts(
  site: SiteData,
  riskProfile: SiteRiskProfile,
  config: RiskConfiguration = DEFAULT_RISK_CONFIG
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const now = new Date().toISOString();

  // Check for critical risks
  const criticalFactors = riskProfile.factors.filter((f) => f.severity === 'critical' && f.mitigationStatus !== 'mitigated');
  if (criticalFactors.length >= config.alertThresholds.criticalRiskCount) {
    alerts.push({
      id: `${site.id}-critical-${Date.now()}`,
      siteId: site.id,
      siteName: site.name,
      category: criticalFactors[0].category,
      severity: 'critical',
      title: 'Critical Risk Factors Present',
      description: `${criticalFactors.length} critical risk factor(s) identified that require immediate attention.`,
      createdAt: now,
    });
  }

  // Check for high risk accumulation
  const highFactors = riskProfile.factors.filter((f) => f.severity === 'high' && f.mitigationStatus !== 'mitigated');
  if (highFactors.length >= config.alertThresholds.highRiskCount) {
    alerts.push({
      id: `${site.id}-high-${Date.now()}`,
      siteId: site.id,
      siteName: site.name,
      category: highFactors[0].category,
      severity: 'high',
      title: 'Multiple High Risks',
      description: `${highFactors.length} high-risk factors affecting site viability.`,
      createdAt: now,
    });
  }

  // Check for score drop
  const scoreDrop = ((site.scores.composite - riskProfile.riskAdjustedScore) / site.scores.composite) * 100;
  if (scoreDrop >= config.alertThresholds.scoreDropPercent) {
    alerts.push({
      id: `${site.id}-score-${Date.now()}`,
      siteId: site.id,
      siteName: site.name,
      category: 'regulatory',
      severity: scoreDrop >= 30 ? 'high' : 'medium',
      title: 'Significant Score Reduction',
      description: `Risk factors have reduced the site score by ${scoreDrop.toFixed(0)}%.`,
      createdAt: now,
    });
  }

  return alerts;
}

export function getRiskSeverityColor(severity: RiskSeverity): string {
  return SEVERITY_CONFIG[severity].color;
}

export function sortBySeverity(a: RiskFactor, b: RiskFactor): number {
  return SEVERITY_CONFIG[b.severity].order - SEVERITY_CONFIG[a.severity].order;
}
