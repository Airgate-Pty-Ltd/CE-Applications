import fetch from "node-fetch";
import yaml from "yaml";
import { sha256 } from "../TextUtils";
import { Connector, FetchResult, NormalizedPack } from "./Base";

export class OpenAPIConnector implements Connector {
  canHandle(u: URL): boolean {
    // crude heuristic: /openapi.json|.yaml or /swagger.json
    return ["http:", "https:"].includes(u.protocol) &&
      /(openapi|swagger)\.(json|ya?ml)$/i.test(u.pathname);
  }

  async fetch(u: URL): Promise<FetchResult> {
    const r = await fetch(u.toString(), { headers: { "user-agent":"EDCAT/1.0" } as any });
    const body = await r.text();
    return { 
      rawText: body, 
      meta: { 
        url: u.toString(), 
        bytes: Buffer.byteLength(body), 
        fetchedAt: new Date().toISOString(), 
        contentType: r.headers.get("content-type") || undefined 
      } 
    };
  }

  async normalize(f: FetchResult): Promise<NormalizedPack> {
    const raw = f.rawText.trim();
    let doc: any;
    try {
      doc = raw.startsWith("{") ? JSON.parse(raw) : yaml.parse(raw);
    } catch {
      doc = { openapi: "unknown", paths: {} };
    }

    const clauses: any[] = [];
    const paths = doc.paths || {};
    for (const [route, ops] of Object.entries<any>(paths)) {
      for (const method of Object.keys(ops || {})) {
        const op = ops[method] || {};
        const id = `${method.toUpperCase()} ${route}`;
        const title = op.summary || op.operationId || "";
        const text = `Endpoint: ${id}\nDescription: ${op.description || "n/a"}\nParameters: ${JSON.stringify(op.parameters || [])}`;
        clauses.push({ id, title, level: 1, text, modality: ["api"], tags: ["api","openapi"] });
      }
    }

    const meta = {
      name: doc.info?.title || "Regulatory OpenAPI",
      publisher: doc.info?.contact?.name || "Unknown",
      jurisdiction: "Unknown",
      version: doc.info?.version || new Date().toISOString()
    };
    const yamlSnapshot = yaml.stringify({ meta, clauses });
    const hash = sha256(yamlSnapshot);
    return { meta, clauses, yamlSnapshot, hash };
  }
}

