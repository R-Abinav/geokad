import { BleManager } from 'react-native-ble-plx';
import { GeoKadNode } from '@geokad/core';
import { BLETransport } from './ble-transport';

export class BLEService {
  private manager: BleManager;
  private transport: BLETransport;
  private node: GeoKadNode;
  private sosHandlers: ((msg: any) => void)[] = [];

  constructor(lat: number, lon: number) {
    this.manager = new BleManager();
    const nodeId = Math.floor(lat * 100003 + lon * 999983) & 0x7fffffff;
    const nodeIdHex = nodeId.toString(16).padStart(40, '0');
    
    this.transport = new BLETransport(this.manager, nodeIdHex);
    this.node = new GeoKadNode(lat, lon, this.transport);
    
    this.node.on('sos', (msg: any) => {
      this.sosHandlers.forEach(h => h(msg));
    });
  }

  async start(): Promise<void> {
    // Request BLE permissions
    const state = await this.manager.state();
    if (state !== 'PoweredOn') {
      console.log('BLE not powered on, current state:', state);
      // Wait for BLE to power on
      await new Promise<void>((resolve) => {
        const sub = this.manager.onStateChange((newState) => {
          if (newState === 'PoweredOn') {
            sub.remove();
            resolve();
          }
        }, true);
      });
    }
    console.log('✅ BLE powered on, starting transport');
    // Transport starts scanning via onMessage which is called in GeoKadNode constructor
  }

  async scanAndAddPeers(): Promise<void> {
    // Scanning is already running via transport's onMessage
    // This is a no-op but kept for API compatibility
    console.log('BLE scanning active via transport');
  }

  async sendSOS(message: string): Promise<void> {
    const emergencyId = `ble-${Date.now()}`;
    this.node.sendSOS(message, emergencyId);
  }

  onSOS(handler: (msg: any) => void): void {
    this.sosHandlers.push(handler);
  }

  async stop(): Promise<void> {
    (this.transport as any).stopScanning();
    this.manager.destroy();
  }
}
