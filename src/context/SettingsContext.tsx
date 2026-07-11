import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppSettings, getSettings, FONT_SCALE_LARGE, FONT_SCALE_NORMAL } from '../db/database';

interface SettingsContextValue {
  settings: AppSettings | null;
  fontScale: number;
  reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const reloadSettings = useCallback(async () => {
    setSettings(await getSettings());
  }, []);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  const fontScale = settings?.largeText ? FONT_SCALE_LARGE : FONT_SCALE_NORMAL;

  return (
    <SettingsContext.Provider value={{ settings, fontScale, reloadSettings }}>{children}</SettingsContext.Provider>
  );
}

/**
 * Va chiamato dopo ogni modifica alle impostazioni salvata nel DB (es. da SettingsScreen),
 * altrimenti le altre schermate continuano a usare la copia in memoria non aggiornata.
 */
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings deve essere usato dentro <SettingsProvider>');
  return ctx;
}
