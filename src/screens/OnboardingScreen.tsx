import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { updateSettings } from '../db/database';
import { useSettings } from '../context/SettingsContext';
import { scaleFontSizes } from '../lib/fontScale';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const theme = useTheme();
  const { fontScale, reloadSettings } = useSettings();
  const styles = makeStyles(theme, fontScale);
  const [saving, setSaving] = useState(false);

  async function handleStart() {
    if (saving) return;
    setSaving(true);
    try {
      await updateSettings({ onboardingSeen: true });
      await reloadSettings();
      navigation.replace('Diario');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>Quiete</Text>
      <Text style={styles.title}>Il diario per i rumori molesti dei vicini</Text>

      <View style={styles.card}>
        <Text style={styles.cardIcon}>🔒</Text>
        <Text style={styles.cardTitle}>I tuoi dati restano sul telefono</Text>
        <Text style={styles.cardText}>
          Quello che scrivi e registri qui non viene mai inviato a nessun server. Nessun account, nessuna
          connessione a internet richiesta.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardIcon}>⚡</Text>
        <Text style={styles.cardTitle}>Registra in pochi secondi</Text>
        <Text style={styles.cardText}>
          Quando c'è un rumore molesto, apri l'app e tocca "Rapido": basta scegliere il tipo di rumore e
          l'episodio è salvato, con data e ora. Puoi aggiungere audio e note anche dopo, con calma.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardIcon}>📄</Text>
        <Text style={styles.cardTitle}>Quando serve, hai le prove pronte</Text>
        <Text style={styles.cardText}>
          Con un tocco puoi creare un documento con tutti gli episodi registrati, da mostrare a un avvocato,
          portare in mediazione o allegare a una segnalazione.
        </Text>
      </View>

      <Pressable style={styles.startBtn} onPress={handleStart} disabled={saving}>
        <Text style={styles.startBtnText}>{saving ? 'Un attimo...' : 'Ho capito, iniziamo'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(theme: Theme, scale: number) {
  return scaleFontSizes(
    StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.bg },
      content: { padding: 24, paddingTop: 80, paddingBottom: 48 },
      logo: { fontFamily: undefined, fontSize: 22, fontWeight: '700', color: theme.accent, marginBottom: 8 },
      title: { fontSize: 24, fontWeight: '700', color: theme.text, lineHeight: 32, marginBottom: 32 },
      card: {
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
      },
      cardIcon: { fontSize: 26, marginBottom: 10 },
      cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 },
      cardText: { fontSize: 14, color: theme.muted, lineHeight: 21 },
      startBtn: {
        backgroundColor: theme.accent,
        borderRadius: 14,
        padding: 18,
        alignItems: 'center',
        marginTop: 16,
      },
      startBtnText: { color: theme.accentInk, fontSize: 17, fontWeight: '700' },
    }),
    scale
  );
}
