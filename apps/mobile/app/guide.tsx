import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
// react-native-qrcode-svg must be installed: npx expo install react-native-qrcode-svg react-native-svg
import QRCode from 'react-native-qrcode-svg';

interface TripQRPayload {
  tripId: string;
  tripName: string;
  location: string;
  meshKey: string;
  startTimestamp: number;
}

function generateTripId(): string {
  return `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function generateMeshKey(tripId: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    tripId
  );
  return digest.substring(0, 8); // first 8 chars of SHA256(tripId)
}

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tripName, setTripName] = useState('');
  const [location, setLocation] = useState('');
  const [qrPayload, setQrPayload] = useState<TripQRPayload | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!tripName.trim()) {
      Alert.alert('Missing Info', 'Please enter a trip name.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing Info', 'Please enter a location.');
      return;
    }

    setGenerating(true);
    try {
      const tripId = generateTripId();
      const meshKey = await generateMeshKey(tripId);
      const payload: TripQRPayload = {
        tripId,
        tripName: tripName.trim(),
        location: location.trim(),
        meshKey,
        startTimestamp: Math.floor(Date.now() / 1000),
      };
      setQrPayload(payload);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [tripName, location]);

  const handleNewTrip = useCallback(() => {
    setQrPayload(null);
    setTripName('');
    setLocation('');
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.title}>Trip Guide</Text>
          <Text style={styles.subtitle}>Generate a QR code for your trek</Text>
        </View>

        {!qrPayload ? (
          /* Input Form */
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>TRIP NAME</Text>
              <TextInput
                style={styles.input}
                value={tripName}
                onChangeText={setTripName}
                placeholder="e.g. Manali to Rohtang Pass"
                placeholderTextColor="#444"
                selectionColor="#C8A96E"
                returnKeyType="next"
                maxLength={60}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>LOCATION</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Himachal Pradesh, India"
                placeholderTextColor="#444"
                selectionColor="#C8A96E"
                returnKeyType="done"
                maxLength={80}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.generateButton,
                pressed && styles.generateButtonPressed,
                generating && styles.generateButtonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={generating}
            >
              <Text style={styles.generateButtonText}>
                {generating ? 'Generating…' : 'Generate QR Code'}
              </Text>
            </Pressable>

            {/* Info card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoText}>
                A unique QR code is generated for your trip. Tourists scan it to
                join the same offline BLE mesh, so SOS signals are isolated to
                your group even in crowded areas.
              </Text>
            </View>
          </View>
        ) : (
          /* QR Display */
          <View style={styles.qrSection}>
            <View style={styles.qrCard}>
              <QRCode
                value={JSON.stringify(qrPayload)}
                size={272}
                color="#FFFFFF"
                backgroundColor="#0A0A0A"
                quietZone={12}
              />
            </View>

            <View style={styles.tripMeta}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>TRIP</Text>
                <Text style={styles.metaValue}>{qrPayload.tripName}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>LOCATION</Text>
                <Text style={styles.metaValue}>{qrPayload.location}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>MESH KEY</Text>
                <Text style={[styles.metaValue, styles.codeFont]}>
                  {qrPayload.meshKey}
                </Text>
              </View>
            </View>

            <Text style={styles.scanHint}>
              Ask your tourists to open TourSafe → "I'm a Tourist" → scan this code
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.newTripButton,
                pressed && styles.newTripButtonPressed,
              ]}
              onPress={handleNewTrip}
            >
              <Text style={styles.newTripButtonText}>New Trip</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const GOLD = '#C8A96E';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  header: {
    marginBottom: 36,
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backArrow: {
    color: '#888',
    fontSize: 22,
  },
  title: {
    color: '#fff',
    fontFamily: 'Cormorant_700Bold',
    fontSize: 34,
    letterSpacing: 2,
  },
  subtitle: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 6,
  },

  // Form
  form: {
    gap: 24,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#555',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 2,
  },
  input: {
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  generateButton: {
    backgroundColor: GOLD,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonPressed: {
    opacity: 0.85,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  infoTitle: {
    color: GOLD,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 1,
  },
  infoText: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },

  // QR Display
  qrSection: {
    alignItems: 'center',
    gap: 28,
  },
  qrCard: {
    padding: 20,
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  tripMeta: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metaDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  metaLabel: {
    color: '#555',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  metaValue: {
    color: '#ccc',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  codeFont: {
    fontFamily: 'Inter_500Medium',
    color: GOLD,
    letterSpacing: 1,
  },
  scanHint: {
    color: '#555',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  newTripButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  newTripButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  newTripButtonText: {
    color: '#888',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    letterSpacing: 1,
  },
});
