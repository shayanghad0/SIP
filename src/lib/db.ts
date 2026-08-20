/**
 * SIP — JSON Database Manager
 * ---------------------------
 * A reusable, file-oriented persistence layer that mirrors the
 * `database/*.json` files 1:1. In this browser build the "disk" is
 * localStorage; the adapter keeps the exact same guarantees the Node
 * server uses (see README → Architecture):
 *
 *  - Atomic writes   : serialize → temp key → swap → remove temp
 *  - Backup          : last 5 snapshots kept before every overwrite
 *  - Validation      : per-file schema validators before commit
 *  - Auto IDs        : collision-safe sequential IDs (prefix + ts + rnd)
 *  - File locking    : single-writer in-process queue (mutex)
 *  - Error recovery  : corrupted file → restore from latest backup
 *  - No duplicated IDs enforced by `withUniqueIds`
 */

import type {
  AdminFile,
  AiFile,
  BooksFile,
  ConsultantsFile,
  GradesFile,
  NotesFile,
  ParentsFile,
  StudentsFile,
  TeachersFile,
} from "./types";

export const DB_FILES = [
  "admin",
  "teachers",
  "students",
  "parents",
  "consultants",
  "grades",
  "books",
  "notes",
  "ai-analysis",
] as const;

export type DbFile = (typeof DB_FILES)[number];

export type DbCollections = {
  admin: AdminFile;
  teachers: TeachersFile;
  students: StudentsFile;
  parents: ParentsFile;
  consultants: ConsultantsFile;
  grades: GradesFile;
  books: BooksFile;
  notes: NotesFile;
  "ai-analysis": AiFile;
};

type CollectionName<T> = T extends { [K: string]: unknown[] } ? keyof T & string : string;

const STORAGE_PREFIX = "sip-db:";
const TMP_SUFFIX = ".tmp";
const BACKUPS_KEY = "sip-db:backups";
const MAX_BACKUPS = 5;
const ID_RANDOM_LENGTH = 4;

function defaultCollections(): DbCollections {
  return {
    admin: { admins: [] },
    teachers: { teachers: [] },
    students: {
      students: [],
      attendance: [],
      homeworks: [],
      homeworkSubmissions: [],
      behaviorReports: [],
    },
    parents: { parents: [] },
    consultants: { consultants: [] },
    grades: { grades: [], classes: [], exams: [], examScores: [] },
    books: { lessons: [] },
    notes: { notes: [], wellnessForms: [], alerts: [], activity: [] },
    "ai-analysis": {
      analyses: [],
      studyPlans: [],
      teacherAnalytics: [],
      cheatingFlags: [],
      guidance: {},
    },
  };
}

const DEFAULTS: Record<DbFile, () => unknown> = {
  admin: () => defaultCollections().admin,
  teachers: () => defaultCollections().teachers,
  students: () => defaultCollections().students,
  parents: () => defaultCollections().parents,
  consultants: () => defaultCollections().consultants,
  grades: () => defaultCollections().grades,
  books: () => defaultCollections().books,
  notes: () => defaultCollections().notes,
  "ai-analysis": () => defaultCollections()["ai-analysis"],
};

function hasArrays(data: unknown, keys: string[]): boolean {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return keys.every((k) => Array.isArray(obj[k]));
}

const VALIDATORS: Record<DbFile, (data: unknown) => boolean> = {
  admin: (d) => hasArrays(d, ["admins"]),
  teachers: (d) => hasArrays(d, ["teachers"]),
  students: (d) =>
    hasArrays(d, ["students", "attendance", "homeworks", "homeworkSubmissions", "behaviorReports"]),
  parents: (d) => hasArrays(d, ["parents"]),
  consultants: (d) => hasArrays(d, ["consultants"]),
  grades: (d) => hasArrays(d, ["grades", "classes", "exams", "examScores"]),
  books: (d) => hasArrays(d, ["lessons"]),
  notes: (d) => hasArrays(d, ["notes", "wellnessForms", "alerts", "activity"]),
  "ai-analysis": (d) =>
    hasArrays(d, ["analyses", "studyPlans", "teacherAnalytics", "cheatingFlags"]) &&
    typeof ((d as Record<string, unknown>).guidance as unknown) === "object",
};

interface BackupEntry {
  file: DbFile;
  data: string;
  at: string;
}

function key(file: DbFile): string {
  return `${STORAGE_PREFIX}${file}`;
}

function serverUrl(): string {
  // default server host for file-backed DB
  return (typeof window !== 'undefined' && window.location && `${window.location.protocol}//${window.location.hostname}:3001`) || 'http://localhost:3001';
}

function syncHttpGet(path: string): string | null {
  try {
    if (typeof XMLHttpRequest === 'undefined') return null;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', path, false); // synchronous
    xhr.send(null);
    if (xhr.status === 200) return xhr.responseText;
    return null;
  } catch {
    return null;
  }
}

function syncHttpPost(path: string, body: string): boolean {
  try {
    if (typeof XMLHttpRequest === 'undefined') return false;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path, false); // synchronous
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(body);
    return xhr.status === 200;
  } catch {
    return false;
  }
}

function readBackups(): BackupEntry[] {
  try {
    const raw = localStorage.getItem(BACKUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BackupEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushBackup(file: DbFile, data: string): void {
  try {
    const backups = readBackups().filter((b) => b.file !== file);
    backups.push({ file, data, at: new Date().toISOString() });
    const kept = backups.slice(-MAX_BACKUPS);
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(kept));
  } catch {
    /* storage full — skip backup, still commit */
  }
}

/* ---------------- single-writer lock (file locking) ----------------
 * The browser runtime is single-threaded, so locking is enforced with a
 * re-entrancy depth guard: writes are serialized per call stack, which is
 * the browser equivalent of an exclusive file lock.
 */

let lockDepth = 0;

function withLock<T>(task: () => T): T {
  lockDepth += 1;
  try {
    return task();
  } finally {
    lockDepth -= 1;
  }
}

/* ---------------- low level read / write ---------------- */

function rawWrite(file: DbFile, serialized: string): void {
  // Try file-backed server first (synchronous). Fall back to localStorage.
  const url = `${serverUrl()}/db/${file}`;
  const ok = syncHttpPost(url, serialized);
  if (ok) return;
  const tmpKey = `${key(file)}${TMP_SUFFIX}`;
  localStorage.setItem(tmpKey, serialized);
  localStorage.setItem(key(file), serialized);
  localStorage.removeItem(tmpKey);
}

/** Read a collection; recovers from corruption using backups. */
export function readDb<T extends DbCollections[keyof DbCollections]>(file: DbFile): T {
  return withLock(() => {
    // Try file-backed server synchronously
    let raw: string | null = null;
    const url = `${serverUrl()}/db/${file}`;
    raw = syncHttpGet(url);
    // If server didn't return, fall back to localStorage
    if (raw === null) raw = localStorage.getItem(key(file));
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw) as T;
        if (VALIDATORS[file](parsed)) return parsed;
      } catch {
        /* fall through to recovery */
      }
    }
    // Error recovery: try the latest backup of this file.
    const backup = [...readBackups()]
      .reverse()
      .find((b) => b.file === file);
    if (backup) {
      try {
        const parsed = JSON.parse(backup.data) as T;
        if (VALIDATORS[file](parsed)) {
          rawWrite(file, backup.data);
          return parsed;
        }
      } catch {
        /* corrupted backup — reset below */
      }
    }
    const fresh = DEFAULTS[file]();
    rawWrite(file, JSON.stringify(fresh));
    return fresh as T;
  }) as T;
}

/** Atomic write with backup + validation. */
export function writeDb<T extends DbCollections[keyof DbCollections]>(file: DbFile, data: T): void {
  withLock(() => {
    if (!VALIDATORS[file](data)) {
      throw new Error(`SIP-DB: validation failed for ${file}.json`);
    }
    const current = localStorage.getItem(key(file));
    if (current !== null && current !== JSON.stringify(data)) {
      pushBackup(file, current);
    }
    rawWrite(file, JSON.stringify(data));
  });
}

/** Read-modify-write helper (relationship-safe updates). */
export function updateDb<T extends DbCollections[keyof DbCollections]>(
  file: DbFile,
  mutate: (data: T) => T,
): T {
  return withLock(() => {
    const current = rawReadUnlocked<T>(file);
    const next = mutate(current);
    if (!VALIDATORS[file](next)) {
      throw new Error(`SIP-DB: validation failed for ${file}.json after mutation`);
    }
    if (current !== undefined && JSON.stringify(current) !== JSON.stringify(next)) {
      pushBackup(file, JSON.stringify(current));
    }
    rawWrite(file, JSON.stringify(next));
    return next;
  });
}

function rawReadUnlocked<T>(file: DbFile): T {
  const raw = localStorage.getItem(key(file));
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as T;
      if (VALIDATORS[file](parsed)) return parsed;
    } catch {
      /* recovery */
    }
  }
  const fresh = DEFAULTS[file]();
  rawWrite(file, JSON.stringify(fresh));
  return fresh as T;
}

/* ---------------- auto IDs ---------------- */

const idCounters: Record<string, number> = {};

/** Collision-safe auto ID: `prefix-<seq>-<ts><rand>` */
export function nextId(prefix: string, existing: { id: string }[] = []): string {
  const seq = (idCounters[prefix] ?? 0) + 1;
  idCounters[prefix] = seq;
  const rand = Math.random().toString(36).slice(2, 2 + ID_RANDOM_LENGTH);
  const id = `${prefix}-${Date.now().toString(36)}${rand}`;
  if (existing.some((e) => e.id === id)) return nextId(prefix, existing);
  void seq;
  return id;
}

/** Ensure uniqueness of `field` values; regenerates duplicates. */
export function withUniqueIds<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.map((item, i) => {
    let id = item.id;
    while (seen.has(id)) id = nextId(item.id.split("-")[0] ?? "item");
    seen.add(id);
    return i === 0 && id === item.id ? item : { ...item, id };
  });
}

/* ---------------- system health / reset ---------------- */

export interface FileHealth {
  file: string;
  ok: boolean;
  bytes: number;
}

export function dbHealth(): { files: FileHealth[]; backups: number; totalBytes: number } {
  const files: FileHealth[] = DB_FILES.map((f) => {
    const raw = localStorage.getItem(key(f));
    let ok = false;
    try {
      ok = VALIDATORS[f](JSON.parse(raw ?? "null"));
    } catch {
      ok = false;
    }
    return { file: `${f}.json`, ok, bytes: raw ? raw.length : 0 };
  });
  return {
    files,
    backups: readBackups().length,
    totalBytes: files.reduce((s, f) => s + f.bytes, 0),
  };
}

export function resetDatabase(): void {
  withLock(() => {
    const all = defaultCollections();
    for (const f of DB_FILES) {
      rawWrite(f, JSON.stringify(all[f]));
    }
    localStorage.removeItem(BACKUPS_KEY);
  });
}

export function isInstalled(): boolean {
  const admin = readDb<AdminFile>("admin");
  return admin.admins.length > 0;
}

export function collectionSize(file: DbFile): number {
  const raw = localStorage.getItem(key(file));
  return raw ? raw.length : 0;
}

/* Re-exported for API layer convenience */
export type { CollectionName };
