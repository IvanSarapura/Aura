import { darkTheme, type Theme } from '@rainbow-me/rainbowkit';

// Accent = Celo green; foreground = Aura dark background.
export const customDarkTheme: Theme = {
  ...darkTheme({
    accentColor: '#35D07F',
    accentColorForeground: '#0d0d12',
    borderRadius: 'medium',
  }),
};
