import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { getAllEpisodes, getSettings } from '../db/database';
import { Episode } from '../types/episode';
import { exportFascicolo } from '../lib/pdf';
import { exportCsv } from '../lib/csv';
import { shareDiffida } from '../lib/diffida';
import { exportBackup, importBackup } from '../lib/backup';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Esporta'>;

type ActionKey = 'pdf' | 'csv' | 'diffida' | 'backupExport' | 'backupImport';

export default function ExportScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<ActionKey | null>(null);

  useEffect(() => {
    getAllEpisodes().then((data) => {
      setEpisodes(data);
      setLoaded(true);
    });
  }, []);

  const hasEpisodes = episodes.length > 0;

  async function run(key: ActionKey, action: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try {
      await action();
    } catch (err) {
      Alert.alert('Errore', "Qualcosa è andato storto durante l'operazione. Riprova.");
    } finally {
      setBusy(null);
    }
  }

  function handlePdf() {
    run('pdf', async () => {
      const settings = await getSettings();
      await exportFascicolo(episodes, settings);
    });
  }

  function handleCsv() {
    run('csv', () => exportCsv(episodes));
  }

  function handleDiffida() {
    run('diffida', async () => {
      const settings = await getSettings();
      await shareDiffida(episodes, settings);
    });
  }

  function handleBackupExport() {
    run('backupExport', () => exportBackup());
  }

  function handleBackupImport() {
    Alert.alert(
      'Ripristinare un backup?',
      'Il diario attuale sul telefono verrà sostituito con quello del file scelto. Questa azione non può essere annullata.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Scegli file e ripristina',
          style: 'destructive',
          onPress: () =>
            run('backupImport', async () => {
              const result = await importBackup();
              if (!result.cancelled) {
                const fresh = await getAllEpisodes();
                setEpisodes(fresh);
                Alert.alert(
                  'Fatto',
                  `Il backup è stato ripristinato${
                    result.audioFilesRestored > 0 ? ` (${result.audioFilesRestored} file audio inclusi)` : ''
                  }.`
                );
              }
            }),
        },
      ]
    );
  }

  if (!loaded) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Esporta</Text>
      <Text style={styles.subtitle}>
        {hasEpisodes
          ? `${episodes.length} episodio${episodes.length === 1 ? '' : 'i'} nel diario`
          : 'Registra almeno un episodio per usare queste funzioni'}
      </Text>

      <Text style={styles.sectionLabel}>Documenti</Text>
      <ExportRow
        theme={theme}
        icon="📄"
        title="Fascicolo PDF"
        description="Cronologia completa con base legale, pronta per avvocato o mediazione."
        disabled={!hasEpisodes}
        loading={busy === 'pdf'}
        onPress={handlePdf}
      />
      <ExportRow
        theme={theme}
        icon="📊"
        title="Dati in CSV"
        description="Tutti gli episodi in formato tabellare, per analisi o per il tuo avvocato."
        disabled={!hasEpisodes}
        loading={busy === 'csv'}
        onPress={handleCsv}
      />
      <ExportRow
        theme={theme}
        icon="✉️"
        title="Bozza di diffida"
        description="Lettera modificabile basata sui tuoi episodi. Da personalizzare prima dell'invio — non è consulenza legale."
        disabled={!hasEpisodes}
        loading={busy === 'diffida'}
        onPress={handleDiffida}
      />

      <Text style={styles.sectionLabel}>Backup del diario</Text>
      <ExportRow
        theme={theme}
        icon="⬆️"
        title="Esporta backup"
        description="Database e file audio in un unico .zip, da salvare dove preferisci."
        disabled={!hasEpisodes}
        loading={busy === 'backupExport'}
        onPress={handleBackupExport}
      />
      <ExportRow
        theme={theme}
        icon="⬇️"
        title="Ripristina backup"
        description="Sostituisce il diario attuale con quello di un file .zip esportato in precedenza."
        loading={busy === 'backupImport'}
        onPress={handleBackupImport}
      />
    </ScrollView>
  );
}

function ExportRow({
  theme,
  icon,
  title,
  description,
  disabled,
  loading,
  onPress,
}: {
  theme: Theme;
  icon: string;
  title: string;
  description: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const styles = makeStyles(theme);
  return (
    <Pressable
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      {loading && <ActivityIndicator color={theme.accent} />}
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingTop: 64, paddingBottom: 60 },
    title: { fontSize: 28, fontWeight: '700', color: theme.text },
    subtitle: { fontSize: 13, color: theme.muted, marginTop: 4, marginBottom: 12 },
    sectionLabel: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 24,
      marginBottom: 10,
    },
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
    rowDisabled: { opacity: 0.45 },
    rowIcon: { fontSize: 22, marginRight: 14 },
    rowBody: { flex: 1, paddingRight: 8 },
    rowTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
    rowDescription: { color: theme.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  });
}
