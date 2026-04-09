import { GeoKadNode, coordsToId } from '@geokad/core';
import { MdnsTransport } from './mdns-transport';
import { Bonjour, Service } from 'bonjour-service';

const lat = parseFloat(process.env.LAT || '13.08');
const lon = parseFloat(process.env.LON || '80.27');

const transport = new MdnsTransport(3001);
const node = new GeoKadNode(lat, lon, transport);
console.log('GeoKad node started, ID:', node.id, 'address:', node.address);

const bonjour = new Bonjour();
const serviceName = `geokad-${Math.random().toString(36).slice(2, 8)}`;

// Publish our own node so others can discover us
bonjour.publish({
    name: serviceName,
    type: 'toursafe-geokad',
    port: 3001,
    txt: { lat: lat.toString(), lon: lon.toString() }
});

// Discover other peers on the network
const browser = bonjour.find({ type: 'toursafe-geokad' });
console.log('Browsing for peers...');

browser.on('up', (service: Service) => {
    // Ignore our own broadcast
    if (service.name === serviceName) return;

    let peerLat = 13.08;
    let peerLon = 80.27;

    if (service.txt) {
        if (typeof service.txt.lat === 'string') peerLat = parseFloat(service.txt.lat);
        if (typeof service.txt.lon === 'string') peerLon = parseFloat(service.txt.lon);
    }

    // Default fallback if parsing fails
    if (isNaN(peerLat)) peerLat = 13.08;
    if (isNaN(peerLon)) peerLon = 80.27;

    const host = service.referer?.address || service.host;
    const peerAddress = `${host}:${service.port}`;
    
    // Add peer to the Kademlia routing table
    node.addContact({
        id: coordsToId(peerLat, peerLon),
        address: peerAddress,
        lat: peerLat,
        lon: peerLon,
        lastSeen: Date.now()
    });
    console.log(`[GeoKad] Added peer: ${peerAddress} (ID: ${coordsToId(peerLat, peerLon)})`);
});

node.on('sos', (msg: any) => {
    console.log('SOS received on node!');
    console.log('--- SOS RECEIVED ---');
    console.log(msg);
});

export default node;

import * as http from 'http';

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', nodeId: node.id }));
});

httpServer.listen(3002, '0.0.0.0', () => {
  console.log('HTTP bridge on port 3002');
});
