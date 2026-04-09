import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';

export default function SosIncomingScreen() {
  const router = useRouter();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse the warning ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.redOverlay} />

      <View style={styles.centerContent}>
        {/* Pulsing warning circle */}
        <Animated.View style={[styles.outerRing, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.innerCircle}>
            <Text style={styles.warningIcon}>!</Text>
          </View>
        </Animated.View>

        <Text style={styles.title}>SOS RECEIVED</Text>
        <Text style={styles.subtitle}>A nearby peer needs help.</Text>
        <Text style={styles.body}>
          Someone in your mesh network has triggered an emergency SOS. Please check on them immediately.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.acknowledgeButton} onPress={() => router.back()}>
          <Text style={styles.acknowledgeText}>ACKNOWLEDGE</Text>
        </Pressable>

        <Pressable style={styles.dismissButton} onPress={() => router.back()}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  redOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 59, 48, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  innerCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIcon: {
    fontFamily: 'Inter_800ExtraBold',
    color: '#fff',
    fontSize: 56,
    lineHeight: 64,
  },
  title: {
    fontFamily: 'Inter_800ExtraBold',
    color: '#fff',
    fontSize: 28,
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    color: '#FF3B30',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Inter_400Regular',
    color: '#888',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  acknowledgeButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 16,
    alignItems: 'center',
  },
  acknowledgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#FF3B30',
    fontSize: 14,
    letterSpacing: 3,
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissText: {
    fontFamily: 'Inter_400Regular',
    color: '#555',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
