import * as FileSystem from 'expo-file-system/legacy';

/** Cartella locale dove vivono i file audio registrati, condivisa da registrazione e backup. */
export const AUDIO_DIR = `${FileSystem.documentDirectory}audio/`;
