#!/usr/bin/env node
/**
 * Applica la firma di release al progetto Android nativo.
 *
 * Necessario dopo ogni `expo prebuild`, perché la cartella android/ viene
 * rigenerata da zero e non è tracciata in git (vedi .gitignore) — qualunque
 * modifica manuale a android/app/build.gradle viene persa alla rigenerazione
 * successiva.
 *
 * Richiede, nella root del progetto (mai committati, contengono le credenziali):
 *   - release.keystore.jks
 *   - keystore.properties (storeFile, storePassword, keyAlias, keyPassword)
 *
 * Se questi file non esistono, la build di release resta firmata con la
 * chiave di debug (utile per CI/altre macchine, ma non valida per il Play Store).
 */
const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

if (!fs.existsSync(gradlePath)) {
  console.error('android/app/build.gradle non trovato. Esegui prima "npx expo prebuild --platform android".');
  process.exit(1);
}

let contents = fs.readFileSync(gradlePath, 'utf8');

if (contents.includes('keystorePropertiesFile')) {
  console.log("Firma di release già applicata, nessuna modifica necessaria.");
  process.exit(0);
}

const loaderSnippet = `def keystorePropertiesFile = rootProject.file("../keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

`;

const oldSigningConfigs = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const newSigningConfigs = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile rootProject.file("../" + keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }`;

const oldReleaseBlock = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const newReleaseBlock = `        release {
            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`;

if (!contents.includes('android {') || !contents.includes(oldSigningConfigs) || !contents.includes(oldReleaseBlock)) {
  console.error(
    'Il contenuto atteso di build.gradle non è stato trovato (probabilmente cambiato con una nuova versione di Expo). Applica la firma manualmente confrontando questo script con il file generato.'
  );
  process.exit(1);
}

contents = contents.replace('android {', loaderSnippet + 'android {');
contents = contents.replace(oldSigningConfigs, newSigningConfigs);
contents = contents.replace(oldReleaseBlock, newReleaseBlock);

fs.writeFileSync(gradlePath, contents);
console.log('Firma di release applicata a android/app/build.gradle.');
