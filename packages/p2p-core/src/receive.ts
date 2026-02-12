import { PeerNode } from "./peer";

const receiver = new PeerNode({ name: "receiver" });

receiver.onReceive((from, data) => {
  console.log(`received from ${from}: ${data}`);
  setTimeout(() => receiver.stop(), 500);
});

receiver.start().then(() => {
  console.log("waiting for messages...");
});