import { PeerNode } from "./peer";

const sender = new PeerNode({ name: "sender" });

const message = JSON.stringify({
  type: "alert",
  payload: { lat: 12.97, lng: 77.59, message: "help needed" },
  timestamp: Date.now(),
});

sender.start().then(async () => {
  await new Promise((r) => setTimeout(r, 1000));
  await sender.sendToFirstPeer(message);
  sender.stop();
});