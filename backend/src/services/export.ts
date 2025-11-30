/**
 * Export Service
 *
 * Service for exporting layout data to GeoJSON and KMZ formats.
 */

import archiver from 'archiver';
import { Writable } from 'stream';
import type { Feature, FeatureCollection, Geometry, Polygon, LineString, Point } from 'geojson';
import {
  ExportFormat,
  ExportLayerType,
  ExportOptions,
  ExportResult,
  LayoutExportData,
  KMLStyle,
  DEFAULT_KML_STYLES,
  ASSET_KML_COLORS,
  GeoJSONAssetProperties,
  GeoJSONRoadProperties,
  GeoJSONExclusionZoneProperties,
  GeoJSONBoundaryProperties,
} from '../types/export';

/**
 * Round coordinates to specified precision
 */
function roundCoordinates(coords: number[], precision: number): number[] {
  return coords.map((c) => Number(c.toFixed(precision)));
}

/**
 * Recursively round all coordinates in a geometry
 */
function roundGeometryCoordinates(geometry: Geometry, precision: number): Geometry {
  const roundCoords = (coords: unknown): unknown => {
    if (typeof coords[0] === 'number') {
      return roundCoordinates(coords as number[], precision);
    }
    return (coords as unknown[]).map(roundCoords);
  };

  return {
    ...geometry,
    coordinates: roundCoords(geometry.coordinates) as typeof geometry.coordinates,
  } as Geometry;
}

/**
 * Export layout data to GeoJSON format
 */
export function exportToGeoJSON(data: LayoutExportData, options: ExportOptions): FeatureCollection {
  const features: Feature[] = [];
  const precision = options.coordinatePrecision ?? 6;

  // Add boundary
  if (options.layers.includes(ExportLayerType.BOUNDARY)) {
    const boundaryFeature: Feature<Polygon, GeoJSONBoundaryProperties> = {
      type: 'Feature',
      properties: {
        id: 'boundary',
        layerType: 'boundary',
        projectName: data.projectName,
        totalArea: data.metadata.totalArea,
      },
      geometry: roundGeometryCoordinates(data.boundary, precision) as Polygon,
    };
    features.push(boundaryFeature);
  }

  // Add assets
  if (options.layers.includes(ExportLayerType.ASSETS)) {
    for (const asset of data.assets) {
      const assetFeature: Feature<Polygon, GeoJSONAssetProperties> = {
        type: 'Feature',
        properties: {
          id: asset.id,
          type: asset.type,
          name: asset.name,
          layerType: 'asset',
          dimensions: asset.dimensions,
          rotation: asset.rotation,
          ...(options.includeMetadata && asset.earthworkVolume !== undefined
            ? {
                earthwork: {
                  cutVolume: asset.cutVolume ?? 0,
                  fillVolume: asset.fillVolume ?? 0,
                  netVolume: asset.earthworkVolume,
                },
              }
            : {}),
        },
        geometry: roundGeometryCoordinates(asset.footprint, precision) as Polygon,
      };
      features.push(assetFeature);
    }
  }

  // Add roads
  if (options.layers.includes(ExportLayerType.ROADS) && data.roads) {
    // Add entry point
    const entryFeature: Feature<Point> = {
      type: 'Feature',
      properties: {
        id: 'entry-point',
        layerType: 'road',
        name: 'Entry Point',
      },
      geometry: roundGeometryCoordinates(data.roads.entryPoint, precision) as Point,
    };
    features.push(entryFeature);

    // Add road segments
    for (let i = 0; i < data.roads.segments.length; i++) {
      const segment = data.roads.segments[i];
      const roadFeature: Feature<LineString, GeoJSONRoadProperties> = {
        type: 'Feature',
        properties: {
          id: segment.id,
          layerType: 'road',
          segmentIndex: i,
          length: segment.length,
          gradient: segment.gradient,
          width: segment.width,
        },
        geometry: roundGeometryCoordinates(segment.geometry, precision) as LineString,
      };
      features.push(roadFeature);
    }
  }

  // Add exclusion zones
  if (options.layers.includes(ExportLayerType.EXCLUSION_ZONES)) {
    for (const zone of data.exclusionZones) {
      const zoneFeature: Feature<Polygon, GeoJSONExclusionZoneProperties> = {
        type: 'Feature',
        properties: {
          id: zone.id,
          layerType: 'exclusion_zone',
          name: zone.name,
          zoneType: zone.type,
          buffer: zone.buffer,
          reason: zone.reason,
        },
        geometry: roundGeometryCoordinates(zone.geometry, precision) as Polygon,
      };
      features.push(zoneFeature);
    }
  }

  // Build feature collection with metadata
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  // Add metadata as custom properties
  if (options.includeMetadata) {
    (featureCollection as FeatureCollection & { metadata: unknown }).metadata = {
      projectId: data.projectId,
      projectName: data.projectName,
      exportDate: data.exportDate,
      crs: data.crs,
      statistics: data.metadata,
    };
  }

  return featureCollection;
}

/**
 * Convert hex color to KML AABBGGRR format
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function hexToKMLColor(hex: string, alpha: number = 255): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse RGB
  const r = hex.substring(0, 2);
  const g = hex.substring(2, 4);
  const b = hex.substring(4, 6);

  // Convert alpha to hex
  const a = alpha.toString(16).padStart(2, '0');

  // Return in AABBGGRR format
  return `${a}${b}${g}${r}`;
}

/**
 * Generate KML style block
 */
function generateKMLStyle(style: KMLStyle): string {
  return `
    <Style id="${style.id}">
      <LineStyle>
        <color>${style.lineColor}</color>
        <width>${style.lineWidth}</width>
      </LineStyle>
      <PolyStyle>
        <color>${style.fillColor}</color>
        <outline>1</outline>
      </PolyStyle>
      ${
        style.iconHref
          ? `
      <IconStyle>
        <scale>${style.iconScale ?? 1}</scale>
        <Icon>
          <href>${style.iconHref}</href>
        </Icon>
      </IconStyle>
      `
          : ''
      }
      ${
        style.labelColor
          ? `
      <LabelStyle>
        <color>${style.labelColor}</color>
      </LabelStyle>
      `
          : ''
      }
    </Style>`;
}

/**
 * Convert coordinates array to KML coordinate string
 */
function coordsToKML(coords: number[][]): string {
  return coords.map((c) => `${c[0]},${c[1]},${c[2] ?? 0}`).join(' ');
}

/**
 * Generate KML Placemark for a polygon
 */
function generatePolygonPlacemark(
  id: string,
  name: string,
  description: string,
  coords: number[][][],
  styleUrl: string
): string {
  const outerRing = coords[0];
  const innerRings = coords.slice(1);

  return `
    <Placemark id="${id}">
      <name>${escapeXml(name)}</name>
      <description><![CDATA[${description}]]></description>
      <styleUrl>#${styleUrl}</styleUrl>
      <Polygon>
        <extrude>0</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsToKML(outerRing)}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
        ${innerRings
          .map(
            (ring) => `
        <innerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsToKML(ring)}</coordinates>
          </LinearRing>
        </innerBoundaryIs>
        `
          )
          .join('')}
      </Polygon>
    </Placemark>`;
}

/**
 * Generate KML Placemark for a line
 */
function generateLinePlacemark(
  id: string,
  name: string,
  description: string,
  coords: number[][],
  styleUrl: string
): string {
  return `
    <Placemark id="${id}">
      <name>${escapeXml(name)}</name>
      <description><![CDATA[${description}]]></description>
      <styleUrl>#${styleUrl}</styleUrl>
      <LineString>
        <extrude>0</extrude>
        <tessellate>1</tessellate>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>${coordsToKML(coords)}</coordinates>
      </LineString>
    </Placemark>`;
}

/**
 * Generate KML Placemark for a point
 */
function generatePointPlacemark(
  id: string,
  name: string,
  description: string,
  coords: number[],
  styleUrl: string
): string {
  return `
    <Placemark id="${id}">
      <name>${escapeXml(name)}</name>
      <description><![CDATA[${description}]]></description>
      <styleUrl>#${styleUrl}</styleUrl>
      <Point>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>${coords[0]},${coords[1]},${coords[2] ?? 0}</coordinates>
      </Point>
    </Placemark>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Export layout data to KML format
 */
export function exportToKML(data: LayoutExportData, options: ExportOptions): string {
  const styles: string[] = [];
  const folders: string[] = [];

  // Generate styles
  if (options.includeStyles) {
    // Default layer styles
    Object.values(DEFAULT_KML_STYLES).forEach((style) => {
      styles.push(generateKMLStyle(style));
    });

    // Asset-specific styles
    Object.entries(ASSET_KML_COLORS).forEach(([assetType, color]) => {
      styles.push(
        generateKMLStyle({
          id: `asset-${assetType}`,
          lineColor: color,
          lineWidth: 2,
          fillColor: `66${color.substring(2)}`, // Add transparency
        })
      );
    });
  }

  // Boundary folder
  if (options.layers.includes(ExportLayerType.BOUNDARY)) {
    const boundaryPlacemarks: string[] = [];
    const coords =
      data.boundary.type === 'Polygon' ? data.boundary.coordinates : data.boundary.coordinates[0];

    boundaryPlacemarks.push(
      generatePolygonPlacemark(
        'boundary',
        'Site Boundary',
        `Project: ${data.projectName}<br>Total Area: ${data.metadata.totalArea.toFixed(2)} m²`,
        coords,
        'boundary-style'
      )
    );

    folders.push(`
      <Folder>
        <name>Site Boundary</name>
        <open>1</open>
        ${boundaryPlacemarks.join('\n')}
      </Folder>
    `);
  }

  // Assets folder
  if (options.layers.includes(ExportLayerType.ASSETS) && data.assets.length > 0) {
    const assetPlacemarks: string[] = [];

    for (const asset of data.assets) {
      const description = `
        Type: ${asset.type}<br>
        Dimensions: ${asset.dimensions.width}m x ${asset.dimensions.length}m x ${asset.dimensions.height}m<br>
        Rotation: ${asset.rotation}°<br>
        ${asset.earthworkVolume !== undefined ? `Earthwork: ${asset.earthworkVolume.toFixed(1)} m³` : ''}
      `;

      const styleId = options.includeStyles ? `asset-${asset.type}` : 'asset-style';

      assetPlacemarks.push(
        generatePolygonPlacemark(
          asset.id,
          asset.name,
          description,
          asset.footprint.coordinates,
          styleId
        )
      );
    }

    folders.push(`
      <Folder>
        <name>Assets</name>
        <open>1</open>
        ${assetPlacemarks.join('\n')}
      </Folder>
    `);
  }

  // Roads folder
  if (options.layers.includes(ExportLayerType.ROADS) && data.roads) {
    const roadPlacemarks: string[] = [];

    // Entry point
    roadPlacemarks.push(
      generatePointPlacemark(
        'entry-point',
        'Entry Point',
        'Site access entry point',
        data.roads.entryPoint.coordinates,
        'road-style'
      )
    );

    // Road segments
    for (let i = 0; i < data.roads.segments.length; i++) {
      const segment = data.roads.segments[i];
      const description = `
        Length: ${segment.length.toFixed(1)}m<br>
        Gradient: ${segment.gradient.toFixed(1)}%<br>
        Width: ${segment.width}m
      `;

      roadPlacemarks.push(
        generateLinePlacemark(
          segment.id,
          `Road Segment ${i + 1}`,
          description,
          segment.geometry.coordinates,
          'road-style'
        )
      );
    }

    folders.push(`
      <Folder>
        <name>Roads</name>
        <open>1</open>
        <description>Total Length: ${data.roads.totalLength.toFixed(1)}m, Max Gradient: ${data.roads.maxGradient.toFixed(1)}%</description>
        ${roadPlacemarks.join('\n')}
      </Folder>
    `);
  }

  // Exclusion zones folder
  if (options.layers.includes(ExportLayerType.EXCLUSION_ZONES) && data.exclusionZones.length > 0) {
    const zonePlacemarks: string[] = [];

    for (const zone of data.exclusionZones) {
      const description = `
        Type: ${zone.type}<br>
        ${zone.buffer ? `Buffer: ${zone.buffer}m<br>` : ''}
        ${zone.reason ? `Reason: ${zone.reason}` : ''}
      `;

      const coords =
        zone.geometry.type === 'Polygon' ? zone.geometry.coordinates : zone.geometry.coordinates[0];

      zonePlacemarks.push(
        generatePolygonPlacemark(zone.id, zone.name, description, coords, 'exclusion-style')
      );
    }

    folders.push(`
      <Folder>
        <name>Exclusion Zones</name>
        <open>0</open>
        ${zonePlacemarks.join('\n')}
      </Folder>
    `);
  }

  // Generate full KML document
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>${escapeXml(data.projectName)}</name>
    <description><![CDATA[
      Project: ${data.projectName}<br>
      Export Date: ${data.exportDate}<br>
      Assets: ${data.metadata.assetCount}<br>
      Road Length: ${data.metadata.roadLength.toFixed(1)}m<br>
      Exclusion Zones: ${data.metadata.exclusionZoneCount}
    ]]></description>
    ${styles.join('\n')}
    ${folders.join('\n')}
  </Document>
</kml>`;

  return kml;
}

/**
 * Create KMZ file (zipped KML) as Buffer
 */
export async function exportToKMZ(data: LayoutExportData, options: ExportOptions): Promise<Buffer> {
  const kml = exportToKML(data, options);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    // Create a writable stream that collects chunks
    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    archive.on('error', reject);

    writableStream.on('finish', () => {
      resolve(Buffer.concat(chunks));
    });

    archive.pipe(writableStream);
    archive.append(kml, { name: 'doc.kml' });
    archive.finalize();
  });
}

/**
 * Main export function
 */
export async function exportLayout(
  data: LayoutExportData,
  options: ExportOptions
): Promise<ExportResult> {
  const filename = options.filename ?? `${data.projectName.replace(/\s+/g, '_')}_layout`;

  try {
    switch (options.format) {
      case ExportFormat.GEOJSON: {
        const geojson = exportToGeoJSON(data, options);
        const jsonStr = JSON.stringify(geojson, null, 2);
        return {
          success: true,
          format: ExportFormat.GEOJSON,
          filename: `${filename}.geojson`,
          size: Buffer.byteLength(jsonStr, 'utf8'),
          data: jsonStr,
        };
      }

      case ExportFormat.KML: {
        const kml = exportToKML(data, options);
        return {
          success: true,
          format: ExportFormat.KML,
          filename: `${filename}.kml`,
          size: Buffer.byteLength(kml, 'utf8'),
          data: kml,
        };
      }

      case ExportFormat.KMZ: {
        const kmz = await exportToKMZ(data, options);
        return {
          success: true,
          format: ExportFormat.KMZ,
          filename: `${filename}.kmz`,
          size: kmz.length,
          data: kmz,
        };
      }

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  } catch (error) {
    return {
      success: false,
      format: options.format,
      filename: `${filename}.${options.format}`,
      size: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate export data
 */
export function validateExportData(data: Partial<LayoutExportData>): string[] {
  const errors: string[] = [];

  if (!data.projectId) errors.push('Project ID is required');
  if (!data.projectName) errors.push('Project name is required');
  if (!data.boundary) errors.push('Site boundary is required');
  if (!data.assets) errors.push('Assets array is required');
  if (!data.exclusionZones) errors.push('Exclusion zones array is required');

  return errors;
}

/**
 * Get default export options
 */
export function getDefaultExportOptions(format: ExportFormat): ExportOptions {
  return {
    format,
    layers: [
      ExportLayerType.BOUNDARY,
      ExportLayerType.ASSETS,
      ExportLayerType.ROADS,
      ExportLayerType.EXCLUSION_ZONES,
    ],
    includeStyles: true,
    coordinatePrecision: 6,
    includeMetadata: true,
  };
}
