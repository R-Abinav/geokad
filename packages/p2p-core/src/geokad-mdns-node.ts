import { GeoKadNode, coordsToId } from '@geokad/core';
import { MdnsTransport } from './mdns-transport';
import { Bonjour, Service } from 'bonjour-service';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const lat = parseFloat(process.env.LAT || '13.08');
const lon = parseFloat(process.env.LON || '80.27');

const transport = new MdnsTransport(3001);
const node = new GeoKadNode(lat, lon, transport);
console.log('GeoKad node started, ID:', node.id, 'address:', node.address);

// ── mDNS peer discovery ──────────────────────────────────
const bonjour = new Bonjour();
const serviceName = `geokad-${Math.random().toString(36).slice(2, 8)}`;

bonjour.publish({
    name: serviceName,
    type: 'toursafe-geokad',
    port: 3001,
    txt: { lat: lat.toString(), lon: lon.toString() }
});

const browser = bonjour.find({ type: 'toursafe-geokad' });
console.log('Browsing for peers...');

browser.on('up', (service: Service) => {
    if (service.name === serviceName) return;

    let peerLat = 13.08;
    let peerLon = 80.27;

    if (service.txt) {
        if (typeof service.txt.lat === 'string') peerLat = parseFloat(service.txt.lat);
        if (typeof service.txt.lon === 'string') peerLon = parseFloat(service.txt.lon);
    }

    if (isNaN(peerLat)) peerLat = 13.08;
    if (isNaN(peerLon)) peerLon = 80.27;

    const host = service.referer?.address || service.host;
    const peerAddress = `${host}:${service.port}`;
    
    node.addContact({
        id: coordsToId(peerLat, peerLon),
        address: peerAddress,
        lat: peerLat,
        lon: peerLon,
        lastSeen: Date.now()
    });
    console.log(`[GeoKad] Added peer: ${peerAddress} (ID: ${coordsToId(peerLat, peerLon)})`);
});

// ── SOS event tracking ───────────────────────────────────
const sosEvents: any[] = [];

node.on('sos', (msg: any) => {
    console.log('SOS received on node!');
    console.log('--- SOS RECEIVED ---');
    console.log(msg);
    sosEvents.push({ ...msg, receivedAt: Date.now() });
    // Broadcast to all connected WebSocket clients (phones)
    broadcastToPhones(msg);
});

// ── Connected phones via WebSocket ───────────────────────
const connectedPhones: Set<WebSocket> = new Set();

function broadcastToPhones(msg: any) {
    const payload = JSON.stringify({ type: 'sos', data: msg });
    for (const ws of connectedPhones) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    }
    console.log(`📡 Broadcast SOS to ${connectedPhones.size} connected phone(s)`);
}

function broadcastPeerCount() {
    const payload = JSON.stringify({ type: 'peers', count: connectedPhones.size });
    for (const ws of connectedPhones) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    }
}

// ── HTTP server (status + SOS ingestion) ─────────────────
const httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.method === 'POST' && req.url === '/sos') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const msg = JSON.parse(body);
                sosEvents.push({ ...msg, receivedAt: Date.now() });
                node.handleMessage(msg, req.socket.remoteAddress || 'unknown');
                // handleMessage triggers the 'sos' event which calls broadcastToPhones
                console.log('📨 SOS received via HTTP:', msg.message);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', phonesNotified: connectedPhones.size }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'invalid json' }));
            }
        });
    } else if (req.url === '/events') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sosEvents));
    } else if (req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            nodeId: node.id, 
            connectedPhones: connectedPhones.size,
            routingTableSize: node.table.size()
        }));
    } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', nodeId: node.id }));
    }
});

// ── WebSocket server (phone real-time connection) ────────
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`📱 Phone connected from ${clientIp} (total: ${connectedPhones.size + 1})`);
    connectedPhones.add(ws);
    
    // Send current status to newly connected phone
    ws.send(JSON.stringify({ 
        type: 'welcome', 
        nodeId: node.id,
        peerCount: connectedPhones.size,
        pendingSOS: sosEvents.length
    }));
    
    broadcastPeerCount();

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'SOS') {
                console.log(`📱 SOS received from phone: ${msg.message}`);
                sosEvents.push({ ...msg, receivedAt: Date.now() });
                // Forward via Kademlia to TCP peers
                node.handleMessage(msg, clientIp);
                // Broadcast to all OTHER connected phones
                const payload = JSON.stringify({ type: 'sos', data: msg });
                for (const client of connectedPhones) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(payload);
                    }
                }
                // Acknowledge back to sender
                ws.send(JSON.stringify({ 
                    type: 'sos_ack', 
                    emergencyId: msg.emergencyId,
                    peersNotified: connectedPhones.size - 1
                }));
            } else if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (e) {
            console.error('Failed to parse phone message:', e);
        }
    });

    ws.on('close', () => {
        connectedPhones.delete(ws);
        console.log(`📱 Phone disconnected (remaining: ${connectedPhones.size})`);
        broadcastPeerCount();
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        connectedPhones.delete(ws);
    });
});

httpServer.listen(3002, '0.0.0.0', () => {
    console.log('HTTP + WebSocket server on port 3002');
    console.log('Phones connect via: ws://<your-ip>:3002');
});

export default node;
