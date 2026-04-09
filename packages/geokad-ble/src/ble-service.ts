import { BleManager } from 'react-native-ble-plx';
import { GeoKadNode, coordsToId } from '@geokad/core';
import { BLETransport, SERVICE_UUID } from './ble-transport';

export class BLEService {
    private manager: BleManager;
    private transport: BLETransport;
    private node: GeoKadNode;

    constructor(lat: number, lon: number) {
        this.manager = new BleManager();
        
        // Derive ID manually to pass to transport naming
        const idFormula = Math.floor(lat * 100003 + lon * 999983) & 0x7fffffff;
        const nodeId = idFormula.toString(16).padStart(40, '0');

        this.transport = new BLETransport(this.manager, nodeId);
        this.node = new GeoKadNode(lat, lon, this.transport);
    }

    async start(): Promise<void> {
        // Transport's onMessage handles the peripheral advertising which is already invoked by GeoKadNode
    }

    async scanAndAddPeers(): Promise<void> {
        this.manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
            if (error) {
                console.log('BLE Scan error:', error);
                return;
            }
            if (device && device.name && device.name.startsWith('TourSafe-')) {
                const abbreviatedId = device.name.replace('TourSafe-', '');
                
                // Construct a synthetically padded node ID for routing
                const paddedId = abbreviatedId.padEnd(40, '0');

                this.node.addContact({
                    id: paddedId,
                    address: device.id, // BLE MAC or UUID
                    lat: 0, // Fallback lat, we don't have this securely mapped in BLE GAP yet
                    lon: 0,
                    lastSeen: Date.now()
                });
            }
        });
    }

    async sendSOS(message: string): Promise<void> {
        const emergencyId = `sos-ble-${Date.now()}`;
        this.node.sendSOS(message, emergencyId);
    }

    onSOS(handler: (msg: any) => void): void {
        this.node.on('sos', handler);
    }

    async stop(): Promise<void> {
        this.manager.stopDeviceScan();
        this.manager.destroy();
    }
}
