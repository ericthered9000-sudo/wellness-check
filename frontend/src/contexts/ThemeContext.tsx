import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeName = 'calm' | 'ocean' | 'garden' | 'sunset' | 'classic' | 'night';
export type TextSize = 'small' | 'medium' | 'large' | 'xlarge';

interface ThemeColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  themes: Record<ThemeName, { name: string; colors: ThemeColors }>;
}

const themes: Record<ThemeName, { name: string; colors: ThemeColors }> = {
  calm: {
    name: 'Calm',
    colors: {
      primary: '#2563eb',
      primaryDark: '#1d4ed8',
      secondary: '#10b981',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
  },
  ocean: {
    name: 'Ocean',
    colors: {
      primary: '#0891b2',
      primaryDark: '#0e7490',
      secondary: '#06b6d4',
      background: '#f0fdfa',
      surface: '#ecfeff',
      text: '#164e63',
      textMuted: '#0d9488',
      border: '#99f6e4',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
    },
  },
  garden: {
    name: 'Garden',
    colors: {
      primary: '#16a34a',
      primaryDark: '#15803d',
      secondary: '#84cc16',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#14532d',
      textMuted: '#166534',
      border: '#bbf7d0',
      success: '#22c55e',
      warning: '#eab308',
      danger: '#dc2626',
    },
  },
  sunset: {
    name: 'Sunset',
    colors: {
      primary: '#ea580c',
      primaryDark: '#c2410c',
      secondary: '#f59e0b',
      background: '#fffbeb',
      surface: '#fef3c7',
      text: '#78350f',
      textMuted: '#92400e',
      border: '#fde68a',
      success: '#65a30d',
      warning: '#f59e0b',
      danger: '#dc2626',
    },
  },
  classic: {
    name: 'Classic',
    colors: {
      primary: '#000000',
      primaryDark: '#000000',
      secondary: '#1f2937',
      background: '#ffffff',
      surface: '#f3f4f6',
      text: '#000000',
      textMuted: '#4b5563',
      border: '#000000',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
    },
  },
  night: {
    name: 'Night',
    colors: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      secondary: '#60a5fa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      border: '#334155',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
    },
  },
};

const textSizes: Record<TextSize, { base: string; lg: string; xl: string; score: string }> = {
  small: { base: '14px', lg: '16px', xl: '20px', score: '56px' },
  medium: { base: '16px', lg: '18px', xl: '24px', score: '72px' },
  large: { base: '18px', lg: '22px', xl: '28px', score: '80px' },
  xlarge: { base: '22px', lg: '26px', xl: '34px', score: '96px' },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('wellness-theme');
    return (saved as ThemeName) || 'calm';
  });

  const [textSize, setTextSize] = useState<TextSize>(() => {
    const saved = localStorage.getItem('wellness-text-size');
    return (saved as TextSize) || 'medium';
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    const saved = localStorage.getItem('wellness-high-contrast');
    return saved === 'true';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const colors = themes[theme].colors;
    const fonts = textSizes[textSize];

    // Apply color variables
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-dark', colors.primaryDark);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--bg', colors.background); // Alias for compatibility
    root.style.setProperty('--surface', colors.surface);
    root.style.setProperty('--card', colors.surface); // Alias for compatibility
    root.style.setProperty('--text', colors.text);
    root.style.setProperty('--text-muted', colors.textMuted);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--danger', colors.danger);

    // Apply font size variables
    root.style.setProperty('--font-base', fonts.base);
    root.style.setProperty('--font-lg', fonts.lg);
    root.style.setProperty('--font-xl', fonts.xl);
    root.style.setProperty('--font-score', fonts.score);

    // Apply high contrast
    if (highContrast) {
      root.style.setProperty('--text', '#000000');
      root.style.setProperty('--background', '#ffffff');
      root.style.setProperty('--border', '#000000');
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply large text class
    if (textSize === 'large' || textSize === 'xlarge') {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Apply theme name
    root.setAttribute('data-theme', theme);

    // Save preferences
    localStorage.setItem('wellness-theme', theme);
    localStorage.setItem('wellness-text-size', textSize);
    localStorage.setItem('wellness-high-contrast', String(highContrast));
  }, [theme, textSize, highContrast]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      textSize, 
      setTextSize, 
      highContrast, 
      setHighContrast,
      themes 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}