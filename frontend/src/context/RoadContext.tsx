/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { roadApi } from '../api/siteLayoutApi';

interface ElevationSample {
  distance: number;
  elevation: number;
  grade: number;
  lat: number;
  lng: number;
}

interface ElevationStats {
  minElevation: number;
  maxElevation: number;
  minGrade: number;
  maxGrade: number;
  avgGrade: number;
  elevationGain: number;
  elevationLoss: number;
}

interface ElevationProfile {
  samplingInterval: number;
  totalLength: number;
  samples: ElevationSample[];
  stats: ElevationStats;
}

export interface Road {
  id: string;
  layoutId: string;
  name: string;
  coordinates: [number, number][];
  type: 'primary' | 'secondary' | 'access';
  length: number;
  elevationProfile?: ElevationProfile;
  createdAt: Date;
}

interface RoadContextType {
  roads: Road[];
  selectedRoad: Road | null;
  loading: boolean;
  error: string | null;
  loadRoads: (layoutId: string) => Promise<void>;
  createRoad: (layoutId: string, data: Record<string, unknown>) => Promise<Road>;
  updateRoad: (id: string, data: Record<string, unknown>) => Promise<Road>;
  deleteRoad: (id: string) => Promise<void>;
  selectRoad: (road: Road | null) => void;
  validateRoad: (data: Record<string, unknown>) => Promise<void>;
}

const RoadContext = createContext<RoadContextType | undefined>(undefined);

export const RoadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roads, setRoads] = useState<Road[]>([]);
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoads = useCallback(async (layoutId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await roadApi.listByLayout(layoutId);
      setRoads(data.data || []);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRoad = useCallback(async (layoutId: string, data: Record<string, unknown>) => {
    setLoading(true);
    try {
      const road = await roadApi.create(layoutId, data);
      setRoads((prev) => [...prev, road]);
      return road;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRoad = useCallback(async (id: string, data: Record<string, unknown>) => {
    setLoading(true);
    try {
      const road = await roadApi.update(id, data);
      setRoads((prev) => prev.map((r) => (r.id === id ? road : r)));
      if (selectedRoad?.id === id) setSelectedRoad(road);
      return road;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedRoad]);

  const deleteRoad = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await roadApi.delete(id);
      setRoads((prev) => prev.filter((r) => r.id !== id));
      if (selectedRoad?.id === id) setSelectedRoad(null);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedRoad]);

  const validateRoad = useCallback(async (data: Record<string, unknown>) => {
    try {
      await roadApi.validate(data);
      setError(null);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    }
  }, []);

  return (
    <RoadContext.Provider
      value={{
        roads,
        selectedRoad,
        loading,
        error,
        loadRoads,
        createRoad,
        updateRoad,
        deleteRoad,
        selectRoad: setSelectedRoad,
        validateRoad,
      }}
    >
      {children}
    </RoadContext.Provider>
  );
};

export const useRoad = () => {
  const context = useContext(RoadContext);
  if (!context) throw new Error('useRoad must be used within RoadProvider');
  return context;
};
