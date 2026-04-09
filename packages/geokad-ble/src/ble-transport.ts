import { BleManager } from 'react-native-ble-plx';
import { Transport } from '@geokad/core';

export const SERVICE_UUID = '0000FFF0-0000-1000-8000-00805F9B34FB';
export const CHARACTERISTIC_UUID = '0000FFF1-0000-1000-8000-00805F9B34FB';

// Using RN compatible base64 or global Buffer polyfill
const utf8ToBase64 = (str: string) => {
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
    if ((global as any).btoa) return (global as any).btoa(unescape(encodeURIComponent(str)));
    return ''; // fallback
};

const base64ToUtf8 = (b64: string) => {
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
    if ((global as any).atob) return decodeURIComponent(escape((global as any).atob(b64)));
    return ''; // fallback
};

export class BLETransport implements Transport {
    private manager: BleManager;
    private deviceName: string;
    private address: string;

    constructor(manager: BleManager, nodeId: string) {
        this.manager = manager;
        this.deviceName = `TourSafe-${nodeId.substring(0, 8)}`;
        this.address = '00:00:00:00:00:00'; // Default till set/generated
    }

    getAddress(): string {
        return this.address;
    }

    async send(address: string, message: object): Promise<void> {
        try {
            const device = await this.manager.connectToDevice(address);
            await device.discoverAllServicesAndCharacteristics();
            const payload = utf8ToBase64(JSON.stringify(message));
            
            await device.writeCharacteristicWithResponseForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID,
                payload
            );
            await device.cancelConnection();
        } catch (e) {
            console.log(`Failed to send via BLE to ${address}:`, e);
        }
    }

    onMessage(handler: (msg: object, fromAddress: string) => void): void {
        // NOTE: react-native-ble-plx only supports Central mode officially.
        // We write the peripheral listener logic here conceptually or assuming a compatible fork.
        const man: any = this.manager;

        if (man.startAdvertising) {
            man.startAdvertising({
                name: this.deviceName,
                serviceUUIDs: [SERVICE_UUID]
            });
        }

        if (man.onCharacteristicWrite) {
            man.onCharacteristicWrite(
                SERVICE_UUID,
                CHARACTERISTIC_UUID,
                (error: any, characteristic: any) => {
                    if (error) return;
                    if (characteristic && characteristic.value) {
                        try {
                            const decoded = base64ToUtf8(characteristic.value);
                            const msg = JSON.parse(decoded);
                            handler(msg, characteristic.deviceId || 'unknown-ble');
                        } catch (e) {
                            console.log('Failed to parse incoming BLE payload', e);
                        }
                    }
                }
            );
        }
    }
}
