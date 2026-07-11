import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { useSettings } from '../context/SettingsContext';
import { scaleFontSizes } from '../lib/fontScale';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Guida'>;

interface GuideItem {
  icon: string;
  title: string;
  text: string;
}

const ITEMS: GuideItem[] = [
  {
    icon: '⚡',
    title: '"Rapido" — il pulsante per l\'emergenza',
    text: 'Quando senti un rumore molesto proprio in quel momento: tocca "Rapido", scegli il tipo di rumore, ed è già salvato con data e ora. Nient\'altro da fare subito.',
  },
  {
    icon: '➕',
    title: '"+" — aggiungere un episodio con calma',
    text: 'Se hai qualche minuto: registra anche un audio, scrivi una nota, o correggi data e ora se stai segnando un episodio della sera prima.',
  },
  {
    icon: '📊',
    title: 'Statistiche',
    text: 'Mostra quanti episodi hai registrato, a che ore succedono più spesso e in che giorni della settimana — utile per far vedere che non è un caso isolato.',
  },
  {
    icon: '⚙️',
    title: 'Impostazioni',
    text: "Qui puoi indicare il tuo comune (per usare i suoi orari di riposo notturno), ingrandire il testo, e gestire il backup dei tuoi dati.",
  },
  {
    icon: '📤',
    title: 'Esporta',
    text: 'Da qui crei i documenti: un fascicolo PDF con tutti gli episodi, i dati in un foglio elettronico, o una bozza di lettera da mandare al vicino o all\'amministratore.',
  },
  {
    icon: '✏️',
    title: 'Modificare o eliminare un episodio',
    text: 'Tocca un episodio nella lista del diario per aprirlo: da lì puoi modificarlo o eliminarlo.',
  },
];

export default function GuidaScreen(_props: Props) {
  const theme = useTheme();
  const { fontScale } = useSettings();
  const styles = makeStyles(theme, fontScale);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Guida rapida</Text>
      <Text style={styles.intro}>Come funzionano i pulsanti e le schermate principali di Quiete.</Text>

      {ITEMS.map((item) => (
        <View key={item.title} style={styles.item}>
          <Text style={styles.itemIcon}>{item.icon}</Text>
          <View style={styles.itemBody}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemText}>{item.text}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: Theme, scale: number) {
  return scaleFontSizes(
    StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.bg },
      content: { padding: 20, paddingTop: 64, paddingBottom: 60 },
      title: { fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 6 },
      intro: { fontSize: 13, color: theme.muted, marginBottom: 24, lineHeight: 19 },
      item: {
        flexDirection: 'row',
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      },
      itemIcon: { fontSize: 22, marginRight: 14 },
      itemBody: { flex: 1 },
      itemTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 5 },
      itemText: { color: theme.muted, fontSize: 13, lineHeight: 19 },
    }),
    scale
  );
}
