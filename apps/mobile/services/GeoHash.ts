import * as Crypto from 'expo-crypto';
// @ts-ignore
import ngeohash from 'ngeohash';

export async function generateNodeId(lat: number, lon: number): Promise<string> {
  const hash = ngeohash.encode(lat, lon, 7);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    hash
  );
  return digest.substring(0, 16); // First 8 bytes = 16 hex chars
}

export function generateRandomId(): string {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
