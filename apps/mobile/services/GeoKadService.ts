// GeoKad Service — Dual transport: BLE (primary, P2P) + WebSocket relay (secondary, WiFi)
// BLE works completely offline — no relay/laptop needed
// WebSocket is opportunistic — used if a relay node is configured
//
// BLE flow:
//   Advertise: SOS encoded in manufacturer data → other phones scan and decode
//   Scan:      Always running, detects nearby TourSafe SOS advertisements
//
// The try/require pattern for BLE means Expo Go degrades gracefully.
// In an EAS APK build, both native modules are present and BLE works fully.

import { Platform, PermissionsAndroid } from 'react-native';

// ── Constants ─────────────────────────────────────────────
const TOURSAFE_UUID = '74278BDA-B644-4520-8F0C-720EAF059935';
const COMPANY_ID_HI = 0xFF;
const COMPANY_ID_LO = 0x02; // Little-endian: [0x02, 0xFF] in the packet
const SOS_FLAG = 0xA5;

// ── Types ─────────────────────────────────────────────────
type SOSHandler = (event: SOSEvent) => void;
type PeerCountHandler = (count: number) => void;
type SosAckHandler = (peersNotified: number) => void;

export type TransportMode = 'ble' | 'wifi' | 'both' | 'offline';

interface SOSEvent {
  emergencyId: string;
  message: string;
  timestamp: number;
  type?: string;
  originId?: string;
  ttl?: number;
}

// ── Module-level state ────────────────────────────────────
let _bleManager: any = null;
let _BLEAdvertiser: any = null;
let _bleAvailable = false;
let _bleScanning = false;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _relayAddress: string | null = null;
let _wsConnected = false;
let _peerCount = 0;
let _transportMode: TransportMode = 'offline';
let _sosAdvertiseTimer: ReturnType<typeof setTimeout> | null = null;

const seen = new Set<string>();
const sosHandlers: SOSHandler[] = [];
const peerCountHandlers: PeerCountHandler[] = [];
const sosAckHandlers: SosAckHandler[] = [];

// ── Helper: Encoding / Decoding SOS for BLE ──────────────

function encodeSOSBytes(message: string): number[] {
  const ts = Math.floor(Date.now() / 1000);
  const msgBytes = message
    .substring(0, 18)
    .split('')
    .map(c => c.charCodeAt(0) & 0xFF);
  return [
    SOS_FLAG, 0x01,                          // marker + version
    (ts >>> 24) & 0xFF, (ts >>> 16) & 0xFF,  // timestamp (4 bytes big-endian)
    (ts >>> 8) & 0xFF,  ts & 0xFF,
    ...msgBytes,
  ];
}

function decodeManufacturerData(b64: string): SOSEvent | null {
  try {
    const binary = atob(b64); // atob is a global in React Native
    const bytes: number[] = Array.from({ length: binary.length }, (_, i) =>
      binary.charCodeAt(i)
    );
    // react-native-ble-plx prepends 2-byte company ID (little-endian): [LO, HI]
    let offset = 0;
    if (bytes.length >= 2 && bytes[0] === COMPANY_ID_LO && bytes[1] === COMPANY_ID_HI) {
      offset = 2;
    }
    if (bytes[offset] !== SOS_FLAG) return null;

    const ts = ((bytes[offset + 2] << 24) |
                (bytes[offset + 3] << 16) |
                (bytes[offset + 4] << 8)  |
                 bytes[offset + 5]) >>> 0;

    const message = bytes
      .slice(offset + 6)
      .filter(b => b >= 0x20 && b < 0x7F) // printable ASCII
      .map(b => String.fromCharCode(b))
      .join('')
      .trim() || 'Emergency SOS';

    return {
      emergencyId: `ble-${ts}`,
      message,
      timestamp: ts * 1000,
    };
  } catch {
    return null;
  }
}

// ── BLE Permissions ───────────────────────────────────────

async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    if ((Platform.Version as number) >= 31) {
      // Android 12+ — use new granular permissions, no location needed
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return Object.values(result).every(
        r => r === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      // Android < 12 — needs location for BLE scanning
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return res === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch {
    return false;
  }
}

// ── BLE Init + Scanning ───────────────────────────────────

export async function initBLE(): Promise<void> {
  try {
    // Use require() so Expo Go doesn't crash — native module missing = caught below
    const { BleManager } = require('react-native-ble-plx');
    _BLEAdvertiser = require('react-native-ble-advertiser').default;

    _bleManager = new BleManager();
    _BLEAdvertiser.setCompanyId((COMPANY_ID_HI << 8) | COMPANY_ID_LO); // 0xFF02

    const granted = await requestBLEPermissions();
    if (!granted) {
      console.log('⚠️ BLE permissions denied');
      return;
    }

    _bleAvailable = true;
    _updateTransportMode();
    _startBLEScan();
    console.log('✅ BLE initialized, scanning for peers');
  } catch (e) {
    console.log('⚠️ BLE unavailable (Expo Go or unsupported device)');
    _bleAvailable = false;
  }
}

function _startBLEScan(): void {
  if (!_bleManager || _bleScanning) return;
  try {
    _bleScanning = true;
    _bleManager.startDeviceScan(
      [TOURSAFE_UUID],
      { allowDuplicates: false },
      (error: any, device: any) => {
        if (error) {
          console.log('BLE scan error:', error.message);
          _bleScanning = false;
          // Retry after 5s
          setTimeout(_startBLEScan, 5000);
          return;
        }
        if (!device?.manufacturerData) return;

        const decoded = decodeManufacturerData(device.manufacturerData);
        if (!decoded) return;
        if (seen.has(decoded.emergencyId)) return;

        seen.add(decoded.emergencyId);
        console.log(`📡 BLE SOS from ${device.id}: ${decoded.message}`);
        sosHandlers.forEach(h => h(decoded));
      }
    );
  } catch (e) {
    console.log('BLE startDeviceScan error:', e);
    _bleScanning = false;
  }
}

async function _broadcastSOSViaBLE(message: string): Promise<void> {
  if (!_bleAvailable || !_BLEAdvertiser) return;

  // Stop any prior advertisement
  if (_sosAdvertiseTimer) {
    clearTimeout(_sosAdvertiseTimer);
    _sosAdvertiseTimer = null;
    try { await _BLEAdvertiser.stopBroadcast(); } catch {}
  }

  try {
    const payload = encodeSOSBytes(message);
    await _BLEAdvertiser.broadcast(TOURSAFE_UUID, payload, {
      advertiseMode: 2,           // ADVERTISE_MODE_LOW_LATENCY
      txPowerLevel: 3,            // ADVERTISE_TX_POWER_HIGH
      connectable: false,
      includeDeviceName: false,
      includeTxPowerLevel: false,
    });
    console.log('📡 BLE SOS advertising started');

    // Auto-stop after 60s to save battery
    _sosAdvertiseTimer = setTimeout(async () => {
      try { await _BLEAdvertiser.stopBroadcast(); } catch {}
      console.log('📡 BLE advertising stopped (timeout)');
    }, 60000);
  } catch (e: any) {
    console.log('BLE broadcast error:', e?.message ?? e);
  }
}

// ── WebSocket relay (optional, WiFi) ─────────────────────

export function connectToRelay(relayAddress: string): void {
  _relayAddress = relayAddress;
  _doWSConnect(relayAddress);
}

function _doWSConnect(relayAddress: string): void {
  try {
    if (ws) { ws.close(); ws = null; }
    ws = new WebSocket(`ws://${relayAddress}`);

    ws.onopen = () => {
      _wsConnected = true;
      _updateTransportMode();
      console.log('✅ Relay connected');
      const ping = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        } else {
          clearInterval(ping);
        }
      }, 15000);
    };

    ws.onmessage = (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'sos') {
          const d = msg.data as SOSEvent;
          if (!seen.has(d.emergencyId)) {
            seen.add(d.emergencyId);
            sosHandlers.forEach(h => h(d));
          }
        } else if (msg.type === 'sos_ack') {
          sosAckHandlers.forEach(h => h(msg.peersNotified));
        } else if (msg.type === 'peers' || msg.type === 'welcome') {
          const count = msg.count ?? msg.peerCount ?? 0;
          _peerCount = count;
          peerCountHandlers.forEach(h => h(count));
        }
      } catch {}
    };

    ws.onclose = () => {
      _wsConnected = false;
      _updateTransportMode();
      if (_relayAddress) {
        reconnectTimer = setTimeout(() => _doWSConnect(_relayAddress!), 3000);
      }
    };

    ws.onerror = () => {
      _wsConnected = false;
      _updateTransportMode();
    };
  } catch {}
}

function _updateTransportMode(): void {
  if (_wsConnected && _bleAvailable) _transportMode = 'both';
  else if (_bleAvailable)            _transportMode = 'ble';
  else if (_wsConnected)             _transportMode = 'wifi';
  else                               _transportMode = 'offline';
}

// ── Public API ────────────────────────────────────────────

export async function sendSOS(message: string): Promise<void> {
  const emergencyId = `sos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const sosMsg: SOSEvent = {
    type: 'SOS', emergencyId, originId: 'mobile-node',
    message, ttl: 5, timestamp: Date.now(),
  };
  seen.add(emergencyId);

  // 1. WebSocket relay (WiFi, if connected)
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(sosMsg));
    console.log('📡 SOS → relay (WiFi)');
  }

  // 2. BLE advertisement (fully offline, P2P)
  await _broadcastSOSViaBLE(message);
}

export function onSOS(handler: SOSHandler): void     { sosHandlers.push(handler); }
export function onPeerCount(h: PeerCountHandler): void { peerCountHandlers.push(h); }
export function onSosAck(h: SosAckHandler): void       { sosAckHandlers.push(h); }

export function isConnected():      boolean       { return _wsConnected; }
export function isBLEAvailable():   boolean       { return _bleAvailable; }
export function getPeerCount():     number        { return _peerCount; }
export function getTransportMode(): TransportMode { return _transportMode; }

export function disconnect(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  _relayAddress = null;
  if (ws) { ws.close(); ws = null; }
  _wsConnected = false;
  _bleManager?.stopDeviceScan();
  _bleScanning = false;
  _updateTransportMode();
}

export default {
  initBLE, connectToRelay, sendSOS, disconnect,
  onSOS, onPeerCount, onSosAck,
  isConnected, isBLEAvailable, getPeerCount, getTransportMode,
};
