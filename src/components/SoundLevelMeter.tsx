import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme/colors';

const BAR_COUNT = 14;

// Range pratico per un microfono di smartphone in un ambiente domestico:
// -50 dBFS ~ stanza silenziosa, -10 dBFS ~ rumore forte captato in camera.
// È un range indicativo, non una scala fonometrica: expo-audio riporta dBFS
// (livello relativo al massimo registrabile), non dB SPL calibrato.
const MIN_DB = -50;
const MAX_DB = -10;

function normalize(db: number | undefined): number {
  if (db === undefined || !Number.isFinite(db)) return 0;
  const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
  return (clamped - MIN_DB) / (MAX_DB - MIN_DB);
}

interface Props {
  level: number | undefined;
  theme: Theme;
}

export function SoundLevelMeter({ level, theme }: Props) {
  const activeBars = Math.round(normalize(level) * BAR_COUNT);

  return (
    <View style={styles.wrap}>
      <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: 6 + i * 1.8,
                backgroundColor: i < activeBars ? theme.accent : theme.line,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.caption, { color: theme.muted }]}>
        Livello sonoro indicativo — non è una misura fonometrica certificata
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 16, marginBottom: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 32 },
  bar: { width: 6, borderRadius: 2 },
  caption: { fontSize: 10, marginTop: 10, textAlign: 'center', maxWidth: 240 },
});
