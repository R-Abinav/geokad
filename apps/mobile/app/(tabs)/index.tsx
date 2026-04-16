import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SOSButton from '../../components/SOSButton';
import { useSosStore } from '../../store/useSosStore';
import { initBLE, startListening, getMyNodeId, getKBucketContacts, GeoKadEvents } from '../../services/GeoKadService';
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const buttonRef = useRef<View>(null);
  const setIntroSosCenterY = useSosStore(s => s.setIntroSosCenterY);
  const setPeersNotified = useSosStore(s => s.setPeersNotified);
  const [relayInput, setRelayInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [incomingSOS, setIncomingSOS] = useState<any>(null);

  useEffect(() => {
    // Measure SOS button position for intro animation
    setTimeout(() => {
      buttonRef.current?.measure((x, y, w, h, pageX, pageY) => {
        if (h && pageY) {
          setIntroSosCenterY(pageY + (h / 2));
        }
      });
    }, 100);

    // Init BLE and generic loop
    initBLE();
    
    // Poll transport status
    const statusInterval = setInterval(() => {
      setConnected(true);
      setPeerCount(getKBucketContacts().length);
    }, 2000);

    // Listen for incoming SOS
    GeoKadEvents.on('SOS_RECEIVED', (msg: any) => {
      setIncomingSOS({ emergencyId: msg.senderNodeId, message: `SOS from ${msg.senderNodeId}` });
      router.push('/sos-incoming');
    });

    // Listen for SOS acks to update notified count
    GeoKadEvents.on('ACK_RECEIVED', () => {
      useSosStore.getState().incrementPeers();
    });

    return () => {
      clearInterval(statusInterval);
      GeoKadEvents.removeAllListeners();
    };
  }, []);

  const mode = connected ? 'ble' : 'offline';
  const statusDotColor = connected ? '#34C759' : '#555';
  const statusText = connected ? `BLE Mesh · ${peerCount} peer${peerCount !== 1 ? 's' : ''}` : 'mesh inactive · not connected';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topArea}>
        <Text style={styles.wordmark}>TourSafe</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      {/* SOS Button */}
      <View style={styles.centerArea}>
        <View ref={buttonRef} collapsable={false}>
          <SOSButton />
        </View>
        <Text style={styles.holdText}>hold 2 seconds to activate</Text>
      </View>

      {/* Incoming SOS Banner */}
      {incomingSOS && (
        <Pressable
          style={styles.incomingBanner}
          onPress={() => router.push('/sos-incoming')}
        >
          <Text style={styles.incomingBannerText}>⚠️ SOS RECEIVED — Tap to view</Text>
        </Pressable>
      )}

      {/* Bottom nav rows */}
      <View style={styles.bottomArea}>
        <Pressable style={styles.row} onPress={() => router.push('/peers')}>
          <Text style={styles.rowLabel}>Nearby Peers</Text>
          <Text style={styles.rowArrow}>→</Text>
        </Pressable>
        <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => router.push('/trip')}>
          <Text style={styles.rowLabel}>Trip Info</Text>
          <Text style={styles.rowArrow}>→</Text>
        </Pressable>

        {/* Relay connection input hidden, routing handled over BLE */}
        <View style={styles.relayRow}>
          <Text style={{color: '#555', fontSize: 12}}>Mesh Node ID: {getMyNodeId()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
  },
  topArea: {
    alignItems: 'center',
    marginTop: 40,
  },
  wordmark: {
    color: '#fff',
    fontFamily: 'Cormorant_700Bold',
    fontSize: 28,
    letterSpacing: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: '#888',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdText: {
    color: '#888',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 16,
  },
  incomingBanner: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  incomingBannerText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  bottomArea: {
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowLabel: {
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  rowArrow: {
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  relayRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  relayInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  connectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
