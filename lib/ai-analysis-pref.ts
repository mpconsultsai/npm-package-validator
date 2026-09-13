const STORAGE_KEY = "npv-ai-analysis";

type Listener = () => void;

const listeners = new Set<Listener>();
let hydrated = false;
let enabled = true;

const emit = () => {
  listeners.forEach((listener) => listener());
};

const read = (): boolean => {
  if (typeof window === "undefined") return true;
  if (!hydrated) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    enabled = raw === null ? true : raw === "1" || raw === "true";
    hydrated = true;
  }
  return enabled;
};

export const subscribeAiAnalysisPref = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAiAnalysisEnabled = (): boolean => read();

export const getAiAnalysisEnabledServerSnapshot = (): boolean => true;

export const setAiAnalysisEnabled = (value: boolean): void => {
  const next = Boolean(value);
  if (hydrated && enabled === next) return;
  enabled = next;
  hydrated = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
  emit();
};
