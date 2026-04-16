import { Platform, PermissionsAndroid } from 'react-native';
import EventEmitter from 'eventemitter3';
import { generateNodeId, generateRandomId } from './GeoHash';
import { KBucket, Contact } from './KBucket';
import { SeenCache } from './SeenCache';

const TOURSAFE_UUID = '74278BDA-B644-4520-8F0C-720EAF059935';
const COMPANY_ID_HI = 0xFF;
const COMPANY_ID_LO = 0x02; // Little-endian: [0x02, 0xFF]

// Constants
const MSG_SOS = 0x01;
const MSG_ACK = 0x02;
const MSG_RELAY = 0x03;

const BROADCAST_NODE_ID = 'ffffffffffffffff';

export type TransportMode = 'offline' | 'ble_mesh';

// Internal State
let _bleManager: any = null;
let _BLEAdvertiser: any = null;
let _bleAvailable = false;
let _bleScanning = false;
let _sosAdvertiseTimer: ReturnType<typeof setTimeout> | null = null;
let _myNodeId: string | null = null;

const events = new EventEmitter();
const bucket = new KBucket(3);
const seenCache = new SeenCache();

// Helper: Hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Helper: Uint8Array to Hex string
function bytesToHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Encode Payload
function encodePayload(type: number, ttl: number, senderIdHex: string, targetIdHex: string, seqNo: number): number[] {
  const bytes = new Uint8Array(20);
  bytes[0] = type;
  bytes[1] = ttl;
  const senderBytes = hexToBytes(senderIdHex);
  const targetBytes = hexToBytes(targetIdHex);
  bytes.set(senderBytes, 2);
  bytes.set(targetBytes, 10);
  bytes[18] = seqNo;

  // Checksum
  let checksum = 0;
  for (let i = 0; i < 19; i++) {
    checksum ^= bytes[i];
  }
  bytes[19] = checksum;
  return Array.from(bytes);
}

function decodeManufacturerData(b64: string): any {
  try {
    const binary = atob(b64);
    const bytes: number[] = Array.from({ length: binary.length }, (_, i) => binary.charCodeAt(i));
    
    let offset = 0;
    if (bytes.length >= 2 && bytes[0] === COMPANY_ID_LO && bytes[1] === COMPANY_ID_HI) {
      offset = 2;
    }
    
    const payload = bytes.slice(offset, offset + 20);
    if (payload.length < 20) return null;

    let checksum = 0;
    for (let i = 0; i < 19; i++) checksum ^= payload[i];
    if (checksum !== payload[19]) return null; // Invalid Checksum

    return {
      type: payload[0],
      ttl: payload[1],
      senderId: bytesToHex(payload.slice(2, 10)),
      targetId: bytesToHex(payload.slice(10, 18)),
      seqNo: payload[18],
      originalBytes: payload
    };
  } catch {
    return null;
  }
}

async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    if ((Platform.Version as number) >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return Object.values(result).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return res === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch {
    return false;
  }
}

export async function initBLE(): Promise<void> {
  try {
    const { BleManager } = require('react-native-ble-plx');
    // Note: react-native-ble-advertiser is installed in package.json and was in previous code
    _BLEAdvertiser = require('react-native-ble-advertiser').default;

    if (!_bleManager) _bleManager = new BleManager();
    _BLEAdvertiser.setCompanyId((COMPANY_ID_HI << 8) | COMPANY_ID_LO); 

    const granted = await requestBLEPermissions();
    if (!granted) {
      console.log('⚠️ BLE permissions denied');
      return;
    }

    _bleAvailable = true;
    startListening();
    console.log('✅ BLE Mesh initialized');
  } catch (e) {
    console.log('⚠️ BLE unavailable (Expo Go/Unsupported)', e);
    _bleAvailable = false;
  }
}

export function startListening(): void {
  if (!_bleManager || _bleScanning) return;
  _bleScanning = true;
  _bleManager.startDeviceScan([TOURSAFE_UUID], { allowDuplicates: true }, (error: any, device: any) => {
    if (error) {
      console.log('BLE scan error:', error.message);
      _bleScanning = false;
      setTimeout(startListening, 5000);
      return;
    }
    if (!device?.manufacturerData) return;

    const decoded = decodeManufacturerData(device.manufacturerData);
    if (!decoded || !_myNodeId) return;

    const cacheKey = `${decoded.senderId}-${decoded.seqNo}`;
    if (seenCache.has(cacheKey)) return; // Loop Prevention

    seenCache.add(cacheKey);
    bucket.addContact(decoded.senderId, { deviceId: device.id });

    // Handle Messages
    if (decoded.ttl === 0) return;

    if (decoded.type === MSG_SOS) {
      if (decoded.targetId === _myNodeId || decoded.targetId === BROADCAST_NODE_ID) {
        // We received an SOS
        events.emit('SOS_RECEIVED', {
          senderNodeId: decoded.senderId,
          targetNodeId: decoded.targetId,
          hopCount: 5 - decoded.ttl,
          timestamp: Date.now()
        });

        if (decoded.targetId === _myNodeId) {
          sendAck(decoded.senderId); // Acknowledge specifically to sender
        }
      }

      // TTL > 1 means we can relay
      if (decoded.ttl > 1 && (decoded.targetId === BROADCAST_NODE_ID || decoded.targetId !== _myNodeId)) {
        relayMessage(decoded, MSG_SOS);
        events.emit('SOS_RELAYED', {
          originalSender: decoded.senderId,
          relayedBy: _myNodeId,
          hopCount: 5 - (decoded.ttl - 1)
        });
      }
    } else if (decoded.type === MSG_ACK) {
      if (decoded.targetId === _myNodeId) {
        events.emit('ACK_RECEIVED', {
          from: decoded.senderId,
          hopCount: 5 - decoded.ttl
        });
      } else if (decoded.ttl > 1) {
        relayMessage(decoded, MSG_ACK);
      }
    } else if (decoded.type === MSG_RELAY) {
      if (decoded.ttl > 1 && decoded.targetId !== _myNodeId) {
         relayMessage(decoded, MSG_RELAY);
      }
    }
  });
}

function relayMessage(decoded: any, type: number) {
  setTimeout(() => {
    // Re-encode with TTL decremented
    const payload = encodePayload(type, decoded.ttl - 1, decoded.senderId, decoded.targetId, decoded.seqNo);
    broadcastBlePayload(payload);
  }, Math.random() * 200 + 50); // Jitter
}

export function stopListening(): void {
  _bleManager?.stopDeviceScan();
  _bleScanning = false;
}

export async function sendSOS(lat: number | null, lon: number | null): Promise<void> {
  if (!_myNodeId) {
    if (lat !== null && lon !== null) {
      _myNodeId = await generateNodeId(lat, lon);
    } else {
      _myNodeId = generateRandomId();
    }
  }
  
  const seqNo = Math.floor(Math.random() * 256);
  const cacheKey = `${_myNodeId}-${seqNo}`;
  seenCache.add(cacheKey);

  const payload = encodePayload(MSG_SOS, 5, _myNodeId, BROADCAST_NODE_ID, seqNo);
  await broadcastBlePayload(payload);

  events.emit('SOS_SENT', {
    nodeId: _myNodeId,
    timestamp: Date.now()
  });
}

async function sendAck(targetId: string): Promise<void> {
  if (!_myNodeId) return;
  const seqNo = Math.floor(Math.random() * 256);
  const cacheKey = `${_myNodeId}-${seqNo}`;
  seenCache.add(cacheKey);

  const payload = encodePayload(MSG_ACK, 5, _myNodeId, targetId, seqNo);
  await broadcastBlePayload(payload);
}

async function broadcastBlePayload(payloadBytes: number[]): Promise<void> {
  if (!_bleAvailable || !_BLEAdvertiser) return;

  if (_sosAdvertiseTimer) {
    clearTimeout(_sosAdvertiseTimer);
    _sosAdvertiseTimer = null;
    try { await _BLEAdvertiser.stopBroadcast(); } catch {}
  }

  try {
    await _BLEAdvertiser.broadcast(TOURSAFE_UUID, payloadBytes, {
      advertiseMode: 2,           
      txPowerLevel: 3,            
      connectable: false,
      includeDeviceName: false,
      includeTxPowerLevel: false,
    });

    _sosAdvertiseTimer = setTimeout(async () => {
      try { await _BLEAdvertiser.stopBroadcast(); } catch {}
    }, 30000); // 30s broadcast
  } catch (e: any) {
    console.log('BLE broadcast error:', e?.message ?? e);
  }
}

export function getMyNodeId(): string | null {
  return _myNodeId;
}

export async function setMyNodeId(lat: number, lon: number): Promise<void> {
  _myNodeId = await generateNodeId(lat, lon);
}

export function getKBucketContacts(): Contact[] {
  return bucket.getAll();
}

export const GeoKadEvents = events;

export default {
  initBLE, startListening, stopListening, sendSOS, getMyNodeId, setMyNodeId, getKBucketContacts, GeoKadEvents
};
