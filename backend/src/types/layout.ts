export interface Layout {
  id: string;
  siteId: string;
  name: string;
  description?: string;
  version: number;
  status: 'draft' | 'review' | 'approved' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLayoutInput {
  siteId: string;
  name: string;
  description?: string;
}

export interface UpdateLayoutInput {
  name?: string;
  description?: string;
  status?: 'draft' | 'review' | 'approved' | 'archived';
}
