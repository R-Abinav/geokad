export function coordsToId(lat: number, lon: number): string {
    const val = Math.floor(lat * 100003 + lon * 999983) & 0x7fffffff;
    return val.toString(16).padStart(40, '0');
}

export function xorDistance(a: string, b: string): bigint {
  if (!a || !b) return BigInt(0);
  if (!a.startsWith('0x') && !/^[0-9a-f]+$/i.test(a)) return BigInt(0);
  if (!b.startsWith('0x') && !/^[0-9a-f]+$/i.test(b)) return BigInt(0);
  const cleanA = a.startsWith('0x') ? a.slice(2) : a;
  const cleanB = b.startsWith('0x') ? b.slice(2) : b;
  return BigInt('0x' + cleanA) ^ BigInt('0x' + cleanB);
}

export function closerNode(target: string, a: string, b: string): string {
    const distA = xorDistance(target, a);
    const distB = xorDistance(target, b);
    return distA < distB ? a : b;
}

export function randomId(): string {
    const bytes = new Uint8Array(20);
    for (let i = 0; i < 20; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
