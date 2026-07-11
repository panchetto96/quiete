import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Episode, episodeTypeInfo } from '../types/episode';
import { formatDuration } from './format';

const HEADERS = ['Data', 'Ora', 'Tipo', 'Durata', 'Note', 'Audio allegato'];

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(episodes: Episode[]): string {
  const sorted = [...episodes].sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const rows = sorted.map((e) => {
    const date = new Date(e.startedAt);
    return [
      date.toLocaleDateString('it-IT'),
      date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      episodeTypeInfo(e.type).label,
      formatDuration(e.durationMinutes),
      e.notes ?? '',
      e.audioUri ? 'Sì' : 'No',
    ]
      .map(escapeCsvField)
      .join(',');
  });

  // BOM iniziale: fa aprire correttamente gli accenti in Excel su Windows.
  return '﻿' + [HEADERS.join(','), ...rows].join('\n');
}

export async function exportCsv(episodes: Episode[]): Promise<void> {
  const csv = buildCsv(episodes);
  const dest = `${FileSystem.cacheDirectory}quiete-episodi-${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(dest, csv, { encoding: 'utf8' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, {
      mimeType: 'text/csv',
      dialogTitle: 'Esporta dati in CSV',
    });
  }
}
