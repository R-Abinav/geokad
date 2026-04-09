import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSosStore } from '../store/useSosStore';
import { getTransportMode } from '../services/GeoKadService';

const TRANSPORT_LABELS: Record<string, string> = {
  both:    'Alerting peers via BLE + WiFi...',
  ble:     'Alerting peers via BLE mesh...',
  wifi:    'Alerting peers via WiFi relay...',
  offline: 'Offline — SOS stored locally',
};

export default function SosActiveScreen() {
  const router = useRouter();
  const { peersNotified, activate, cancel } = useSosStore();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const transportLabel = TRANSPORT_LABELS[getTransportMode()];

  useEffect(() => {
    activate();

    // Pulse animation for the SOS circle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Notification count is updated via the store when a 'sos_ack' or 'peers' event is received.
    return () => {};
  }, []);

  const handleCancel = () => {
    cancel();
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.redOverlay} />

      <View style={styles.centerContent}>
        <Animated.View style={[styles.sosCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.sosText}>SOS</Text>
        </Animated.View>
        
        <Text style={styles.activeText}>SOS ACTIVE</Text>
        
        <Text style={styles.alertingText}>{transportLabel}</Text>
        
        <Text style={styles.peersText}>
          {peersNotified} peers notified
        </Text>
      </View>

      <Pressable onPress={handleCancel} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  redOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    fontFamily: 'Inter_800ExtraBold',
    color: '#fff',
    fontSize: 32,
    letterSpacing: 4,
  },
  activeText: {
    fontFamily: 'Inter_800ExtraBold',
    color: '#fff',
    fontSize: 28,
    letterSpacing: 4,
    marginTop: 48,
    textTransform: 'uppercase',
  },
  alertingText: {
    fontFamily: 'Inter_400Regular',
    color: '#aaaaaa',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  peersText: {
    fontFamily: 'Inter_500Medium',
    color: '#fff',
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  cancelText: {
    fontFamily: 'Inter_400Regular',
    color: '#fff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
