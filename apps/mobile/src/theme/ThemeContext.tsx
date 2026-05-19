import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeKey, themes, lightTheme } from './themes';

interface ThemeContextType {
  theme: Theme;
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeKey: 'light',
  setThemeKey: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>('light');

  useEffect(() => {
    AsyncStorage.getItem('di-theme').then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setThemeKeyState(saved);
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
