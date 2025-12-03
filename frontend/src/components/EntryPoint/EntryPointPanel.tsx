import React, { useState } from 'react';
import { useEntryPoint } from '../../context/EntryPointContext';

export const EntryPointPanel: React.FC<{ siteId: string }> = ({ siteId }) => {
  const { entryPoints, selectedEntryPoint, loading, error, loadEntryPoints, createEntryPoint, deleteEntryPoint, selectEntryPoint } = useEntryPoint();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'primary' as const,
    coordinates: [0, 0] as [number, number],
  });

  React.useEffect(() => {
    loadEntryPoints(siteId);
  }, [siteId, loadEntryPoints]);

  const handleCreate = async () => {
    if (!formData.name) {
      alert('Please enter a name');
      return;
    }
    try {
      await createEntryPoint(siteId, {
        name: formData.name,
        type: formData.type,
        coordinates: formData.coordinates,
      });
      setFormData({ name: '', type: 'primary', coordinates: [0, 0] });
      setShowForm(false);
    } catch {
      alert('Failed to create entry point');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this entry point?')) {
      try {
        await deleteEntryPoint(id);
      } catch {
        alert('Failed to delete entry point');
      }
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Entry Points</h2>

      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading && <div className="text-gray-500 mb-2">Loading...</div>}

      <div className="mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Add Entry Point'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-100 p-4 rounded mb-4 space-y-2">
          <input
            type="text"
            placeholder="Entry point name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-2 py-1 border rounded"
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'primary' | 'secondary' | 'emergency' | 'maintenance' | 'construction' })}
            className="w-full px-2 py-1 border rounded"
          >
            <option>primary</option>
            <option>secondary</option>
            <option>emergency</option>
            <option>maintenance</option>
            <option>construction</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.0001"
              placeholder="Latitude"
              value={formData.coordinates[0]}
              onChange={(e) => setFormData({
                ...formData,
                coordinates: [parseFloat(e.target.value), formData.coordinates[1]],
              })}
              className="px-2 py-1 border rounded"
            />
            <input
              type="number"
              step="0.0001"
              placeholder="Longitude"
              value={formData.coordinates[1]}
              onChange={(e) => setFormData({
                ...formData,
                coordinates: [formData.coordinates[0], parseFloat(e.target.value)],
              })}
              className="px-2 py-1 border rounded"
            />
          </div>
          <button
            onClick={handleCreate}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Create Entry Point
          </button>
        </div>
      )}

      <div className="space-y-2">
        {entryPoints.map((ep) => (
          <div
            key={ep.id}
            onClick={() => selectEntryPoint(ep)}
            className={`p-3 border rounded cursor-pointer ${
              selectedEntryPoint?.id === ep.id ? 'bg-blue-100 border-blue-500' : 'bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{ep.name}</h3>
                <p className="text-sm text-gray-600">Type: {ep.type}</p>
                <p className="text-sm text-gray-600">
                  Coordinates: {ep.geometry.coordinates[0].toFixed(4)}, {ep.geometry.coordinates[1].toFixed(4)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(ep.id);
                }}
                className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EntryPointPanel;
