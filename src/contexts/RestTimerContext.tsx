import { createContext, ReactNode, useContext } from 'react';
import { useRestTimer, RestTimerState, RestTimerControls } from '../hooks/useRestTimer';

interface RestTimerContextValue {
  timer: RestTimerState;
  controls: RestTimerControls;
}

const RestTimerContext = createContext<RestTimerContextValue | null>(null);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timer, controls] = useRestTimer();
  return (
    <RestTimerContext.Provider value={{ timer, controls }}>
      {children}
    </RestTimerContext.Provider>
  );
}

export function useRestTimerContext(): RestTimerContextValue {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error('useRestTimerContext must be inside RestTimerProvider');
  return ctx;
}
