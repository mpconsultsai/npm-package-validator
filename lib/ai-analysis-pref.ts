const STORAGE_KEY = "npv-ai-analysis";

type Listener = () => void;

const listeners = new Set<Listener>();
let hydrated = false;
let enabled = true;

function emit() {
  for (const listener of listeners) listener();
}

function read(): boolean {
  if (typeof window === "undefined") return true;
  if (!hydrated) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    enabled = raw === null ? true : raw === "1" || raw === "true";
    hydrated = true;
  }
  return enabled;
}

export function subscribeAiAnalysisPref(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAiAnalysisEnabled(): boolean {
  return read();
}

export function getAiAnalysisEnabledServerSnapshot(): boolean {
  return true;
}

export function setAiAnalysisEnabled(value: boolean): void {
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
}
