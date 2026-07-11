import { Episode, EpisodeType, EPISODE_TYPES } from '../types/episode';

// Fascia oraria "protetta" di default (22-7), il riferimento più comune nei
// regolamenti comunali italiani. Sovrascrivibile da AppSettings, perché varia
// da comune a comune.
const DEFAULT_NIGHT_START_HOUR = 22;
const DEFAULT_NIGHT_END_HOUR = 7;

export interface HourBucket {
  hour: number;
  count: number;
  isNight: boolean;
}

export interface WeekdayBucket {
  weekday: number; // 0 = lunedì ... 6 = domenica
  label: string;
  count: number;
}

export interface TypeBucket {
  type: EpisodeType;
  label: string;
  icon: string;
  count: number;
}

export interface DiaryStats {
  total: number;
  nightCount: number;
  nightPercentage: number;
  nightStartHour: number;
  nightEndHour: number;
  byHour: HourBucket[];
  byWeekday: WeekdayBucket[];
  byType: TypeBucket[];
  firstEpisodeAt: string | null;
  lastEpisodeAt: string | null;
  spanDays: number;
}

export interface NightRange {
  nightStartHour: number;
  nightEndHour: number;
}

function isNightHour(hour: number, range: NightRange): boolean {
  return hour >= range.nightStartHour || hour < range.nightEndHour;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// JS Date.getDay() usa 0 = domenica; qui rimappiamo a 0 = lunedì per un ordine più leggibile.
function toMondayFirst(jsWeekday: number): number {
  return (jsWeekday + 6) % 7;
}

export function computeStats(
  episodes: Episode[],
  nightRange: NightRange = { nightStartHour: DEFAULT_NIGHT_START_HOUR, nightEndHour: DEFAULT_NIGHT_END_HOUR }
): DiaryStats {
  const byHourMap = new Map<number, number>();
  const byWeekdayMap = new Map<number, number>();
  const byTypeMap = new Map<EpisodeType, number>();
  let nightCount = 0;

  let first: string | null = null;
  let last: string | null = null;

  for (const ep of episodes) {
    const date = new Date(ep.startedAt);
    const hour = date.getHours();
    const weekday = toMondayFirst(date.getDay());

    byHourMap.set(hour, (byHourMap.get(hour) ?? 0) + 1);
    byWeekdayMap.set(weekday, (byWeekdayMap.get(weekday) ?? 0) + 1);
    byTypeMap.set(ep.type, (byTypeMap.get(ep.type) ?? 0) + 1);

    if (isNightHour(hour, nightRange)) nightCount += 1;

    if (!first || ep.startedAt < first) first = ep.startedAt;
    if (!last || ep.startedAt > last) last = ep.startedAt;
  }

  const byHour: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: byHourMap.get(hour) ?? 0,
    isNight: isNightHour(hour, nightRange),
  }));

  const byWeekday: WeekdayBucket[] = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    count: byWeekdayMap.get(weekday) ?? 0,
  }));

  const byType: TypeBucket[] = EPISODE_TYPES.map((t) => ({
    type: t.value,
    label: t.label,
    icon: t.icon,
    count: byTypeMap.get(t.value) ?? 0,
  })).filter((t) => t.count > 0);

  const spanDays =
    first && last
      ? Math.max(1, Math.ceil((new Date(last).getTime() - new Date(first).getTime()) / 86400000) + 1)
      : 0;

  return {
    total: episodes.length,
    nightCount,
    nightPercentage: episodes.length > 0 ? Math.round((nightCount / episodes.length) * 100) : 0,
    nightStartHour: nightRange.nightStartHour,
    nightEndHour: nightRange.nightEndHour,
    byHour,
    byWeekday,
    byType,
    firstEpisodeAt: first,
    lastEpisodeAt: last,
    spanDays,
  };
}
