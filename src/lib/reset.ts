import * as FileSystem from 'expo-file-system/legacy';
import { deleteAllEpisodes } from '../db/database';
import { AUDIO_DIR } from './paths';

/** Elimina tutti gli episodi e tutti i file audio registrati. Non tocca le impostazioni. */
export async function clearAllData(): Promise<void> {
  await deleteAllEpisodes();
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(AUDIO_DIR, { idempotent: true });
  }
}
