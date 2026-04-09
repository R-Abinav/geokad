import { BLEService } from '@geokad/ble';

const SERVICE_LAT = 13.08;
const SERVICE_LON = 80.27;

let bleService: BLEService | null = null;

export async function startGeoKad(): Promise<void> {
  try {
    bleService = new BLEService(SERVICE_LAT, SERVICE_LON);
    
    bleService.onSOS((msg: any) => {
      console.log('📱 SOS RECEIVED:', msg);
      // TODO: trigger useSosStore alert UI
    });

    await bleService.start();
    console.log('✅ GeoKad BLE node started');
    
    // Scan for peers every 30 seconds
    await bleService.scanAndAddPeers();
    setInterval(() => bleService?.scanAndAddPeers(), 30_000);
    
  } catch (e) {
    console.error('GeoKad start failed:', e);
  }
}

export async function sendSOS(message: string): Promise<void> {
  if (!bleService) {
    console.error('GeoKad not started');
    return;
  }
  await bleService.sendSOS(message);
  console.log('📡 SOS sent via BLE mesh');
}

export default { startGeoKad, sendSOS };
