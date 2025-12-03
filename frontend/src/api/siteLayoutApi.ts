const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function apiCall(endpoint: string, options: FetchOptions = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

// Entry Points API
export const entryPointApi = {
  create: (siteId: string, input: any) =>
    apiCall('/entry-points', { method: 'POST', body: JSON.stringify({ ...input, siteId }) }),
  get: (id: string) => apiCall(`/entry-points/${id}`),
  listBySite: (siteId: string) => apiCall(`/entry-points/site/${siteId}`),
  update: (id: string, input: any) =>
    apiCall(`/entry-points/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  delete: (id: string) => apiCall(`/entry-points/${id}`, { method: 'DELETE' }),
  validate: (siteId: string, coordinates: [number, number]) =>
    apiCall('/entry-points/validate', { method: 'POST', body: JSON.stringify({ siteId, coordinates }) }),
  exportGeojson: (siteId: string) => apiCall(`/entry-points/geojson/${siteId}`),
};

// Roads API
export const roadApi = {
  create: (layoutId: string, input: any) =>
    apiCall('/roads', { method: 'POST', body: JSON.stringify({ ...input, layoutId }) }),
  get: (id: string) => apiCall(`/roads/${id}`),
  listByLayout: (layoutId: string) => apiCall(`/roads/layout/${layoutId}`),
  update: (id: string, input: any) =>
    apiCall(`/roads/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  delete: (id: string) => apiCall(`/roads/${id}`, { method: 'DELETE' }),
  validate: (input: any) => apiCall('/roads/validate', { method: 'POST', body: JSON.stringify(input) }),
};

// Assets API
export const assetApi = {
  create: (layoutId: string, input: any) =>
    apiCall('/assets', { method: 'POST', body: JSON.stringify({ ...input, layoutId }) }),
  get: (id: string) => apiCall(`/assets/${id}`),
  listByLayout: (layoutId: string) => apiCall(`/assets/layout/${layoutId}`),
  update: (id: string, input: any) =>
    apiCall(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  delete: (id: string) => apiCall(`/assets/${id}`, { method: 'DELETE' }),
};

// Projects API
export const projectApi = {
  create: (input: any) => apiCall('/projects', { method: 'POST', body: JSON.stringify(input) }),
  get: (id: string) => apiCall(`/projects/${id}`),
  list: () => apiCall('/projects'),
  update: (id: string, input: any) =>
    apiCall(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  delete: (id: string) => apiCall(`/projects/${id}`, { method: 'DELETE' }),
};

// Sites API
export const siteApi = {
  create: (projectId: string, input: any) =>
    apiCall('/sites', { method: 'POST', body: JSON.stringify({ ...input, projectId }) }),
  get: (id: string) => apiCall(`/sites/${id}`),
  listByProject: (projectId: string) => apiCall(`/sites/project/${projectId}`),
  update: (id: string, input: any) =>
    apiCall(`/sites/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  delete: (id: string) => apiCall(`/sites/${id}`, { method: 'DELETE' }),
};

// Layouts API
export const layoutApi = {
  create: (siteId: string, input: any) =>
    apiCall('/layouts', { method: 'POST', body: JSON.stringify({ ...input, siteId }) }),
  get: (id: string) => apiCall(`/layouts/${id}`),
  listBySite: (siteId: string) => apiCall(`/layouts/site/${siteId}`),
  update: (id: string, input: any) =>
    apiCall(`/layouts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  delete: (id: string) => apiCall(`/layouts/${id}`, { method: 'DELETE' }),
};

export default {
  entryPointApi,
  roadApi,
  assetApi,
  projectApi,
  siteApi,
  layoutApi,
};
