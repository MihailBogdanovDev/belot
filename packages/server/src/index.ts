import { createServer } from './server.js';

const port = Number(process.env.PORT ?? 3000);
const { port: actual } = await createServer(port);
console.log(`Belot server listening on http://localhost:${actual}`);
