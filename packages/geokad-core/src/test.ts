import { GeoKadNode, Transport, SOSMessage } from './node';

class MockTransport implements Transport {
    private address: string;
    private handler: ((msg: object, fromAddress: string) => void) | null = null;
    static simNetwork: Map<string, MockTransport> = new Map();

    constructor(address: string) {
        this.address = address;
        MockTransport.simNetwork.set(this.address, this);
    }

    send(address: string, message: object): void {
        const dest = MockTransport.simNetwork.get(address);
        if (dest && dest.handler) {
            dest.handler(message, this.address);
        }
    }

    onMessage(handler: (msg: object, fromAddress: string) => void): void {
        this.handler = handler;
    }

    getAddress(): string {
        return this.address;
    }
}

const cities = [
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
    { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639 }
];

const nodes: GeoKadNode[] = [];

// Initialize nodes
for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const transport = new MockTransport(`mock://${city.name}`);
    const node = new GeoKadNode(city.lat, city.lon, transport);
    nodes.push(node);
}

// Inter-connect nodes to prepopulate routing tables (basic bootstrap)
for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
        if (i !== j) {
            nodes[i].addContact({
                id: nodes[j].id,
                address: nodes[j].address,
                lat: nodes[j].lat,
                lon: nodes[j].lon,
                lastSeen: Date.now()
            });
        }
    }
}

let receiveCount = 0;

for (let i = 1; i < nodes.length; i++) {
    nodes[i].on('sos', (msg: SOSMessage) => {
        receiveCount++;
        const city = cities[i];
        console.log(`[${city.name}] received SOS!`);
        console.log(`  From Origin ID: ${msg.originId}`);
        console.log(`  Message: ${msg.message}`);
        console.log(`  Hop count: ${msg.path.length}`);
        console.log(`  Path: ${msg.path.join(' -> ')}\n`);
    });
}

console.log('--- Chennai emitting SOS ---\n');
nodes[0].sendSOS('Emergency in Chennai!', 'emg_ch_001');

if (receiveCount === nodes.length - 1) {
    console.log('PASS');
} else {
    console.log(`FAIL (Received ${receiveCount} / ${nodes.length - 1})`);
}
