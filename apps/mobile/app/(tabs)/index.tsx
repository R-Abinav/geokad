import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, Linking, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SOSButton from '../../components/SOSButton';
import { useSosStore } from '../../store/useSosStore';
import {
  initBLE, retryBLE, getMyNodeId, getKBucketContacts, GeoKadEvents, isBleAvailable,
} from '../../services/GeoKadService';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const buttonRef            = useRef<View>(null);
  const setIntroSosCenterY   = useSosStore(s => s.setIntroSosCenterY);
  const [bleStatus, setBleStatus] = useState<
    'initializing' | 'requesting' | 'active' | 'denied' | 'disabled' | 'failed'
  >('initializing');
  const [peerCount,    setPeerCount]    = useState(0);
  const [incomingSOS,  setIncomingSOS]  = useState<any>(null);
  const [showBtModal,  setShowBtModal]  = useState(false);
  const [nodeId,       setNodeId]       = useState<string | null>(null);

  useEffect(() => {
    // Measure SOS button for intro animation
    setTimeout(() => {
      buttonRef.current?.measure((_x, _y, _w, h, _px, pageY) => {
        if (h && pageY) setIntroSosCenterY(pageY + h / 2);
      });
    }, 100);

    // ── Register listeners BEFORE calling initBLE() ────────────────────────

    const onBleReady = () => {
      console.log('[UI] BLE_READY');
      setBleStatus('active');
      setShowBtModal(false);
      setNodeId(getMyNodeId());
    };

    const onBlePermissionDenied = () => {
      console.warn('[UI] BLE_PERMISSION_DENIED');
      setBleStatus('denied');
    };

    const onBleDisabled = () => {
      console.warn('[UI] BLE_DISABLED — showing BT modal');
      setBleStatus('disabled');
      setShowBtModal(true);
    };

    // Permissions granted but BT is off — show modal, don't show "denied"
    const onBlePermOkBtOff = () => {
      console.warn('[UI] BLE_PERMISSIONS_OK_BT_OFF — BT radio is off');
      setBleStatus('disabled');
      setShowBtModal(true);
    };

    const onBleInitFailed = ({ error }: any) => {
      console.error('[UI] BLE_INIT_FAILED:', error);
      setBleStatus('failed');
      // auto-retry once after 2s — handles race on first boot
      setTimeout(() => retryBLE(), 2000);
    };

    const onSosReceived = (msg: any) => {
      console.log('[UI] SOS_RECEIVED from', msg.senderNodeId);
      Vibration.vibrate([0, 400, 150, 400, 150, 700]);
      setIncomingSOS({ emergencyId: msg.senderNodeId });
      router.push('/sos-incoming');
    };

    const onAckReceived = (msg: any) => {
      console.log('[UI] ACK_RECEIVED from', msg.from);
      useSosStore.getState().incrementPeers();
    };

    GeoKadEvents.on('BLE_READY',              onBleReady);
    GeoKadEvents.on('BLE_PERMISSION_DENIED',  onBlePermissionDenied);
    GeoKadEvents.on('BLE_DISABLED',           onBleDisabled);
    GeoKadEvents.on('BLE_PERMISSIONS_OK_BT_OFF', onBlePermOkBtOff);
    GeoKadEvents.on('BLE_INIT_FAILED',        onBleInitFailed);
    GeoKadEvents.on('SOS_RECEIVED',           onSosReceived);
    GeoKadEvents.on('ACK_RECEIVED',           onAckReceived);

    // ── initBLE AFTER listeners are set up ────────────────────────────────
    setBleStatus('requesting'); // show user something is happening
    initBLE();

    const peerInterval = setInterval(() => {
      setPeerCount(getKBucketContacts().length);
      if (isBleAvailable()) {
        setBleStatus('active');
        setNodeId(getMyNodeId());
      }
    }, 3000);

    return () => {
      clearInterval(peerInterval);
      GeoKadEvents.off('BLE_READY',              onBleReady);
      GeoKadEvents.off('BLE_PERMISSION_DENIED',  onBlePermissionDenied);
      GeoKadEvents.off('BLE_DISABLED',           onBleDisabled);
      GeoKadEvents.off('BLE_PERMISSIONS_OK_BT_OFF', onBlePermOkBtOff);
      GeoKadEvents.off('BLE_INIT_FAILED',        onBleInitFailed);
      GeoKadEvents.off('SOS_RECEIVED',           onSosReceived);
      GeoKadEvents.off('ACK_RECEIVED',           onAckReceived);
    };
  }, []);

  const openBluetoothSettings = useCallback(() => Linking.openSettings(), []);

  const statusDotColor =
    bleStatus === 'active'      ? '#34C759' :
    bleStatus === 'denied'      ? '#FF3B30' :
    bleStatus === 'failed'      ? '#FF3B30' :
    bleStatus === 'disabled'    ? '#FF9500' :
    bleStatus === 'requesting'  ? '#FFD60A' :
    /* initializing */            '#888888';

  const statusText =
    bleStatus === 'active'      ? `BLE Mesh · ${peerCount} peer${peerCount !== 1 ? 's' : ''}` :
    bleStatus === 'denied'      ? 'Bluetooth permission denied' :
    bleStatus === 'failed'      ? 'BLE init failed — restart app' :
    bleStatus === 'disabled'    ? 'Bluetooth is off · tap to fix' :
    bleStatus === 'requesting'  ? 'Requesting permissions…' :
    /* initializing */            'mesh inactive · not connected';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Bluetooth Off Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showBtModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBtModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>📡</Text>
            <Text style={styles.modalTitle}>Enable Bluetooth</Text>
            <Text style={styles.modalBody}>
              TourSafe uses BLE Mesh to send SOS signals without internet.{'\n\n'}
              Please switch on Bluetooth so you can connect to nearby peers.
            </Text>
            <Pressable style={styles.modalButton} onPress={openBluetoothSettings}>
              <Text style={styles.modalButtonText}>Open Bluetooth Settings</Text>
            </Pressable>
            <Pressable style={styles.modalDismiss} onPress={() => setShowBtModal(false)}>
              <Text style={styles.modalDismissText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <View style={styles.topArea}>
        <Text style={styles.wordmark}>TourSafe</Text>
        <Pressable
          style={styles.statusRow}
          onPress={() => {
            if (bleStatus === 'disabled') setShowBtModal(true);
            if (bleStatus === 'failed') retryBLE();
          }}
        >
          <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
          <Text style={styles.statusText}>{statusText}</Text>
        </Pressable>
      </View>

      {/* ── SOS Button ──────────────────────────────────────────────────── */}
      <View style={styles.centerArea}>
        <View ref={buttonRef} collapsable={false}>
          <SOSButton />
        </View>
        <Text style={styles.holdText}>hold 2 seconds to activate</Text>
      </View>

      {/* ── Incoming SOS Banner ─────────────────────────────────────────── */}
      {incomingSOS && (
        <Pressable
          style={styles.incomingBanner}
          onPress={() => router.push('/sos-incoming')}
        >
          <Text style={styles.incomingBannerText}>⚠️ SOS RECEIVED — Tap to view</Text>
        </Pressable>
      )}

      {/* ── Bottom rows ──────────────────────────────────────────────────── */}
      <View style={styles.bottomArea}>
        <Pressable style={styles.row} onPress={() => router.push('/peers')}>
          <Text style={styles.rowLabel}>Nearby Peers</Text>
          <Text style={styles.rowArrow}>→</Text>
        </Pressable>
        <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => router.push('/trip')}>
          <Text style={styles.rowLabel}>Trip Info</Text>
          <Text style={styles.rowArrow}>→</Text>
        </Pressable>
        <View style={styles.relayRow}>
          <Text style={{ color: '#555', fontSize: 12 }}>
            Mesh Node ID: {nodeId ?? '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24 },
  /* Modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#111', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 32, alignItems: 'center', width: '100%',
  },
  modalIcon:        { fontSize: 48, marginBottom: 16 },
  modalTitle:       { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 20, marginBottom: 12, textAlign: 'center' },
  modalBody:        { color: '#888', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  modalButton:      { backgroundColor: '#FF3B30', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 8, marginBottom: 16, width: '100%', alignItems: 'center' },
  modalButtonText:  { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 1 },
  modalDismiss:     { paddingVertical: 8 },
  modalDismissText: { color: '#555', fontFamily: 'Inter_400Regular', fontSize: 13, textDecorationLine: 'underline' },
  /* Main */
  topArea:          { alignItems: 'center', marginTop: 40 },
  wordmark:         { color: '#fff', fontFamily: 'Cormorant_700Bold', fontSize: 28, letterSpacing: 3 },
  statusRow:        { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  statusDot:        { width: 6, height: 6, borderRadius: 3 },
  statusText:       { color: '#888', fontFamily: 'Inter_400Regular', fontSize: 12 },
  centerArea:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  holdText:         { color: '#888', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 16 },
  incomingBanner:   { backgroundColor: '#FF3B30', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12, alignItems: 'center' },
  incomingBannerText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1 },
  bottomArea:       { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 24 },
  row:              { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 20, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  rowLabel:         { color: '#fff', fontFamily: 'Inter_400Regular', fontSize: 14 },
  rowArrow:         { color: '#fff', fontFamily: 'Inter_400Regular', fontSize: 14 },
  relayRow:         { flexDirection: 'row', marginTop: 16, gap: 10 },
});
