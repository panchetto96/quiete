/**
 * Applica un moltiplicatore a tutti i `fontSize` di uno StyleSheet, per il toggle
 * "Testo più grande" nelle impostazioni. Un'unica chiamata per schermata invece di
 * dover moltiplicare ogni valore a mano, con meno rischio di dimenticarne uno.
 */
export function scaleFontSizes<T extends Record<string, any>>(styles: T, scale: number): T {
  if (scale === 1) return styles;
  const result: Record<string, any> = {};
  for (const key in styles) {
    const style = styles[key];
    if (style && typeof style === 'object' && typeof style.fontSize === 'number') {
      result[key] = { ...style, fontSize: Math.round(style.fontSize * scale) };
    } else {
      result[key] = style;
    }
  }
  return result as T;
}
