import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initDatabase } from './src/db/database';
import { useTheme } from './src/theme/colors';
import type { RootStackParamList } from './src/types/navigation';
import DiaryScreen from './src/screens/DiaryScreen';
import NewEpisodeScreen from './src/screens/NewEpisodeScreen';
import EpisodeDetailScreen from './src/screens/EpisodeDetailScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ExportScreen from './src/screens/ExportScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const theme = useTheme();
  const scheme = useColorScheme();

  useEffect(() => {
    initDatabase()
      .catch((err) => setDbError(String(err)))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (dbError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg, padding: 24 }}>
        <ActivityIndicator color={theme.danger} />
      </View>
    );
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
