import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initDatabase } from './src/db/database';
import { useTheme, Theme } from './src/theme/colors';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import type { RootStackParamList } from './src/types/navigation';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DiaryScreen from './src/screens/DiaryScreen';
import NewEpisodeScreen from './src/screens/NewEpisodeScreen';
import EpisodeDetailScreen from './src/screens/EpisodeDetailScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ExportScreen from './src/screens/ExportScreen';
import GuidaScreen from './src/screens/GuidaScreen';
import BaseLegaleScreen from './src/screens/BaseLegaleScreen';
import InfoScreen from './src/screens/InfoScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen({ theme, danger }: { theme: Theme; danger?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
      <ActivityIndicator color={danger ? theme.danger : theme.accent} />
    </View>
  );
}

function AppNavigator() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { settings } = useSettings();

  if (!settings) {
    return <LoadingScreen theme={theme} />;
  }

  const baseNavTheme = scheme === 'light' ? DefaultTheme : DarkTheme;
  const navTheme: NavTheme = {
    ...baseNavTheme,
    colors: {
      ...baseNavTheme.colors,
      background: theme.bg,
      card: theme.surface,
      text: theme.text,
      border: theme.line,
      primary: theme.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={settings.onboardingSeen ? 'Diario' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Diario" component={DiaryScreen} />
        <Stack.Screen
          name="NuovoEpisodio"
          component={NewEpisodeScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="DettaglioEpisodio" component={EpisodeDetailScreen} />
        <Stack.Screen name="Statistiche" component={StatsScreen} />
        <Stack.Screen name="Impostazioni" component={SettingsScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Esporta" component={ExportScreen} />
        <Stack.Screen name="Guida" component={GuidaScreen} />
        <Stack.Screen name="BaseLegale" component={BaseLegaleScreen} />
        <Stack.Screen name="InfoApp" component={InfoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    initDatabase()
      .catch((err) => setDbError(String(err)))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <LoadingScreen theme={theme} />;
  }

  if (dbError) {
    return <LoadingScreen theme={theme} danger />;
  }

  return (
    <SettingsProvider>
      <AppNavigator />
    </SettingsProvider>
  );
}
