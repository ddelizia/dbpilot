import { Client as TypesenseClient } from 'typesense';
import dotenv from 'dotenv';

dotenv.config();

export interface TypesenseConfig {
  host: string;
  port: number;
  protocol: string;
  apiKey: string;
}

export function getTypesenseConfig(): TypesenseConfig {
  return {
    host: process.env.TYPESENSE_HOST || 'localhost',
    port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
    protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz_typesense_admin_key_123',
  };
}

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
