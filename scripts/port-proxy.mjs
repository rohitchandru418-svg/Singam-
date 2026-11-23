// Tiny TCP proxy: the workspace exposes two hosts, one per port (12000 and 12001), but the
// Next.js server listens on a single port. This forwards the second port to the first so both
// public links reach the same app. Usage: node scripts/port-proxy.mjs [listenPort] [targetPort]
import net from "node:net";

const LISTEN = Number(process.argv[2] ?? process.env.PROXY_PORT ?? 12001);
const TARGET = Number(process.argv[3] ?? process.env.PROXY_TARGET ?? 12000);

const server = net.createServer((client) => {
  const upstream = net.connect(TARGET, "127.0.0.1");
  const close = () => {
    client.destroy();
    upstream.destroy();
  };
  client.on("error", close);
  upstream.on("error", close);
  client.pipe(upstream).pipe(client);
});

server.on("error", (error) => {
  console.error(`port-proxy failed on ${LISTEN}: ${error.message}`);
  process.exit(1);
});

server.listen(LISTEN, "0.0.0.0", () => {
  console.log(`port-proxy ${LISTEN} -> 127.0.0.1:${TARGET}`);
});
