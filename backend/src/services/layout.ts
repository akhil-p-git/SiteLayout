import { Layout, CreateLayoutInput, UpdateLayoutInput } from '../types/layout';

const layoutsStore = new Map<string, Layout>();

export async function createLayout(input: CreateLayoutInput): Promise<Layout> {
  const layout: Layout = {
    id: `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    siteId: input.siteId,
    name: input.name,
    description: input.description,
    version: 1,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  layoutsStore.set(layout.id, layout);
  return layout;
}

export async function getLayout(id: string): Promise<Layout | null> {
  return layoutsStore.get(id) || null;
}

export async function listLayoutsBySite(siteId: string): Promise<Layout[]> {
  return Array.from(layoutsStore.values()).filter((l) => l.siteId === siteId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function updateLayout(id: string, input: UpdateLayoutInput): Promise<Layout> {
  const layout = layoutsStore.get(id);
  if (!layout) throw new Error('Layout not found');

  if (input.name) layout.name = input.name;
  if (input.description !== undefined) layout.description = input.description;
  if (input.status) layout.status = input.status;
  layout.updatedAt = new Date();

  layoutsStore.set(id, layout);
  return layout;
}

export async function deleteLayout(id: string): Promise<void> {
  if (!layoutsStore.has(id)) throw new Error('Layout not found');
  layoutsStore.delete(id);
}
