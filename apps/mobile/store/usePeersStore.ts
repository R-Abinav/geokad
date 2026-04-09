import { create } from 'zustand';

export interface Peer {
  id: string;
  name: string;
  distanceMeters: number;
  signalStrength: 1 | 2 | 3;
  lastSeen: number;
}

interface PeersState {
  peers: Peer[];
  apiStatus: string;
  refreshPeers: () => void;
}

export const usePeersStore = create<PeersState>((set) => ({
  peers: [],
  apiStatus: '',
  refreshPeers: async () => {
    try {
      const res = await fetch('http://localhost:8080/api/v1/peers', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        set({ apiStatus: 'API Not responding', peers: [] });
        return;
      }
      const data = await res.json();
      set({ peers: data.peers || [], apiStatus: '' });
    } catch (e) {
      set({ apiStatus: 'API Not responding', peers: [] });
    }
  }
}));
