import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
// expo-file-system SDK 57 ha una nuova API async orientata a File/Directory;
// usiamo il sottopercorso "legacy" perché espone ancora documentDirectory/copyAsync
// nella forma più semplice per questo caso d'uso (copiare un file audio in una cartella fissa).
import * as FileSystem from 'expo-file-system/legacy';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, AudioModule } from 'expo-audio';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { EPISODE_TYPES, EpisodeType } from '../types/episode';
import { insertEpisode, updateEpisode, getEpisode } from '../db/database';
import type { RootStackParamList } from '../types/navigation';
import { SoundLevelMeter } from '../components/SoundLevelMeter';
import { AUDIO_DIR } from '../lib/paths';

const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

type Props = NativeStackScreenProps<RootStackParamList, 'NuovoEpisodio'>;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function NewEpisodeScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const editingId = route.params?.id;
  const isEditing = Boolean(editingId);

  const [loaded, setLoaded] = useState(!isEditing);
  const [type, setType] = useState<EpisodeType>('musica');
  const [notes, setNotes] = useState('');
  const [startedAt, setStartedAt] = useState<Date>(new Date());
  const [savedAudioUri, setSavedAudioUri] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    getEpisode(editingId).then((episode) => {
      if (episode) {
        setType(episode.type);
        setNotes(episode.notes ?? '');
        setStartedAt(new Date(episode.startedAt));
        setSavedAudioUri(episode.audioUri ?? null);
        setDurationMinutes(episode.durationMinutes);
      }
      setLoaded(true);
    });
  }, [editingId]);

  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  // Polling più frequente (150ms) del default (500ms) perché alimenta il meter live:
  // con 500ms l'animazione delle barre risulterebbe a scatti.
  const recorderState = useAudioRecorderState(audioRecorder, 150);

  async function startRecording() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permesso microfono necessario',
        'Per registrare il rumore, Quiete ha bisogno del permesso al microfono. Puoi attivarlo dalle impostazioni del telefono.'
      );
      return;
    }
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  }

  async function stopRecording() {
    // Va letta prima di stop(): una volta fermata la registrazione lo stato torna a 0.
    const seconds = (recorderState.durationMillis ?? 0) / 1000;
    await audioRecorder.stop();
    const uri = audioRecorder.uri;
    if (!uri) return;
    try {
      await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true }).catch(() => {});
      const dest = `${AUDIO_DIR}episodio-${Date.now()}.m4a`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      setSavedAudioUri(dest);
      setDurationMinutes(seconds / 60);
    } catch (err) {
      Alert.alert('Errore', 'Non è stato possibile salvare la registrazione audio.');
    }
  }

  function onChangeDate(event: DateTimePickerEvent, selected?: Date) {
    setShowDatePicker(false);
    if (event.type === 'set' && selected) {
      setStartedAt((prev) => {
        const next = new Date(prev);
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        return next;
      });
    }
  }

  function onChangeTime(event: DateTimePickerEvent, selected?: Date) {
    setShowTimePicker(false);
    if (event.type === 'set' && selected) {
      setStartedAt((prev) => {
        const next = new Date(prev);
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        return next;
      });
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      if (isEditing && editingId) {
        await updateEpisode(editingId, {
          type,
          startedAt: startedAt.toISOString(),
          durationMinutes,
          notes: notes.trim() || undefined,
          audioUri: savedAudioUri ?? undefined,
        });
      } else {
        await insertEpisode({
          id: newId(),
          type,
          startedAt: startedAt.toISOString(),
          durationMinutes,
          notes: notes.trim() || undefined,
          audioUri: savedAudioUri ?? undefined,
          createdAt: new Date().toISOString(),
        });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Errore', "Non è stato possibile salvare l'episodio. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <View style={styles.container} />;
  }

  const recordingSeconds = Math.round((recorderState.durationMillis ?? 0) / 1000);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>{isEditing ? 'Modifica episodio' : 'Nuovo episodio'}</Text>

      <Text style={styles.label}>Quando è successo</Text>
      <View style={styles.dateTimeRow}>
        <Pressable style={styles.dateTimeChip} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateTimeText}>
            {startedAt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </Pressable>
        <Pressable style={styles.dateTimeChip} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.dateTimeText}>
            {startedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Pressable>
      </View>
      {showDatePicker && (
        <DateTimePicker value={startedAt} mode="date" display="default" maximumDate={new Date()} onChange={onChangeDate} />
      )}
      {showTimePicker && (
        <DateTimePicker value={startedAt} mode="time" display="default" onChange={onChangeTime} />
      )}

      <Text style={styles.label}>Che rumore è?</Text>
      <View style={styles.typeGrid}>
        {EPISODE_TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setType(t.value)}
            style={[styles.typeChip, type === t.value && styles.typeChipActive]}
          >
            <Text style={styles.typeIcon}>{t.icon}</Text>
            <Text style={[styles.typeLabel, type === t.value && styles.typeLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Audio (facoltativo)</Text>
      <Text style={styles.hint}>Registra il rumore, non le voci: bastano pochi secondi.</Text>

      {!recorderState.isRecording && !savedAudioUri && (
        <Pressable style={styles.recordBtn} onPress={startRecording}>
          <Text style={styles.recordBtnText}>🎙 Inizia registrazione</Text>
        </Pressable>
      )}
      {recorderState.isRecording && (
        <>
          <Pressable style={[styles.recordBtn, styles.recordBtnActive]} onPress={stopRecording}>
            <Text style={styles.recordBtnText}>⏹ Ferma ({recordingSeconds}s)</Text>
          </Pressable>
          <SoundLevelMeter level={recorderState.metering} theme={theme} />
        </>
      )}
      {savedAudioUri && !recorderState.isRecording && (
        <View style={styles.audioSaved}>
          <Text style={styles.audioSavedText}>✓ Audio registrato</Text>
          <Pressable
            onPress={() => {
              setSavedAudioUri(null);
              setDurationMinutes(undefined);
            }}
          >
            <Text style={styles.audioSavedRemove}>Rimuovi</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.label}>Note (facoltativo)</Text>
      <TextInput
        style={styles.textArea}
        placeholder='Es. "impossibile dormire", "svegliato il bambino"...'
        placeholderTextColor={theme.muted}
        multiline
        numberOfLines={4}
        value={notes}
        onChangeText={setNotes}
      />

      <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Salvataggio...' : 'Salva episodio'}</Text>
      </Pressable>

      <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelBtnText}>Annulla</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
    screenTitle: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 8 },
    label: { color: theme.text, fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 10 },
    hint: { color: theme.muted, fontSize: 12, marginBottom: 12, marginTop: -6 },
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
    dateTimeText: { color: theme.text, fontSize: 14, fontWeight: '600' },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    typeChipActive: { borderColor: theme.accent, backgroundColor: theme.surface2 },
    typeIcon: { fontSize: 15 },
    typeLabel: { color: theme.muted, fontSize: 13 },
    typeLabelActive: { color: theme.text, fontWeight: '600' },
    recordBtn: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    recordBtnActive: { borderColor: theme.danger, backgroundColor: theme.surface2 },
    recordBtnText: { color: theme.text, fontSize: 15, fontWeight: '600' },
    audioSaved: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surface2,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.accent,
    },
    audioSavedText: { color: theme.text, fontWeight: '600' },
    audioSavedRemove: { color: theme.danger, fontSize: 13 },
    textArea: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 12,
      padding: 14,
      color: theme.text,
      fontSize: 14,
      textAlignVertical: 'top',
      minHeight: 90,
    },
    saveBtn: {
      backgroundColor: theme.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 32,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: theme.accentInk, fontSize: 16, fontWeight: '700' },
    cancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
    cancelBtnText: { color: theme.muted, fontSize: 14 },
  });
}
