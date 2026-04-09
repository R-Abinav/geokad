import { create } from 'zustand';

interface SosState {
  isActive: boolean;
  peersNotified: number;
  activatedAt: number | null;
  introSosCenterY: number | null;
  activate: () => void;
  cancel: () => void;
  incrementPeers: () => void;
  setPeersNotified: (n: number) => void;
  setIntroSosCenterY: (y: number) => void;
}

export const useSosStore = create<SosState>((set) => ({
  isActive: false,
  peersNotified: 0,
  activatedAt: null,
  introSosCenterY: null,
  setIntroSosCenterY: (y: number) => set({ introSosCenterY: y }),
  activate: () => {
    set({ isActive: true, activatedAt: Date.now(), peersNotified: 0 });
  },
  cancel: () => {
    set({ isActive: false, activatedAt: null, peersNotified: 0 });
  },
  incrementPeers: () => set((state) => ({ peersNotified: state.peersNotified + 1 })),
  setPeersNotified: (n: number) => set({ peersNotified: n }),
}));
