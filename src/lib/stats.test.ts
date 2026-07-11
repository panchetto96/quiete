import { computeStats } from './stats';
import type { Episode, EpisodeType } from '../types/episode';

function isoAt(year: number, month: number, day: number, hour: number, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function ep(id: string, iso: string, type: EpisodeType = 'musica'): Episode {
  return { id, type, startedAt: iso, createdAt: iso };
}

describe('computeStats — fascia notturna', () => {
  it('conta come notturna un\'ora che avvolge la mezzanotte (es. 22-7)', () => {
    const episodes = [
      ep('a', isoAt(2026, 3, 10, 23)), // notte
      ep('b', isoAt(2026, 3, 10, 3)), // notte
      ep('c', isoAt(2026, 3, 10, 22)), // notte, limite incluso
      ep('d', isoAt(2026, 3, 10, 12)), // giorno
      ep('e', isoAt(2026, 3, 10, 7)), // giorno, limite escluso
    ];
    const stats = computeStats(episodes, { nightStartHour: 22, nightEndHour: 7 });
    expect(stats.nightCount).toBe(3);
  });

  it('conta correttamente quando il riposo inizia a mezzanotte (es. 0-7, senza avvolgimento)', () => {
    // Bug storico: la formula con solo "||" segnava sempre notte quando start=0,
    // perché "hour >= 0" è sempre vero. Questo test blocca eventuali regressioni.
    const episodes = [
      ep('a', isoAt(2026, 3, 10, 0)), // notte, limite incluso
      ep('b', isoAt(2026, 3, 10, 6)), // notte
      ep('c', isoAt(2026, 3, 10, 7)), // giorno, limite escluso
      ep('d', isoAt(2026, 3, 10, 23)), // giorno
      ep('e', isoAt(2026, 3, 10, 12)), // giorno
    ];
    const stats = computeStats(episodes, { nightStartHour: 0, nightEndHour: 7 });
    expect(stats.nightCount).toBe(2);
    expect(stats.nightPercentage).toBe(40);
  });
});

describe('computeStats — fascia diurna di quiete', () => {
  const dayRange = { dayRestEnabled: true, dayStartHour: 13, dayStartMinute: 0, dayEndHour: 15, dayEndMinute: 30 };

  it('non conta nulla se la fascia diurna è disattivata', () => {
    const episodes = [ep('a', isoAt(2026, 3, 10, 13, 30))];
    const stats = computeStats(episodes, undefined, { ...dayRange, dayRestEnabled: false });
    expect(stats.dayRestCount).toBe(0);
    expect(stats.dayRestEnabled).toBe(false);
  });

  it('rispetta i confini al minuto quando è attiva', () => {
    const episodes = [
      ep('a', isoAt(2026, 3, 10, 13, 0)), // dentro, limite incluso
      ep('b', isoAt(2026, 3, 10, 15, 29)), // dentro
      ep('c', isoAt(2026, 3, 10, 15, 30)), // fuori, limite escluso
      ep('d', isoAt(2026, 3, 10, 12, 59)), // fuori
    ];
    const stats = computeStats(episodes, undefined, dayRange);
    expect(stats.dayRestCount).toBe(2);
    expect(stats.dayRestPercentage).toBe(50);
  });

  it('segna nel grafico orario anche le ore parzialmente sovrapposte alla fascia', () => {
    const stats = computeStats([], undefined, dayRange);
    const hour15 = stats.byHour.find((h) => h.hour === 15);
    const hour16 = stats.byHour.find((h) => h.hour === 16);
    const hour12 = stats.byHour.find((h) => h.hour === 12);
    expect(hour15?.isDayRest).toBe(true); // 15:00-16:00 si sovrappone a 15:00-15:30
    expect(hour16?.isDayRest).toBe(false);
    expect(hour12?.isDayRest).toBe(false);
  });
});

describe('computeStats — casi generali', () => {
  it('gestisce un diario vuoto senza dividere per zero', () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.nightPercentage).toBe(0);
    expect(stats.dayRestPercentage).toBe(0);
    expect(stats.spanDays).toBe(0);
    expect(stats.firstEpisodeAt).toBeNull();
    expect(stats.lastEpisodeAt).toBeNull();
  });

  it('include in byType solo i tipi effettivamente presenti', () => {
    const episodes = [ep('a', isoAt(2026, 3, 10, 10), 'musica'), ep('b', isoAt(2026, 3, 10, 11), 'musica')];
    const stats = computeStats(episodes);
    expect(stats.byType).toHaveLength(1);
    expect(stats.byType[0]).toMatchObject({ type: 'musica', count: 2 });
  });

  it('calcola spanDays includendo sia il primo che l\'ultimo giorno', () => {
    const episodes = [ep('a', isoAt(2026, 3, 10, 0)), ep('b', isoAt(2026, 3, 12, 0))];
    const stats = computeStats(episodes);
    expect(stats.spanDays).toBe(3);
  });
});
