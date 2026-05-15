import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, themes, auroraTheme } from './themes';

type ThemeKey = 'minimal' | 'glass' | 'bloomberg' | 'aurora';

interface ThemeContextType {
  theme: Theme;
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: auroraTheme,
  themeKey: 'aurora',
  setThemeKey: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>('aurora');

  useEffect(() => {
    AsyncStorage.getItem('di-theme').then((saved) => {
      if (saved && (saved === 'minimal' || saved === 'glass' || saved === 'bloomberg' || saved === 'aurora')) {
        setThemeKeyState(saved as ThemeKey);
      }
    });
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    AsyncStorage.setItem('di-theme', key);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: themes[themeKey], themeKey, setThemeKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
