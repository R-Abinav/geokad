// GeoKad Service — WebSocket transport for phone-to-phone SOS
// Connects to a relay node (laptop or any device running geokad-mdns-node)
// Phone A sends SOS → relay → Phone B receives instantly via WebSocket

type SOSHandler = (event: any) => void;
type PeerCountHandler = (count: number) => void;
type SosAckHandler = (peersNotified: number) => void;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const sosHandlers: SOSHandler[] = [];
const peerCountHandlers: PeerCountHandler[] = [];
const sosAckHandlers: SosAckHandler[] = [];
const seen = new Set<string>();
let _relayAddress: string | null = null;
let _connected = false;
let _peerCount = 0;

// ── Connection to relay node ─────────────────────────────

export function connectToRelay(relayAddress: string): void {
  _relayAddress = relayAddress;
  _doConnect(relayAddress);
}

function _doConnect(relayAddress: string): void {
  try {
    // Close existing connection
    if (ws) {
      ws.close();
      ws = null;
    }

    const wsUrl = `ws://${relayAddress}`;
    console.log(`🔌 Connecting to relay: ${wsUrl}`);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      _connected = true;
      console.log('✅ Connected to relay node');
      // Start keepalive
      const pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        } else {
          clearInterval(pingInterval);
        }
      }, 15000);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
        
        if (msg.type === 'sos') {
          // Incoming SOS from another phone
          const sosData = msg.data;
          if (!seen.has(sosData.emergencyId)) {
            seen.add(sosData.emergencyId);
            console.log('📱 SOS RECEIVED:', sosData.message);
            sosHandlers.forEach(h => h(sosData));
          }
        } else if (msg.type === 'sos_ack') {
          console.log(`✅ SOS acknowledged, ${msg.peersNotified} peers notified`);
          sosAckHandlers.forEach(h => h(msg.peersNotified));
        } else if (msg.type === 'peers') {
          _peerCount = msg.count;
          peerCountHandlers.forEach(h => h(msg.count));
        } else if (msg.type === 'welcome') {
          _peerCount = msg.peerCount;
          console.log(`📡 Relay node: ${msg.nodeId}, ${msg.peerCount} peers connected`);
          peerCountHandlers.forEach(h => h(msg.peerCount));
        }
      } catch (e) {
        console.log('Failed to parse relay message:', e);
      }
    };

    ws.onclose = () => {
      _connected = false;
      console.log('🔌 Disconnected from relay');
      // Auto-reconnect after 3 seconds
      if (_relayAddress) {
        reconnectTimer = setTimeout(() => _doConnect(_relayAddress!), 3000);
      }
    };

    ws.onerror = (error: Event) => {
      console.log('WebSocket error (relay unreachable)');
      _connected = false;
    };

  } catch (e) {
    console.log('Failed to connect to relay:', e);
    _connected = false;
    // Retry
    if (_relayAddress) {
      reconnectTimer = setTimeout(() => _doConnect(_relayAddress!), 3000);
    }
  }
}

// ── Public API ───────────────────────────────────────────

export function sendSOS(message: string): void {
  const emergencyId = `sos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const sosMsg = {
    type: 'SOS',
    emergencyId,
    originId: 'mobile-node',
    message,
    ttl: 5,
    path: [],
    timestamp: Date.now()
  };

  seen.add(emergencyId);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(sosMsg));
    console.log('📡 SOS sent via WebSocket');
  } else {
    console.log('❌ Not connected to relay — SOS not sent');
  }
}

export function onSOS(handler: SOSHandler): void {
  sosHandlers.push(handler);
}

export function onPeerCount(handler: PeerCountHandler): void {
  peerCountHandlers.push(handler);
}

export function onSosAck(handler: SosAckHandler): void {
  sosAckHandlers.push(handler);
}

export function isConnected(): boolean {
  return _connected;
}

export function getPeerCount(): number {
  return _peerCount;
}

export function disconnect(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  _relayAddress = null;
  if (ws) {
    ws.close();
    ws = null;
  }
  _connected = false;
}

export default { connectToRelay, sendSOS, onSOS, onPeerCount, onSosAck, isConnected, getPeerCount, disconnect };
