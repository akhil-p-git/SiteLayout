import type { ChartDataPoint } from './types';
import './Charts.css';

interface SimpleBarChartProps {
  data: ChartDataPoint[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
}

export function SimpleBarChart({
  data,
  height = 100,
  showLabels = true,
  showValues = true,
}: SimpleBarChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="simple-bar-chart" style={{ height }}>
      <div className="bar-chart-bars">
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="bar-item">
              <div className="bar-container">
                <div
                  className="bar"
                  style={{
                    height: `${percentage}%`,
                    backgroundColor: item.color || '#3b82f6',
                  }}
                />
              </div>
              {showLabels && <span className="bar-label">{item.label}</span>}
              {showValues && (
                <span className="bar-value">
                  {item.value >= 1000
                    ? `${(item.value / 1000).toFixed(1)}k`
                    : item.value.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SimplePieChartProps {
  data: ChartDataPoint[];
  size?: number;
  showLegend?: boolean;
}

export function SimplePieChart({
  data,
  size = 120,
  showLegend = true,
}: SimplePieChartProps) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  // Calculate pie segments using reduce to avoid mutable variable
  const segments = data.reduce<Array<ChartDataPoint & { percentage: number; startAngle: number; endAngle: number }>>((acc, item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
    const endAngle = startAngle + angle;

    acc.push({
      ...item,
      percentage,
      startAngle,
      endAngle,
    });
    return acc;
  }, []);

  // Generate SVG path for each segment
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = radius + radius * Math.cos(startRad);
    const y1 = radius + radius * Math.sin(startRad);
    const x2 = radius + radius * Math.cos(endRad);
    const y2 = radius + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const radius = size / 2;

  return (
    <div className="simple-pie-chart">
      <svg width={size} height={size} className="pie-svg">
        {segments.map((seg, index) => (
          <path
            key={index}
            d={createArcPath(seg.startAngle, seg.endAngle, radius)}
            fill={seg.color || '#3b82f6'}
            className="pie-segment"
          >
            <title>{`${seg.label}: ${seg.percentage.toFixed(1)}%`}</title>
          </path>
        ))}
      </svg>
      {showLegend && (
        <div className="pie-legend">
          {segments.map((seg, index) => (
            <div key={index} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: seg.color }}
              />
              <span className="legend-label">{seg.label}</span>
              <span className="legend-value">{seg.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
}

export function ProgressBar({
  value,
  max,
  label,
  color = '#3b82f6',
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="progress-bar-container">
      {label && <span className="progress-label">{label}</span>}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showPercentage && (
        <span className="progress-percentage">{percentage.toFixed(0)}%</span>
      )}
    </div>
  );
}

interface ComparisonBarProps {
  label: string;
  value1: number;
  value2: number;
  label1?: string;
  label2?: string;
  color1?: string;
  color2?: string;
}

export function ComparisonBar({
  label,
  value1,
  value2,
  label1 = 'Current',
  label2 = 'Previous',
  color1 = '#3b82f6',
  color2 = '#94a3b8',
}: ComparisonBarProps) {
  const maxValue = Math.max(value1, value2);

  return (
    <div className="comparison-bar">
      <span className="comparison-label">{label}</span>
      <div className="comparison-bars">
        <div className="comparison-row">
          <span className="comparison-bar-label">{label1}</span>
          <div className="comparison-bar-track">
            <div
              className="comparison-bar-fill"
              style={{
                width: `${maxValue > 0 ? (value1 / maxValue) * 100 : 0}%`,
                backgroundColor: color1,
              }}
            />
          </div>
          <span className="comparison-bar-value">{value1.toLocaleString()}</span>
        </div>
        <div className="comparison-row">
          <span className="comparison-bar-label">{label2}</span>
          <div className="comparison-bar-track">
            <div
              className="comparison-bar-fill"
              style={{
                width: `${maxValue > 0 ? (value2 / maxValue) * 100 : 0}%`,
                backgroundColor: color2,
              }}
            />
          </div>
          <span className="comparison-bar-value">{value2.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default { SimpleBarChart, SimplePieChart, ProgressBar, ComparisonBar };
