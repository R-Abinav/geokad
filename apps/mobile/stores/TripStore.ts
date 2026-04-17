import { create } from 'zustand';
import {
  setMeshKey,
  startListening,
  startAdvertising,
  stopListening,
  stopAdvertising,
  generateNodeIdFromRandom,
} from '../services/GeoKadService';

export interface TripPayload {
  tripId: string;
  tripName: string;
  location: string;
  meshKey: string;
  startTimestamp: number;
}

interface TripState {
  isActive: boolean;
  currentTrip: TripPayload | null;
  myNodeId: string | null;
  nearbyNodes: string[];
  startTrip: (payload: TripPayload) => Promise<void>;
  endTrip: () => void;
  addNearbyNode: (nodeId: string) => void;
}

export const useTripStore = create<TripState>((set) => ({
  isActive: false,
  currentTrip: null,
  myNodeId: null,
  nearbyNodes: [],

  startTrip: async (payload: TripPayload) => {
    // 1. Store payload
    set({ currentTrip: payload });

    // 2. Set mesh key — namespaces all BLE traffic to this trip
    setMeshKey(payload.meshKey);

    // 3. Boot BLE scanner
    startListening();

    // 4. Boot BLE advertiser
    await startAdvertising();

    // 5. Generate a node ID for this session
    const nodeId = generateNodeIdFromRandom();

    // 6. Mark trip as active
    set({ isActive: true, myNodeId: nodeId });
  },

  endTrip: () => {
    stopListening();
    stopAdvertising();
    set({
      isActive: false,
      currentTrip: null,
      myNodeId: null,
      nearbyNodes: [],
    });
  },

  addNearbyNode: (nodeId: string) => {
    set((state) => ({
      nearbyNodes: state.nearbyNodes.includes(nodeId)
        ? state.nearbyNodes
        : [...state.nearbyNodes, nodeId],
    }));
  },
}));
