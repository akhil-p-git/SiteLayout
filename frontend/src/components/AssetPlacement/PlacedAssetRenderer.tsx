import { useEffect, useCallback, useRef } from 'react';
import { useMapContext } from '../../context/MapContext';
import { useAssetPlacement } from '../../context/AssetPlacementContext';
import { ASSET_DEFINITIONS, calculateAssetFootprint, type AssetType } from '../../types/asset';

const ASSETS_SOURCE_ID = 'placed-assets-source';
const ASSETS_FILL_LAYER_ID = 'placed-assets-fill';
const ASSETS_OUTLINE_LAYER_ID = 'placed-assets-outline';
const ASSETS_LABELS_LAYER_ID = 'placed-assets-labels';
const VIOLATIONS_LAYER_ID = 'placed-assets-violations';

export function PlacedAssetRenderer() {
  const { map, isLoaded } = useMapContext();
  const { assets, selectedAssetIds, showConstraints, selectAsset, updateAsset, deselectAll } =
    useAssetPlacement();

  const isDragging = useRef(false);
  const dragAssetId = useRef<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Convert assets to GeoJSON
  const assetsToGeoJSON = useCallback(() => {
    const features = assets.map((asset) => {
      const footprint = calculateAssetFootprint(asset);
      const definition = ASSET_DEFINITIONS[asset.type];

      return {
        type: 'Feature' as const,
        id: asset.id,
        properties: {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          color: definition.color,
          isSelected: asset.isSelected || selectedAssetIds.includes(asset.id),
          isValid: asset.isValid,
          rotation: asset.rotation,
          icon: definition.icon,
        },
        geometry: footprint,
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [assets, selectedAssetIds]);

  // Violations GeoJSON (shows invalid areas)
  const violationsToGeoJSON = useCallback(() => {
    const invalidAssets = assets.filter((a) => !a.isValid);
    const features = invalidAssets.map((asset) => {
      const footprint = calculateAssetFootprint(asset);
      return {
        type: 'Feature' as const,
        id: `violation-${asset.id}`,
        properties: {
          id: asset.id,
        },
        geometry: footprint,
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [assets]);

  // Initialize map layers
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Add source with empty data initially
    if (!map.getSource(ASSETS_SOURCE_ID)) {
      map.addSource(ASSETS_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection' as const,
          features: [],
        },
      });
    }

    if (!map.getSource(`${ASSETS_SOURCE_ID}-violations`)) {
      map.addSource(`${ASSETS_SOURCE_ID}-violations`, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection' as const,
          features: [],
        },
      });
    }

    // Add fill layer
    if (!map.getLayer(ASSETS_FILL_LAYER_ID)) {
      map.addLayer({
        id: ASSETS_FILL_LAYER_ID,
        type: 'fill',
        source: ASSETS_SOURCE_ID,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['case', ['get', 'isSelected'], 0.7, 0.5],
        },
      });
    }

    // Add outline layer
    if (!map.getLayer(ASSETS_OUTLINE_LAYER_ID)) {
      map.addLayer({
        id: ASSETS_OUTLINE_LAYER_ID,
        type: 'line',
        source: ASSETS_SOURCE_ID,
        paint: {
          'line-color': ['case', ['get', 'isSelected'], '#ffffff', ['get', 'color']],
          'line-width': ['case', ['get', 'isSelected'], 3, 2],
        },
      });
    }

    // Add violations layer (red overlay for invalid placements)
    if (!map.getLayer(VIOLATIONS_LAYER_ID)) {
      map.addLayer({
        id: VIOLATIONS_LAYER_ID,
        type: 'fill',
        source: `${ASSETS_SOURCE_ID}-violations`,
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.3,
        },
      });
    }

    // Add labels layer
    if (!map.getLayer(ASSETS_LABELS_LAYER_ID)) {
      map.addLayer({
        id: ASSETS_LABELS_LAYER_ID,
        type: 'symbol',
        source: ASSETS_SOURCE_ID,
        layout: {
          'text-field': ['get', 'icon'],
          'text-size': 20,
          'text-allow-overlap': true,
        },
      });
    }

    // Cleanup
    return () => {
      if (map.getLayer(ASSETS_LABELS_LAYER_ID)) map.removeLayer(ASSETS_LABELS_LAYER_ID);
      if (map.getLayer(VIOLATIONS_LAYER_ID)) map.removeLayer(VIOLATIONS_LAYER_ID);
      if (map.getLayer(ASSETS_OUTLINE_LAYER_ID)) map.removeLayer(ASSETS_OUTLINE_LAYER_ID);
      if (map.getLayer(ASSETS_FILL_LAYER_ID)) map.removeLayer(ASSETS_FILL_LAYER_ID);
      if (map.getSource(`${ASSETS_SOURCE_ID}-violations`))
        map.removeSource(`${ASSETS_SOURCE_ID}-violations`);
      if (map.getSource(ASSETS_SOURCE_ID)) map.removeSource(ASSETS_SOURCE_ID);
    };
  }, [map, isLoaded]);

  // Update source data when assets change
  useEffect(() => {
    if (!map || !isLoaded) return;

    const source = map.getSource(ASSETS_SOURCE_ID);
    if (source && 'setData' in source) {
      source.setData(assetsToGeoJSON());
    }

    const violationSource = map.getSource(`${ASSETS_SOURCE_ID}-violations`);
    if (violationSource && 'setData' in violationSource) {
      violationSource.setData(violationsToGeoJSON());
    }

    // Update violations layer visibility
    if (map.getLayer(VIOLATIONS_LAYER_ID)) {
      map.setLayoutProperty(
        VIOLATIONS_LAYER_ID,
        'visibility',
        showConstraints ? 'visible' : 'none'
      );
    }
  }, [
    map,
    isLoaded,
    assets,
    selectedAssetIds,
    showConstraints,
    assetsToGeoJSON,
    violationsToGeoJSON,
  ]);

  // Click handler for selection
  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [ASSETS_FILL_LAYER_ID],
      });

      if (features.length > 0) {
        const assetId = features[0].properties?.id;
        if (assetId) {
          const isShiftClick = e.originalEvent.shiftKey;
          selectAsset(assetId, isShiftClick);
        }
      } else {
        deselectAll();
      }
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, isLoaded, selectAsset, deselectAll]);

  // Drag handlers
  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMouseDown = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [ASSETS_FILL_LAYER_ID],
      });

      if (features.length > 0) {
        const assetId = features[0].properties?.id;
        if (assetId && selectedAssetIds.includes(assetId)) {
          isDragging.current = true;
          dragAssetId.current = assetId;
          dragStartPos.current = e.lngLat;
          map.getCanvas().style.cursor = 'grabbing';
        }
      }
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!isDragging.current || !dragAssetId.current || !dragStartPos.current) return;

      const dx = e.lngLat.lng - dragStartPos.current.lng;
      const dy = e.lngLat.lat - dragStartPos.current.lat;

      // Update all selected assets
      selectedAssetIds.forEach((id) => {
        const asset = assets.find((a) => a.id === id);
        if (asset) {
          updateAsset(id, {
            position: {
              x: asset.position.x + dx * 111000, // Rough conversion to meters
              y: asset.position.y + dy * 111000,
            },
          });
        }
      });

      dragStartPos.current = e.lngLat;
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        dragAssetId.current = null;
        dragStartPos.current = null;
        map.getCanvas().style.cursor = '';
      }
    };

    // Cursor change on hover
    const handleMouseEnter = () => {
      if (!isDragging.current) {
        map.getCanvas().style.cursor = 'pointer';
      }
    };

    const handleMouseLeave = () => {
      if (!isDragging.current) {
        map.getCanvas().style.cursor = '';
      }
    };

    map.on('mousedown', ASSETS_FILL_LAYER_ID, handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    map.on('mouseenter', ASSETS_FILL_LAYER_ID, handleMouseEnter);
    map.on('mouseleave', ASSETS_FILL_LAYER_ID, handleMouseLeave);

    return () => {
      map.off('mousedown', ASSETS_FILL_LAYER_ID, handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.off('mouseenter', ASSETS_FILL_LAYER_ID, handleMouseEnter);
      map.off('mouseleave', ASSETS_FILL_LAYER_ID, handleMouseLeave);
    };
  }, [map, isLoaded, selectedAssetIds, assets, updateAsset]);

  // Handle drop from palette
  useEffect(() => {
    if (!map || !isLoaded) return;

    const canvas = map.getCanvas();

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const assetType = e.dataTransfer?.getData('assetType') as AssetType;
      if (!assetType) return;

      // Get map coordinates from drop position
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const lngLat = map.unproject([x, y]);

      // Notify parent to add asset (handled by AssetPlacementContext)
      const event = new CustomEvent('assetDrop', {
        detail: {
          assetType,
          position: {
            x: lngLat.lng,
            y: lngLat.lat,
          },
        },
      });
      window.dispatchEvent(event);
    };

    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);

    return () => {
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('drop', handleDrop);
    };
  }, [map, isLoaded]);

  return null; // This component only manages map layers
}

export default PlacedAssetRenderer;
