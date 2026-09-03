import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const colors = {
  api: '\x1b[34m',    // Blue
  worker: '\x1b[35m', // Magenta
  web: '\x1b[32m',    // Green
  ngrok: '\x1b[33m',  // Yellow
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Ensure common paths like Homebrew (/opt/homebrew/bin) are in PATH
const extendedPath = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  process.env.PATH || ''
].filter(Boolean).join(':');

const services = [
  { name: 'API', color: colors.api, cmd: 'yarn', args: ['workspace', '@recovery/api', 'dev'] },
  { name: 'WORKER', color: colors.worker, cmd: 'yarn', args: ['workspace', '@recovery/worker', 'dev'] },
  { name: 'WEB', color: colors.web, cmd: 'yarn', args: ['workspace', 'web', 'dev'] },
  { name: 'NGROK', color: colors.ngrok, cmd: 'ngrok', args: ['http', '4000', '--log=stdout'] }
];

const children = [];

function log(service, data) {
  const lines = data.toString().split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length > 0) {
      // Highlight ngrok tunnel URL when detected
      if (service.name === 'NGROK') {
        const urlMatch = line.match(/url=(https:\/\/[^\s]+)/);
        if (urlMatch) {
          const tunnelUrl = urlMatch[1];
          console.log(`\n${colors.bold}${colors.ngrok}══════════════════════════════════════════════════════════════════════════════${colors.reset}`);
          console.log(`${colors.bold}${colors.ngrok}🔗 NGROK TUNNEL ONLINE:   ${tunnelUrl}${colors.reset}`);
          console.log(`${colors.bold}${colors.ngrok}📡 Razorpay Webhook URL:  ${tunnelUrl}/webhooks/razorpay${colors.reset}`);
          console.log(`${colors.bold}${colors.ngrok}══════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
          continue;
        }
      }
      console.log(`${service.color}[${service.name}]${colors.reset} ${line}`);
    }
  }
}

console.log(`${colors.bold}🚀 Starting all services (API, Worker, Web, Ngrok) in this terminal...${colors.reset}\n`);

for (const s of services) {
  const proc = spawn(s.cmd, s.args, {
    cwd: rootDir,
    shell: true,
    env: { ...process.env, PATH: extendedPath, FORCE_COLOR: '1' }
  });

  proc.stdout.on('data', (d) => log(s, d));
  proc.stderr.on('data', (d) => log(s, d));

  proc.on('close', (code) => {
    if (code !== null && code !== 0) {
      console.log(`${s.color}[${s.name}]${colors.reset} exited with code ${code}`);
    }
  });

  children.push(proc);
}

function shutdown() {
  console.log(`\n🛑 Shutting down all services...`);
  for (const proc of children) {
    try {
      proc.kill('SIGINT');
    } catch (e) {}
  }
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
