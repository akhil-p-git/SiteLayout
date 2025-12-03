import { Site, CreateSiteInput, UpdateSiteInput } from '../types/site';

const sitesStore = new Map<string, Site>();

export async function createSite(input: CreateSiteInput): Promise<Site> {
  const site: Site = {
    id: `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    projectId: input.projectId,
    name: input.name,
    description: input.description,
    location: input.location,
    acreage: input.acreage,
    status: 'planning',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  sitesStore.set(site.id, site);
  return site;
}

export async function getSite(id: string): Promise<Site | null> {
  return sitesStore.get(id) || null;
}

export async function listSitesByProject(projectId: string): Promise<Site[]> {
  return Array.from(sitesStore.values()).filter((s) => s.projectId === projectId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function updateSite(id: string, input: UpdateSiteInput): Promise<Site> {
  const site = sitesStore.get(id);
  if (!site) throw new Error('Site not found');

  if (input.name) site.name = input.name;
  if (input.description !== undefined) site.description = input.description;
  if (input.location) site.location = input.location;
  if (input.acreage !== undefined) site.acreage = input.acreage;
  if (input.status) site.status = input.status;
  site.updatedAt = new Date();

  sitesStore.set(id, site);
  return site;
}

export async function deleteSite(id: string): Promise<void> {
  if (!sitesStore.has(id)) throw new Error('Site not found');
  sitesStore.delete(id);
}
