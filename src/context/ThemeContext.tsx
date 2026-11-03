import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'finanzas_vzla_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved;
    }
    return 'auto'; // Default is automatic as requested
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    // Auto: 06:00 - 18:00 is light, 18:00 - 06:00 is dark
    const hour = new Date().getHours();
    return hour < 6 || hour >= 18;
  });

  // Calculate and apply dark class
  useEffect(() => {
    const evaluateTheme = () => {
      let shouldBeDark = false;
      if (mode === 'dark') {
        shouldBeDark = true;
      } else if (mode === 'light') {
        shouldBeDark = false;
      } else {
        // Auto
        const currentHour = new Date().getHours();
        shouldBeDark = currentHour < 6 || currentHour >= 18;
      }

      setIsDark(shouldBeDark);
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    evaluateTheme();

    // Check periodically for auto mode transitions
    const interval = setInterval(evaluateTheme, 60000);
    return () => clearInterval(interval);
  }, [mode]);

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const toggleTheme = () => {
    if (mode === 'auto') {
      setThemeMode(isDark ? 'light' : 'dark');
    } else if (mode === 'dark') {
      setThemeMode('light');
    } else {
      setThemeMode('auto');
    }
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
