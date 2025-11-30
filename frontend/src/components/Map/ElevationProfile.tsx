import { useMemo, useState, useRef, useCallback } from 'react';
import type { ElevationProfilePoint } from '../../types/map';
import './ElevationProfile.css';

interface ElevationProfileProps {
  data: ElevationProfilePoint[];
  unit?: 'meters' | 'feet';
  onHover?: (point: ElevationProfilePoint | null) => void;
  className?: string;
  title?: string;
}

export function ElevationProfile({
  data,
  unit = 'meters',
  onHover,
  className = '',
  title = 'Elevation Profile',
}: ElevationProfileProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ElevationProfilePoint | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Chart dimensions
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = 400;
  const height = 200;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Convert units if needed
  const conversionFactor = unit === 'feet' ? 3.28084 : 1;
  const unitLabel = unit === 'feet' ? 'ft' : 'm';

  // Calculate data bounds and scales
  const { minElevation, maxElevation, maxDistance, pathData, gradientStops, stats } = useMemo(() => {
    if (data.length === 0) {
      return {
        minElevation: 0,
        maxElevation: 100,
        maxDistance: 1000,
        pathData: '',
        gradientStops: [],
        stats: { min: 0, max: 0, avg: 0, totalGain: 0, maxSlope: 0 },
      };
    }

    const elevations = data.map((p) => p.elevation * conversionFactor);
    const distances = data.map((p) => p.distance);

    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const maxDist = Math.max(...distances);

    // Add padding to elevation range
    const elevRange = maxElev - minElev || 10;
    const paddedMin = minElev - elevRange * 0.1;
    const paddedMax = maxElev + elevRange * 0.1;

    // Scale functions
    const xScale = (d: number) => (d / maxDist) * chartWidth;
    const yScale = (e: number) => chartHeight - ((e - paddedMin) / (paddedMax - paddedMin)) * chartHeight;

    // Generate path
    const points = data.map((p, i) => {
      const x = xScale(p.distance);
      const y = yScale(p.elevation * conversionFactor);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    });

    // Generate area path (for fill)
    const areaPoints = [...points, `L${chartWidth},${chartHeight}`, `L0,${chartHeight}`, 'Z'];

    // Calculate gradient stops based on slope
    const stops: { offset: string; color: string }[] = [];
    data.forEach((p, i) => {
      if (i === 0) return;
      const slope = Math.abs(
        ((data[i].elevation - data[i - 1].elevation) / (data[i].distance - data[i - 1].distance)) * 100
      );
      const offset = `${(p.distance / maxDist) * 100}%`;
      let color = '#22c55e'; // Green for flat
      if (slope > 15) color = '#dc2626'; // Red for steep
      else if (slope > 10) color = '#f97316'; // Orange
      else if (slope > 5) color = '#eab308'; // Yellow
      stops.push({ offset, color });
    });

    // Calculate statistics
    let totalGain = 0;
    let maxSlope = 0;
    for (let i = 1; i < data.length; i++) {
      const elevDiff = data[i].elevation - data[i - 1].elevation;
      if (elevDiff > 0) totalGain += elevDiff;
      const slope = Math.abs((elevDiff / (data[i].distance - data[i - 1].distance)) * 100);
      maxSlope = Math.max(maxSlope, slope);
    }

    return {
      minElevation: paddedMin,
      maxElevation: paddedMax,
      maxDistance: maxDist,
      pathData: points.join(' '),
      areaPathData: areaPoints.join(' '),
      gradientStops: stops,
      stats: {
        min: minElev,
        max: maxElev,
        avg: elevations.reduce((a, b) => a + b, 0) / elevations.length,
        totalGain: totalGain * conversionFactor,
        maxSlope,
      },
    };
  }, [data, conversionFactor, chartWidth, chartHeight]);

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || data.length === 0) return;

      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - margin.left;

      if (x < 0 || x > chartWidth) {
        setHoveredPoint(null);
        onHover?.(null);
        return;
      }

      const distance = (x / chartWidth) * maxDistance;
      const closestPoint = data.reduce((closest, point) => {
        return Math.abs(point.distance - distance) < Math.abs(closest.distance - distance)
          ? point
          : closest;
      });

      setHoveredPoint(closestPoint);
      setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      onHover?.(closestPoint);
    },
    [data, maxDistance, chartWidth, margin.left, onHover]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    onHover?.(null);
  }, [onHover]);

  if (data.length === 0) {
    return (
      <div className={`elevation-profile empty ${className}`}>
        <p>Draw a line on the map to see elevation profile</p>
      </div>
    );
  }

  // Format Y axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minElevation + ((maxElevation - minElevation) * i) / 4;
    return {
      value,
      y: chartHeight - (i / 4) * chartHeight,
      label: value.toFixed(0),
    };
  });

  // Format X axis ticks
  const xTicks = Array.from({ length: 5 }, (_, i) => {
    const value = (maxDistance * i) / 4;
    return {
      value,
      x: (i / 4) * chartWidth,
      label: value >= 1000 ? `${(value / 1000).toFixed(1)}km` : `${value.toFixed(0)}m`,
    };
  });

  return (
    <div className={`elevation-profile ${className}`}>
      <div className="elevation-profile-header">
        <h3>{title}</h3>
        <div className="elevation-stats">
          <span>
            Min: {stats.min.toFixed(1)}
            {unitLabel}
          </span>
          <span>
            Max: {stats.max.toFixed(1)}
            {unitLabel}
          </span>
          <span>Gain: {stats.totalGain.toFixed(1)}{unitLabel}</span>
          <span>Max Slope: {stats.maxSlope.toFixed(1)}%</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="elevation-chart"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="elevation-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          <g className="grid-lines">
            {yTicks.map((tick, i) => (
              <line
                key={`y-${i}`}
                x1={0}
                y1={tick.y}
                x2={chartWidth}
                y2={tick.y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
            ))}
            {xTicks.map((tick, i) => (
              <line
                key={`x-${i}`}
                x1={tick.x}
                y1={0}
                x2={tick.x}
                y2={chartHeight}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
            ))}
          </g>

          {/* Area fill */}
          <path
            d={`${pathData} L${chartWidth},${chartHeight} L0,${chartHeight} Z`}
            fill="url(#area-gradient)"
          />

          {/* Elevation line */}
          <path d={pathData} fill="none" stroke="url(#elevation-gradient)" strokeWidth="2.5" />

          {/* Y axis */}
          <g className="y-axis">
            <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#d1d5db" />
            {yTicks.map((tick, i) => (
              <g key={i} transform={`translate(0,${tick.y})`}>
                <line x1={-6} y1={0} x2={0} y2={0} stroke="#d1d5db" />
                <text x={-10} y={4} textAnchor="end" className="axis-label">
                  {tick.label}
                </text>
              </g>
            ))}
            <text
              transform={`translate(-40,${chartHeight / 2}) rotate(-90)`}
              textAnchor="middle"
              className="axis-title"
            >
              Elevation ({unitLabel})
            </text>
          </g>

          {/* X axis */}
          <g className="x-axis" transform={`translate(0,${chartHeight})`}>
            <line x1={0} y1={0} x2={chartWidth} y2={0} stroke="#d1d5db" />
            {xTicks.map((tick, i) => (
              <g key={i} transform={`translate(${tick.x},0)`}>
                <line x1={0} y1={0} x2={0} y2={6} stroke="#d1d5db" />
                <text x={0} y={20} textAnchor="middle" className="axis-label">
                  {tick.label}
                </text>
              </g>
            ))}
            <text x={chartWidth / 2} y={35} textAnchor="middle" className="axis-title">
              Distance
            </text>
          </g>

          {/* Hover indicator */}
          {hoveredPoint && (
            <g>
              <line
                x1={(hoveredPoint.distance / maxDistance) * chartWidth}
                y1={0}
                x2={(hoveredPoint.distance / maxDistance) * chartWidth}
                y2={chartHeight}
                stroke="#6b7280"
                strokeDasharray="4 4"
              />
              <circle
                cx={(hoveredPoint.distance / maxDistance) * chartWidth}
                cy={
                  chartHeight -
                  ((hoveredPoint.elevation * conversionFactor - minElevation) /
                    (maxElevation - minElevation)) *
                    chartHeight
                }
                r={5}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={2}
              />
            </g>
          )}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="elevation-tooltip"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 60,
          }}
        >
          <div className="tooltip-row">
            <span>Distance:</span>
            <span>
              {hoveredPoint.distance >= 1000
                ? `${(hoveredPoint.distance / 1000).toFixed(2)} km`
                : `${hoveredPoint.distance.toFixed(0)} m`}
            </span>
          </div>
          <div className="tooltip-row">
            <span>Elevation:</span>
            <span>
              {(hoveredPoint.elevation * conversionFactor).toFixed(1)} {unitLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ElevationProfile;
