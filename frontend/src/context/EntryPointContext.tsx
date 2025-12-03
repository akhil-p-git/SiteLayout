import React, { createContext, useContext, useState, useCallback } from 'react';
import { entryPointApi } from '../api/siteLayoutApi';

export interface EntryPoint {
  id: string;
  siteId: string;
  type: 'primary' | 'secondary' | 'emergency' | 'maintenance' | 'construction';
  name: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: Date;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface EntryPointContextType {
  entryPoints: EntryPoint[];
  selectedEntryPoint: EntryPoint | null;
  loading: boolean;
  error: string | null;
  loadEntryPoints: (siteId: string) => Promise<void>;
  createEntryPoint: (siteId: string, data: any) => Promise<EntryPoint>;
  updateEntryPoint: (id: string, data: any) => Promise<EntryPoint>;
  deleteEntryPoint: (id: string) => Promise<void>;
  selectEntryPoint: (ep: EntryPoint | null) => void;
  validateLocation: (siteId: string, coordinates: [number, number]) => Promise<ValidationResult>;
  exportGeojson: (siteId: string) => Promise<any>;
}

const EntryPointContext = createContext<EntryPointContextType | undefined>(undefined);

export const EntryPointProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [selectedEntryPoint, setSelectedEntryPoint] = useState<EntryPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntryPoints = useCallback(async (siteId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await entryPointApi.listBySite(siteId);
      setEntryPoints(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createEntryPoint = useCallback(async (siteId: string, data: any) => {
    setLoading(true);
    try {
      const ep = await entryPointApi.create(siteId, data);
      setEntryPoints((prev) => [...prev, ep]);
      return ep;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEntryPoint = useCallback(async (id: string, data: any) => {
    setLoading(true);
    try {
      const ep = await entryPointApi.update(id, data);
      setEntryPoints((prev) => prev.map((e) => (e.id === id ? ep : e)));
      if (selectedEntryPoint?.id === id) setSelectedEntryPoint(ep);
      return ep;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedEntryPoint]);

  const deleteEntryPoint = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await entryPointApi.delete(id);
      setEntryPoints((prev) => prev.filter((e) => e.id !== id));
      if (selectedEntryPoint?.id === id) setSelectedEntryPoint(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedEntryPoint]);

  const validateLocation = useCallback(async (siteId: string, coordinates: [number, number]) => {
    try {
      const result = await entryPointApi.validate(siteId, coordinates);
      return result;
    } catch (err: any) {
      return { valid: false, errors: [err.message], warnings: [] };
    }
  }, []);

  const exportGeojson = useCallback(async (siteId: string) => {
    try {
      return await entryPointApi.exportGeojson(siteId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return (
    <EntryPointContext.Provider
      value={{
        entryPoints,
        selectedEntryPoint,
        loading,
        error,
        loadEntryPoints,
        createEntryPoint,
        updateEntryPoint,
        deleteEntryPoint,
        selectEntryPoint: setSelectedEntryPoint,
        validateLocation,
        exportGeojson,
      }}
    >
      {children}
    </EntryPointContext.Provider>
  );
};

export const useEntryPoint = () => {
  const context = useContext(EntryPointContext);
  if (!context) throw new Error('useEntryPoint must be used within EntryPointProvider');
  return context;
};
