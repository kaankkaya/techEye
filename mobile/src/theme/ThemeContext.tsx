import { createContext, useContext } from 'react';
import { colors, Colors } from './colors';

const ThemeContext = createContext<Colors>(colors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={colors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Colors {
  return useContext(ThemeContext);
}
