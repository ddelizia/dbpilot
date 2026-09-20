import { Client as TypesenseClient } from 'typesense';
import { getTypesenseConfig, TypesenseConfig } from '../config.js';

export { getTypesenseConfig, type TypesenseConfig };


export function createTypesenseClient(customConfig?: TypesenseConfig): TypesenseClient {
  const cfg = customConfig || getTypesenseConfig();
  return new TypesenseClient({
    nodes: [
      {
        host: cfg.host,
        port: cfg.port,
        protocol: cfg.protocol,
      },
    ],
    apiKey: cfg.apiKey,
    connectionTimeoutSeconds: 5,
  });
}

export async function testTypesenseConnection(): Promise<{ success: boolean; message: string }> {
  const client = createTypesenseClient();
  try {
    const health = await client.health.retrieve();
    if (health && health.ok) {
      return { success: true, message: 'Connected' };
    }
    return { success: false, message: 'Typesense health check returned false' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Connection failed' };
  }
}

export interface CollectionSummary {
  name: string;
  num_documents: number;
  fields: { name: string; type: string; optional?: boolean }[];
  created_at: number;
}

export interface CreatedKeyResult {
  keyId: number;
  value: string; // The generated API Key secret string
  description: string;
  actions: string[];
  collections: string[];
}

export interface KeySummary {
  id: number;
  description: string;
  actions: string[];
  collections: string[];
  expires_at?: number;
  value_prefix?: string;
}

export function parseSchemaFields(input: string): { name: string; type: string }[] {
  if (!input.trim()) return [];
  return input.split(',').map((item) => {
    const parts = item.split(':').map((s) => s.trim());
    const name = parts[0];
    const type = parts[1] || 'string';
    return { name, type };
  });
}

/**
 * Fetch all collections in Typesense
 */
export async function getTypesenseCollections(): Promise<CollectionSummary[]> {
  const client = createTypesenseClient();
  const collections = await client.collections().retrieve();
  
  return collections.map((col: any) => ({
    name: col.name,
    num_documents: col.num_documents ?? 0,
    fields: (col.fields || []).map((f: any) => ({
      name: f.name,
      type: f.type,
      optional: f.optional,
    })),
    created_at: col.created_at || 0,
  }));
}

/**
 * Create a new collection and generate a collection-scoped admin API key
 */
export async function createCollectionAndAdmin(
  collectionName: string,
  fields: { name: string; type: string; optional?: boolean }[],
  keyDescription?: string
): Promise<{ success: boolean; message: string; apiKey?: CreatedKeyResult }> {
  const client = createTypesenseClient();

  try {
    // 1. Create collection schema
    const schema = {
      name: collectionName,
      fields: fields.length > 0 ? fields : [
        { name: '.*', type: 'auto' as const } // Auto schema if no explicit fields provided
      ],
    };

    await client.collections().create(schema as any);

    // 2. Generate scoped admin API key
    const desc = keyDescription || `Admin user key for collection ${collectionName}`;
    const keyResp = await client.keys().create({
      description: desc,
      actions: ['*'],
      collections: [collectionName],
    });

    const apiKeyResult: CreatedKeyResult = {
      keyId: keyResp.id,
      value: keyResp.value || '',
      description: keyResp.description || '',
      actions: keyResp.actions || [],
      collections: keyResp.collections || [],
    };

    return {
      success: true,
      message: `Collection "${collectionName}" created with admin API Key.`,
      apiKey: apiKeyResult,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create Typesense collection' };
  }
}

/**
 * Add a new user API key for a specific Typesense collection (admin or read-only)
 */
export async function addUserKeyToCollection(
  collectionName: string,
  description: string,
  role: 'admin' | 'read-only'
): Promise<{ success: boolean; message: string; apiKey?: CreatedKeyResult }> {
  const client = createTypesenseClient();

  try {
    const actions = role === 'admin' ? ['*'] : ['documents:search'];
    
    const keyResp = await client.keys().create({
      description: description || `${role.toUpperCase()} key for ${collectionName}`,
      actions: actions,
      collections: [collectionName],
    });

    const apiKeyResult: CreatedKeyResult = {
      keyId: keyResp.id,
      value: keyResp.value || '',
      description: keyResp.description || '',
      actions: keyResp.actions || [],
      collections: keyResp.collections || [],
    };

    return {
      success: true,
      message: `Key created for collection "${collectionName}" with ${role.toUpperCase()} role.`,
      apiKey: apiKeyResult,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create collection API key' };
  }
}

/**
 * List API keys (secret values are never returned after creation)
 */
export async function getTypesenseKeys(): Promise<KeySummary[]> {
  const client = createTypesenseClient();
  const res = await client.keys().retrieve();
  const keys = ((res as any).keys || []) as any[];

  return keys.map((key) => ({
    id: key.id,
    description: key.description || '',
    actions: key.actions || [],
    collections: key.collections || [],
    expires_at: key.expires_at,
    value_prefix: key.value_prefix,
  }));
}

/**
 * Drop a Typesense collection and all of its documents
 */
export async function deleteCollection(
  collectionName: string
): Promise<{ success: boolean; message: string }> {
  const trimmed = collectionName.trim();
  if (!trimmed) {
    return { success: false, message: 'Collection name is required.' };
  }

  const client = createTypesenseClient();
  try {
    await client.collections(trimmed).delete();
    return { success: true, message: `Collection "${trimmed}" deleted.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete collection' };
  }
}

/**
 * Revoke a Typesense API key by numeric id
 */
export async function deleteKey(keyId: number): Promise<{ success: boolean; message: string }> {
  if (!Number.isInteger(keyId) || keyId <= 0) {
    return { success: false, message: 'A valid numeric key id is required.' };
  }

  const client = createTypesenseClient();
  try {
    await client.keys(keyId).delete();
    return { success: true, message: `API key #${keyId} deleted.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete API key' };
  }
}
