import * as net from 'net';

const message = {
  type: 'SOS',
  emergencyId: 'test-001',
  originId: 'test-origin',
  originLat: 13.08,
  originLon: 80.27,
  message: 'Test SOS from laptop',
  ttl: 5,
  path: []
};

const client = net.createConnection({ port: 3001, host: 'localhost' }, () => {
  client.write(JSON.stringify(message));
  client.end();
  console.log('SOS sent');
});

client.on('error', (err) => {
  console.error('Could not connect to node on port 3001:', err.message);
});
