import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import unzipper from 'unzipper';
import { DOMParser } from 'xmldom';
import * as toGeoJSON from '@tmcw/togeojson';
import proj4 from 'proj4';
import type { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon, LineString, Point } from 'geojson';

// Define common projections
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs');

// UTM zones (for auto-detection)
for (let zone = 1; zone <= 60; zone++) {
  proj4.defs(`EPSG:${32600 + zone}`, `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`);
  proj4.defs(`EPSG:${32700 + zone}`, `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`);
}

// Parsed file result
export interface ParsedFile {
  type: 'kml' | 'kmz' | 'geojson';
  features: Feature[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null;
  crs: string;
  metadata: {
    name?: string;
    description?: string;
    featureCount: number;
    polygonCount: number;
    lineCount: number;
    pointCount: number;
  };
}

// Extracted geometry with properties
export interface ExtractedGeometry {
  id: string;
  name: string;
  type: 'polygon' | 'multipolygon' | 'linestring' | 'point';
  geometry: Geometry;
  properties: Record<string, unknown>;
  area?: number; // For polygons, in square meters
}

/**
 * Extract KML content from a KMZ file
 */
export async function extractKmlFromKmz(kmzPath: string): Promise<string> {
  const tempDir = path.join(path.dirname(kmzPath), `temp_${Date.now()}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    // Extract KMZ (which is a ZIP file)
    await new Promise<void>((resolve, reject) => {
      createReadStream(kmzPath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .on('close', resolve)
        .on('error', reject);
    });

    // Find the doc.kml file (usually the main KML in a KMZ)
    const files = await fs.readdir(tempDir);
    let kmlFile = files.find(f => f.toLowerCase() === 'doc.kml');

    // If no doc.kml, look for any .kml file
    if (!kmlFile) {
      kmlFile = files.find(f => f.toLowerCase().endsWith('.kml'));
    }

    if (!kmlFile) {
      throw new Error('No KML file found in KMZ archive');
    }

    const kmlContent = await fs.readFile(path.join(tempDir, kmlFile), 'utf-8');

    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });

    return kmlContent;
  } catch (error) {
    // Cleanup on error
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Parse KML content to GeoJSON
 */
export function parseKmlToGeoJSON(kmlContent: string): FeatureCollection {
  const parser = new DOMParser();
  const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');

  // Use togeojson to convert KML to GeoJSON
  const geojson = toGeoJSON.kml(kmlDoc);

  return geojson as FeatureCollection;
}

/**
 * Parse a file (KML, KMZ, or GeoJSON) and extract geometries
 */
export async function parseFile(filepath: string): Promise<ParsedFile> {
  const ext = path.extname(filepath).toLowerCase();
  let geojson: FeatureCollection;
  let fileType: 'kml' | 'kmz' | 'geojson';

  switch (ext) {
    case '.kmz': {
      const kmlContent = await extractKmlFromKmz(filepath);
      geojson = parseKmlToGeoJSON(kmlContent);
      fileType = 'kmz';
      break;
    }
    case '.kml': {
      const kmlContent = await fs.readFile(filepath, 'utf-8');
      geojson = parseKmlToGeoJSON(kmlContent);
      fileType = 'kml';
      break;
    }
    case '.geojson':
    case '.json': {
      const content = await fs.readFile(filepath, 'utf-8');
      geojson = JSON.parse(content) as FeatureCollection;
      fileType = 'geojson';
      break;
    }
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }

  // Ensure we have a FeatureCollection
  if (geojson.type !== 'FeatureCollection') {
    if (geojson.type === 'Feature') {
      geojson = {
        type: 'FeatureCollection',
        features: [geojson as unknown as Feature],
      };
    } else {
      throw new Error('Invalid GeoJSON: expected FeatureCollection or Feature');
    }
  }

  // Calculate bounds and count geometry types
  const bounds = calculateBounds(geojson.features);
  const metadata = calculateMetadata(geojson);

  return {
    type: fileType,
    features: geojson.features,
    bounds,
    crs: 'EPSG:4326', // KML is always WGS84
    metadata,
  };
}

/**
 * Calculate bounding box from features
 */
function calculateBounds(features: Feature[]): ParsedFile['bounds'] {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  function processCoord(coord: number[]): void {
    const [lng, lat] = coord;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  function processCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;

    if (typeof coords[0] === 'number') {
      processCoord(coords as number[]);
    } else {
      for (const c of coords) {
        processCoords(c);
      }
    }
  }

  for (const feature of features) {
    if (feature.geometry) {
      const geom = feature.geometry as Geometry;
      if ('coordinates' in geom) {
        processCoords(geom.coordinates);
      }
    }
  }

  if (minLat === Infinity) return null;

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Calculate metadata from GeoJSON
 */
function calculateMetadata(geojson: FeatureCollection): ParsedFile['metadata'] {
  let polygonCount = 0;
  let lineCount = 0;
  let pointCount = 0;
  let name: string | undefined;
  let description: string | undefined;

  for (const feature of geojson.features) {
    if (!feature.geometry) continue;

    // Get name from first feature with a name
    if (!name && feature.properties?.name) {
      name = String(feature.properties.name);
    }
    if (!description && feature.properties?.description) {
      description = String(feature.properties.description);
    }

    switch (feature.geometry.type) {
      case 'Polygon':
      case 'MultiPolygon':
        polygonCount++;
        break;
      case 'LineString':
      case 'MultiLineString':
        lineCount++;
        break;
      case 'Point':
      case 'MultiPoint':
        pointCount++;
        break;
    }
  }

  return {
    name,
    description,
    featureCount: geojson.features.length,
    polygonCount,
    lineCount,
    pointCount,
  };
}

/**
 * Extract polygon geometries from parsed file
 */
export function extractPolygons(parsedFile: ParsedFile): ExtractedGeometry[] {
  const polygons: ExtractedGeometry[] = [];

  for (const feature of parsedFile.features) {
    if (!feature.geometry) continue;

    const geomType = feature.geometry.type;

    if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
      const id = feature.id?.toString() || crypto.randomUUID();
      const name = feature.properties?.name as string || `Polygon ${polygons.length + 1}`;

      polygons.push({
        id,
        name,
        type: geomType.toLowerCase() as 'polygon' | 'multipolygon',
        geometry: feature.geometry,
        properties: feature.properties || {},
        area: calculatePolygonArea(feature.geometry as Polygon | MultiPolygon),
      });
    }
  }

  return polygons;
}

/**
 * Calculate polygon area in square meters using Shoelace formula
 * Approximation for small areas, assumes WGS84
 */
function calculatePolygonArea(geometry: Polygon | MultiPolygon): number {
  function ringArea(coords: number[][]): number {
    let area = 0;
    const n = coords.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[j];

      // Convert to approximate meters at the centroid latitude
      const avgLat = (lat1 + lat2) / 2;
      const latRad = avgLat * Math.PI / 180;
      const mPerDegLng = 111320 * Math.cos(latRad);
      const mPerDegLat = 110540;

      const x1 = lng1 * mPerDegLng;
      const y1 = lat1 * mPerDegLat;
      const x2 = lng2 * mPerDegLng;
      const y2 = lat2 * mPerDegLat;

      area += (x1 * y2) - (x2 * y1);
    }

    return Math.abs(area / 2);
  }

  if (geometry.type === 'Polygon') {
    // First ring is exterior, rest are holes
    let area = ringArea(geometry.coordinates[0]);
    for (let i = 1; i < geometry.coordinates.length; i++) {
      area -= ringArea(geometry.coordinates[i]);
    }
    return Math.max(0, area);
  } else {
    // MultiPolygon
    let totalArea = 0;
    for (const polygon of geometry.coordinates) {
      let area = ringArea(polygon[0]);
      for (let i = 1; i < polygon.length; i++) {
        area -= ringArea(polygon[i]);
      }
      totalArea += Math.max(0, area);
    }
    return totalArea;
  }
}

/**
 * Detect UTM zone from coordinates
 */
export function detectUtmZone(lng: number, lat: number): string {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const isNorth = lat >= 0;
  const epsg = isNorth ? 32600 + zone : 32700 + zone;
  return `EPSG:${epsg}`;
}

/**
 * Reproject coordinates from one CRS to another
 */
export function reprojectCoordinates(
  coords: number[],
  fromCrs: string,
  toCrs: string
): number[] {
  if (fromCrs === toCrs) return coords;

  const [x, y] = proj4(fromCrs, toCrs, [coords[0], coords[1]]);
  return coords.length > 2 ? [x, y, coords[2]] : [x, y];
}

/**
 * Reproject a geometry to a different CRS
 */
export function reprojectGeometry(
  geometry: Geometry,
  fromCrs: string,
  toCrs: string
): Geometry {
  if (fromCrs === toCrs) return geometry;

  function reprojectCoords(coords: unknown): unknown {
    if (!Array.isArray(coords)) return coords;

    if (typeof coords[0] === 'number') {
      return reprojectCoordinates(coords as number[], fromCrs, toCrs);
    }

    return coords.map(c => reprojectCoords(c));
  }

  const reprojected = { ...geometry };
  if ('coordinates' in reprojected) {
    (reprojected as { coordinates: unknown }).coordinates = reprojectCoords(
      (geometry as { coordinates: unknown }).coordinates
    );
  }

  return reprojected;
}

/**
 * Convert geometry to WKT format for PostGIS
 */
export function geometryToWkt(geometry: Geometry): string {
  function coordsToWkt(coords: number[]): string {
    return coords.slice(0, 2).join(' ');
  }

  function ringToWkt(ring: number[][]): string {
    return `(${ring.map(coordsToWkt).join(', ')})`;
  }

  switch (geometry.type) {
    case 'Point': {
      const point = geometry as Point;
      return `POINT(${coordsToWkt(point.coordinates)})`;
    }
    case 'LineString': {
      const line = geometry as LineString;
      return `LINESTRING(${line.coordinates.map(coordsToWkt).join(', ')})`;
    }
    case 'Polygon': {
      const polygon = geometry as Polygon;
      return `POLYGON(${polygon.coordinates.map(ringToWkt).join(', ')})`;
    }
    case 'MultiPolygon': {
      const multi = geometry as MultiPolygon;
      const polygons = multi.coordinates.map(
        p => `(${p.map(ringToWkt).join(', ')})`
      );
      return `MULTIPOLYGON(${polygons.join(', ')})`;
    }
    default:
      throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
}

/**
 * Validate geometry (basic checks)
 */
export function validateGeometry(geometry: Geometry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  function checkCoord(coord: number[]): void {
    if (coord.length < 2) {
      errors.push('Coordinate must have at least 2 values (lng, lat)');
      return;
    }
    const [lng, lat] = coord;
    if (lng < -180 || lng > 180) {
      errors.push(`Invalid longitude: ${lng}`);
    }
    if (lat < -90 || lat > 90) {
      errors.push(`Invalid latitude: ${lat}`);
    }
  }

  function checkCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;

    if (typeof coords[0] === 'number') {
      checkCoord(coords as number[]);
    } else {
      for (const c of coords) {
        checkCoords(c);
      }
    }
  }

  if ('coordinates' in geometry) {
    checkCoords((geometry as { coordinates: unknown }).coordinates);
  }

  // Check polygon ring closure
  if (geometry.type === 'Polygon') {
    const polygon = geometry as Polygon;
    for (const ring of polygon.coordinates) {
      if (ring.length < 4) {
        errors.push('Polygon ring must have at least 4 coordinates');
      }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        errors.push('Polygon ring is not closed');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Need to import crypto for UUID generation
import crypto from 'crypto';
