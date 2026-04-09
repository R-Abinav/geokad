import { Contact, KBucket } from './kbucket';
import { xorDistance } from './ids';

export class RoutingTable {
    private buckets: KBucket[];
    private selfId: string;
    private k: number;

    constructor(selfId: string, k: number = 20) {
        this.selfId = selfId;
        this.k = k;
        // 160 buckets for 160-bit ID spaces (40 hex chars * 4 bits)
        this.buckets = Array.from({ length: 160 }, () => new KBucket(k));
    }

    bucketIndex(selfId: string, contactId: string): number {
        const dist = xorDistance(selfId, contactId);
        if (dist === 0n) return 0;
        
        let d = dist;
        let index = -1;
        while (d > 0n) {
            d >>= 1n;
            index++;
        }
        return index;
    }

    add(contact: Contact): void {
        if (contact.id === this.selfId) return;
        const index = this.bucketIndex(this.selfId, contact.id);
        if (index >= 0 && index < 160) {
            this.buckets[index].add(contact);
        }
    }

    remove(id: string): void {
        const index = this.bucketIndex(this.selfId, id);
        if (index >= 0 && index < 160) {
            this.buckets[index].remove(id);
        }
    }

    closest(targetId: string, count: number): Contact[] {
        const allContacts: Contact[] = [];
        for (const bucket of this.buckets) {
            allContacts.push(...bucket.getAll());
        }
        return allContacts
            .sort((a, b) => {
                const distA = xorDistance(a.id, targetId);
                const distB = xorDistance(b.id, targetId);
                return distA < distB ? -1 : distA > distB ? 1 : 0;
            })
            .slice(0, count);
    }

    size(): number {
        return this.buckets.reduce((acc, bucket) => acc + bucket.size(), 0);
    }
}
