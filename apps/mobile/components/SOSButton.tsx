import React, { useRef } from 'react';
import { Text, Pressable, StyleSheet, Animated, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { sendSOS, isBleAvailable, GeoKadEvents } from '../services/GeoKadService';

export default function SOSButton() {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.outerRing, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        delayLongPress={2000}
        onLongPress={async () => {
          // ── Guard: BLE must be available before sending SOS ────────────────
          if (!isBleAvailable()) {
            Alert.alert(
              'Bluetooth Required',
              'TourSafe needs Bluetooth to send an SOS to nearby peers.\n\nPlease enable Bluetooth and wait for the mesh to connect, then try again.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Trigger the BT modal in the home screen
                    GeoKadEvents.emit('BLE_DISABLED', { state: 'PoweredOff' });
                  },
                },
              ]
            );
            return; // ← Do NOT navigate to sos-active
          }

          // ── Get location (best-effort, SOS works without it) ───────────────
          let lat: number | null = null;
          let lon: number | null = null;
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              lat = loc.coords.latitude;
              lon = loc.coords.longitude;
            }
          } catch (e) {
            console.warn('[SOSButton] Location error – sending SOS without coords:', e);
          }

          // ── Send SOS over BLE ──────────────────────────────────────────────
          try {
            await sendSOS(lat, lon);
          } catch (e) {
            console.error('[SOSButton] sendSOS failed:', e);
          }

          router.push('/sos-active');
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.innerCircle}
      >
        <Text style={styles.text}>SOS</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Inter_800ExtraBold',
    color: '#fff',
    fontSize: 28,
  },
});
