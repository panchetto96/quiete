import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { getEpisode, deleteEpisode } from '../db/database';
import { Episode, episodeTypeInfo } from '../types/episode';
import { formatDuration } from '../lib/format';
import { useSettings } from '../context/SettingsContext';
import { scaleFontSizes } from '../lib/fontScale';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DettaglioEpisodio'>;

export default function EpisodeDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { fontScale } = useSettings();
  const styles = makeStyles(theme, fontScale);
  const { id } = route.params;
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getEpisode(id)
      .then(setEpisode)
      .finally(() => setLoaded(true));
  }, [id]);

  const player = useAudioPlayer(episode?.audioUri ?? null);
  const status = useAudioPlayerStatus(player);

  function togglePlay() {
    if (!episode?.audioUri) return;
    if (status.playing) {
      player.pause();
    } else {
      player.seekTo(0);
      player.play();
    }
  }

  function handleDelete() {
    Alert.alert('Eliminare l\'episodio?', 'Questa azione non può essere annullata.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await deleteEpisode(id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!loaded) {
    return <View style={styles.container} />;
  }

  if (!episode) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Episodio non trovato.</Text>
      </View>
    );
  }

  const info = episodeTypeInfo(episode.type);
  const date = new Date(episode.startedAt);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.icon}>{info.icon}</Text>
          <Text style={styles.title}>{info.label}</Text>
        </View>
        <Pressable
          style={styles.editBtn}
          onPress={() => navigation.navigate('NuovoEpisodio', { id: episode.id })}
        >
          <Text style={styles.editBtnText}>Modifica</Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>
        {date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })} ·{' '}
        {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        {episode.durationMinutes ? ` · ${formatDuration(episode.durationMinutes)}` : ''}
      </Text>

      {episode.audioUri && (
        <Pressable style={styles.playBtn} onPress={togglePlay}>
          <Text style={styles.playBtnText}>{status.playing ? '⏸ Pausa' : '▶ Riproduci audio'}</Text>
        </Pressable>
      )}

      {episode.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Note</Text>
          <Text style={styles.notes}>{episode.notes}</Text>
        </View>
      ) : null}

      <View style={styles.spacer} />

      <Pressable style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>Elimina episodio</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(theme: Theme, scale: number) {
  return scaleFontSizes(
    StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 64 },
    notFound: { color: theme.muted, fontSize: 15 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
    editBtn: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    editBtnText: { color: theme.text, fontSize: 13, fontWeight: '600' },
    icon: { fontSize: 40, marginBottom: 8 },
    title: { color: theme.text, fontSize: 24, fontWeight: '700' },
    meta: { color: theme.muted, fontSize: 14, marginTop: 6, marginBottom: 28, textTransform: 'capitalize' },
    playBtn: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 24,
    },
    playBtnText: { color: theme.text, fontSize: 15, fontWeight: '600' },
    notesBox: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.line,
    },
    notesLabel: {
      color: theme.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    notes: { color: theme.text, fontSize: 15, lineHeight: 22 },
    spacer: { flex: 1 },
    deleteBtn: { padding: 16, alignItems: 'center' },
    deleteBtnText: { color: theme.danger, fontSize: 14, fontWeight: '600' },
    }),
    scale
  );
}
