import net from 'net';
import os from 'os';
import { Transport } from '@geokad/core';

export class MdnsTransport implements Transport {
    private port: number;
    private server: net.Server | null = null;
    private address: string;

    constructor(port: number = 3001) {
        this.port = port;
        this.address = `${this.getLocalIp()}:${this.port}`;
    }

    private getLocalIp(): string {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            const ifaceGroup = interfaces[name];
            if (!ifaceGroup) continue;
            for (const iface of ifaceGroup) {
                if (!iface.internal && iface.family === 'IPv4') {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }

    getAddress(): string {
        return this.address;
    }

    send(address: string, message: object): void {
        const [host, portStr] = address.split(':');
        const port = parseInt(portStr || this.port.toString(), 10);
        
        const client = net.createConnection({ host, port }, () => {
            client.end(JSON.stringify(message));
        });
        
        client.on('error', (err) => {
            // console.error(`[MdnsTransport] send error to ${address}: ${err.message}`);
        });
    }

    onMessage(handler: (msg: object, fromAddress: string) => void): void {
        if (this.server) return;
        
        this.server = net.createServer((socket) => {
            let buf = "";
            socket.on("data", (chunk) => {
                buf += chunk.toString();
            });
            socket.on("end", () => {
                try {
                    if (!buf) return;
                    const msg = JSON.parse(buf);
                    handler(msg, `${socket.remoteAddress}:${socket.remotePort}`);
                } catch (e) {
                    console.error("Failed to parse incoming message:", e);
                }
            });
        });
        
        this.server.listen(this.port);
    }
}
