import React, { useState } from 'react';
import { useRoad } from '../../context/RoadContext';

export const RoadDrawingPanel: React.FC<{ layoutId: string }> = ({ layoutId }) => {
  const { roads, selectedRoad, loading, error, loadRoads, createRoad, deleteRoad, selectRoad } = useRoad();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'primary' as const, coordinates: [] as [number, number][] });

  React.useEffect(() => {
    loadRoads(layoutId);
  }, [layoutId, loadRoads]);

  const handleCreate = async () => {
    if (!formData.name || formData.coordinates.length < 2) {
      alert('Please enter a name and at least 2 coordinates');
      return;
    }
    try {
      await createRoad(layoutId, formData);
      setFormData({ name: '', type: 'primary', coordinates: [] });
      setShowForm(false);
    } catch {
      alert('Failed to create road');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this road?')) {
      try {
        await deleteRoad(id);
      } catch {
        alert('Failed to delete road');
      }
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Roads</h2>

      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading && <div className="text-gray-500 mb-2">Loading...</div>}

      <div className="mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Add Road'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-100 p-4 rounded mb-4 space-y-2">
          <input
            type="text"
            placeholder="Road name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-2 py-1 border rounded"
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'primary' | 'secondary' | 'access' })}
            className="w-full px-2 py-1 border rounded"
          >
            <option>primary</option>
            <option>secondary</option>
            <option>access</option>
          </select>
          <button
            onClick={handleCreate}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Create Road
          </button>
        </div>
      )}

      <div className="space-y-2">
        {roads.map((road) => (
          <div
            key={road.id}
            onClick={() => selectRoad(road)}
            className={`p-3 border rounded cursor-pointer ${
              selectedRoad?.id === road.id ? 'bg-blue-100 border-blue-500' : 'bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{road.name}</h3>
                <p className="text-sm text-gray-600">Type: {road.type}</p>
                <p className="text-sm text-gray-600">Length: {road.length?.toFixed(2)}m</p>
                {road.elevationProfile && (
                  <p className="text-sm text-gray-600">
                    Grade: {road.elevationProfile.stats.avgGrade?.toFixed(1)}%
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(road.id);
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

export default RoadDrawingPanel;
