/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Map as MapboxMap, LngLatBoundsLike } from 'mapbox-gl';
import type {
  MapContextValue,
  MapContextState,
  MapViewState,
  LayerVisibility,
  TerrainOverlayType,
  DrawingMode,
  MapboxDrawInstance,
} from '../types/map';

// Initial state
const initialState: MapContextState = {
  map: null,
  draw: null,
  isLoaded: false,
  viewState: {
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4,
    pitch: 0,
    bearing: 0,
  },
  layerVisibility: {
    boundary: true,
    exclusionZones: true,
    terrain: false,
    slope: false,
    aspect: false,
    assets: true,
    roads: true,
    entryPoints: true,
    contours: false,
  },
  terrainOverlay: 'none',
  drawingMode: 'simple_select',
  selectedFeatureId: null,
  isDrawing: false,
};

// Action types
type MapAction =
  | { type: 'SET_MAP'; payload: MapboxMap | null }
  | { type: 'SET_DRAW'; payload: MapboxDrawInstance | null }
  | { type: 'SET_IS_LOADED'; payload: boolean }
  | { type: 'SET_VIEW_STATE'; payload: Partial<MapViewState> }
  | { type: 'TOGGLE_LAYER'; payload: keyof LayerVisibility }
  | { type: 'SET_LAYER_VISIBILITY'; payload: Partial<LayerVisibility> }
  | { type: 'SET_TERRAIN_OVERLAY'; payload: TerrainOverlayType }
  | { type: 'SET_DRAWING_MODE'; payload: DrawingMode }
  | { type: 'SET_SELECTED_FEATURE_ID'; payload: string | null }
  | { type: 'SET_IS_DRAWING'; payload: boolean };

// Reducer
function mapReducer(state: MapContextState, action: MapAction): MapContextState {
  switch (action.type) {
    case 'SET_MAP':
      return { ...state, map: action.payload };
    case 'SET_DRAW':
      return { ...state, draw: action.payload };
    case 'SET_IS_LOADED':
      return { ...state, isLoaded: action.payload };
    case 'SET_VIEW_STATE':
      return { ...state, viewState: { ...state.viewState, ...action.payload } };
    case 'TOGGLE_LAYER':
      return {
        ...state,
        layerVisibility: {
          ...state.layerVisibility,
          [action.payload]: !state.layerVisibility[action.payload],
        },
      };
    case 'SET_LAYER_VISIBILITY':
      return {
        ...state,
        layerVisibility: { ...state.layerVisibility, ...action.payload },
      };
    case 'SET_TERRAIN_OVERLAY':
      return { ...state, terrainOverlay: action.payload };
    case 'SET_DRAWING_MODE':
      return {
        ...state,
        drawingMode: action.payload,
        isDrawing: action.payload !== 'simple_select' && action.payload !== 'static',
      };
    case 'SET_SELECTED_FEATURE_ID':
      return { ...state, selectedFeatureId: action.payload };
    case 'SET_IS_DRAWING':
      return { ...state, isDrawing: action.payload };
    default:
      return state;
  }
}

// Create context
const MapContext = createContext<MapContextValue | undefined>(undefined);

// Provider props
interface MapProviderProps {
  children: ReactNode;
  initialViewState?: Partial<MapViewState>;
}

// Provider component
export function MapProvider({ children, initialViewState }: MapProviderProps) {
  const [state, dispatch] = useReducer(mapReducer, {
    ...initialState,
    viewState: { ...initialState.viewState, ...initialViewState },
  });

  const setMap = useCallback((map: MapboxMap | null) => {
    dispatch({ type: 'SET_MAP', payload: map });
  }, []);

  const setDraw = useCallback((draw: MapboxDrawInstance | null) => {
    dispatch({ type: 'SET_DRAW', payload: draw });
  }, []);

  const setIsLoaded = useCallback((loaded: boolean) => {
    dispatch({ type: 'SET_IS_LOADED', payload: loaded });
  }, []);

  const setViewState = useCallback((viewState: Partial<MapViewState>) => {
    dispatch({ type: 'SET_VIEW_STATE', payload: viewState });
  }, []);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    dispatch({ type: 'TOGGLE_LAYER', payload: layer });
  }, []);

  const setLayerVisibility = useCallback((visibility: Partial<LayerVisibility>) => {
    dispatch({ type: 'SET_LAYER_VISIBILITY', payload: visibility });
  }, []);

  const setTerrainOverlay = useCallback((overlay: TerrainOverlayType) => {
    dispatch({ type: 'SET_TERRAIN_OVERLAY', payload: overlay });
  }, []);

  const setDrawingMode = useCallback((mode: DrawingMode) => {
    dispatch({ type: 'SET_DRAWING_MODE', payload: mode });
  }, []);

  const setSelectedFeatureId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_SELECTED_FEATURE_ID', payload: id });
  }, []);

  const flyTo = useCallback(
    (center: [number, number], zoom?: number) => {
      if (state.map) {
        state.map.flyTo({
          center,
          zoom: zoom ?? state.viewState.zoom,
          duration: 1500,
        });
      }
    },
    [state.map, state.viewState.zoom]
  );

  const fitBounds = useCallback(
    (bounds: LngLatBoundsLike, padding = 50) => {
      if (state.map) {
        state.map.fitBounds(bounds, {
          padding,
          duration: 1500,
        });
      }
    },
    [state.map]
  );

  const deleteSelectedFeatures = useCallback((): string[] => {
    if (state.draw) {
      const selectedIds = state.draw.getSelectedIds();
      if (selectedIds.length > 0) {
        state.draw.delete(selectedIds);
        dispatch({ type: 'SET_SELECTED_FEATURE_ID', payload: null });
        return selectedIds;
      }
    }
    return [];
  }, [state.draw]);

  const value: MapContextValue = {
    ...state,
    setMap,
    setDraw,
    setIsLoaded,
    setViewState,
    toggleLayer,
    setLayerVisibility,
    setTerrainOverlay,
    setDrawingMode,
    setSelectedFeatureId,
    flyTo,
    fitBounds,
    deleteSelectedFeatures,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

// Custom hook to use map context
export function useMapContext(): MapContextValue {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}

// Export context for advanced use cases
export { MapContext };
