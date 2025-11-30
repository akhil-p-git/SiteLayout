/**
 * Portfolio Export Service
 *
 * Exports portfolio data to PDF, Excel, and CSV formats.
 */

import {
  SiteData,
  PortfolioSummary,
  STATUS_CONFIG,
  formatCapacity,
  formatCurrency,
} from './types';
import { SiteRiskProfile, RISK_CATEGORY_CONFIG, SEVERITY_CONFIG } from './riskTypes';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  includeRiskAssessment: boolean;
  includeMetrics: boolean;
  includeScores: boolean;
  selectedSites?: string[];
  filename?: string;
}

export interface PortfolioExportData {
  sites: SiteData[];
  summary: PortfolioSummary;
  riskProfiles?: Record<string, SiteRiskProfile>;
  exportDate: string;
  exportedBy?: string;
}

// CSV Export
export function exportToCSV(data: PortfolioExportData, options: ExportOptions): string {
  const sites = options.selectedSites
    ? data.sites.filter((s) => options.selectedSites!.includes(s.id))
    : data.sites;

  const headers = [
    'Project Code',
    'Site Name',
    'Status',
    'Region',
    'Country',
    'Latitude',
    'Longitude',
    'Capacity (MW)',
    'Total Area (m²)',
    'Buildable Area (%)',
  ];

  if (options.includeMetrics) {
    headers.push(
      'Cut Volume (m³)',
      'Fill Volume (m³)',
      'Road Length (m)',
      'Asset Count',
      'Estimated Cost ($)',
      'Carbon Footprint (tCO2)',
      'Carbon Offset (tCO2/yr)'
    );
  }

  if (options.includeScores) {
    headers.push(
      'Terrain Score',
      'Earthwork Score',
      'Accessibility Score',
      'Environmental Score',
      'Cost Score',
      'Composite Score'
    );
  }

  if (options.includeRiskAssessment && data.riskProfiles) {
    headers.push(
      'Risk Score',
      'Risk-Adjusted Score',
      'Risk Factor Count',
      'Critical Risks',
      'High Risks'
    );
  }

  const rows = sites.map((site) => {
    const row = [
      site.projectCode,
      site.name,
      STATUS_CONFIG[site.status].label,
      site.location.region || '',
      site.location.country,
      site.location.latitude.toFixed(6),
      site.location.longitude.toFixed(6),
      site.metrics.capacityMw.toFixed(2),
      site.metrics.totalArea.toFixed(0),
      site.metrics.buildablePercent.toFixed(1),
    ];

    if (options.includeMetrics) {
      row.push(
        site.metrics.cutVolume.toFixed(0),
        site.metrics.fillVolume.toFixed(0),
        site.metrics.roadLength.toFixed(0),
        site.metrics.assetCount.toString(),
        site.metrics.estimatedCost.toFixed(0),
        site.metrics.carbonFootprint.toFixed(1),
        site.metrics.carbonOffset.toFixed(1)
      );
    }

    if (options.includeScores) {
      row.push(
        site.scores.terrain.toString(),
        site.scores.earthwork.toString(),
        site.scores.accessibility.toString(),
        site.scores.environmental.toString(),
        site.scores.cost.toString(),
        site.scores.composite.toString()
      );
    }

    if (options.includeRiskAssessment && data.riskProfiles) {
      const profile = data.riskProfiles[site.id];
      if (profile) {
        const criticalCount = profile.factors.filter((f) => f.severity === 'critical').length;
        const highCount = profile.factors.filter((f) => f.severity === 'high').length;
        row.push(
          profile.overallRiskScore.toString(),
          profile.riskAdjustedScore.toString(),
          profile.factors.length.toString(),
          criticalCount.toString(),
          highCount.toString()
        );
      } else {
        row.push('100', site.scores.composite.toString(), '0', '0', '0');
      }
    }

    return row;
  });

  // Escape and format CSV
  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  return csvContent;
}

// Excel-compatible XML export (no external library needed)
export function exportToExcelXML(data: PortfolioExportData, options: ExportOptions): string {
  const sites = options.selectedSites
    ? data.sites.filter((s) => options.selectedSites!.includes(s.id))
    : data.sites;

  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1a1a2e" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Number">
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="Integer">
      <NumberFormat ss:Format="#,##0"/>
    </Style>
    <Style ss:ID="Currency">
      <NumberFormat ss:Format="$#,##0"/>
    </Style>
  </Styles>`;

  // Summary worksheet
  const summarySheet = `
  <Worksheet ss:Name="Summary">
    <Table>
      <Row>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Portfolio Summary</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Export Date</Data></Cell>
        <Cell><Data ss:Type="String">${data.exportDate}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total Sites</Data></Cell>
        <Cell ss:StyleID="Integer"><Data ss:Type="Number">${data.summary.totalSites}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total Capacity (MW)</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="Number">${data.summary.totalCapacityMw}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total Area (ha)</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="Number">${data.summary.totalAreaHa}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Average Score</Data></Cell>
        <Cell ss:StyleID="Integer"><Data ss:Type="Number">${data.summary.averageScore}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total Investment</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.summary.totalEstimatedCost}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Annual Carbon Offset (tCO2)</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="Number">${data.summary.totalCarbonOffset}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>`;

  // Sites worksheet
  const siteHeaders = [
    'Project Code', 'Site Name', 'Status', 'Region', 'Country',
    'Latitude', 'Longitude', 'Capacity (MW)', 'Area (m²)', 'Buildable %',
  ];

  if (options.includeMetrics) {
    siteHeaders.push('Cut (m³)', 'Fill (m³)', 'Roads (m)', 'Assets', 'Est. Cost', 'CO2 (t)', 'Offset (t/yr)');
  }

  if (options.includeScores) {
    siteHeaders.push('Terrain', 'Earthwork', 'Access', 'Environ', 'Cost', 'Composite');
  }

  const headerRow = siteHeaders.map((h) =>
    `<Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>`
  ).join('');

  const siteRows = sites.map((site) => {
    const cells = [
      `<Cell><Data ss:Type="String">${escapeXML(site.projectCode)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXML(site.name)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${STATUS_CONFIG[site.status].label}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXML(site.location.region || '')}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXML(site.location.country)}</Data></Cell>`,
      `<Cell ss:StyleID="Number"><Data ss:Type="Number">${site.location.latitude}</Data></Cell>`,
      `<Cell ss:StyleID="Number"><Data ss:Type="Number">${site.location.longitude}</Data></Cell>`,
      `<Cell ss:StyleID="Number"><Data ss:Type="Number">${site.metrics.capacityMw}</Data></Cell>`,
      `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.metrics.totalArea}</Data></Cell>`,
      `<Cell ss:StyleID="Number"><Data ss:Type="Number">${site.metrics.buildablePercent}</Data></Cell>`,
    ];

    if (options.includeMetrics) {
      cells.push(
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.metrics.cutVolume}</Data></Cell>`,
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.metrics.fillVolume}</Data></Cell>`,
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.metrics.roadLength}</Data></Cell>`,
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.metrics.assetCount}</Data></Cell>`,
        `<Cell ss:StyleID="Currency"><Data ss:Type="Number">${site.metrics.estimatedCost}</Data></Cell>`,
        `<Cell ss:StyleID="Number"><Data ss:Type="Number">${site.metrics.carbonFootprint}</Data></Cell>`,
        `<Cell ss:StyleID="Number"><Data ss:Type="Number">${site.metrics.carbonOffset}</Data></Cell>`
      );
    }

    if (options.includeScores) {
      cells.push(
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.scores.terrain}</Data></Cell>`,
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.scores.earthwork}</Data></Cell>`,
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.scores.accessibility}</Data></Cell>`,
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.scores.environmental}</Data></Cell>`,
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.scores.cost}</Data></Cell>`,
        `<Cell ss:StyleID="Integer"><Data ss:Type="Number">${site.scores.composite}</Data></Cell>`
      );
    }

    return `<Row>${cells.join('')}</Row>`;
  }).join('\n      ');

  const sitesSheet = `
  <Worksheet ss:Name="Sites">
    <Table>
      <Row>${headerRow}</Row>
      ${siteRows}
    </Table>
  </Worksheet>`;

  // Risk worksheet (if included)
  let riskSheet = '';
  if (options.includeRiskAssessment && data.riskProfiles) {
    const riskHeaders = ['Site', 'Risk Score', 'Adjusted Score', 'Category', 'Factor', 'Severity', 'Weight', 'Status'];
    const riskHeaderRow = riskHeaders.map((h) =>
      `<Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>`
    ).join('');

    const riskRows: string[] = [];
    sites.forEach((site) => {
      const profile = data.riskProfiles![site.id];
      if (profile && profile.factors.length > 0) {
        profile.factors.forEach((factor) => {
          riskRows.push(`<Row>
            <Cell><Data ss:Type="String">${escapeXML(site.name)}</Data></Cell>
            <Cell ss:StyleID="Integer"><Data ss:Type="Number">${profile.overallRiskScore}</Data></Cell>
            <Cell ss:StyleID="Integer"><Data ss:Type="Number">${profile.riskAdjustedScore}</Data></Cell>
            <Cell><Data ss:Type="String">${RISK_CATEGORY_CONFIG[factor.category].label}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXML(factor.name)}</Data></Cell>
            <Cell><Data ss:Type="String">${SEVERITY_CONFIG[factor.severity].label}</Data></Cell>
            <Cell ss:StyleID="Number"><Data ss:Type="Number">${factor.weight}</Data></Cell>
            <Cell><Data ss:Type="String">${factor.mitigationStatus || 'not_started'}</Data></Cell>
          </Row>`);
        });
      }
    });

    riskSheet = `
  <Worksheet ss:Name="Risk Assessment">
    <Table>
      <Row>${riskHeaderRow}</Row>
      ${riskRows.join('\n      ')}
    </Table>
  </Worksheet>`;
  }

  return `${xmlHeader}${summarySheet}${sitesSheet}${riskSheet}
</Workbook>`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Download helper
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Main export function
export function exportPortfolio(
  data: PortfolioExportData,
  options: ExportOptions
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const baseFilename = options.filename || `portfolio-export-${timestamp}`;

  switch (options.format) {
    case 'csv': {
      const csv = exportToCSV(data, options);
      downloadFile(csv, `${baseFilename}.csv`, 'text/csv;charset=utf-8');
      break;
    }
    case 'excel': {
      const xml = exportToExcelXML(data, options);
      downloadFile(xml, `${baseFilename}.xls`, 'application/vnd.ms-excel');
      break;
    }
    case 'pdf': {
      // For PDF, we need to call the backend API
      console.log('PDF export requires backend API call');
      // This would typically trigger a POST to /api/v1/reports/portfolio
      break;
    }
  }
}

// Export summary for quick exports
export function generateExportSummary(data: PortfolioExportData): string {
  const summary = data.summary;
  return `
Portfolio Export Summary
========================
Date: ${data.exportDate}
${data.exportedBy ? `Exported by: ${data.exportedBy}` : ''}

Total Sites: ${summary.totalSites}
Total Capacity: ${formatCapacity(summary.totalCapacityMw)}
Total Area: ${summary.totalAreaHa.toFixed(0)} hectares
Average Score: ${summary.averageScore}/100
Total Investment: ${formatCurrency(summary.totalEstimatedCost)}
Annual Carbon Offset: ${(summary.totalCarbonOffset / 1000).toFixed(1)}K tonnes CO2

Status Breakdown:
${Object.entries(summary.statusBreakdown)
  .filter(([, count]) => count > 0)
  .map(([status, count]) => `  ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}: ${count}`)
  .join('\n')}
`.trim();
}
