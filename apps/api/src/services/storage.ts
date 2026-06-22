import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { config } from "../config.js";

// Honor an absolute PRINTFLOW_DATA_DIR (e.g. a Render disk mount); otherwise resolve from cwd.
const dataRoot = isAbsolute(config.dataDir) ? config.dataDir : join(process.cwd(), config.dataDir);

export interface StoredObject {
  storagePath: string;
  publicUrl?: string | undefined;
  provider: "local" | "supabase";
}

export async function saveArtworkObject(input: { storagePath: string; mimeType: string; base64?: string | undefined }): Promise<StoredObject> {
  if (!input.base64) {
    return { storagePath: input.storagePath, provider: configuredStorageProvider() };
  }
  const bytes = Buffer.from(input.base64, "base64");
  if (config.supabaseUrl && config.supabaseServiceRoleKey) {
    const cleanPath = input.storagePath.replace(/^artwork\//, "");
    const response = await fetch(`${config.supabaseUrl}/storage/v1/object/${config.supabaseArtworkBucket}/${encodeURIComponentPath(cleanPath)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        apikey: config.supabaseServiceRoleKey,
        "Content-Type": input.mimeType,
        "x-upsert": "true"
      },
      body: bytes
    });
    if (!response.ok) {
      throw Object.assign(new Error(`Supabase Storage upload failed: ${response.status}`), { statusCode: 502 });
    }
    return {
      storagePath: `${config.supabaseArtworkBucket}/${cleanPath}`,
      publicUrl: `${config.supabaseUrl}/storage/v1/object/public/${config.supabaseArtworkBucket}/${encodeURIComponentPath(cleanPath)}`,
      provider: "supabase"
    };
  }

  const target = join(dataRoot, "storage", input.storagePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return { storagePath: input.storagePath, provider: "local" };
}

function configuredStorageProvider(): StoredObject["provider"] {
  return config.supabaseUrl && config.supabaseServiceRoleKey ? "supabase" : "local";
}

function encodeURIComponentPath(path: string): string {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}
