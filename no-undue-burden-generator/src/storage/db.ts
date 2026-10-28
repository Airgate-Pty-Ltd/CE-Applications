import { organizationProfile, emptyProfile, type OrganizationProfile } from '../schema/profile.ts'
import { projectPlan, emptyPlan, type ProjectPlan } from '../schema/plan.ts'

/**
 * Local-first storage.
 *
 * Everything stays in the browser. Customers preparing a federal filing will not
 * paste article model numbers, facility names and drawing references into a
 * cloud service they do not control, and they should not have to — nothing in
 * this product needs a server. Cloud sync, if it ever ships, is opt-in and paid.
 *
 * Values are validated through the Zod schema on the way out. A stored document
 * written by an older version of the app is a real possibility, and a schema
 * that has since gained a field must not produce `undefined` in the middle of a
 * regulatory determination — parsing applies the defaults instead.
 */

const DB_NAME = 'no-undue-burden'
const DB_VERSION = 1
const STORE = 'documents'

export const PROFILE_KEY = 'organization-profile'
export const PLAN_KEY_PREFIX = 'plan:'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

async function put(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
  })
  db.close()
}

async function get(key: string): Promise<unknown> {
  const db = await openDb()
  const value = await new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'))
  })
  db.close()
  return value
}

async function listKeys(): Promise<string[]> {
  const db = await openDb()
  const keys = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAllKeys()
    req.onsuccess = () => resolve(req.result.map(String))
    req.onerror = () => reject(req.error ?? new Error('IndexedDB list failed'))
  })
  db.close()
  return keys
}

export async function saveProfile(profile: OrganizationProfile): Promise<void> {
  await put(PROFILE_KEY, profile)
}

export async function loadProfile(): Promise<OrganizationProfile> {
  const raw = await get(PROFILE_KEY)
  if (raw === undefined) return emptyProfile()
  const parsed = organizationProfile.safeParse(raw)
  // A profile that no longer parses is recoverable: fall back to defaults for
  // the fields that broke rather than losing the whole record.
  return parsed.success ? parsed.data : organizationProfile.parse({ ...emptyProfile(), ...(raw as object) })
}

export async function savePlan(id: string, plan: ProjectPlan): Promise<void> {
  await put(PLAN_KEY_PREFIX + id, plan)
}

export async function loadPlan(id: string): Promise<ProjectPlan> {
  const raw = await get(PLAN_KEY_PREFIX + id)
  if (raw === undefined) return emptyPlan()
  const parsed = projectPlan.safeParse(raw)
  return parsed.success ? parsed.data : emptyPlan()
}

export async function listPlanIds(): Promise<string[]> {
  return (await listKeys()).filter((k) => k.startsWith(PLAN_KEY_PREFIX)).map((k) => k.slice(PLAN_KEY_PREFIX.length))
}

/** Available in every browser this app supports; guarded for non-DOM test runs. */
export function storageAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}
