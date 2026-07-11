import * as SQLite from 'expo-sqlite';
import { Episode, EpisodeType } from '../types/episode';

// Nome file locale sul dispositivo: nessuna sincronizzazione, nessun server.
export const DB_NAME = 'quiete.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      started_at TEXT NOT NULL,
      duration_minutes INTEGER,
      notes TEXT,
      audio_uri TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      comune TEXT,
      night_start_hour INTEGER,
      night_end_hour INTEGER
    );
  `);
}

const DEFAULT_NIGHT_START_HOUR = 22;
const DEFAULT_NIGHT_END_HOUR = 7;

export interface AppSettings {
  comune?: string;
  nightStartHour: number;
  nightEndHour: number;
}

interface SettingsRow {
  comune: string | null;
  night_start_hour: number | null;
  night_end_hour: number | null;
}

/**
 * Ora del riposo notturno: di default 22-7 (il riferimento più comune nei regolamenti
 * comunali italiani), ma personalizzabile perché varia da comune a comune. Non esiste
 * un database pubblico affidabile di tutti i regolamenti comunali italiani: la scelta
 * più onesta è lasciare che sia l'utente a inserire quello del proprio comune, se lo conosce.
 */
export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<SettingsRow>('SELECT * FROM settings WHERE id = 1');
  return {
    comune: row?.comune ?? undefined,
    nightStartHour: row?.night_start_hour ?? DEFAULT_NIGHT_START_HOUR,
    nightEndHour: row?.night_end_hour ?? DEFAULT_NIGHT_END_HOUR,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (id, comune, night_start_hour, night_end_hour)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET comune = excluded.comune,
       night_start_hour = excluded.night_start_hour,
       night_end_hour = excluded.night_end_hour`,
    settings.comune ?? null,
    settings.nightStartHour,
    settings.nightEndHour
  );
}

/**
 * In modalità WAL le scritture recenti possono restare nel file `-wal` e non essere
 * ancora presenti nel file principale `quiete.db`. Va chiamata prima di leggere/copiare
 * il file per un backup, altrimenti gli episodi aggiunti di recente rischiano di non
 * finire nell'export.
 */
export async function checkpointDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

/** Chiude la connessione corrente. Serve solo prima di sostituire il file del DB (ripristino backup). */
export async function closeDatabase(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.closeAsync();
  dbPromise = null;
}

/**
 * Percorso del file del database sul dispositivo, usato per l'export/import del backup.
 * `SQLite.defaultDatabaseDirectory` restituisce un percorso nudo (es. "/data/user/0/.../SQLite"),
 * senza lo schema "file://" richiesto dalle funzioni di expo-file-system: lo aggiungiamo qui.
 */
export function getDatabaseFilePath(): string {
  const dir = SQLite.defaultDatabaseDirectory;
  const withScheme = dir.startsWith('file://') ? dir : `file://${dir}`;
  return `${withScheme}/${DB_NAME}`;
}

export async function insertEpisode(episode: Episode): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO episodes (id, type, started_at, duration_minutes, notes, audio_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    episode.id,
    episode.type,
    episode.startedAt,
    episode.durationMinutes ?? null,
    episode.notes ?? null,
    episode.audioUri ?? null,
    episode.createdAt
  );
}

export interface EpisodeUpdate {
  type: EpisodeType;
  startedAt: string;
  durationMinutes?: number;
  notes?: string;
  audioUri?: string;
}

export async function updateEpisode(id: string, changes: EpisodeUpdate): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE episodes
     SET type = ?, started_at = ?, duration_minutes = ?, notes = ?, audio_uri = ?
     WHERE id = ?`,
    changes.type,
    changes.startedAt,
    changes.durationMinutes ?? null,
    changes.notes ?? null,
    changes.audioUri ?? null,
    id
  );
}

export async function getAllEpisodes(): Promise<Episode[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EpisodeRow>('SELECT * FROM episodes ORDER BY started_at DESC');
  return rows.map(rowToEpisode);
}

export async function getEpisode(id: string): Promise<Episode | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EpisodeRow>('SELECT * FROM episodes WHERE id = ?', id);
  return row ? rowToEpisode(row) : null;
}

export async function deleteEpisode(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM episodes WHERE id = ?', id);
}

interface EpisodeRow {
  id: string;
  type: string;
  started_at: string;
  duration_minutes: number | null;
  notes: string | null;
  audio_uri: string | null;
  created_at: string;
}

function rowToEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    type: row.type as EpisodeType,
    startedAt: row.started_at,
    durationMinutes: row.duration_minutes ?? undefined,
    notes: row.notes ?? undefined,
    audioUri: row.audio_uri ?? undefined,
    createdAt: row.created_at,
  };
}
