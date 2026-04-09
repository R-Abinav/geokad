import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SOSButton from '../../components/SOSButton';
import { useSosStore } from '../../store/useSosStore';
import { connectToRelay, isConnected, getPeerCount, onPeerCount, onSOS } from '../../services/GeoKadService';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const buttonRef = useRef<View>(null);
  const setIntroSosCenterY = useSosStore(s => s.setIntroSosCenterY);
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

    // Poll connection status every 2s
    const statusInterval = setInterval(() => {
      setConnected(isConnected());
      setPeerCount(getPeerCount());
    }, 2000);

    // Listen for incoming SOS
    onSOS((msg) => {
      setIncomingSOS(msg);
      // Auto-navigate to incoming SOS screen
      router.push('/sos-incoming');
    });

    // Listen for peer count updates
    onPeerCount((count) => {
      setPeerCount(count);
      setConnected(true);
    });

    return () => clearInterval(statusInterval);
  }, []);

  const statusDotColor = connected ? '#34C759' : '#555';
  const statusText = connected
    ? `${peerCount} peer${peerCount !== 1 ? 's' : ''} · mesh active`
    : 'mesh inactive · not connected';

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

        {/* Relay connection input */}
        <View style={styles.relayRow}>
          <TextInput
            style={styles.relayInput}
            placeholder="Relay IP  e.g. 10.96.63.200:3002"
            placeholderTextColor="#555"
            value={relayInput}
            onChangeText={setRelayInput}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Pressable
            style={styles.connectButton}
            onPress={() => {
              if (relayInput.trim()) {
                connectToRelay(relayInput.trim());
                setRelayInput('');
              }
            }}
          >
            <Text style={styles.connectButtonText}>Connect</Text>
          </Pressable>
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
