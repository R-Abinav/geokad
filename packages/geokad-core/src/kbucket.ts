import { xorDistance } from './ids';

export interface Contact {
    id: string;
    address: string;
    lat: number;
    lon: number;
    lastSeen: number;
}

export class KBucket {
    private contacts: Contact[] = [];
    private k: number;

    constructor(k: number = 20) {
        this.k = k;
    }

    add(contact: Contact): void {
        const index = this.contacts.findIndex(c => c.id === contact.id);
        if (index !== -1) {
            // Refresh: put at the end (most recently seen / LRU policy where 0 is LRU)
            this.contacts.splice(index, 1);
            this.contacts.push(contact);
        } else {
            if (this.contacts.length >= this.k) {
                // Drop oldest (index 0)
                this.contacts.shift();
            }
            this.contacts.push(contact);
        }
    }

    remove(id: string): void {
        this.contacts = this.contacts.filter(c => c.id !== id);
    }

    getClosest(targetId: string, count: number): Contact[] {
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

    size(): number {
        return this.contacts.length;
    }
}
