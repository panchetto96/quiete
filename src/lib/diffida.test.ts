import { buildDiffidaText } from './diffida';
import type { Episode } from '../types/episode';
import type { AppSettings } from '../db/database';

function ep(id: string, iso: string): Episode {
  return { id, type: 'musica', startedAt: iso, createdAt: iso };
}

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    nightStartHour: 22,
    nightEndHour: 7,
    largeText: false,
    backupReminderEnabled: true,
    onboardingSeen: true,
    dayRestEnabled: false,
    dayStartHour: 13,
    dayStartMinute: 0,
    dayEndHour: 15,
    dayEndMinute: 0,
    ...overrides,
  };
}

// Notte 22-7: tre episodi notturni e uno diurno -> 75% notturno, sopra la soglia del 50%.
const mostlyNightEpisodes = [
  ep('a', '2026-03-10T23:00:00.000Z'),
  ep('b', '2026-03-11T02:00:00.000Z'),
  ep('c', '2026-03-12T22:30:00.000Z'),
  ep('d', '2026-03-13T12:00:00.000Z'),
];

describe('buildDiffidaText — nota sulla fascia notturna', () => {
  it('la include quando la percentuale notturna è alta, senza citare fonti se non impostate', () => {
    const text = buildDiffidaText(mostlyNightEpisodes, settings());
    expect(text).toContain('si colloca nella fascia di riposo notturno');
    expect(text).not.toMatch(/riposo notturno\s*\(Regolamento/);
  });

  it('cita la fonte tra parentesi solo se comuneFonte è impostata', () => {
    const text = buildDiffidaText(mostlyNightEpisodes, settings({ comuneFonte: 'Regolamento X, art. 5' }));
    expect(text).toContain('fascia di riposo notturno (Regolamento X, art. 5)');
  });

  it('non la include quando la percentuale notturna è sotto la soglia', () => {
    const dayEpisodes = [ep('a', '2026-03-10T10:00:00.000Z'), ep('b', '2026-03-10T12:00:00.000Z')];
    const text = buildDiffidaText(dayEpisodes, settings());
    expect(text).not.toContain('si colloca nella fascia di riposo notturno');
  });
});

describe('buildDiffidaText — nota sulla fascia diurna', () => {
  it('la include solo se attivata e sopra la soglia del 30%', () => {
    const episodes = [
      ep('a', '2026-03-10T13:15:00.000Z'), // fascia diurna
      ep('b', '2026-03-10T14:00:00.000Z'), // fascia diurna
      ep('c', '2026-03-10T09:00:00.000Z'),
    ];
    const text = buildDiffidaText(
      episodes,
      settings({ dayRestEnabled: true, dayStartHour: 13, dayEndHour: 15 })
    );
    expect(text).toContain('fascia di riposo pomeridiano');
  });

  it('non la include se la fascia diurna è disattivata, anche con episodi nell\'orario', () => {
    const episodes = [ep('a', '2026-03-10T13:15:00.000Z')];
    const text = buildDiffidaText(episodes, settings({ dayRestEnabled: false }));
    expect(text).not.toContain('fascia di riposo pomeridiano');
  });
});
