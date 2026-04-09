import net from "net";
import { Bonjour, Service } from "bonjour-service";

const SERVICE_TYPE = "toursafe-p2p";

interface PeerOptions {
  name: string;
  port?: number;
}

export class PeerNode {
  private name: string;
  private port: number;
  private server: net.Server | null = null;
  private bonjour: Bonjour;
  private onMessage: ((from: string, data: string) => void) | null = null;
  constructor(opts: PeerOptions) {
    this.name = opts.name;
    this.port = opts.port || 0;
    this.bonjour = new Bonjour();
  }

  //start listening and send via mdns
  async start(): Promise<number> {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        let buf = "";
        socket.on("data", (chunk) => {
          buf += chunk.toString();
        });
        socket.on("end", () => {
          if (this.onMessage) {
            this.onMessage(socket.remoteAddress || "unknown", buf);
          }
        });
      });
      this.server.listen(this.port, () => {
        const addr = this.server!.address() as net.AddressInfo;
        this.port = addr.port;
        this.bonjour.publish({
          name: this.name,
          type: SERVICE_TYPE,
          port: this.port,
        });
        console.log(`[${this.name}] listening on port ${this.port}`);
        resolve(this.port);
      });
    });
  }

  //recieve msg
  onReceive(handler: (from: string, data: string) => void) {
    this.onMessage = handler;
  }

  //discover and send to first peer found
  sendToFirstPeer(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[${this.name}] searching for peers...`);
      const browser = this.bonjour.find({ type: SERVICE_TYPE });
      browser.on("up", (service: Service) => {
        if (service.name === this.name) return;
        const host = service.referer?.address || service.host;
        const port = service.port;
        console.log(`[${this.name}] found peer: ${service.name} at ${host}:${port}`);
        const client = net.createConnection({ host, port }, () => {
          client.end(message, () => {
            console.log(`[${this.name}] message sent`);
            browser.stop();
            resolve();
          });
        });
        client.on("error", (err) => reject(err));
      });
    });
  }

  //stop mdns
  stop() {
    this.bonjour.unpublishAll();
    this.bonjour.destroy();
    if (this.server) this.server.close();
    console.log(`[${this.name}] stopped`);
  }
}