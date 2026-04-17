import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SOSButton from '../../components/SOSButton';
import { useSosStore } from '../../store/useSosStore';
import { useTripStore } from '../../stores/TripStore';
import { initBLE, getMyNodeId, getKBucketContacts, GeoKadEvents } from '../../services/GeoKadService';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const buttonRef = useRef<View>(null);
  const setIntroSosCenterY = useSosStore((s) => s.setIntroSosCenterY);
  const [peerCount, setPeerCount] = useState(0);
  const [incomingSOS, setIncomingSOS] = useState<any>(null);

  // Trip store
  const isActive = useTripStore((s) => s.isActive);
  const currentTrip = useTripStore((s) => s.currentTrip);
  const endTrip = useTripStore((s) => s.endTrip);

  // Fade animation for role-selection buttons
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  useEffect(() => {
    // Measure SOS button position for intro animation
    setTimeout(() => {
      buttonRef.current?.measure((_x, _y, _w, h, _pageX, pageY) => {
        if (h && pageY) setIntroSosCenterY(pageY + h / 2);
      });
    }, 100);

    // Only init BLE for permissions — mesh is gated behind trip start
    initBLE();

    // Poll peer count
    const statusInterval = setInterval(() => {
      setPeerCount(getKBucketContacts().length);
    }, 2000);

    // Listen for incoming SOS
    GeoKadEvents.on('SOS_RECEIVED', (msg: any) => {
      setIncomingSOS({ emergencyId: msg.senderNodeId, message: `SOS from ${msg.senderNodeId}` });
      router.push('/sos-incoming');
    });

    GeoKadEvents.on('ACK_RECEIVED', () => {
      useSosStore.getState().incrementPeers();
    });

    return () => {
      clearInterval(statusInterval);
      GeoKadEvents.removeAllListeners();
    };
  }, []);

  const handleSOSPress = () => {
    if (!isActive) {
      Alert.alert(
        'No Active Trip',
        'Please scan the trip QR code first to activate the mesh before sending an SOS.',
        [{ text: 'OK' }]
      );
      return;
    }
    // SOSButton handles the actual SOS send internally via long-press
  };

  const handleEndTrip = () => {
    Alert.alert(
      'End Trip',
      'This will deactivate the BLE mesh for your group. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: () => endTrip(),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topArea}>
        <Text style={styles.wordmark}>TourSafe</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? '#34C759' : '#555' },
            ]}
          />
          <Text style={styles.statusText}>
            {isActive
              ? `BLE Mesh · ${peerCount} peer${peerCount !== 1 ? 's' : ''}`
              : 'mesh inactive · no trip'}
          </Text>
        </View>
      </View>

      {/* Center Area */}
      <View style={styles.centerArea}>
        {isActive ? (
          /* ── TRIP ACTIVE VIEW ── */
          <Animated.View style={[styles.tripActivePanel, { opacity: fadeAnim }]}>
            {/* Trip badge */}
            <View style={styles.activeBadge}>
              <View style={styles.activePulse} />
              <Text style={styles.activeBadgeText}>TRIP ACTIVE</Text>
            </View>

            <Text style={styles.tripName}>{currentTrip?.tripName}</Text>
            <Text style={styles.tripLocation}>{currentTrip?.location}</Text>

            {/* SOS Button */}
            <View style={styles.sosWrapper} ref={buttonRef} collapsable={false}>
              <SOSButton />
            </View>
            <Text style={styles.holdText}>hold 2 seconds to activate</Text>

            {/* Mesh info row */}
            <View style={styles.meshInfoRow}>
              <Text style={styles.meshInfoLabel}>Mesh Key</Text>
              <Text style={styles.meshInfoValue}>{currentTrip?.meshKey}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.endTripButton,
                pressed && styles.endTripButtonPressed,
              ]}
              onPress={handleEndTrip}
            >
              <Text style={styles.endTripButtonText}>End Trip</Text>
            </Pressable>
          </Animated.View>
        ) : (
          /* ── ROLE SELECTION VIEW ── */
          <Animated.View style={[styles.rolePanel, { opacity: fadeAnim }]}>
            <Text style={styles.roleHeading}>Join a Trip</Text>
            <Text style={styles.roleSubheading}>
              Select your role to activate the offline safety mesh
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.roleButton,
                styles.roleButtonPrimary,
                pressed && styles.roleButtonPrimaryPressed,
              ]}
              onPress={() => router.push('/scan')}
            >
              <Text style={styles.roleButtonIconLarge}>📷</Text>
              <View style={styles.roleButtonTextGroup}>
                <Text style={styles.roleButtonLabel}>I'm a Tourist</Text>
                <Text style={styles.roleButtonSub}>Scan the guide's QR code</Text>
              </View>
              <Text style={styles.roleButtonArrow}>→</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.roleButton,
                styles.roleButtonSecondary,
                pressed && styles.roleButtonSecondaryPressed,
              ]}
              onPress={() => router.push('/guide')}
            >
              <Text style={styles.roleButtonIconLarge}>🗺️</Text>
              <View style={styles.roleButtonTextGroup}>
                <Text style={styles.roleButtonLabel}>I'm a Trip Guide</Text>
                <Text style={styles.roleButtonSub}>Generate a QR code for your group</Text>
              </View>
              <Text style={styles.roleButtonArrow}>→</Text>
            </Pressable>

            {/* Disabled SOS hint */}
            <Pressable style={styles.sosDisabledCard} onPress={handleSOSPress}>
              <Text style={styles.sosDisabledIcon}>🚨</Text>
              <Text style={styles.sosDisabledText}>
                SOS available once trip is active
              </Text>
            </Pressable>
          </Animated.View>
        )}
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

      {/* Bottom nav */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={styles.row} onPress={() => router.push('/peers')}>
          <Text style={styles.rowLabel}>Nearby Peers</Text>
          <Text style={styles.rowArrow}>→</Text>
        </Pressable>
        <Pressable
          style={[styles.row, { borderBottomWidth: 0 }]}
          onPress={() => router.push('/trip')}
        >
          <Text style={styles.rowLabel}>Trip Info</Text>
          <Text style={styles.rowArrow}>→</Text>
        </Pressable>
        <View style={styles.nodeIdRow}>
          <Text style={styles.nodeIdText}>
            Node ID: {getMyNodeId() ?? '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const GOLD = '#C8A96E';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
  },

  // Top bar
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

  // Center
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
  },

  // ── Trip Active UI ──
  tripActivePanel: {
    alignItems: 'center',
    gap: 12,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  activePulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  activeBadgeText: {
    color: '#34C759',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 2,
  },
  tripName: {
    color: '#fff',
    fontFamily: 'Cormorant_700Bold',
    fontSize: 26,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
  tripLocation: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  sosWrapper: {
    marginTop: 20,
    marginBottom: 4,
  },
  holdText: {
    color: '#555',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  meshInfoRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  meshInfoLabel: {
    color: '#555',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  meshInfoValue: {
    color: GOLD,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 1,
  },
  endTripButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  endTripButtonPressed: {
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  endTripButtonText: {
    color: '#FF3B30',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: 1,
  },

  // ── Role Selection UI ──
  rolePanel: {
    gap: 14,
  },
  roleHeading: {
    color: '#fff',
    fontFamily: 'Cormorant_700Bold',
    fontSize: 30,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 2,
  },
  roleSubheading: {
    color: '#555',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  roleButtonPrimary: {
    backgroundColor: GOLD,
  },
  roleButtonPrimaryPressed: {
    opacity: 0.88,
  },
  roleButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleButtonSecondaryPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  roleButtonIconLarge: {
    fontSize: 26,
  },
  roleButtonTextGroup: {
    flex: 1,
  },
  roleButtonLabel: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  roleButtonSub: {
    color: 'rgba(0,0,0,0.55)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  roleButtonArrow: {
    color: 'rgba(0,0,0,0.4)',
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
  },

  sosDisabledCard: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sosDisabledIcon: {
    fontSize: 18,
    opacity: 0.35,
  },
  sosDisabledText: {
    color: '#444',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },

  // Incoming SOS
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

  // Bottom nav
  bottomArea: {
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
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
  nodeIdRow: {
    marginTop: 12,
  },
  nodeIdText: {
    color: '#333',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});
