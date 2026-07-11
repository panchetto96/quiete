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

const SETTINGS_COLUMNS: Record<string, string> = {
  comune: 'TEXT',
  night_start_hour: 'INTEGER',
  night_end_hour: 'INTEGER',
  large_text: 'INTEGER',
  last_backup_at: 'TEXT',
  backup_reminder_enabled: 'INTEGER',
  onboarding_seen: 'INTEGER',
  day_rest_enabled: 'INTEGER',
  day_start_hour: 'INTEGER',
  day_start_minute: 'INTEGER',
  day_end_hour: 'INTEGER',
  day_end_minute: 'INTEGER',
  comune_fonte: 'TEXT',
};

/**
 * `CREATE TABLE IF NOT EXISTS` non aggiunge colonne a una tabella già esistente
 * (es. su un telefono dove l'app era già installata prima di questo aggiornamento).
 * Qui verifichiamo quali colonne mancano e le aggiungiamo con ALTER TABLE, senza
 * mai toccare le righe già salvate.
 */
async function migrateSettingsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await db.getAllAsync<{ name: string }>('PRAGMA table_info(settings)');
  const existingNames = new Set(existing.map((c) => c.name));
  for (const [column, type] of Object.entries(SETTINGS_COLUMNS)) {
    if (!existingNames.has(column)) {
      await db.execAsync(`ALTER TABLE settings ADD COLUMN ${column} ${type}`);
    }
  }
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
      id INTEGER PRIMARY KEY CHECK (id = 1)
    );
    CREATE TABLE IF NOT EXISTS custom_comuni (
      id TEXT PRIMARY KEY NOT NULL,
      comune TEXT NOT NULL,
      night_start_hour INTEGER NOT NULL,
      night_end_hour INTEGER NOT NULL,
      day_start_hour INTEGER,
      day_start_minute INTEGER,
      day_end_hour INTEGER,
      day_end_minute INTEGER,
      fonte TEXT,
      created_at TEXT NOT NULL
    );
  `);
  await migrateSettingsTable(db);
}

const DEFAULT_NIGHT_START_HOUR = 22;
const DEFAULT_NIGHT_END_HOUR = 7;
const DEFAULT_DAY_START_HOUR = 13;
const DEFAULT_DAY_START_MINUTE = 0;
const DEFAULT_DAY_END_HOUR = 15;
const DEFAULT_DAY_END_MINUTE = 0;
export const FONT_SCALE_LARGE = 1.18;
export const FONT_SCALE_NORMAL = 1;

export interface AppSettings {
  comune?: string;
  nightStartHour: number;
  nightEndHour: number;
  largeText: boolean;
  lastBackupAt?: string;
  backupReminderEnabled: boolean;
  onboardingSeen: boolean;
  dayRestEnabled: boolean;
  dayStartHour: number;
  dayStartMinute: number;
  dayEndHour: number;
  dayEndMinute: number;
  /**
   * Riferimento normativo per gli orari sopra: valorizzato solo quando gli orari
   * coincidono esattamente con un comune verificato (ufficiale o aggiunto dall'utente),
   * oppure quando l'utente lo scrive di suo pugno. Se l'utente modifica gli orari
   * scostandosi da un preset, il chiamante deve ricalcolare/azzerare questo campo:
   * non va mai citata una fonte per numeri che quella fonte non prevede davvero.
   */
  comuneFonte?: string;
}

interface SettingsRow {
  comune: string | null;
  night_start_hour: number | null;
  night_end_hour: number | null;
  large_text: number | null;
  last_backup_at: string | null;
  backup_reminder_enabled: number | null;
  onboarding_seen: number | null;
  day_rest_enabled: number | null;
  day_start_hour: number | null;
  day_start_minute: number | null;
  day_end_hour: number | null;
  day_end_minute: number | null;
  comune_fonte: string | null;
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
    largeText: row?.large_text === 1,
    lastBackupAt: row?.last_backup_at ?? undefined,
    // Attivo di default: meglio un promemoria in più che un backup mai fatto.
    backupReminderEnabled: row?.backup_reminder_enabled !== 0,
    onboardingSeen: row?.onboarding_seen === 1,
    // Disattivata di default: a differenza del riposo notturno, non è un riferimento
    // universale nei regolamenti comunali italiani, va attivata solo se pertinente.
    dayRestEnabled: row?.day_rest_enabled === 1,
    dayStartHour: row?.day_start_hour ?? DEFAULT_DAY_START_HOUR,
    dayStartMinute: row?.day_start_minute ?? DEFAULT_DAY_START_MINUTE,
    dayEndHour: row?.day_end_hour ?? DEFAULT_DAY_END_HOUR,
    dayEndMinute: row?.day_end_minute ?? DEFAULT_DAY_END_MINUTE,
    comuneFonte: row?.comune_fonte ?? undefined,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (id, comune, night_start_hour, night_end_hour, large_text, last_backup_at, backup_reminder_enabled, onboarding_seen, day_rest_enabled, day_start_hour, day_start_minute, day_end_hour, day_end_minute, comune_fonte)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET comune = excluded.comune,
       night_start_hour = excluded.night_start_hour,
       night_end_hour = excluded.night_end_hour,
       large_text = excluded.large_text,
       last_backup_at = excluded.last_backup_at,
       backup_reminder_enabled = excluded.backup_reminder_enabled,
       onboarding_seen = excluded.onboarding_seen,
       day_rest_enabled = excluded.day_rest_enabled,
       day_start_hour = excluded.day_start_hour,
       day_start_minute = excluded.day_start_minute,
       day_end_hour = excluded.day_end_hour,
       day_end_minute = excluded.day_end_minute,
       comune_fonte = excluded.comune_fonte`,
    settings.comune ?? null,
    settings.nightStartHour,
    settings.nightEndHour,
    settings.largeText ? 1 : 0,
    settings.lastBackupAt ?? null,
    settings.backupReminderEnabled ? 1 : 0,
    settings.onboardingSeen ? 1 : 0,
    settings.dayRestEnabled ? 1 : 0,
    settings.dayStartHour,
    settings.dayStartMinute,
    settings.dayEndHour,
    settings.dayEndMinute,
    settings.comuneFonte ?? null
  );
}

/** Aggiorna un sottoinsieme delle impostazioni senza dover ricaricare/riscrivere tutto il resto. */
export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await saveSettings(next);
  return next;
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

/** Elimina tutti gli episodi dal database. I file audio associati vanno rimossi separatamente. */
export async function deleteAllEpisodes(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM episodes');
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

/**
 * Comune aggiunto manualmente dall'utente, con i propri orari e, se lo conosce con
 * certezza, il riferimento al regolamento ufficiale. A differenza dei comuni verificati
 * in comuniOrari.json (controllati da noi), qui la fonte è quella dichiarata dall'utente:
 * viene mostrata così com'è, senza garanzia di correttezza da parte dell'app.
 */
export interface CustomComune {
  id: string;
  comune: string;
  nightStartHour: number;
  nightEndHour: number;
  dayStartHour?: number;
  dayStartMinute?: number;
  dayEndHour?: number;
  dayEndMinute?: number;
  fonte?: string;
  createdAt: string;
}

interface CustomComuneRow {
  id: string;
  comune: string;
  night_start_hour: number;
  night_end_hour: number;
  day_start_hour: number | null;
  day_start_minute: number | null;
  day_end_hour: number | null;
  day_end_minute: number | null;
  fonte: string | null;
  created_at: string;
}

function rowToCustomComune(row: CustomComuneRow): CustomComune {
  return {
    id: row.id,
    comune: row.comune,
    nightStartHour: row.night_start_hour,
    nightEndHour: row.night_end_hour,
    dayStartHour: row.day_start_hour ?? undefined,
    dayStartMinute: row.day_start_minute ?? undefined,
    dayEndHour: row.day_end_hour ?? undefined,
    dayEndMinute: row.day_end_minute ?? undefined,
    fonte: row.fonte ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getCustomComuni(): Promise<CustomComune[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CustomComuneRow>('SELECT * FROM custom_comuni ORDER BY comune COLLATE NOCASE');
  return rows.map(rowToCustomComune);
}

export async function insertCustomComune(comune: CustomComune): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO custom_comuni (id, comune, night_start_hour, night_end_hour, day_start_hour, day_start_minute, day_end_hour, day_end_minute, fonte, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    comune.id,
    comune.comune,
    comune.nightStartHour,
    comune.nightEndHour,
    comune.dayStartHour ?? null,
    comune.dayStartMinute ?? null,
    comune.dayEndHour ?? null,
    comune.dayEndMinute ?? null,
    comune.fonte ?? null,
    comune.createdAt
  );
}

export async function deleteCustomComune(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM custom_comuni WHERE id = ?', id);
}
