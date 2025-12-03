import { AssetPlacement, CreateAssetInput, UpdateAssetInput, ASSET_CONSTRAINTS } from '../types/asset';

const assetsStore = new Map<string, AssetPlacement>();

export async function createAsset(input: CreateAssetInput): Promise<AssetPlacement> {
  const asset: AssetPlacement = {
    id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    layoutId: input.layoutId,
    assetType: input.assetType,
    name: input.name,
    geometry: { type: 'Polygon', coordinates: input.coordinates },
    createdAt: new Date(),
  };
  assetsStore.set(asset.id, asset);
  return asset;
}

export async function getAsset(id: string): Promise<AssetPlacement | null> {
  return assetsStore.get(id) || null;
}

export async function listAssetsByLayout(layoutId: string): Promise<AssetPlacement[]> {
  return Array.from(assetsStore.values()).filter((a) => a.layoutId === layoutId);
}

export async function updateAsset(id: string, input: UpdateAssetInput): Promise<AssetPlacement> {
  const asset = assetsStore.get(id);
  if (!asset) throw new Error('Asset not found');

  if (input.name) asset.name = input.name;
  if (input.coordinates) asset.geometry.coordinates = input.coordinates;

  assetsStore.set(id, asset);
  return asset;
}

export async function deleteAsset(id: string): Promise<void> {
  if (!assetsStore.has(id)) throw new Error('Asset not found');
  assetsStore.delete(id);
}

export async function validateAssetConstraints(assetType: string): Promise<any> {
  return (ASSET_CONSTRAINTS as any)[assetType] || ASSET_CONSTRAINTS['custom'];
}
