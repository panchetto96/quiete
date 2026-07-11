import { Episode, EpisodeType, EPISODE_TYPES } from '../types/episode';

// Fascia oraria "protetta" di default (22-7), il riferimento più comune nei
// regolamenti comunali italiani. Sovrascrivibile da AppSettings, perché varia
// da comune a comune.
const DEFAULT_NIGHT_START_HOUR = 22;
const DEFAULT_NIGHT_END_HOUR = 7;

const DEFAULT_DAY_START_HOUR = 13;
const DEFAULT_DAY_START_MINUTE = 0;
const DEFAULT_DAY_END_HOUR = 15;
const DEFAULT_DAY_END_MINUTE = 0;

export interface HourBucket {
  hour: number;
  count: number;
  isNight: boolean;
  isDayRest: boolean;
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
  dayRestEnabled: boolean;
  dayRestCount: number;
  dayRestPercentage: number;
  dayStartHour: number;
  dayStartMinute: number;
  dayEndHour: number;
  dayEndMinute: number;
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

export interface DayRestRange {
  dayRestEnabled?: boolean;
  dayStartHour: number;
  dayStartMinute: number;
  dayEndHour: number;
  dayEndMinute: number;
}

function isNightHour(hour: number, range: NightRange): boolean {
  const { nightStartHour: start, nightEndHour: end } = range;
  // Alcuni comuni fissano l'inizio del riposo a mezzanotte (start=0): in quel caso
  // la fascia non "avvolge" la mezzanotte come per 22-7, è un intervallo diretto.
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

// A differenza del riposo notturno, la fascia diurna non avvolge mai la mezzanotte:
// è sempre un intervallo diretto dello stesso giorno (es. 13:00-15:30).
function isInDayRest(totalMinutes: number, range: DayRestRange): boolean {
  const start = range.dayStartHour * 60 + range.dayStartMinute;
  const end = range.dayEndHour * 60 + range.dayEndMinute;
  return totalMinutes >= start && totalMinutes < end;
}

// Un'ora del grafico è "in fascia diurna" se il suo intervallo [hour:00, hour+1:00)
// si sovrappone anche solo parzialmente alla fascia configurata.
function isDayRestHour(hour: number, range: DayRestRange): boolean {
  const start = range.dayStartHour * 60 + range.dayStartMinute;
  const end = range.dayEndHour * 60 + range.dayEndMinute;
  return hour * 60 < end && hour * 60 + 60 > start;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// JS Date.getDay() usa 0 = domenica; qui rimappiamo a 0 = lunedì per un ordine più leggibile.
function toMondayFirst(jsWeekday: number): number {
  return (jsWeekday + 6) % 7;
}

export function computeStats(
  episodes: Episode[],
  nightRange: NightRange = { nightStartHour: DEFAULT_NIGHT_START_HOUR, nightEndHour: DEFAULT_NIGHT_END_HOUR },
  dayRestRange: DayRestRange = {
    dayRestEnabled: false,
    dayStartHour: DEFAULT_DAY_START_HOUR,
    dayStartMinute: DEFAULT_DAY_START_MINUTE,
    dayEndHour: DEFAULT_DAY_END_HOUR,
    dayEndMinute: DEFAULT_DAY_END_MINUTE,
  }
): DiaryStats {
  const byHourMap = new Map<number, number>();
  const byWeekdayMap = new Map<number, number>();
  const byTypeMap = new Map<EpisodeType, number>();
  let nightCount = 0;
  let dayRestCount = 0;

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
    if (dayRestRange.dayRestEnabled && isInDayRest(hour * 60 + date.getMinutes(), dayRestRange)) {
      dayRestCount += 1;
    }

    if (!first || ep.startedAt < first) first = ep.startedAt;
    if (!last || ep.startedAt > last) last = ep.startedAt;
  }

  const byHour: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: byHourMap.get(hour) ?? 0,
    isNight: isNightHour(hour, nightRange),
    isDayRest: Boolean(dayRestRange.dayRestEnabled) && isDayRestHour(hour, dayRestRange),
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
    dayRestEnabled: Boolean(dayRestRange.dayRestEnabled),
    dayRestCount,
    dayRestPercentage: episodes.length > 0 ? Math.round((dayRestCount / episodes.length) * 100) : 0,
    dayStartHour: dayRestRange.dayStartHour,
    dayStartMinute: dayRestRange.dayStartMinute,
    dayEndHour: dayRestRange.dayEndHour,
    dayEndMinute: dayRestRange.dayEndMinute,
    byHour,
    byWeekday,
    byType,
    firstEpisodeAt: first,
    lastEpisodeAt: last,
    spanDays,
  };
}
