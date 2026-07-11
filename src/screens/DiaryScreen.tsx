import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { getAllEpisodes, insertEpisode } from '../db/database';
import { Episode, EpisodeType, EPISODE_TYPES, episodeTypeInfo } from '../types/episode';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Diario'>;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function DiaryScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingQuick, setLoggingQuick] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEpisodes(await getAllEpisodes());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleQuickLog(type: EpisodeType) {
    if (loggingQuick) return;
    setLoggingQuick(true);
    try {
      const id = newId();
      await insertEpisode({
        id,
        type,
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      setPickerVisible(false);
      navigation.navigate('DettaglioEpisodio', { id });
    } finally {
      setLoggingQuick(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Diario</Text>
          <Text style={styles.subtitle}>
            {episodes.length === 0
              ? 'Nessun episodio registrato'
              : `${episodes.length} episodio${episodes.length === 1 ? '' : 'i'} registrat${
                  episodes.length === 1 ? 'o' : 'i'
                }`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('Statistiche')}>
            <Text style={styles.iconBtnText}>📊</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('Impostazioni')}>
            <Text style={styles.iconBtnText}>⚙️</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('Esporta')}>
            <Text style={styles.iconBtnText}>📤</Text>
          </Pressable>
        </View>
      </View>

      {episodes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔇</Text>
          <Text style={styles.emptyText}>
            Quando senti un rumore molesto, registralo subito: bastano trenta secondi, anche alle 3 di notte.
          </Text>
        </View>
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.accent} />}
          renderItem={({ item }) => {
            const info = episodeTypeInfo(item.type);
            const date = new Date(item.startedAt);
            return (
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate('DettaglioEpisodio', { id: item.id })}
              >
                <Text style={styles.rowIcon}>{info.icon}</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{info.label}</Text>
                  <Text style={styles.rowMeta}>
                    {date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} ·{' '}
                    {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    {item.audioUri ? ' · 🎙' : ''}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        style={styles.quickFab}
        onPress={() => setPickerVisible(true)}
        accessibilityLabel="Registra subito un episodio scegliendo solo il tipo, da completare dopo"
      >
        <Text style={styles.quickFabText}>⚡ Rapido</Text>
      </Pressable>

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('NuovoEpisodio')}
        accessibilityLabel="Registra un nuovo episodio con tutti i dettagli"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Che rumore è?</Text>
            <Text style={styles.sheetHint}>Salvato subito con l'ora di adesso — audio e note li aggiungi dopo, se vuoi.</Text>
            <View style={styles.sheetGrid}>
              {EPISODE_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={styles.sheetChip}
                  onPress={() => handleQuickLog(t.value)}
                  disabled={loggingQuick}
                >
                  <Text style={styles.sheetChipIcon}>{t.icon}</Text>
                  <Text style={styles.sheetChipLabel}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.sheetCancel} onPress={() => setPickerVisible(false)}>
              <Text style={styles.sheetCancelText}>Annulla</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 64,
      paddingBottom: 16,
    },
    headerText: { flex: 1, paddingRight: 12 },
    title: { fontSize: 28, fontWeight: '700', color: theme.text },
    subtitle: { fontSize: 13, color: theme.muted, marginTop: 4 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnText: { fontSize: 16, color: theme.text },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 40, marginBottom: 16 },
    emptyText: { color: theme.muted, textAlign: 'center', fontSize: 15, lineHeight: 22, maxWidth: 280 },
    list: { paddingHorizontal: 20, paddingBottom: 150 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.line,
    },
    rowIcon: { fontSize: 22, marginRight: 14 },
    rowBody: { flex: 1 },
    rowTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
    rowMeta: { color: theme.muted, fontSize: 12, marginTop: 3 },
    quickFab: {
      position: 'absolute',
      right: 20,
      bottom: 100,
      paddingHorizontal: 18,
      height: 46,
      borderRadius: 23,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    quickFabText: { color: theme.text, fontSize: 14, fontWeight: '700' },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 32,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: theme.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabText: { color: theme.accentInk, fontSize: 30, fontWeight: '400', marginTop: -2 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 36,
      borderTopWidth: 1,
      borderColor: theme.line,
    },
    sheetTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
    sheetHint: { color: theme.muted, fontSize: 12, marginBottom: 18, lineHeight: 17 },
    sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    sheetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    sheetChipIcon: { fontSize: 16 },
    sheetChipLabel: { color: theme.text, fontSize: 13, fontWeight: '600' },
    sheetCancel: { alignItems: 'center', marginTop: 20, padding: 8 },
    sheetCancelText: { color: theme.muted, fontSize: 14 },
  });
}
