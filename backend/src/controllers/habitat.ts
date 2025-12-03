/**
 * Habitat Controller
 *
 * Handles HTTP requests for habitat overlay data.
 */

import { Request, Response } from 'express';
import type { Polygon, MultiPolygon } from 'geojson';
import {
  getHabitatOverlay,
  getHabitatGeoJSON,
  getImpactScore,
  getSpeciesInArea,
  getWetlandsInArea,
} from '../services/habitat';
import { HABITAT_COLORS, DEFAULT_BUFFER_DISTANCES } from '../types/habitat';

/**
 * Get habitat overlay data for a site
 */
export async function getOverlay(req: Request, res: Response): Promise<void> {
  try {
    const { siteId } = req.params;
    const { format = 'json', includeBuffers = 'true' } = req.query;
    const boundaryGeometry = req.body.boundaryGeometry as Polygon | MultiPolygon;

    if (!boundaryGeometry) {
      res.status(400).json({ error: 'boundaryGeometry is required in request body' });
      return;
    }

    if (format === 'geojson') {
      const geojson = await getHabitatGeoJSON({
        siteId,
        boundaryGeometry,
        includeBuffers: includeBuffers === 'true',
      });
      res.json(geojson);
    } else {
      const overlay = await getHabitatOverlay({
        siteId,
        boundaryGeometry,
        includeBuffers: includeBuffers === 'true',
      });
      res.json({ overlay });
    }
  } catch (error) {
    console.error('Error getting habitat overlay:', error);
    res.status(500).json({ error: 'Failed to get habitat overlay' });
  }
}

/**
 * Get impact score for a boundary
 */
export async function getImpact(req: Request, res: Response): Promise<void> {
  try {
    const boundaryGeometry = req.body.boundaryGeometry as Polygon | MultiPolygon;

    if (!boundaryGeometry) {
      res.status(400).json({ error: 'boundaryGeometry is required in request body' });
      return;
    }

    const impactScore = await getImpactScore(boundaryGeometry);
    res.json({ impactScore });
  } catch (error) {
    console.error('Error calculating impact score:', error);
    res.status(500).json({ error: 'Failed to calculate impact score' });
  }
}

/**
 * Get species potentially present in an area
 */
export async function getSpecies(req: Request, res: Response): Promise<void> {
  try {
    const boundaryGeometry = req.body.boundaryGeometry as Polygon | MultiPolygon;

    if (!boundaryGeometry) {
      res.status(400).json({ error: 'boundaryGeometry is required in request body' });
      return;
    }

    const species = await getSpeciesInArea(boundaryGeometry);
    res.json({ species, count: species.length });
  } catch (error) {
    console.error('Error getting species:', error);
    res.status(500).json({ error: 'Failed to get species data' });
  }
}

/**
 * Get wetlands in an area
 */
export async function getWetlands(req: Request, res: Response): Promise<void> {
  try {
    const boundaryGeometry = req.body.boundaryGeometry as Polygon | MultiPolygon;

    if (!boundaryGeometry) {
      res.status(400).json({ error: 'boundaryGeometry is required in request body' });
      return;
    }

    const wetlands = await getWetlandsInArea(boundaryGeometry);
    res.json({ wetlands, count: wetlands.length });
  } catch (error) {
    console.error('Error getting wetlands:', error);
    res.status(500).json({ error: 'Failed to get wetland data' });
  }
}

/**
 * Get habitat layer colors and configuration
 */
export function getLayerConfig(_req: Request, res: Response): void {
  res.json({
    colors: HABITAT_COLORS,
    bufferDistances: DEFAULT_BUFFER_DISTANCES,
    layers: [
      {
        id: 'critical-habitat',
        name: 'Critical Habitat',
        description: 'USFWS designated critical habitat for endangered/threatened species',
        visible: true,
        opacity: 0.6,
      },
      {
        id: 'wetlands',
        name: 'Wetlands (NWI)',
        description: 'National Wetlands Inventory data',
        visible: true,
        opacity: 0.5,
      },
      {
        id: 'buffers',
        name: 'Species Buffers',
        description: 'Recommended buffer zones around critical habitat',
        visible: false,
        opacity: 0.3,
      },
    ],
  });
}
