import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTripStore, TripPayload } from '../stores/TripStore';

function isValidTripPayload(obj: any): obj is TripPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.tripId === 'string' &&
    obj.tripId.length > 0 &&
    typeof obj.meshKey === 'string' &&
    obj.meshKey.length > 0 &&
    typeof obj.startTimestamp === 'number' &&
    typeof obj.tripName === 'string' &&
    typeof obj.location === 'string'
  );
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const startTrip = useTripStore((s) => s.startTrip);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const processingRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!scanning || processingRef.current || loading) return;

      processingRef.current = true;
      setScanning(false);

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        setErrorMsg('Invalid QR code — not a TourSafe trip code.');
        processingRef.current = false;
        setScanning(true);
        return;
      }

      if (!isValidTripPayload(parsed)) {
        setErrorMsg('QR code is missing required trip fields. Please scan again.');
        processingRef.current = false;
        setScanning(true);
        return;
      }

      setLoading(true);
      setErrorMsg(null);
      try {
        await startTrip(parsed);
        // Navigate to the home screen — TripStore.isActive will show the trip UI
        router.replace('/');
      } catch (e: any) {
        setErrorMsg('Failed to start BLE mesh. Please try again.');
        setLoading(false);
        processingRef.current = false;
        setScanning(true);
      }
    },
    [scanning, loading, startTrip, router]
  );

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    setScanning(true);
    processingRef.current = false;
  }, []);

  // Permission not yet requested
  if (!permission) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#C8A96E" />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.permTitle}>Camera Permission Needed</Text>
        <Text style={styles.permSubtitle}>
          TourSafe needs camera access to scan trip QR codes.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={requestPermission}
        >
          <Text style={styles.actionButtonText}>Grant Access</Text>
        </Pressable>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.headerTextGroup}>
          <Text style={styles.title}>Scan Trip Code</Text>
          <Text style={styles.subtitle}>Point your camera at the guide's QR code</Text>
        </View>
      </View>

      {/* Camera Viewport */}
      <View style={styles.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
        />

        {/* Scanning overlay frame */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#C8A96E" />
            <Text style={styles.loadingText}>Activating BLE mesh…</Text>
          </View>
        )}
      </View>

      {/* Status / Error area */}
      <View style={[styles.statusArea, { paddingBottom: insets.bottom + 24 }]}>
        {errorMsg ? (
          <>
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              onPress={handleRetry}
            >
              <Text style={styles.actionButtonText}>Try Again</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.tipText}>
            Ensure the QR code is well-lit and fully in frame
          </Text>
        )}
      </View>
    </View>
  );
}

const GOLD = '#C8A96E';
const CORNER_SIZE = 22;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  backArrow: {
    color: '#888',
    fontSize: 22,
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontFamily: 'Cormorant_700Bold',
    fontSize: 28,
    letterSpacing: 2,
  },
  subtitle: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 4,
  },

  // Camera
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#111',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: GOLD,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    gap: 16,
  },
  loadingText: {
    color: GOLD,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // Status area
  statusArea: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
    gap: 16,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  tipText: {
    color: '#444',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: GOLD,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 1.5,
  },

  // Permission page
  permTitle: {
    color: '#fff',
    fontFamily: 'Cormorant_700Bold',
    fontSize: 26,
    letterSpacing: 1,
    textAlign: 'center',
  },
  permSubtitle: {
    color: '#666',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  backLink: {
    marginTop: 8,
  },
  backLinkText: {
    color: '#555',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
});
