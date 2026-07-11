import { buildFascicoloHtml } from './pdf';
import type { Episode } from '../types/episode';
import type { AppSettings } from '../db/database';

function ep(id: string, iso: string, notes?: string): Episode {
  return { id, type: 'musica', startedAt: iso, createdAt: iso, notes };
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

const oneEpisode = [ep('a', '2026-03-10T22:30:00.000Z')];

describe('buildFascicoloHtml — citazione della fonte', () => {
  it('senza impostazioni, usa un valore generico senza citare nessun comune', () => {
    const html = buildFascicoloHtml(oneEpisode, undefined);
    expect(html).toContain('valore generico');
    expect(html).not.toContain('fonte:');
  });

  it('con un comune ma senza fonte corrispondente, dichiara che è un valore personalizzato', () => {
    const html = buildFascicoloHtml(oneEpisode, settings({ comune: 'Reggio Emilia', comuneFonte: undefined }));
    expect(html).toContain('Comune di Reggio Emilia');
    expect(html).toContain('valore personalizzato, nessuna fonte indicata');
    expect(html).not.toContain('fonte:');
  });

  it('con comune e fonte corrispondente, cita la fonte per esteso', () => {
    const html = buildFascicoloHtml(
      oneEpisode,
      settings({ comune: 'Reggio Emilia', comuneFonte: 'Regolamento di Polizia Urbana, art. 21' })
    );
    expect(html).toContain('Comune di Reggio Emilia');
    expect(html).toContain('fonte: Regolamento di Polizia Urbana, art. 21');
  });
});

describe('buildFascicoloHtml — fascia diurna', () => {
  it('non menziona la fascia diurna se disattivata', () => {
    const html = buildFascicoloHtml(oneEpisode, settings({ dayRestEnabled: false }));
    expect(html).not.toContain('riposo pomeridiano');
  });

  it('la menziona con orari e percentuale se attivata', () => {
    const html = buildFascicoloHtml(
      oneEpisode,
      settings({ dayRestEnabled: true, dayStartHour: 13, dayStartMinute: 0, dayEndHour: 15, dayEndMinute: 30 })
    );
    expect(html).toContain('Fascia di riposo pomeridiano di riferimento: 13:00-15:30');
  });
});

describe('buildFascicoloHtml — plurale nel conteggio episodi', () => {
  it('usa il singolare corretto con un solo episodio', () => {
    const html = buildFascicoloHtml(oneEpisode, undefined);
    expect(html).toContain('1 episodio registrato');
  });

  it('usa il plurale corretto con più episodi (non "episodioi")', () => {
    const html = buildFascicoloHtml(
      [ep('a', '2026-03-10T10:00:00.000Z'), ep('b', '2026-03-11T10:00:00.000Z')],
      undefined
    );
    expect(html).toContain('2 episodi registrati');
    expect(html).not.toContain('episodioi');
  });
});

describe('buildFascicoloHtml — sicurezza', () => {
  it('esegue l\'escape dell\'HTML nelle note per evitare injection nel documento', () => {
    const malicious = [ep('a', '2026-03-10T10:00:00.000Z', '<script>alert(1)</script>')];
    const html = buildFascicoloHtml(malicious, undefined);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
