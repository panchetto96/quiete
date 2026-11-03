# Quiete

App mobile per documentare i disturbi da rumore tra vicini: un diario di episodi con prove audio, statistiche e documenti pronti da usare (fascicolo PDF, bozza di diffida), tutto in locale sul telefono.

Sito: [quieteapp.it](https://quieteapp.it)

## Funzionalità

- **Diario degli episodi**: registrazione di data/ora, tipo di rumore (musica, mobili/passi, cane, voci, lavori, altro), durata e note.
- **Registrazione audio** con indicatore del livello sonoro in tempo reale (dBFS, indicativo e non una misura fonometrica); i file restano sul dispositivo.
- **Orari di riposo per comune**: preset per alcuni comuni italiani con la relativa fonte normativa, orari personalizzabili e comuni definiti dall'utente. Il preset viene citato nei documenti solo se corrisponde agli orari effettivamente impostati.
- **Statistiche**: distribuzione per fascia oraria, giorno della settimana e tipo, con quota di episodi in fascia notturna e nel riposo pomeridiano.
- **Esportazione**: fascicolo PDF, dati in CSV, bozza di diffida in testo semplice (punto di partenza, non consulenza legale).
- **Backup e ripristino** in un unico file `.zip` (database SQLite più audio), costruito interamente sul dispositivo; cancellazione completa dei dati.
- **Contenuti informativi**: guida all'uso, schermata sulla base legale (art. 659 c.p.), onboarding, tema chiaro/scuro automatico.

Non ci sono backend né account: i dati non lasciano il telefono.

## Stack tecnologico

- Expo SDK 57, React Native 0.86, React 19, TypeScript
- React Navigation (native stack)
- `expo-sqlite` per la persistenza, con migrazione incrementale delle colonne
- `expo-audio`, `expo-print`, `expo-sharing`, `expo-document-picker`, `expo-file-system`
- `jszip` per i backup
- Jest con `jest-expo` per i test
- GitHub Actions per la CI

## Architettura

```
App.tsx          Navigazione e provider (impostazioni, tema)
index.ts         Entry point Expo
src/
  screens/       Schermate dell'app (diario, nuovo episodio, dettaglio, statistiche,
                 impostazioni, esportazione, guida, base legale, onboarding, info)
  components/    Componenti riutilizzabili (es. SoundLevelMeter)
  context/       SettingsContext: impostazioni condivise
  db/            Schema SQLite, accesso ai dati e migrazioni
  lib/           Logica di dominio, senza UI: statistiche, preset comune,
                 PDF, CSV, diffida, backup, reset
  data/          Dataset dei comuni con orari e fonti (JSON)
  theme/         Palette e tema
  types/         Tipi di dominio e di navigazione
scripts/         Script di build (firma di release Android)
```

La logica di dominio in `src/lib` è separata dalle schermate ed è coperta da test unitari.

## Avvio in sviluppo

Requisiti: Node.js 20 e un emulatore o dispositivo Android/iOS.

```bash
npm install
npm start          # expo start
npm run android    # expo run:android
npm run ios        # expo run:ios
npm run web        # expo start --web
```

## Test e CI

```bash
npx tsc --noEmit   # type-check
npm test           # jest
```

Il workflow `.github/workflows/ci.yml` esegue su push e pull request verso `master`: `npm ci`, `npx tsc --noEmit` e `npx jest --ci` (Node 20).

## Build Android di release

La cartella `android/` non è versionata: viene generata da `expo prebuild`. Lo script `postprebuild` esegue `scripts/apply-release-signing.js`, che aggiunge al `build.gradle` generato la configurazione di firma di release.

```bash
npm run prebuild -- --platform android
```

Lo script legge, dalla root del progetto, `release.keystore.jks` e `keystore.properties` (chiavi `storeFile`, `storePassword`, `keyAlias`, `keyPassword`). Entrambi sono esclusi da git e non vanno mai committati. Senza questi file la build di release viene firmata con la chiave di debug, adatta solo a prove. La firma è quindi gestita localmente: la CI non esegue build di release.

## Licenza

Distribuito sotto licenza MIT, vedi il file [LICENSE](LICENSE).
