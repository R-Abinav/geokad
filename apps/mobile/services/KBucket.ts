export interface Contact {
  id: string; // Hex string (8 bytes, 16 chars)
  address?: string;
  lat?: number;
  lon?: number;
  deviceId?: string;
  lastSeen: number;
}

export function xorDistance(a: string, b: string): bigint {
  if (!a || !b) return BigInt(0);
  const cleanA = a.startsWith('0x') ? a.slice(2) : a;
  const cleanB = b.startsWith('0x') ? b.slice(2) : b;
  return BigInt('0x' + cleanA) ^ BigInt('0x' + cleanB);
}

export class KBucket {
  private contacts: Contact[] = [];
  private k: number;

  constructor(k: number = 3) {
    this.k = k;
  }

  addContact(nodeId: string, metadata: { lat?: number; lon?: number; deviceId?: string }) {
    const existingIndex = this.contacts.findIndex(c => c.id === nodeId);
    if (existingIndex !== -1) {
      const contact = this.contacts[existingIndex];
      contact.lastSeen = Date.now();
      if (metadata.lat) contact.lat = metadata.lat;
      if (metadata.lon) contact.lon = metadata.lon;
      
      this.contacts.splice(existingIndex, 1);
      this.contacts.push(contact); // Most recently seen put to the end
    } else {
      if (this.contacts.length >= this.k) {
        this.contacts.shift(); // Evict the least recently seen (index 0)
      }
      this.contacts.push({ id: nodeId, ...metadata, lastSeen: Date.now() });
    }
  }

  removeContact(nodeId: string) {
    this.contacts = this.contacts.filter(c => c.id !== nodeId);
  }

  findClosest(targetId: string, count: number): Contact[] {
    return [...this.contacts]
      .sort((a, b) => {
        const distA = xorDistance(a.id, targetId);
        const distB = xorDistance(b.id, targetId);
        return distA < distB ? -1 : distA > distB ? 1 : 0;
      })
      .slice(0, count);
  }

  getAll(): Contact[] {
    return [...this.contacts];
  }
}
