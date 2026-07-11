export type EpisodeType = 'musica' | 'mobili' | 'cane' | 'voci' | 'lavori' | 'altro';

export interface EpisodeTypeInfo {
  value: EpisodeType;
  label: string;
  icon: string;
}

// L'ordine riflette la frequenza reale osservata nella ricerca di mercato
// (musica e mobili/passi sono le cause più citate nei forum sui rumori condominiali).
export const EPISODE_TYPES: EpisodeTypeInfo[] = [
  { value: 'musica', label: 'Musica ad alto volume', icon: '\u{1F3B5}' },
  { value: 'mobili', label: 'Trascinamento mobili / passi', icon: '\u{1FA91}' },
  { value: 'cane', label: 'Cane che abbaia', icon: '\u{1F415}' },
  { value: 'voci', label: 'Schiamazzi / voci alte', icon: '\u{1F5E3}\u{FE0F}' },
  { value: 'lavori', label: 'Lavori / trapano', icon: '\u{1F528}' },
  { value: 'altro', label: 'Altro', icon: '\u{1F50A}' },
];

export function episodeTypeInfo(type: EpisodeType): EpisodeTypeInfo {
  return EPISODE_TYPES.find((t) => t.value === type) ?? EPISODE_TYPES[EPISODE_TYPES.length - 1];
}

export interface Episode {
  id: string;
  type: EpisodeType;
  /** Data/ora di inizio dell'episodio, ISO 8601 */
  startedAt: string;
  durationMinutes?: number;
  notes?: string;
  /** Percorso locale del file audio, mai caricato altrove */
  audioUri?: string;
  createdAt: string;
}
