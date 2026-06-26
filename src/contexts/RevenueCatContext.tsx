import { createContext, useContext, ReactNode } from 'react';
import useRevenueCat from '../hooks/useRevenueCat';

type RevenueCatContextValue = ReturnType<typeof useRevenueCat>;

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const value = useRevenueCat();
  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCatContext(): RevenueCatContextValue {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) throw new Error('useRevenueCatContext must be used within RevenueCatProvider');
  return ctx;
}
