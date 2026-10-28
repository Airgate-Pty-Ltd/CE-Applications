export interface FetchResult { 
  rawText: string; 
  meta: { url: string; bytes: number; fetchedAt: string; contentType?: string }; 
}

export interface NormalizedPack {
  meta: { name: string; publisher?: string; jurisdiction?: string; version?: string; };
  clauses: Array<{ id: string; title?: string; level: number; text: string; modality: string[]; tags: string[] }>;
  yamlSnapshot: string;
  hash: string;
}

export interface Connector {
  canHandle(u: URL): boolean;
  fetch(u: URL): Promise<FetchResult>;
  normalize(f: FetchResult): Promise<NormalizedPack>;
}

