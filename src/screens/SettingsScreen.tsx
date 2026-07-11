import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Switch, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, Theme } from '../theme/colors';
import {
  getSettings,
  saveSettings,
  getCustomComuni,
  insertCustomComune,
  deleteCustomComune,
  CustomComune,
} from '../db/database';
import { clearAllData } from '../lib/reset';
import { useSettings } from '../context/SettingsContext';
import { scaleFontSizes } from '../lib/fontScale';
import type { RootStackParamList } from '../types/navigation';
import comuniOrari from '../data/comuniOrari.json';

type Props = NativeStackScreenProps<RootStackParamList, 'Impostazioni'>;

interface ComunePreset {
  comune: string;
  nightStartHour: number;
  nightEndHour: number;
  dayStartHour?: number;
  dayStartMinute?: number;
  dayEndHour?: number;
  dayEndMinute?: number;
  fonte?: string;
  note?: string;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hourToDate(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

function timeToDate(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function formatHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatBackupDate(iso: string | undefined): string {
  if (!iso) return 'Mai fatto';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function SettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { fontScale, reloadSettings } = useSettings();
  const styles = makeStyles(theme, fontScale);

  const [comune, setComune] = useState('');
  const [nightStartHour, setNightStartHour] = useState(22);
  const [nightEndHour, setNightEndHour] = useState(7);
  const [largeText, setLargeText] = useState(false);
  const [backupReminderEnabled, setBackupReminderEnabled] = useState(true);
  const [lastBackupAt, setLastBackupAt] = useState<string | undefined>(undefined);
  const [onboardingSeen, setOnboardingSeen] = useState(true);
  const [dayRestEnabled, setDayRestEnabled] = useState(false);
  const [dayStartHour, setDayStartHour] = useState(13);
  const [dayStartMinute, setDayStartMinute] = useState(0);
  const [dayEndHour, setDayEndHour] = useState(15);
  const [dayEndMinute, setDayEndMinute] = useState(0);
  const [comuneFonte, setComuneFonte] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDayStartPicker, setShowDayStartPicker] = useState(false);
  const [showDayEndPicker, setShowDayEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [customComuni, setCustomComuni] = useState<CustomComune[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newComuneName, setNewComuneName] = useState('');
  const [newNightStart, setNewNightStart] = useState(22);
  const [newNightEnd, setNewNightEnd] = useState(7);
  const [newDayRestEnabled, setNewDayRestEnabled] = useState(false);
  const [newDayStart, setNewDayStart] = useState({ hour: 13, minute: 0 });
  const [newDayEnd, setNewDayEnd] = useState({ hour: 15, minute: 0 });
  const [newFonte, setNewFonte] = useState('');
  const [showNewNightStartPicker, setShowNewNightStartPicker] = useState(false);
  const [showNewNightEndPicker, setShowNewNightEndPicker] = useState(false);
  const [showNewDayStartPicker, setShowNewDayStartPicker] = useState(false);
  const [showNewDayEndPicker, setShowNewDayEndPicker] = useState(false);
  const [addingComune, setAddingComune] = useState(false);

  const loadCustomComuni = useCallback(() => {
    getCustomComuni().then(setCustomComuni);
  }, []);

  useEffect(() => {
    getSettings().then((s) => {
      setComune(s.comune ?? '');
      setNightStartHour(s.nightStartHour);
      setNightEndHour(s.nightEndHour);
      setLargeText(s.largeText);
      setBackupReminderEnabled(s.backupReminderEnabled);
      setLastBackupAt(s.lastBackupAt);
      setOnboardingSeen(s.onboardingSeen);
      setDayRestEnabled(s.dayRestEnabled);
      setDayStartHour(s.dayStartHour);
      setDayStartMinute(s.dayStartMinute);
      setDayEndHour(s.dayEndHour);
      setDayEndMinute(s.dayEndMinute);
      setComuneFonte(s.comuneFonte ?? '');
      setLoaded(true);
    });
    loadCustomComuni();
  }, [loadCustomComuni]);

  function applyPreset(preset: ComunePreset) {
    setComune(preset.comune);
    setNightStartHour(preset.nightStartHour);
    setNightEndHour(preset.nightEndHour);
    if (preset.dayStartHour !== undefined && preset.dayEndHour !== undefined) {
      setDayRestEnabled(true);
      setDayStartHour(preset.dayStartHour);
      setDayStartMinute(preset.dayStartMinute ?? 0);
      setDayEndHour(preset.dayEndHour);
      setDayEndMinute(preset.dayEndMinute ?? 0);
    } else {
      setDayRestEnabled(false);
    }
  }

  function openAddModal() {
    setNewComuneName('');
    setNewNightStart(22);
    setNewNightEnd(7);
    setNewDayRestEnabled(false);
    setNewDayStart({ hour: 13, minute: 0 });
    setNewDayEnd({ hour: 15, minute: 0 });
    setNewFonte('');
    setAddModalVisible(true);
  }

  async function handleAddComune() {
    const name = newComuneName.trim();
    if (!name) {
      Alert.alert('Nome mancante', 'Inserisci il nome del comune.');
      return;
    }
    const isDuplicate =
      comuniOrari.some((p) => p.comune.toLowerCase() === name.toLowerCase()) ||
      customComuni.some((c) => c.comune.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      Alert.alert('Comune già presente', `${name} è già tra i comuni disponibili: selezionalo dall'elenco.`);
      return;
    }
    setAddingComune(true);
    try {
      const entry: CustomComune = {
        id: newId(),
        comune: name,
        nightStartHour: newNightStart,
        nightEndHour: newNightEnd,
        dayStartHour: newDayRestEnabled ? newDayStart.hour : undefined,
        dayStartMinute: newDayRestEnabled ? newDayStart.minute : undefined,
        dayEndHour: newDayRestEnabled ? newDayEnd.hour : undefined,
        dayEndMinute: newDayRestEnabled ? newDayEnd.minute : undefined,
        fonte: newFonte.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      await insertCustomComune(entry);
      loadCustomComuni();
      applyPreset(entry);
      setAddModalVisible(false);
    } catch (err) {
      Alert.alert('Errore', 'Non è stato possibile aggiungere il comune.');
    } finally {
      setAddingComune(false);
    }
  }

  function handleDeleteCustomComune(c: CustomComune) {
    Alert.alert('Eliminare questo comune?', `"${c.comune}" verrà rimosso dai comuni aggiunti da te.`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomComune(c.id);
          loadCustomComuni();
          if (comune === c.comune) setComune('');
        },
      },
    ]);
  }

  function onValueChangeStart(event: DateTimePickerChangeEvent, selected: Date) {
    setShowStartPicker(false);
    setNightStartHour(selected.getHours());
  }

  function onValueChangeEnd(event: DateTimePickerChangeEvent, selected: Date) {
    setShowEndPicker(false);
    setNightEndHour(selected.getHours());
  }

  function onValueChangeDayStart(event: DateTimePickerChangeEvent, selected: Date) {
    setShowDayStartPicker(false);
    setDayStartHour(selected.getHours());
    setDayStartMinute(selected.getMinutes());
  }

  function onValueChangeDayEnd(event: DateTimePickerChangeEvent, selected: Date) {
    setShowDayEndPicker(false);
    setDayEndHour(selected.getHours());
    setDayEndMinute(selected.getMinutes());
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSettings({
        comune: comune.trim() || undefined,
        nightStartHour,
        nightEndHour,
        largeText,
        backupReminderEnabled,
        lastBackupAt,
        onboardingSeen,
        dayRestEnabled,
        dayStartHour,
        dayStartMinute,
        dayEndHour,
        dayEndMinute,
        // Se gli orari coincidono con un comune verificato si cita quella fonte;
        // altrimenti solo quella scritta a mano dall'utente (se c'è). Mai la fonte
        // di un comune i cui orari sono stati poi modificati.
        comuneFonte: matchedPreset?.fonte ?? (comuneFonte.trim() || undefined),
      });
      await reloadSettings();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Errore', 'Non è stato possibile salvare le impostazioni.');
    } finally {
      setSaving(false);
    }
  }

  function handleClearData() {
    Alert.alert(
      'Cancellare tutti i dati?',
      'Tutti gli episodi e gli audio registrati verranno eliminati per sempre da questo telefono. Se non hai un backup, non potrai più recuperarli.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Continua',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Sei sicuro?',
              'Questa è l\'ultima conferma: l\'intero diario verrà cancellato definitivamente.',
              [
                { text: 'Annulla', style: 'cancel' },
                {
                  text: 'Cancella tutto',
                  style: 'destructive',
                  onPress: async () => {
                    setClearing(true);
                    try {
                      await clearAllData();
                      Alert.alert('Fatto', 'Tutti i dati sono stati cancellati.');
                    } catch (err) {
                      Alert.alert('Errore', 'Non è stato possibile cancellare tutti i dati.');
                    } finally {
                      setClearing(false);
                    }
                  },
                },
              ]
            ),
        },
      ]
    );
  }

  if (!loaded) {
    return <View style={styles.container} />;
  }

  const allPresets: ComunePreset[] = [...comuniOrari, ...customComuni];

  // Un preset è "attivo" solo se il comune E tutti gli orari attualmente impostati
  // coincidono esattamente con quelli verificati: se l'utente ha modificato anche
  // un solo orario, la fonte di quel preset non è più valida e non va più citata.
  function dayFieldsMatchPreset(preset: ComunePreset): boolean {
    if (preset.dayStartHour === undefined || preset.dayEndHour === undefined) {
      return !dayRestEnabled;
    }
    return (
      dayRestEnabled &&
      dayStartHour === preset.dayStartHour &&
      dayStartMinute === (preset.dayStartMinute ?? 0) &&
      dayEndHour === preset.dayEndHour &&
      dayEndMinute === (preset.dayEndMinute ?? 0)
    );
  }

  const matchedPreset = allPresets.find(
    (p) => p.comune === comune && p.nightStartHour === nightStartHour && p.nightEndHour === nightEndHour && dayFieldsMatchPreset(p)
  );

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Impostazioni</Text>

      <Text style={styles.sectionLabel}>Guida e informazioni</Text>
      <Pressable style={styles.navRow} onPress={() => navigation.navigate('Guida')}>
        <Text style={styles.navRowIcon}>📘</Text>
        <Text style={styles.navRowText}>Come funziona Quiete</Text>
        <Text style={styles.navRowChevron}>›</Text>
      </Pressable>
      <Pressable style={styles.navRow} onPress={() => navigation.navigate('BaseLegale')}>
        <Text style={styles.navRowIcon}>⚖️</Text>
        <Text style={styles.navRowText}>Perché conta (base legale)</Text>
        <Text style={styles.navRowChevron}>›</Text>
      </Pressable>
      <Pressable style={styles.navRow} onPress={() => navigation.navigate('InfoApp')}>
        <Text style={styles.navRowIcon}>ℹ️</Text>
        <Text style={styles.navRowText}>Informazioni sull'app</Text>
        <Text style={styles.navRowChevron}>›</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Il tuo comune</Text>
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
        {customComuni.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.presetChip, styles.presetChipCustom, comune === c.comune && styles.presetChipActive]}
            onPress={() => applyPreset(c)}
            onLongPress={() => handleDeleteCustomComune(c)}
          >
            <Text style={[styles.presetChipText, comune === c.comune && styles.presetChipTextActive]}>
              {c.comune} ✎
            </Text>
          </Pressable>
        ))}
        <Pressable style={styles.addComuneChip} onPress={openAddModal}>
          <Text style={styles.addComuneChipText}>+ Aggiungi comune</Text>
        </Pressable>
      </View>
      {customComuni.length > 0 && (
        <Text style={styles.hint}>Tieni premuto un comune aggiunto da te (✎) per eliminarlo.</Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="Nome del comune (facoltativo)"
        placeholderTextColor={theme.muted}
        value={comune}
        onChangeText={setComune}
      />

      <Text style={[styles.label, { marginTop: 20 }]}>Fascia di riposo notturno</Text>
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
        <DateTimePicker
          value={hourToDate(nightStartHour)}
          mode="time"
          display="default"
          onValueChange={onValueChangeStart}
          onDismiss={() => setShowStartPicker(false)}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={hourToDate(nightEndHour)}
          mode="time"
          display="default"
          onValueChange={onValueChangeEnd}
          onDismiss={() => setShowEndPicker(false)}
        />
      )}

      <View style={[styles.switchRow, { marginTop: 20 }]}>
        <View style={styles.switchTextWrap}>
          <Text style={styles.switchTitle}>Fascia diurna di quiete</Text>
          <Text style={styles.switchHint}>
            Alcuni comuni prevedono anche un riposo pomeridiano (es. 13-15:30). Attivala solo se prevista dal tuo
            regolamento comunale.
          </Text>
        </View>
        <Switch
          value={dayRestEnabled}
          onValueChange={setDayRestEnabled}
          trackColor={{ false: theme.line, true: theme.accent }}
          thumbColor={theme.surface}
        />
      </View>

      {dayRestEnabled && (
        <View style={styles.dateTimeRow}>
          <Pressable style={styles.dateTimeChip} onPress={() => setShowDayStartPicker(true)}>
            <Text style={styles.dateTimeLabel}>Dalle</Text>
            <Text style={styles.dateTimeText}>{formatHourMinute(dayStartHour, dayStartMinute)}</Text>
          </Pressable>
          <Pressable style={styles.dateTimeChip} onPress={() => setShowDayEndPicker(true)}>
            <Text style={styles.dateTimeLabel}>Alle</Text>
            <Text style={styles.dateTimeText}>{formatHourMinute(dayEndHour, dayEndMinute)}</Text>
          </Pressable>
        </View>
      )}
      {showDayStartPicker && (
        <DateTimePicker
          value={timeToDate(dayStartHour, dayStartMinute)}
          mode="time"
          display="default"
          onValueChange={onValueChangeDayStart}
          onDismiss={() => setShowDayStartPicker(false)}
        />
      )}
      {showDayEndPicker && (
        <DateTimePicker
          value={timeToDate(dayEndHour, dayEndMinute)}
          mode="time"
          display="default"
          onValueChange={onValueChangeDayEnd}
          onDismiss={() => setShowDayEndPicker(false)}
        />
      )}

      {matchedPreset && matchedPreset.fonte ? (
        <Text style={[styles.sourceNote, { marginTop: 16 }]}>
          Fonte: {matchedPreset.fonte}
          {matchedPreset.note ? `\n${matchedPreset.note}` : ''}
        </Text>
      ) : (
        <>
          <Text style={[styles.label, { marginTop: 20 }]}>Ordinanza che conosci (facoltativa)</Text>
          <Text style={styles.hint}>
            Gli orari sopra non corrispondono (più) a un comune verificato. Se conosci il regolamento che si applica
            — anche del tuo condominio — scrivilo qui: verrà citato nei documenti esportati. Se lo lasci vuoto, non
            verrà citata nessuna fonte.
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Es. Regolamento condominiale, art. 5"
            placeholderTextColor={theme.muted}
            value={comuneFonte}
            onChangeText={setComuneFonte}
            multiline
          />
        </>
      )}

      <Text style={styles.sectionLabel}>Comodità</Text>
      <View style={styles.switchRow}>
        <View style={styles.switchTextWrap}>
          <Text style={styles.switchTitle}>Testo più grande</Text>
          <Text style={styles.switchHint}>Ingrandisce i testi in tutta l'app, per leggere più comodamente.</Text>
        </View>
        <Switch
          value={largeText}
          onValueChange={setLargeText}
          trackColor={{ false: theme.line, true: theme.accent }}
          thumbColor={theme.surface}
        />
      </View>

      <Text style={styles.sectionLabel}>Backup</Text>
      <Text style={styles.hint}>Ultimo backup: {formatBackupDate(lastBackupAt)}</Text>
      <View style={styles.switchRow}>
        <View style={styles.switchTextWrap}>
          <Text style={styles.switchTitle}>Promemoria di backup</Text>
          <Text style={styles.switchHint}>
            Un avviso nel Diario se non fai un backup da un po' di tempo, per non rischiare di perdere il diario.
          </Text>
        </View>
        <Switch
          value={backupReminderEnabled}
          onValueChange={setBackupReminderEnabled}
          trackColor={{ false: theme.line, true: theme.accent }}
          thumbColor={theme.surface}
        />
      </View>

      <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Salvataggio...' : 'Salva'}</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Dati</Text>
      <Pressable style={styles.dangerBtn} onPress={handleClearData} disabled={clearing}>
        <Text style={styles.dangerBtnText}>{clearing ? 'Cancellazione...' : 'Cancella tutti i dati'}</Text>
      </Pressable>
      <Text style={styles.hint}>Elimina definitivamente tutti gli episodi e gli audio da questo telefono.</Text>
    </ScrollView>

    <Modal
      visible={addModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setAddModalVisible(false)}
    >
      <Pressable style={styles.modalBackdrop} onPress={() => setAddModalVisible(false)}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle}>Aggiungi il tuo comune</Text>
            <Text style={styles.sheetHint}>
              Inserisci gli orari che conosci per il tuo comune. Se sei sicuro del regolamento ufficiale, indicalo:
              aiuta a rendere più solidi i documenti che esporti.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome del comune"
              placeholderTextColor={theme.muted}
              value={newComuneName}
              onChangeText={setNewComuneName}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Fascia di riposo notturno</Text>
            <View style={styles.dateTimeRow}>
              <Pressable style={styles.dateTimeChip} onPress={() => setShowNewNightStartPicker(true)}>
                <Text style={styles.dateTimeLabel}>Dalle</Text>
                <Text style={styles.dateTimeText}>{String(newNightStart).padStart(2, '0')}:00</Text>
              </Pressable>
              <Pressable style={styles.dateTimeChip} onPress={() => setShowNewNightEndPicker(true)}>
                <Text style={styles.dateTimeLabel}>Alle</Text>
                <Text style={styles.dateTimeText}>{String(newNightEnd).padStart(2, '0')}:00</Text>
              </Pressable>
            </View>
            {showNewNightStartPicker && (
              <DateTimePicker
                value={hourToDate(newNightStart)}
                mode="time"
                display="default"
                onValueChange={(event, selected) => {
                  setShowNewNightStartPicker(false);
                  setNewNightStart(selected.getHours());
                }}
                onDismiss={() => setShowNewNightStartPicker(false)}
              />
            )}
            {showNewNightEndPicker && (
              <DateTimePicker
                value={hourToDate(newNightEnd)}
                mode="time"
                display="default"
                onValueChange={(event, selected) => {
                  setShowNewNightEndPicker(false);
                  setNewNightEnd(selected.getHours());
                }}
                onDismiss={() => setShowNewNightEndPicker(false)}
              />
            )}

            <View style={[styles.switchRow, { marginTop: 16 }]}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.switchTitle}>Fascia diurna di quiete</Text>
                <Text style={styles.switchHint}>Solo se il tuo comune prevede anche un riposo pomeridiano.</Text>
              </View>
              <Switch
                value={newDayRestEnabled}
                onValueChange={setNewDayRestEnabled}
                trackColor={{ false: theme.line, true: theme.accent }}
                thumbColor={theme.surface}
              />
            </View>
            {newDayRestEnabled && (
              <View style={styles.dateTimeRow}>
                <Pressable style={styles.dateTimeChip} onPress={() => setShowNewDayStartPicker(true)}>
                  <Text style={styles.dateTimeLabel}>Dalle</Text>
                  <Text style={styles.dateTimeText}>{formatHourMinute(newDayStart.hour, newDayStart.minute)}</Text>
                </Pressable>
                <Pressable style={styles.dateTimeChip} onPress={() => setShowNewDayEndPicker(true)}>
                  <Text style={styles.dateTimeLabel}>Alle</Text>
                  <Text style={styles.dateTimeText}>{formatHourMinute(newDayEnd.hour, newDayEnd.minute)}</Text>
                </Pressable>
              </View>
            )}
            {showNewDayStartPicker && (
              <DateTimePicker
                value={timeToDate(newDayStart.hour, newDayStart.minute)}
                mode="time"
                display="default"
                onValueChange={(event, selected) => {
                  setShowNewDayStartPicker(false);
                  setNewDayStart({ hour: selected.getHours(), minute: selected.getMinutes() });
                }}
                onDismiss={() => setShowNewDayStartPicker(false)}
              />
            )}
            {showNewDayEndPicker && (
              <DateTimePicker
                value={timeToDate(newDayEnd.hour, newDayEnd.minute)}
                mode="time"
                display="default"
                onValueChange={(event, selected) => {
                  setShowNewDayEndPicker(false);
                  setNewDayEnd({ hour: selected.getHours(), minute: selected.getMinutes() });
                }}
                onDismiss={() => setShowNewDayEndPicker(false)}
              />
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Regolamento ufficiale (facoltativo)</Text>
            <Text style={styles.hint}>
              Inseriscilo solo se sei sicuro — es. "Regolamento di Polizia Urbana, art. 30, delibera n. ...".
            </Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Riferimento al regolamento (facoltativo)"
              placeholderTextColor={theme.muted}
              value={newFonte}
              onChangeText={setNewFonte}
              multiline
            />

            <Pressable
              style={[styles.saveBtn, { marginTop: 20 }, addingComune && styles.saveBtnDisabled]}
              onPress={handleAddComune}
              disabled={addingComune}
            >
              <Text style={styles.saveBtnText}>{addingComune ? 'Aggiunta...' : 'Aggiungi comune'}</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setAddModalVisible(false)}>
              <Text style={styles.sheetCancelText}>Annulla</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

function makeStyles(theme: Theme, scale: number) {
  return scaleFontSizes(
    StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.bg },
      content: { padding: 20, paddingTop: 64, paddingBottom: 60 },
      title: { fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 12 },
      sectionLabel: {
        color: theme.muted,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 26,
        marginBottom: 10,
      },
      navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        gap: 12,
      },
      navRowIcon: { fontSize: 18 },
      navRowText: { flex: 1, color: theme.text, fontSize: 14, fontWeight: '600' },
      navRowChevron: { color: theme.muted, fontSize: 18 },
      label: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
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
      presetChipCustom: { borderStyle: 'dashed' },
      addComuneChip: {
        borderWidth: 1,
        borderColor: theme.accent,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: theme.surface,
      },
      addComuneChipText: { color: theme.accent, fontSize: 13, fontWeight: '600' },
      input: {
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: 10,
        padding: 12,
        color: theme.text,
        fontSize: 14,
      },
      inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
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
      switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: 12,
        padding: 14,
        gap: 12,
      },
      switchTextWrap: { flex: 1 },
      switchTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
      switchHint: { color: theme.muted, fontSize: 12, lineHeight: 17 },
      saveBtn: { backgroundColor: theme.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
      saveBtnDisabled: { opacity: 0.6 },
      saveBtnText: { color: theme.accentInk, fontSize: 16, fontWeight: '700' },
      dangerBtn: {
        borderWidth: 1,
        borderColor: theme.danger,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginBottom: 8,
      },
      dangerBtnText: { color: theme.danger, fontSize: 14, fontWeight: '700' },
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
        maxHeight: '85%',
      },
      sheetTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
      sheetHint: { color: theme.muted, fontSize: 12, marginBottom: 18, lineHeight: 17 },
      sheetCancel: { alignItems: 'center', marginTop: 14, padding: 8 },
      sheetCancelText: { color: theme.muted, fontSize: 14 },
    }),
    scale
  );
}
