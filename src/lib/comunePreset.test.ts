import { findMatchedPreset, ComunePreset, CurrentComuneConfig } from './comunePreset';

const reggioEmilia: ComunePreset = {
  comune: 'Reggio Emilia',
  nightStartHour: 0,
  nightEndHour: 9,
  fonte: 'Regolamento di Polizia Urbana e per la civile convivenza di Reggio Emilia, art. 21',
};

const cagliari: ComunePreset = {
  comune: 'Cagliari',
  nightStartHour: 23,
  nightEndHour: 7,
  dayStartHour: 13,
  dayStartMinute: 0,
  dayEndHour: 15,
  dayEndMinute: 30,
  fonte: 'Regolamento Acustico Comunale, Comune di Cagliari',
};

const presets = [reggioEmilia, cagliari];

function config(overrides: Partial<CurrentComuneConfig> = {}): CurrentComuneConfig {
  return {
    comune: '',
    nightStartHour: 22,
    nightEndHour: 7,
    dayRestEnabled: false,
    dayStartHour: 13,
    dayStartMinute: 0,
    dayEndHour: 15,
    dayEndMinute: 0,
    ...overrides,
  };
}

describe('findMatchedPreset', () => {
  it('trova il preset quando comune e orari coincidono esattamente', () => {
    const match = findMatchedPreset(
      presets,
      config({ comune: 'Reggio Emilia', nightStartHour: 0, nightEndHour: 9 })
    );
    expect(match).toBe(reggioEmilia);
  });

  it("non trova nulla se l'utente ha modificato l'orario notturno (caso Reggio Emilia)", () => {
    // Scenario reale: l'utente seleziona Reggio Emilia, poi cambia l'orario perché
    // il suo condominio ne ha uno diverso — la fonte ufficiale non deve più comparire.
    const match = findMatchedPreset(
      presets,
      config({ comune: 'Reggio Emilia', nightStartHour: 23, nightEndHour: 9 })
    );
    expect(match).toBeUndefined();
  });

  it('non trova nulla se il nome del comune non corrisponde a nessun preset', () => {
    const match = findMatchedPreset(presets, config({ comune: 'Comune Inventato', nightStartHour: 22, nightEndHour: 7 }));
    expect(match).toBeUndefined();
  });

  it('non considera corrispondente un preset senza fascia diurna se l\'utente ne ha attivata una', () => {
    const match = findMatchedPreset(
      presets,
      config({
        comune: 'Reggio Emilia',
        nightStartHour: 0,
        nightEndHour: 9,
        dayRestEnabled: true,
        dayStartHour: 13,
        dayEndHour: 15,
      })
    );
    expect(match).toBeUndefined();
  });

  it('trova il preset con fascia diurna solo se anche i minuti coincidono', () => {
    const exact = findMatchedPreset(
      presets,
      config({
        comune: 'Cagliari',
        nightStartHour: 23,
        nightEndHour: 7,
        dayRestEnabled: true,
        dayStartHour: 13,
        dayStartMinute: 0,
        dayEndHour: 15,
        dayEndMinute: 30,
      })
    );
    expect(exact).toBe(cagliari);

    const offByMinute = findMatchedPreset(
      presets,
      config({
        comune: 'Cagliari',
        nightStartHour: 23,
        nightEndHour: 7,
        dayRestEnabled: true,
        dayStartHour: 13,
        dayStartMinute: 0,
        dayEndHour: 15,
        dayEndMinute: 0, // 15:00 invece di 15:30
      })
    );
    expect(offByMinute).toBeUndefined();
  });

  it('non trova nulla se il campo comune è vuoto', () => {
    const match = findMatchedPreset(presets, config({ comune: '' }));
    expect(match).toBeUndefined();
  });
});
