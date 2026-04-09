import { RoutingTable } from './routing-table';
import { Contact } from './kbucket';
import { coordsToId } from './ids';

export interface Transport {
    send(address: string, message: object): void;
    onMessage(handler: (msg: object, fromAddress: string) => void): void;
    getAddress(): string;
}

export interface SOSMessage {
    type: 'SOS';
    emergencyId: string;
    originId: string;
    originLat: number;
    originLon: number;
    message: string;
    ttl: number;
    path: string[];
}

type EventHandler = (...args: any[]) => void;

export class GeoKadNode {
    id: string;
    lat: number;
    lon: number;
    address: string;
    table: RoutingTable;
    private transport: Transport;
    private k: number;
    private seenEmergencies: Set<string>;
    private events: Map<string, EventHandler[]>;

    constructor(lat: number, lon: number, transport: Transport, k: number = 20) {
        this.lat = lat;
        this.lon = lon;
        this.transport = transport;
        this.address = transport.getAddress();
        this.k = k;
        this.id = coordsToId(lat, lon);
        this.table = new RoutingTable(this.id, this.k);
        this.seenEmergencies = new Set();
        this.events = new Map();

        this.transport.onMessage((msg: object, fromAddress: string) => {
            this.handleMessage(msg, fromAddress);
        });
    }

    addContact(contact: Contact): void {
        this.table.add(contact);
        this.emit('peer', contact);
    }

    findClosest(targetId: string, count: number = this.k): Contact[] {
        return this.table.closest(targetId, count);
    }

    sendSOS(message: string, emergencyId: string, ttl: number = 10): void {
        this.seenEmergencies.add(emergencyId);
        
        const sosMsg: SOSMessage = {
            type: 'SOS',
            emergencyId,
            originId: this.id,
            originLat: this.lat,
            originLon: this.lon,
            message,
            ttl,
            path: [this.id]
        };

        const closest = this.findClosest(this.id, this.k);
        for (const contact of closest) {
            this.transport.send(contact.address, sosMsg);
        }
    }

    handleMessage(msg: any, fromAddress: string): void {
        if (msg && msg.type === 'SOS') {
            const sosMsg = msg as SOSMessage;

            if (this.seenEmergencies.has(sosMsg.emergencyId)) {
                return; // Duplicate, drop it
            }
            this.seenEmergencies.add(sosMsg.emergencyId);

            const isValidHex = (str: any) => typeof str === 'string' && (str.startsWith('0x') ? /^[0-9a-f]+$/i.test(str.slice(2)) : /^[0-9a-f]+$/i.test(str));
            if (sosMsg.originId && isValidHex(sosMsg.originId)) {
                const senderId = (sosMsg.path && sosMsg.path.length > 0) ? sosMsg.path[sosMsg.path.length - 1] : sosMsg.originId;
                if (senderId && isValidHex(senderId)) {
                    // Add the sender to our routing table
                    this.addContact({
                        id: senderId,
                        address: fromAddress,
                        lat: sosMsg.originLat,
                        lon: sosMsg.originLon,
                        lastSeen: Date.now()
                    });
                }
            }

            this.emit('sos', sosMsg);

            if (sosMsg.ttl > 1) {
                const forwardedMsg: SOSMessage = {
                    ...sosMsg,
                    ttl: sosMsg.ttl - 1,
                    path: [...sosMsg.path, this.id]
                };

                const closest = this.findClosest(this.id, this.k);
                for (const contact of closest) {
                    this.transport.send(contact.address, forwardedMsg);
                }
            }
        }
    }

    on(event: 'sos' | 'peer', handler: EventHandler): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(handler);
    }

    private emit(event: string, ...args: any[]): void {
        const handlers = this.events.get(event);
        if (handlers) {
            for (const handler of handlers) {
                handler(...args);
            }
        }
    }
}
