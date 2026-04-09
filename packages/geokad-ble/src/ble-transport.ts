import { BleManager, Device } from 'react-native-ble-plx';
import BLEAdvertiser from 'react-native-ble-advertiser';
import { Transport } from '@geokad/core';

const SERVICE_UUID = '0000FFF0-0000-1000-8000-00805F9B34FB';

// Encode message into manufacturer data (max ~20 bytes)
// We only encode the emergencyId (first 16 chars) to fit BLE limits
function encodeManufacturerData(emergencyId: string, nodeId: string): number[] {
  const str = `${emergencyId.slice(0, 8)}|${nodeId.slice(0, 8)}`;
  return Array.from(str).map(c => c.charCodeAt(0));
}

function decodeManufacturerData(data: number[]): { emergencyId: string, nodeId: string } | null {
  try {
    const str = String.fromCharCode(...data);
    const [emergencyId, nodeId] = str.split('|');
    return { emergencyId, nodeId };
  } catch {
    return null;
  }
}

export class BLETransport implements Transport {
  private manager: BleManager;
  private nodeId: string;
  private messageHandlers: ((msg: object, from: string) => void)[] = [];
  private isScanning = false;

  constructor(manager: BleManager, nodeId: string) {
    this.manager = manager;
    this.nodeId = nodeId;
  }

  getAddress(): string {
    return `ble-${this.nodeId.slice(0, 8)}`;
  }

  // BLE advertisement-based send — broadcasts SOS in the ad packet
  async send(address: string, message: any): Promise<void> {
    if (message.type !== 'SOS') return;
    try {
      const manufacturerData = encodeManufacturerData(
        message.emergencyId,
        message.originId || this.nodeId
      );
      
      await BLEAdvertiser.setCompanyId(0x004C);
      await BLEAdvertiser.broadcast(
        SERVICE_UUID,
        manufacturerData,
        {
          advertiseMode: 0,        // ADVERTISE_MODE_LOW_LATENCY
          txPowerLevel: 3,         // ADVERTISE_TX_POWER_HIGH
          connectable: false,
          includeDeviceName: true,
        }
      );
      
      // Stop broadcasting after 5 seconds
      setTimeout(() => BLEAdvertiser.stopBroadcast(), 5000);
      console.log('📡 BLE SOS broadcast started');
    } catch (e) {
      console.log('BLE advertise failed:', e);
    }
  }

  // Scan for TourSafe BLE advertisements
  onMessage(handler: (msg: object, from: string) => void): void {
    this.messageHandlers.push(handler);
    
    // Start scanning immediately
    this.startScanning();
  }

  private startScanning(): void {
    if (this.isScanning) return;
    this.isScanning = true;

    this.manager.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.log('BLE scan error:', error);
          this.isScanning = false;
          return;
        }
        if (!device) return;
        
        // Only process TourSafe devices
        if (!device.name?.startsWith('TourSafe-')) return;
        
        // Parse manufacturer data from advertisement
        if (device.manufacturerData) {
          try {
            const raw = Buffer.from(device.manufacturerData, 'base64');
            const bytes = Array.from(raw);
            const decoded = decodeManufacturerData(bytes);
            
            if (decoded) {
              const sosMessage = {
                type: 'SOS',
                emergencyId: decoded.emergencyId,
                originId: decoded.nodeId,
                originLat: 0,
                originLon: 0,
                message: 'SOS via BLE',
                ttl: 5,
                path: [decoded.nodeId]
              };
              this.messageHandlers.forEach(h => h(sosMessage, device.id));
            }
          } catch (e) {
            console.log('Failed to parse BLE manufacturer data:', e);
          }
        }
      }
    );
  }

  stopScanning(): void {
    this.manager.stopDeviceScan();
    this.isScanning = false;
  }
}
