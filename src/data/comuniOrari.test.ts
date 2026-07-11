import comuniOrari from './comuniOrari.json';

describe('comuniOrari.json', () => {
  it('non ha comuni duplicati (case-insensitive)', () => {
    const names = comuniOrari.map((c) => c.comune.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('ha orari notturni validi (0-23) per ogni comune', () => {
    for (const c of comuniOrari) {
      expect(c.nightStartHour).toBeGreaterThanOrEqual(0);
      expect(c.nightStartHour).toBeLessThanOrEqual(23);
      expect(c.nightEndHour).toBeGreaterThanOrEqual(0);
      expect(c.nightEndHour).toBeLessThanOrEqual(23);
    }
  });

  it('cita sempre una fonte non vuota per ogni comune verificato', () => {
    for (const c of comuniOrari) {
      expect(c.fonte).toBeTruthy();
      expect(c.fonte.trim().length).toBeGreaterThan(0);
    }
  });

  it('se ha la fascia diurna, la definisce per intero (ora+minuto di inizio e fine)', () => {
    for (const c of comuniOrari) {
      const dayFields = [c.dayStartHour, c.dayStartMinute, c.dayEndHour, c.dayEndMinute];
      const definedCount = dayFields.filter((v) => v !== undefined).length;
      expect([0, 4]).toContain(definedCount);
    }
  });
});
