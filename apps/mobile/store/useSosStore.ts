import { create } from 'zustand';

interface SosState {
  isActive: boolean;
  peersNotified: number;
  activatedAt: number | null;
  introSosCenterY: number | null;
  activate: () => void;
  cancel: () => void;
  incrementPeers: () => void;
  setIntroSosCenterY: (y: number) => void;
}

export const useSosStore = create<SosState>((set) => ({
  isActive: false,
  peersNotified: 0,
  activatedAt: null,
  introSosCenterY: null,
  setIntroSosCenterY: (y: number) => set({ introSosCenterY: y }),
  activate: async () => {
    set({ isActive: true, activatedAt: Date.now(), peersNotified: 0 });
    try {
      await fetch('http://localhost:8080/api/v1/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' })
      });
    } catch (e) {
      console.log('API placeholder: backend unreachable');
    }
  },
  cancel: async () => {
    set({ isActive: false, activatedAt: null, peersNotified: 0 });
    try {
      await fetch('http://localhost:8080/api/v1/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      });
    } catch (e) {
      console.log('API placeholder: backend unreachable');
    }
  },
  incrementPeers: () => set((state) => ({ peersNotified: Math.min(state.peersNotified + 1, 4) }))
}));
