import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { getSettings, saveSettings } from '../db/database';
import type { RootStackParamList } from '../types/navigation';
import comuniOrari from '../data/comuniOrari.json';

type Props = NativeStackScreenProps<RootStackParamList, 'Impostazioni'>;

function hourToDate(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

export default function SettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [comune, setComune] = useState('');
  const [nightStartHour, setNightStartHour] = useState(22);
  const [nightEndHour, setNightEndHour] = useState(7);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setComune(s.comune ?? '');
      setNightStartHour(s.nightStartHour);
      setNightEndHour(s.nightEndHour);
      setLoaded(true);
    });
  }, []);

  function applyPreset(preset: (typeof comuniOrari)[number]) {
    setComune(preset.comune);
    setNightStartHour(preset.nightStartHour);
    setNightEndHour(preset.nightEndHour);
  }

  function onChangeStart(event: DateTimePickerEvent, selected?: Date) {
    setShowStartPicker(false);
    if (event.type === 'set' && selected) setNightStartHour(selected.getHours());
  }

  function onChangeEnd(event: DateTimePickerEvent, selected?: Date) {
    setShowEndPicker(false);
    if (event.type === 'set' && selected) setNightEndHour(selected.getHours());
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSettings({ comune: comune.trim() || undefined, nightStartHour, nightEndHour });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Errore', 'Non è stato possibile salvare le impostazioni.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Impostazioni</Text>

      <Text style={styles.label}>Il tuo comune (facoltativo)</Text>
      <Text style={styles.hint}>
        Alcuni comuni hanno un orario di riposo notturno diverso dal generico 22-7. Se il tuo è tra quelli
        verificati, selezionalo: i valori restano comunque modificabili.
      </Text>
      <View style={styles.presetRow}>
        {comuniOrari.map((preset) => (
          <Pressable
            key={preset.comune}
            style={[styles.presetChip, comune === preset.comune && styles.presetChipActive]}
            onPress={() => applyPreset(preset)}
          >
            <Text style={[styles.presetChipText, comune === preset.comune && styles.presetChipTextActive]}>
              {preset.comune}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nome del comune"
        placeholderTextColor={theme.muted}
        value={comune}
        onChangeText={setComune}
      />

      {comuniOrari.some((p) => p.comune === comune) && (
        <Text style={styles.sourceNote}>
          Fonte: {comuniOrari.find((p) => p.comune === comune)?.fonte}
          {'\n'}
          {comuniOrari.find((p) => p.comune === comune)?.note}
        </Text>
      )}

      <Text style={styles.label}>Fascia di riposo notturno</Text>
      <Text style={styles.hint}>
        Usata nelle Statistiche e nei documenti esportati per segnalare gli episodi in fascia protetta.
      </Text>
      <View style={styles.dateTimeRow}>
        <Pressable style={styles.dateTimeChip} onPress={() => setShowStartPicker(true)}>
          <Text style={styles.dateTimeLabel}>Dalle</Text>
          <Text style={styles.dateTimeText}>{String(nightStartHour).padStart(2, '0')}:00</Text>
        </Pressable>
        <Pressable style={styles.dateTimeChip} onPress={() => setShowEndPicker(true)}>
          <Text style={styles.dateTimeLabel}>Alle</Text>
          <Text style={styles.dateTimeText}>{String(nightEndHour).padStart(2, '0')}:00</Text>
        </Pressable>
      </View>
      {showStartPicker && (
        <DateTimePicker value={hourToDate(nightStartHour)} mode="time" display="default" onChange={onChangeStart} />
      )}
      {showEndPicker && (
        <DateTimePicker value={hourToDate(nightEndHour)} mode="time" display="default" onChange={onChangeEnd} />
      )}

      <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Salvataggio...' : 'Salva'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingTop: 64, paddingBottom: 60 },
    title: { fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 24 },
    label: { color: theme.text, fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 8 },
    hint: { color: theme.muted, fontSize: 12, marginBottom: 14, lineHeight: 17 },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    presetChip: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: theme.surface,
    },
    presetChipActive: { borderColor: theme.accent, backgroundColor: theme.surface2 },
    presetChipText: { color: theme.muted, fontSize: 13 },
    presetChipTextActive: { color: theme.text, fontWeight: '600' },
    input: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 10,
      padding: 12,
      color: theme.text,
      fontSize: 14,
    },
    sourceNote: { color: theme.muted, fontSize: 11, marginTop: 10, lineHeight: 16 },
    dateTimeRow: { flexDirection: 'row', gap: 10 },
    dateTimeChip: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    dateTimeLabel: { color: theme.muted, fontSize: 11, marginBottom: 2 },
    dateTimeText: { color: theme.text, fontSize: 16, fontWeight: '700' },
    saveBtn: { backgroundColor: theme.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: theme.accentInk, fontSize: 16, fontWeight: '700' },
  });
}
