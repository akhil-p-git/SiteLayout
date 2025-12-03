export interface Site {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  location?: { latitude: number; longitude: number };
  acreage?: number;
  status: 'planning' | 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSiteInput {
  projectId: string;
  name: string;
  description?: string;
  location?: { latitude: number; longitude: number };
  acreage?: number;
}

export interface UpdateSiteInput {
  name?: string;
  description?: string;
  location?: { latitude: number; longitude: number };
  acreage?: number;
  status?: 'planning' | 'active' | 'completed' | 'archived';
}
