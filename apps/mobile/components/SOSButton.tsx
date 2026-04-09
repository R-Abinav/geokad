import React, { useRef } from 'react';
import { Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { sendSOS } from '../services/GeoKadService';

export default function SOSButton() {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.outerRing, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        delayLongPress={2000}
        onLongPress={async () => {
          await sendSOS('Emergency! SOS triggered.');
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
  }
});
