import { useColorScheme } from 'react-native';

// Stessi token della landing page (quiete-landing.html), per coerenza visiva
// tra il sito di validazione e l'app.
const dark = {
  bg: '#0E1220',
  surface: '#171C2E',
  surface2: '#1E2438',
  text: '#E8E6DD',
  muted: '#9BA0B0',
  accent: '#F2B33D',
  accentInk: '#10141F',
  line: '#2A3048',
  danger: '#E5484D',
};

const light = {
  bg: '#F4F3EE',
  surface: '#FFFFFF',
  surface2: '#ECEAE2',
  text: '#1A2233',
  muted: '#5C6474',
  accent: '#A66E10',
  accentInk: '#FFFFFF',
  line: '#D9D6CB',
  danger: '#C4302B',
};

export type Theme = typeof dark;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'light' ? light : dark;
}
