import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { useSettings } from '../context/SettingsContext';
import { scaleFontSizes } from '../lib/fontScale';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'InfoApp'>;

const APP_VERSION = Constants.expoConfig?.version ?? '?';

export default function InfoScreen(_props: Props) {
  const theme = useTheme();
  const { fontScale } = useSettings();
  const styles = makeStyles(theme, fontScale);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>Quiete</Text>
      <Text style={styles.version}>Versione {APP_VERSION}</Text>

      <Text style={styles.paragraph}>
        Quiete è un diario per documentare episodi di rumori molesti da vicini di casa, pensato per chi vuole
        tenere traccia in modo ordinato senza dover imparare uno strumento complicato.
      </Text>
      <Text style={styles.paragraph}>
        Tutti i dati — episodi, audio, note — restano esclusivamente sul tuo telefono. Nessun account,
        nessun server, nessuna raccolta dati.
      </Text>
      <Text style={styles.paragraph}>
        Quiete è uno strumento di documentazione personale, non un servizio di consulenza legale.
      </Text>
    </ScrollView>
  );
}

function makeStyles(theme: Theme, scale: number) {
  return scaleFontSizes(
    StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.bg },
      content: { padding: 20, paddingTop: 64, paddingBottom: 60 },
      logo: { fontSize: 26, fontWeight: '700', color: theme.text },
      version: { fontSize: 13, color: theme.muted, marginTop: 4, marginBottom: 28 },
      paragraph: { fontSize: 14, color: theme.muted, lineHeight: 21, marginBottom: 16 },
    }),
    scale
  );
}
