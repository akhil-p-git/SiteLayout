export interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  location?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  location?: string;
  status?: 'planning' | 'active' | 'completed' | 'archived';
}
