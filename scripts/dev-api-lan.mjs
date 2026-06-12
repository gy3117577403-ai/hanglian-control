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
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || '3000';

console.log('Starting Hanglian API for LAN tablet demo');
console.log(`HOST=${host} PORT=${port}`);
console.log(`Local API: http://localhost:${port}/api`);
for (const ip of lanIpv4List()) {
  console.log(`LAN API: http://${ip}:${port}/api`);
  console.log(`LAN Swagger: http://${ip}:${port}/api/docs`);
}
console.log('This script does not run migrations, seed, db push, or readonly DB checks.');

const child = spawn(npmCommand, ['run', 'start:dev', '-w', 'api'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    HOST: host,
    PORT: port,
  },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
