import { Platform, PermissionsAndroid, Vibration } from 'react-native';
import EventEmitter from 'eventemitter3';
import { generateNodeId, generateRandomId } from './GeoHash';
import { KBucket, Contact } from './KBucket';
import { SeenCache } from './SeenCache';

const TOURSAFE_UUID     = '74278BDA-B644-4520-8F0C-720EAF059935';
const COMPANY_ID        = 0xFFFF;
const TS_MARKER_0       = 0xAB;
const TS_MARKER_1       = 0xCD;
const MSG_SOS           = 0x01;
const MSG_ACK           = 0x02;
const BROADCAST_NODE_ID = 'ffffffffffffffff';
const DEFAULT_TTL       = 5;

let _bleManager:        any     = null;
let _BLEAdvertiser:     any     = null;
let _bleAvailable:      boolean = false;
let _bleScanning:       boolean = false;
let _myNodeId:          string | null = null;
let _stateSubscription: any     = null;
let _initDone:          boolean = false;
let _advertiseStopTimer: ReturnType<typeof setTimeout> | null = null;
const _recentAckTargets = new Map<string, number>();

export const GeoKadEvents = new EventEmitter();
const bucket    = new KBucket(3);
const seenCache = new SeenCache();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
  return out;
}
function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}
function encodePayload(type: number, ttl: number, senderIdHex: string, targetIdHex: string, seqNo: number): number[] {
  const b = new Array<number>(22).fill(0);
  b[0] = TS_MARKER_0; b[1] = TS_MARKER_1; b[2] = type; b[3] = ttl;
  const s = hexToBytes(senderIdHex.padEnd(16,'0').slice(0,16));
  const t = hexToBytes(targetIdHex.padEnd(16,'0').slice(0,16));
  for (let i=0;i<8;i++) { b[4+i]=s[i]; b[12+i]=t[i]; }
  b[20] = seqNo & 0xFF;
  let chk = 0; for (let i=0;i<21;i++) chk ^= b[i]; b[21]=chk;
  return b;
}
function decodeManufacturerData(b64: string): any | null {
  try {
    const binary = atob(b64);
    const raw = Array.from({length: binary.length}, (_,i) => binary.charCodeAt(i));
    let payload = raw;
    if (raw.length >= 2) {
      const lo = COMPANY_ID & 0xFF, hi = (COMPANY_ID >> 8) & 0xFF;
      if (raw[0]===lo && raw[1]===hi) payload = raw.slice(2);
    }
    if (payload.length < 22) return null;
    if (payload[0]!==TS_MARKER_0 || payload[1]!==TS_MARKER_1) return null;
    let chk = 0; for (let i=0;i<21;i++) chk ^= payload[i];
    if (chk !== payload[21]) return null;
    return { type:payload[2], ttl:payload[3], senderId:bytesToHex(payload.slice(4,12)), targetId:bytesToHex(payload.slice(12,20)), seqNo:payload[20] };
  } catch { return null; }
}

// ─── Permissions ──────────────────────────────────────────────────────────────

async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  console.log(`[TourSafe] Requesting permissions (API ${Platform.Version})...`);
  try {
    let results: Record<string, string>;
    if ((Platform.Version as number) >= 31) {
      results = await PermissionsAndroid.requestMultiple([
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_ADVERTISE',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION',
      ]);
      console.log('[TourSafe] BLUETOOTH_SCAN      :', results['android.permission.BLUETOOTH_SCAN']);
      console.log('[TourSafe] BLUETOOTH_ADVERTISE :', results['android.permission.BLUETOOTH_ADVERTISE']);
      console.log('[TourSafe] BLUETOOTH_CONNECT   :', results['android.permission.BLUETOOTH_CONNECT']);
      console.log('[TourSafe] ACCESS_FINE_LOCATION:', results['android.permission.ACCESS_FINE_LOCATION']);
    } else {
      results = await PermissionsAndroid.requestMultiple([
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ]);
      console.log('[TourSafe] ACCESS_FINE_LOCATION  :', results['android.permission.ACCESS_FINE_LOCATION']);
      console.log('[TourSafe] ACCESS_COARSE_LOCATION:', results['android.permission.ACCESS_COARSE_LOCATION']);
    }
    const allGranted = Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
    if (allGranted) {
      console.log('[TourSafe] ✅ All permissions GRANTED');
    } else {
      const denied = Object.entries(results).filter(([,v])=>v!==PermissionsAndroid.RESULTS.GRANTED).map(([k])=>k.replace('android.permission.',''));
      console.warn('[TourSafe] ❌ DENIED:', denied.join(', '));
    }
    return allGranted;
  } catch (e) {
    console.error('[TourSafe] Permission error:', e);
    return false;
  }
}

// ─── Radio state subscription ─────────────────────────────────────────────────
// NOTE: We rely ENTIRELY on onStateChange — never on bleManager.state().
// bleManager.state() often returns 'Unknown' right after creation which
// would incorrectly trigger the "BT is off" path.

function subscribeToRadioState(): void {
  if (!_bleManager || _stateSubscription) return;
  _stateSubscription = _bleManager.onStateChange((state: string) => {
    console.log('[TourSafe] BLE radio state →', state);

    if (state === 'PoweredOn') {
      if (!_bleAvailable) {
        if (!_myNodeId) { _myNodeId = generateRandomId(); console.log('[TourSafe] Node ID:', _myNodeId); }
        _bleAvailable = true;
        GeoKadEvents.emit('BLE_READY');
        console.log('[TourSafe] ✅ BLE_READY emitted');
      }
      if (!_bleScanning) startListening();

    } else if (state === 'PoweredOff' || state === 'Unauthorized' || state === 'Unsupported') {
      _bleAvailable = false;
      _bleScanning  = false;
      console.warn('[TourSafe] Radio is', state);
      GeoKadEvents.emit('BLE_DISABLED', { state });

    }
    // 'Unknown' / 'Resetting' → ignore, wait for next state change
  }, true /* emitCurrentState – fires immediately with current state */);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initBLE(): Promise<void> {
  if (_initDone) { console.log('[TourSafe] initBLE already ran'); return; }
  _initDone = true;
  console.log('[TourSafe] initBLE() starting...');

  try {
    // 1. Permissions first
    const granted = await requestBLEPermissions();
    if (!granted) {
      console.warn('[TourSafe] Permissions denied');
      GeoKadEvents.emit('BLE_PERMISSION_DENIED');
      _initDone = false;
      return;
    }

    // 2. Create BleManager + subscribe to state immediately
    const { BleManager } = require('react-native-ble-plx');
    _bleManager = new BleManager();
    subscribeToRadioState(); // ← Must be right after BleManager, before anything else can throw

    // 3. Load advertiser — non-fatal (can still RECEIVE SOS without it)
    try {
      _BLEAdvertiser = require('react-native-ble-advertiser').default;
      _BLEAdvertiser.setCompanyId(COMPANY_ID);
      console.log('[TourSafe] BLE Advertiser ready');
    } catch (e) {
      console.warn('[TourSafe] Advertiser unavailable (receive-only mode):', e);
      _BLEAdvertiser = null;
    }

    // onStateChange with emitCurrentState=true handles everything from here.
    // No need to call bleManager.state() — it returns 'Unknown' right after
    // creation on many Samsung devices, which would cause false "BT is off".
    console.log('[TourSafe] Waiting for radio state from onStateChange...');

  } catch (e: any) {
    console.error('[TourSafe] initBLE FAILED:', e?.message ?? e);
    _initDone = false; // allow retry
    GeoKadEvents.emit('BLE_INIT_FAILED', { error: e?.message ?? String(e) });
  }
}

// Allow UI to retry after failure
export function retryBLE(): void {
  _initDone = false;
  initBLE();
}

// ─── Scanning ─────────────────────────────────────────────────────────────────

export function startListening(): void {
  if (!_bleManager || _bleScanning) return;
  _bleScanning = true;
  console.log('[TourSafe] BLE scan starting (LOW_LATENCY mode)...');

  // scanMode 2 = SCAN_MODE_LOW_LATENCY: fastest discovery, higher battery use
  // This is acceptable for an emergency SOS app
  _bleManager.startDeviceScan(null, { allowDuplicates: true, scanMode: 2 }, (error: any, device: any) => {
    if (error) {
      _bleScanning = false;
      if (error.errorCode === 102) {
        // Radio turned off
        _bleAvailable = false;
        GeoKadEvents.emit('BLE_DISABLED', { state: 'PoweredOff' });
        return; // onStateChange will restart scan when radio comes back
      }
      console.warn(`[TourSafe] Scan error (${error.errorCode}): ${error.message} – retry in 5s`);
      setTimeout(startListening, 5000);
      return;
    }
    if (!device?.manufacturerData) return;
    const decoded = decodeManufacturerData(device.manufacturerData);
    if (!decoded) return;
    handleIncomingPacket(decoded, device.id);
  });
}

function handleIncomingPacket(decoded: any, deviceId: string): void {
  const cacheKey = `${decoded.senderId}-${decoded.seqNo}`;
  if (seenCache.has(cacheKey)) return;
  seenCache.add(cacheKey);
  bucket.addContact(decoded.senderId, { deviceId });
  if (decoded.ttl <= 0) return;

  if (decoded.type === MSG_SOS) {
    const isForMe     = decoded.targetId === _myNodeId;
    const isBroadcast = decoded.targetId === BROADCAST_NODE_ID;
    if (isForMe || isBroadcast) {
      console.log(`[TourSafe] 🆘 SOS from ${decoded.senderId} hop=${DEFAULT_TTL - decoded.ttl}`);
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
      GeoKadEvents.emit('SOS_RECEIVED', { senderNodeId:decoded.senderId, targetNodeId:decoded.targetId, hopCount:DEFAULT_TTL-decoded.ttl, timestamp:Date.now() });
      sendAck(decoded.senderId);
    }
    if (isBroadcast && decoded.ttl > 1) relayPacket(decoded, MSG_SOS);

  } else if (decoded.type === MSG_ACK) {
    if (decoded.targetId === _myNodeId) {
      console.log(`[TourSafe] ✅ ACK from ${decoded.senderId}`);
      GeoKadEvents.emit('ACK_RECEIVED', { from:decoded.senderId, hopCount:DEFAULT_TTL-decoded.ttl });
    } else if (decoded.ttl > 1) {
      relayPacket(decoded, MSG_ACK);
    }
  }
}

function relayPacket(decoded: any, type: number): void {
  setTimeout(() => {
    const payload = encodePayload(type, decoded.ttl-1, decoded.senderId, decoded.targetId, decoded.seqNo);
    broadcastBlePayload(payload).catch(()=>{});
  }, Math.random() * 200 + 50);
}

export function stopListening(): void {
  _bleManager?.stopDeviceScan();
  _bleScanning = false;
}

// ─── Sending ──────────────────────────────────────────────────────────────────

export async function sendSOS(lat: number | null, lon: number | null): Promise<void> {
  if (lat !== null && lon !== null) {
    _myNodeId = await generateNodeId(lat, lon);
  } else if (!_myNodeId) {
    _myNodeId = generateRandomId();
  }
  console.log('[TourSafe] 📡 Sending SOS from', _myNodeId);
  const seqNo = Math.floor(Math.random() * 256);
  seenCache.add(`${_myNodeId}-${seqNo}`);
  const payload = encodePayload(MSG_SOS, DEFAULT_TTL, _myNodeId, BROADCAST_NODE_ID, seqNo);
  await broadcastBlePayload(payload);
  setTimeout(() => broadcastBlePayload(payload).catch(()=>{}), 500);
  setTimeout(() => broadcastBlePayload(payload).catch(()=>{}), 1200);
  GeoKadEvents.emit('SOS_SENT', { nodeId:_myNodeId, timestamp:Date.now() });
}

async function sendAck(targetId: string): Promise<void> {
  if (!_myNodeId) return;
  const now = Date.now();
  const last = _recentAckTargets.get(targetId);
  if (last && now - last < 3000) return;
  _recentAckTargets.set(targetId, now);
  const seqNo = Math.floor(Math.random() * 256);
  seenCache.add(`${_myNodeId}-${seqNo}`);
  const payload = encodePayload(MSG_ACK, DEFAULT_TTL, _myNodeId, targetId, seqNo);
  await broadcastBlePayload(payload);
  console.log('[TourSafe] ACK sent to', targetId);
}

async function broadcastBlePayload(payloadBytes: number[]): Promise<void> {
  if (!_BLEAdvertiser) { console.warn('[TourSafe] No advertiser – cannot broadcast'); return; }
  if (_advertiseStopTimer) { clearTimeout(_advertiseStopTimer); _advertiseStopTimer = null; }
  try {
    try { await _BLEAdvertiser.stopBroadcast(); } catch { /* ignore */ }

    // CRITICAL: Pass empty string '' for UUID — do NOT pass a 128-bit UUID here.
    // A 128-bit UUID takes 18 bytes in the BLE advertisement packet.
    // BLE advertisement packets have a hard 31-byte limit.
    // 18 (UUID) + 4 (mfr header) + 22 (payload) = 44 bytes → EXCEEDS LIMIT.
    // Android silently drops oversized advertisements without any error.
    // We identify TourSafe packets by the 0xAB 0xCD marker bytes instead.
    await _BLEAdvertiser.broadcast('', payloadBytes, {
      advertiseMode:        1,    // ADVERTISE_MODE_LOW_LATENCY
      txPowerLevel:         3,    // ADVERTISE_TX_POWER_HIGH
      connectable:          false,
      includeDeviceName:    false,
      includeTxPowerLevel:  false,
    });
    console.log('[TourSafe] 📶 Advertising started, payload bytes:', payloadBytes.length);
    _advertiseStopTimer = setTimeout(async () => {
      try { await _BLEAdvertiser.stopBroadcast(); } catch { /* ignore */ }
      _advertiseStopTimer = null;
      console.log('[TourSafe] Advertising auto-stopped after 30s');
    }, 30_000);
  } catch (e: any) {
    console.error('[TourSafe] ❌ Broadcast FAILED:', e?.message ?? e);
    console.error('[TourSafe] If error is ADVERTISE_FAILED_DATA_TOO_LARGE, payload is too big');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getMyNodeId():    string | null { return _myNodeId; }
export function isBleAvailable(): boolean       { return _bleAvailable; }
export async function setMyNodeId(lat: number, lon: number): Promise<void> { _myNodeId = await generateNodeId(lat, lon); }
export function getKBucketContacts(): Contact[] { return bucket.getAll(); }

export default { initBLE, retryBLE, startListening, stopListening, sendSOS, getMyNodeId, setMyNodeId, getKBucketContacts, GeoKadEvents, isBleAvailable };
