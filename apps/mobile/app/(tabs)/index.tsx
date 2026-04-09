import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SOSButton from '../../components/SOSButton';
import { useSosStore } from '../../store/useSosStore';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const buttonRef = useRef<View>(null);
  const setIntroSosCenterY = useSosStore(s => s.setIntroSosCenterY);

  useEffect(() => {
    // Allows UI layout thread flex offsets to resolve then locks absolute offset
    setTimeout(() => {
      buttonRef.current?.measure((x, y, w, h, pageX, pageY) => {
        if (h && pageY) {
          setIntroSosCenterY(pageY + (h / 2));
        }
      });
    }, 100);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topArea}>
        <Text style={styles.wordmark}>TourSafe</Text>
        <Text style={styles.statusText}>mesh inactive · 0 peers</Text>
      </View>

      <View style={styles.centerArea}>
        <View ref={buttonRef} collapsable={false}>
          <SOSButton />
        </View>
        <Text style={styles.holdText}>hold 2 seconds to activate</Text>
      </View>

      <View style={styles.bottomArea}>
        <Pressable style={styles.row} onPress={() => router.push('/peers')}>
          <Text style={styles.rowLabel}>Nearby Peers</Text>
          <Text style={styles.rowArrow}>→</Text>
        </Pressable>
        <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => router.push('/trip')}>
          <Text style={styles.rowLabel}>Trip Info</Text>
          <Text style={styles.rowArrow}>→</Text>
        </Pressable>
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
  statusText: {
    color: '#888',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 8,
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
  bottomArea: {
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
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
  }
});
