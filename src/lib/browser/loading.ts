import { create } from "zustand";

/** Transient per-tab loading flags (not persisted). */
export const useLoadingStore = create<{
  loading: Record<string, boolean>;
  setLoading: (tabId: string, value: boolean) => void;
}>((set) => ({
  loading: {},
  setLoading: (tabId, value) =>
    set((s) => (s.loading[tabId] === value ? s : { loading: { ...s.loading, [tabId]: value } })),
}));

export const FOCUS_ADDRESS_EVENT = "janela:focus-address";
export function focusAddressBar() {
  requestAnimationFrame(() => window.dispatchEvent(new Event(FOCUS_ADDRESS_EVENT)));
}
