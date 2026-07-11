import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import { useSettings } from '../context/SettingsContext';
import { scaleFontSizes } from '../lib/fontScale';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'BaseLegale'>;

interface LegalItem {
  art: string;
  title: string;
  text: string;
}

const ITEMS: LegalItem[] = [
  {
    art: 'Art. 844 c.c.',
    title: 'La tollerabilità si valuta caso per caso',
    text: 'Non esiste una soglia fissa di decibel: il giudice valuta frequenza, orari e impatto sulla vita quotidiana. È esattamente ciò che un diario sistematico documenta meglio di una singola misurazione.',
  },
  {
    art: 'Art. 2712 c.c.',
    title: 'Le registrazioni possono fare piena prova',
    text: 'Audio e riproduzioni meccaniche hanno valore probatorio, e la loro credibilità cresce con la coerenza dell\'insieme: date, orari e circostanze che si confermano a vicenda nel tempo.',
  },
  {
    art: 'Art. 615-bis c.p.',
    title: 'Il rumore sì, le persone no',
    text: 'Documentare il volume di una musica è lecito; captare le parole di una conversazione privata è un reato a sé. Quiete ti guida a registrare tracce brevi del disturbo, non conversazioni.',
  },
  {
    art: 'D.lgs. 28/2010',
    title: 'La mediazione è il primo passaggio obbligato',
    text: 'Per le liti condominiali la mediazione civile è condizione di procedibilità. Arrivarci con un fascicolo ordinato cambia il peso della tua posizione al tavolo.',
  },
  {
    art: 'L. 150/2022 — Riforma Cartabia',
    title: 'La via penale si è ristretta',
    text: 'Dal 2022 il disturbo della quiete (art. 659 c.p.) è perseguibile quasi solo su querela di parte: aspettare che "ci pensino i carabinieri" non basta più. La tutela oggi passa dalle prove che raccogli tu.',
  },
];

export default function BaseLegaleScreen(_props: Props) {
  const theme = useTheme();
  const { fontScale } = useSettings();
  const styles = makeStyles(theme, fontScale);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Perché conta un diario</Text>
      <Text style={styles.intro}>
        Quiete è costruita attorno a come funzionano davvero le liti per rumori molesti in Italia — non attorno
        a un fonometro.
      </Text>

      {ITEMS.map((item) => (
        <View key={item.art} style={styles.item}>
          <Text style={styles.itemArt}>{item.art}</Text>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemText}>{item.text}</Text>
        </View>
      ))}

      <Text style={styles.disclaimer}>
        Quiete è uno strumento di documentazione, non un servizio di consulenza legale. Il valore probatorio di
        ogni elemento è sempre rimesso alla valutazione dell'autorità competente.
      </Text>
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
        borderLeftWidth: 2,
        borderLeftColor: theme.accent,
        paddingLeft: 16,
        marginBottom: 22,
      },
      itemArt: { fontSize: 12, color: theme.accent, fontWeight: '700', marginBottom: 6 },
      itemTitle: { fontSize: 15, color: theme.text, fontWeight: '700', marginBottom: 6 },
      itemText: { fontSize: 13, color: theme.muted, lineHeight: 19 },
      disclaimer: { fontSize: 11, color: theme.muted, marginTop: 12, lineHeight: 16 },
    }),
    scale
  );
}
