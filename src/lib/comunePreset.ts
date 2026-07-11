export interface ComunePreset {
  comune: string;
  nightStartHour: number;
  nightEndHour: number;
  dayStartHour?: number;
  dayStartMinute?: number;
  dayEndHour?: number;
  dayEndMinute?: number;
  fonte?: string;
  note?: string;
}

export interface CurrentComuneConfig {
  comune: string;
  nightStartHour: number;
  nightEndHour: number;
  dayRestEnabled: boolean;
  dayStartHour: number;
  dayStartMinute: number;
  dayEndHour: number;
  dayEndMinute: number;
}

function dayFieldsMatch(preset: ComunePreset, current: CurrentComuneConfig): boolean {
  if (preset.dayStartHour === undefined || preset.dayEndHour === undefined) {
    return !current.dayRestEnabled;
  }
  return (
    current.dayRestEnabled &&
    current.dayStartHour === preset.dayStartHour &&
    current.dayStartMinute === (preset.dayStartMinute ?? 0) &&
    current.dayEndHour === preset.dayEndHour &&
    current.dayEndMinute === (preset.dayEndMinute ?? 0)
  );
}

/**
 * Un preset è "attivo" solo se il comune e tutti gli orari attualmente impostati
 * coincidono esattamente con quelli verificati: se l'utente ha modificato anche
 * un solo orario, la fonte di quel preset non è più valida e non va più citata
 * (vedi il caso Reggio Emilia: orari personalizzati per il proprio condominio
 * non devono ereditare la fonte del regolamento comunale generico).
 */
export function findMatchedPreset(presets: ComunePreset[], current: CurrentComuneConfig): ComunePreset | undefined {
  return presets.find(
    (p) =>
      p.comune === current.comune &&
      p.nightStartHour === current.nightStartHour &&
      p.nightEndHour === current.nightEndHour &&
      dayFieldsMatch(p, current)
  );
}
