import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

function lanIpv4List() {
  return Object.values(networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const apiPort = process.env.PORT || '3000';
const tabletPort = process.env.TABLET_PORT || '5173';

console.log('Hanglian LAN demo launcher');
console.log('Use these addresses on an Android tablet connected to the same LAN:');
for (const ip of lanIpv4List()) {
  console.log(`Tablet UI: http://${ip}:${tabletPort}`);
  console.log(`API: http://${ip}:${apiPort}/api`);
  console.log(`Swagger: http://${ip}:${apiPort}/api/docs`);
}
console.log('This launcher starts local dev servers only; it does not connect to or write any database.');

const children = [
  spawn(npmCommand, ['run', 'dev:api:lan'], { stdio: 'inherit', env: process.env }),
  spawn(npmCommand, ['run', 'dev', '-w', 'tablet', '--', '--host', '0.0.0.0', '--port', tabletPort], { stdio: 'inherit', env: process.env }),
];

function stopAll() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGINT');
  }
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(143);
});

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
}
