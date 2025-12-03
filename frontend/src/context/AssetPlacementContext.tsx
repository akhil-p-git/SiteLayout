/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import {
  type PlacedAsset,
  type AssetType,
  type AssetPlacementState,
  type AssetAction,
  createPlacedAsset,
  snapToGrid as snapToGridFn,
} from '../types/asset';
import { assetApi } from '../api/siteLayoutApi';

// History for undo/redo
interface HistoryState {
  past: PlacedAsset[][];
  present: PlacedAsset[];
  future: PlacedAsset[][];
}

const MAX_HISTORY = 50;

const initialState: AssetPlacementState = {
  assets: [],
  selectedAssetIds: [],
  draggedAssetType: null,
  isDragging: false,
  snapToGrid: true,
  gridSize: 5, // 5 meter grid
  showConstraints: true,
};

const initialHistory: HistoryState = {
  past: [],
  present: [],
  future: [],
};

function assetReducer(state: AssetPlacementState, action: AssetAction): AssetPlacementState {
  switch (action.type) {
    case 'ADD_ASSET':
      return {
        ...state,
        assets: [...state.assets, action.payload],
      };

    case 'UPDATE_ASSET':
      return {
        ...state,
        assets: state.assets.map((asset) =>
          asset.id === action.payload.id ? { ...asset, ...action.payload.updates } : asset
        ),
      };

    case 'REMOVE_ASSET':
      return {
        ...state,
        assets: state.assets.filter((asset) => asset.id !== action.payload),
        selectedAssetIds: state.selectedAssetIds.filter((id) => id !== action.payload),
      };

    case 'SELECT_ASSET':
      return {
        ...state,
        selectedAssetIds: state.selectedAssetIds.includes(action.payload)
          ? state.selectedAssetIds
          : [...state.selectedAssetIds, action.payload],
        assets: state.assets.map((asset) => ({
          ...asset,
          isSelected: asset.id === action.payload ? true : asset.isSelected,
        })),
      };

    case 'DESELECT_ASSET':
      return {
        ...state,
        selectedAssetIds: state.selectedAssetIds.filter((id) => id !== action.payload),
        assets: state.assets.map((asset) => ({
          ...asset,
          isSelected: asset.id === action.payload ? false : asset.isSelected,
        })),
      };

    case 'SELECT_ALL':
      return {
        ...state,
        selectedAssetIds: state.assets.map((a) => a.id),
        assets: state.assets.map((asset) => ({ ...asset, isSelected: true })),
      };

    case 'DESELECT_ALL':
      return {
        ...state,
        selectedAssetIds: [],
        assets: state.assets.map((asset) => ({ ...asset, isSelected: false })),
      };

    case 'SET_DRAGGED_TYPE':
      return {
        ...state,
        draggedAssetType: action.payload,
        isDragging: action.payload !== null,
      };

    case 'TOGGLE_SNAP_TO_GRID':
      return {
        ...state,
        snapToGrid: !state.snapToGrid,
      };

    case 'SET_GRID_SIZE':
      return {
        ...state,
        gridSize: action.payload,
      };

    case 'TOGGLE_SHOW_CONSTRAINTS':
      return {
        ...state,
        showConstraints: !state.showConstraints,
      };

    case 'SET_ASSETS':
      return {
        ...state,
        assets: action.payload,
      };

    default:
      return state;
  }
}

function historyReducer(
  state: HistoryState,
  action: { type: 'PUSH' | 'UNDO' | 'REDO' | 'SET'; payload?: PlacedAsset[] }
): HistoryState {
  switch (action.type) {
    case 'PUSH':
      if (!action.payload) return state;
      return {
        past: [...state.past.slice(-MAX_HISTORY + 1), state.present],
        present: action.payload,
        future: [],
      };

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }

    case 'SET':
      return {
        ...state,
        present: action.payload || [],
      };

    default:
      return state;
  }
}

interface AssetPlacementContextValue extends AssetPlacementState {
  // Asset operations
  addAsset: (type: AssetType, position: { x: number; y: number }) => PlacedAsset;
  updateAsset: (id: string, updates: Partial<PlacedAsset>) => void;
  removeAsset: (id: string) => void;
  removeSelectedAssets: () => void;

  // Selection
  selectAsset: (id: string, addToSelection?: boolean) => void;
  deselectAsset: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;

  // Drag state
  setDraggedType: (type: AssetType | null) => void;

  // Settings
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  toggleShowConstraints: () => void;

  // Position helpers
  snapPosition: (position: { x: number; y: number }) => { x: number; y: number };

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Bulk operations
  rotateSelected: (degrees: number) => void;
  moveSelected: (dx: number, dy: number) => void;
  duplicateSelected: () => void;

  // Validation
  validateAsset: (asset: PlacedAsset) => PlacedAsset;
  validateAllAssets: () => void;

  // API persistence
  loadAssetsFromApi: (layoutId: string) => Promise<void>;
  saveAssetToApi: (layoutId: string, asset: PlacedAsset) => Promise<PlacedAsset>;
  updateAssetInApi: (asset: PlacedAsset) => Promise<PlacedAsset>;
  deleteAssetFromApi: (assetId: string) => Promise<void>;
}

const AssetPlacementContext = createContext<AssetPlacementContextValue | undefined>(undefined);

interface AssetPlacementProviderProps {
  children: ReactNode;
  onValidate?: (asset: PlacedAsset) => Promise<PlacedAsset>;
}

export function AssetPlacementProvider({ children, onValidate }: AssetPlacementProviderProps) {
  const [state, dispatch] = useReducer(assetReducer, initialState);
  const [history, dispatchHistory] = useReducer(historyReducer, initialHistory);

  // Sync history with state
  const pushHistory = useCallback(() => {
    dispatchHistory({ type: 'PUSH', payload: state.assets });
  }, [state.assets]);

  // Asset operations
  const addAsset = useCallback(
    (type: AssetType, position: { x: number; y: number }): PlacedAsset => {
      const snappedPosition = state.snapToGrid
        ? {
            x: snapToGridFn(position.x, state.gridSize),
            y: snapToGridFn(position.y, state.gridSize),
          }
        : position;

      const asset = createPlacedAsset(type, snappedPosition);
      pushHistory();
      dispatch({ type: 'ADD_ASSET', payload: asset });
      return asset;
    },
    [state.snapToGrid, state.gridSize, pushHistory]
  );

  const updateAsset = useCallback(
    (id: string, updates: Partial<PlacedAsset>) => {
      // Snap position if updating position
      if (updates.position && state.snapToGrid) {
        updates.position = {
          x: snapToGridFn(updates.position.x, state.gridSize),
          y: snapToGridFn(updates.position.y, state.gridSize),
        };
      }
      pushHistory();
      dispatch({ type: 'UPDATE_ASSET', payload: { id, updates } });
    },
    [state.snapToGrid, state.gridSize, pushHistory]
  );

  const removeAsset = useCallback(
    (id: string) => {
      pushHistory();
      dispatch({ type: 'REMOVE_ASSET', payload: id });
    },
    [pushHistory]
  );

  const removeSelectedAssets = useCallback(() => {
    if (state.selectedAssetIds.length === 0) return;
    pushHistory();
    state.selectedAssetIds.forEach((id) => {
      dispatch({ type: 'REMOVE_ASSET', payload: id });
    });
  }, [state.selectedAssetIds, pushHistory]);

  // Selection
  const selectAsset = useCallback((id: string, addToSelection = false) => {
    if (!addToSelection) {
      dispatch({ type: 'DESELECT_ALL' });
    }
    dispatch({ type: 'SELECT_ASSET', payload: id });
  }, []);

  const deselectAsset = useCallback((id: string) => {
    dispatch({ type: 'DESELECT_ASSET', payload: id });
  }, []);

  const selectAll = useCallback(() => {
    dispatch({ type: 'SELECT_ALL' });
  }, []);

  const deselectAll = useCallback(() => {
    dispatch({ type: 'DESELECT_ALL' });
  }, []);

  const toggleSelection = useCallback(
    (id: string) => {
      if (state.selectedAssetIds.includes(id)) {
        dispatch({ type: 'DESELECT_ASSET', payload: id });
      } else {
        dispatch({ type: 'SELECT_ASSET', payload: id });
      }
    },
    [state.selectedAssetIds]
  );

  // Drag state
  const setDraggedType = useCallback((type: AssetType | null) => {
    dispatch({ type: 'SET_DRAGGED_TYPE', payload: type });
  }, []);

  // Settings
  const toggleSnapToGrid = useCallback(() => {
    dispatch({ type: 'TOGGLE_SNAP_TO_GRID' });
  }, []);

  const setGridSize = useCallback((size: number) => {
    dispatch({ type: 'SET_GRID_SIZE', payload: size });
  }, []);

  const toggleShowConstraints = useCallback(() => {
    dispatch({ type: 'TOGGLE_SHOW_CONSTRAINTS' });
  }, []);

  // Position helpers
  const snapPosition = useCallback(
    (position: { x: number; y: number }) => {
      if (!state.snapToGrid) return position;
      return {
        x: snapToGridFn(position.x, state.gridSize),
        y: snapToGridFn(position.y, state.gridSize),
      };
    },
    [state.snapToGrid, state.gridSize]
  );

  // Undo/Redo
  const undo = useCallback(() => {
    dispatchHistory({ type: 'UNDO' });
    dispatch({ type: 'SET_ASSETS', payload: history.past[history.past.length - 1] || [] });
  }, [history.past]);

  const redo = useCallback(() => {
    dispatchHistory({ type: 'REDO' });
    dispatch({ type: 'SET_ASSETS', payload: history.future[0] || [] });
  }, [history.future]);

  // Bulk operations
  const rotateSelected = useCallback(
    (degrees: number) => {
      if (state.selectedAssetIds.length === 0) return;
      pushHistory();
      state.selectedAssetIds.forEach((id) => {
        const asset = state.assets.find((a) => a.id === id);
        if (asset) {
          dispatch({
            type: 'UPDATE_ASSET',
            payload: {
              id,
              updates: { rotation: (asset.rotation + degrees) % 360 },
            },
          });
        }
      });
    },
    [state.selectedAssetIds, state.assets, pushHistory]
  );

  const moveSelected = useCallback(
    (dx: number, dy: number) => {
      if (state.selectedAssetIds.length === 0) return;
      pushHistory();
      state.selectedAssetIds.forEach((id) => {
        const asset = state.assets.find((a) => a.id === id);
        if (asset) {
          dispatch({
            type: 'UPDATE_ASSET',
            payload: {
              id,
              updates: {
                position: {
                  x: asset.position.x + dx,
                  y: asset.position.y + dy,
                },
              },
            },
          });
        }
      });
    },
    [state.selectedAssetIds, state.assets, pushHistory]
  );

  const duplicateSelected = useCallback(() => {
    if (state.selectedAssetIds.length === 0) return;
    pushHistory();
    const offset = 10; // meters offset for duplicates
    state.selectedAssetIds.forEach((id) => {
      const asset = state.assets.find((a) => a.id === id);
      if (asset) {
        const newAsset = createPlacedAsset(asset.type, {
          x: asset.position.x + offset,
          y: asset.position.y + offset,
        });
        newAsset.rotation = asset.rotation;
        dispatch({ type: 'ADD_ASSET', payload: newAsset });
      }
    });
  }, [state.selectedAssetIds, state.assets, pushHistory]);

  // Validation
  const validateAsset = useCallback((asset: PlacedAsset): PlacedAsset => {
    // Basic validation - in production, call the constraint API
    const violations: PlacedAsset['violations'] = [];

    // This would be replaced with actual constraint checking
    // For now, just return the asset as valid
    return {
      ...asset,
      isValid: violations.length === 0,
      violations,
    };
  }, []);

  const validateAllAssets = useCallback(async () => {
    const validatedAssets = await Promise.all(
      state.assets.map(async (asset) => {
        if (onValidate) {
          return onValidate(asset);
        }
        return validateAsset(asset);
      })
    );
    dispatch({ type: 'SET_ASSETS', payload: validatedAssets });
  }, [state.assets, onValidate, validateAsset]);

  // API persistence
  const loadAssetsFromApi = useCallback(async (layoutId: string) => {
    try {
      const data = await assetApi.listByLayout(layoutId);
      const apiAssets = (data.data || []).map((a: Record<string, unknown>) => ({
        ...a,
        position: { x: (a.geometry as Record<string, unknown>).coordinates[0][0][0], y: (a.geometry as Record<string, unknown>).coordinates[0][0][1] },
        isSelected: false,
      }));
      dispatch({ type: 'SET_ASSETS', payload: apiAssets });
    } catch (error) {
      console.error('Failed to load assets from API:', error);
    }
  }, []);

  const saveAssetToApi = useCallback(async (layoutId: string, asset: PlacedAsset) => {
    try {
      const response = await assetApi.create(layoutId, {
        name: asset.name || asset.type,
        assetType: asset.type,
        coordinates: [[
          [asset.position.x, asset.position.y],
          [asset.position.x + asset.width, asset.position.y],
          [asset.position.x + asset.width, asset.position.y + asset.height],
          [asset.position.x, asset.position.y + asset.height],
          [asset.position.x, asset.position.y],
        ]],
      });
      return response;
    } catch (error) {
      console.error('Failed to save asset to API:', error);
      throw error;
    }
  }, []);

  const updateAssetInApi = useCallback(async (asset: PlacedAsset) => {
    try {
      const response = await assetApi.update(asset.id, {
        name: asset.name || asset.type,
        coordinates: [[
          [asset.position.x, asset.position.y],
          [asset.position.x + asset.width, asset.position.y],
          [asset.position.x + asset.width, asset.position.y + asset.height],
          [asset.position.x, asset.position.y + asset.height],
          [asset.position.x, asset.position.y],
        ]],
      });
      return response;
    } catch (error) {
      console.error('Failed to update asset in API:', error);
      throw error;
    }
  }, []);

  const deleteAssetFromApi = useCallback(async (assetId: string) => {
    try {
      await assetApi.delete(assetId);
    } catch (error) {
      console.error('Failed to delete asset from API:', error);
      throw error;
    }
  }, []);

  const value: AssetPlacementContextValue = {
    ...state,
    addAsset,
    updateAsset,
    removeAsset,
    removeSelectedAssets,
    selectAsset,
    deselectAsset,
    selectAll,
    deselectAll,
    toggleSelection,
    setDraggedType,
    toggleSnapToGrid,
    setGridSize,
    toggleShowConstraints,
    snapPosition,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    rotateSelected,
    moveSelected,
    duplicateSelected,
    validateAsset,
    validateAllAssets,
    loadAssetsFromApi,
    saveAssetToApi,
    updateAssetInApi,
    deleteAssetFromApi,
  };

  return <AssetPlacementContext.Provider value={value}>{children}</AssetPlacementContext.Provider>;
}

export function useAssetPlacement(): AssetPlacementContextValue {
  const context = useContext(AssetPlacementContext);
  if (context === undefined) {
    throw new Error('useAssetPlacement must be used within an AssetPlacementProvider');
  }
  return context;
}

export { AssetPlacementContext };
