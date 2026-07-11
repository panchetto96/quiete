import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { getAllEpisodes, getSettings } from '../db/database';
import { computeStats, DiaryStats } from '../lib/stats';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Statistiche'>;

export default function StatsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [stats, setStats] = useState<DiaryStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getAllEpisodes(), getSettings()]).then(([episodes, settings]) =>
        setStats(computeStats(episodes, settings))
      );
    }, [])
  );

  if (!stats) {
    return <View style={styles.container} />;
  }

  if (stats.total === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Statistiche</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Le statistiche compariranno qui non appena avrai registrato qualche episodio.
          </Text>
        </View>
      </View>
    );
  }

  const maxHour = Math.max(1, ...stats.byHour.map((h) => h.count));
  const maxWeekday = Math.max(1, ...stats.byWeekday.map((w) => w.count));
  const maxType = Math.max(1, ...stats.byType.map((t) => t.count));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Statistiche</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{stats.total}</Text>
          <Text style={styles.summaryLabel}>episodi{stats.spanDays > 1 ? `\nin ${stats.spanDays} giorni` : ''}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNum, stats.nightPercentage >= 50 && { color: theme.accent }]}>
            {stats.nightPercentage}%
          </Text>
          <Text style={styles.summaryLabel}>
            tra le {String(stats.nightStartHour).padStart(2, '0')}{'\n'}e le{' '}
            {String(stats.nightEndHour).padStart(2, '0')}
          </Text>
        </View>
      </View>

      {stats.nightPercentage >= 50 && (
        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            La maggior parte degli episodi cade nella fascia di riposo notturno — un elemento che pesa nella
            valutazione della tollerabilità (art. 844 c.c.).
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Per fascia oraria</Text>
      <View style={styles.hourChart}>
        {stats.byHour.map((h) => (
          <View key={h.hour} style={styles.hourBarWrap}>
            <View
              style={[
                styles.hourBar,
                {
                  height: 4 + (h.count / maxHour) * 70,
                  backgroundColor: h.count === 0 ? theme.line : h.isNight ? theme.accent : theme.muted,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.hourAxis}>
        <Text style={styles.axisLabel}>00</Text>
        <Text style={styles.axisLabel}>06</Text>
        <Text style={styles.axisLabel}>12</Text>
        <Text style={styles.axisLabel}>18</Text>
        <Text style={styles.axisLabel}>23</Text>
      </View>

      <Text style={styles.sectionTitle}>Per giorno della settimana</Text>
      <View style={styles.weekdayChart}>
        {stats.byWeekday.map((w) => (
          <View key={w.weekday} style={styles.weekdayItem}>
            <View style={styles.weekdayBarTrack}>
              <View
                style={[
                  styles.weekdayBar,
                  { height: 6 + (w.count / maxWeekday) * 80, backgroundColor: theme.accent },
                ]}
              />
            </View>
            <Text style={styles.axisLabel}>{w.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Per tipo</Text>
      <View style={styles.typeList}>
        {stats.byType.map((t) => (
          <View key={t.type} style={styles.typeRow}>
            <Text style={styles.typeIcon}>{t.icon}</Text>
            <Text style={styles.typeLabel} numberOfLines={1}>
              {t.label}
            </Text>
            <View style={styles.typeBarTrack}>
              <View style={[styles.typeBar, { width: `${(t.count / maxType) * 100}%` }]} />
            </View>
            <Text style={styles.typeCount}>{t.count}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingTop: 64, paddingBottom: 60 },
    title: { fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 20 },
    empty: { paddingTop: 40, alignItems: 'center' },
    emptyText: { color: theme.muted, textAlign: 'center', fontSize: 15, lineHeight: 22, maxWidth: 280 },
    summaryRow: { flexDirection: 'row', gap: 12 },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 12,
      padding: 18,
      alignItems: 'center',
    },
    summaryNum: { fontSize: 30, fontWeight: '700', color: theme.text },
    summaryLabel: { fontSize: 12, color: theme.muted, marginTop: 6, textAlign: 'center' },
    callout: {
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 12,
      padding: 14,
      marginTop: 14,
    },
    calloutText: { color: theme.text, fontSize: 13, lineHeight: 19 },
    sectionTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700',
      marginTop: 32,
      marginBottom: 14,
    },
    hourChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 80,
    },
    hourBarWrap: { flex: 1, alignItems: 'center' },
    hourBar: { width: 4, borderRadius: 2 },
    hourAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    axisLabel: { fontSize: 10, color: theme.muted },
    weekdayChart: { flexDirection: 'row', justifyContent: 'space-between', height: 110 },
    weekdayItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    weekdayBarTrack: { height: 90, justifyContent: 'flex-end' },
    weekdayBar: { width: 18, borderRadius: 4 },
    typeList: { gap: 14 },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    typeIcon: { fontSize: 16, width: 22 },
    typeLabel: { color: theme.text, fontSize: 13, width: 96 },
    typeBarTrack: {
      flex: 1,
      height: 8,
      backgroundColor: theme.line,
      borderRadius: 4,
      overflow: 'hidden',
    },
    typeBar: { height: '100%', backgroundColor: theme.accent, borderRadius: 4 },
    typeCount: { color: theme.muted, fontSize: 12, width: 20, textAlign: 'right' },
  });
}
