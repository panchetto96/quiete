import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { checkpointDatabase, closeDatabase, getDatabaseFilePath, initDatabase, DB_NAME } from '../db/database';
import { AUDIO_DIR } from './paths';

const DB_ENTRY = DB_NAME;
const AUDIO_ENTRY_PREFIX = 'audio/';

function backupFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes()
  )}`;
  return `quiete-backup-${stamp}.zip`;
}

async function listAudioFiles(): Promise<string[]> {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) return [];
  return FileSystem.readDirectoryAsync(AUDIO_DIR);
}

/**
 * Esporta un pacchetto completo: il database (episodi, note, orari) più tutti i file
 * audio registrati, in un unico .zip condivisibile. Tutto costruito in memoria dal
 * telefono: nessun passaggio da un server.
 */
export async function exportBackup(): Promise<void> {
  const zip = new JSZip();

  await checkpointDatabase();
  const dbContent = await FileSystem.readAsStringAsync(getDatabaseFilePath(), { encoding: 'base64' });
  zip.file(DB_ENTRY, dbContent, { base64: true });

  const audioFiles = await listAudioFiles();
  for (const fileName of audioFiles) {
    const content = await FileSystem.readAsStringAsync(`${AUDIO_DIR}${fileName}`, { encoding: 'base64' });
    zip.file(`${AUDIO_ENTRY_PREFIX}${fileName}`, content, { base64: true });
  }

  const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
  const dest = `${FileSystem.cacheDirectory}${backupFileName()}`;
  await FileSystem.writeAsStringAsync(dest, zipBase64, { encoding: 'base64' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, {
      mimeType: 'application/zip',
      dialogTitle: 'Salva il backup di Quiete',
    });
  }
}

export type ImportResult = { cancelled: true } | { cancelled: false; audioFilesRestored: number };

/**
 * Ripristina un backup .zip esportato da Quiete: sostituisce il database locale e
 * riscrive tutti i file audio contenuti nel pacchetto.
 */
export async function importBackup(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
  });

  if (picked.canceled || !picked.assets?.[0]) {
    return { cancelled: true };
  }

  const pickedUri = picked.assets[0].uri;
  const pickedBase64 = await FileSystem.readAsStringAsync(pickedUri, { encoding: 'base64' });
  const zip = await JSZip.loadAsync(pickedBase64, { base64: true });

  const dbEntry = zip.file(DB_ENTRY);
  if (!dbEntry) {
    throw new Error('Il file scelto non è un backup valido di Quiete (manca il database).');
  }
  const dbBase64 = await dbEntry.async('base64');

  await closeDatabase();
  await FileSystem.writeAsStringAsync(getDatabaseFilePath(), dbBase64, { encoding: 'base64' });

  await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true }).catch(() => {});
  const audioEntries = Object.values(zip.files).filter(
    (entry) => !entry.dir && entry.name.startsWith(AUDIO_ENTRY_PREFIX)
  );
  for (const entry of audioEntries) {
    const fileName = entry.name.slice(AUDIO_ENTRY_PREFIX.length);
    if (!fileName) continue;
    const content = await entry.async('base64');
    await FileSystem.writeAsStringAsync(`${AUDIO_DIR}${fileName}`, content, { encoding: 'base64' });
  }

  await initDatabase();

  return { cancelled: false, audioFilesRestored: audioEntries.length };
}
