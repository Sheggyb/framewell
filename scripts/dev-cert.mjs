// Creates a self-signed HTTPS certificate for testing on phones over the local network.
// Covers localhost plus this machine's current LAN IPs. Nothing is added to the OS trust
// store, so browsers show a one-time warning you tap through.
// Usage: node scripts/dev-cert.mjs   (re-run if your IP address changes)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { networkInterfaces } from "node:os";

const OUT_DIR = "certificates";

const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net.address);

const san = ["DNS:localhost", "IP:127.0.0.1", ...lanIps.map((ip) => `IP:${ip}`)].join(",");

// Git for Windows ships openssl but doesn't always put it on PATH.
const candidates = ["openssl", "C:\\Program Files\\Git\\usr\\bin\\openssl.exe", "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe"];
const openssl = candidates.find((bin) => {
  try {
    execFileSync(bin, ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});
if (!openssl) {
  console.error("openssl not found. Install Git for Windows or OpenSSL and try again.");
  process.exit(1);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR);
execFileSync(
  openssl,
  [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "365",
    "-keyout", `${OUT_DIR}/dev-key.pem`,
    "-out", `${OUT_DIR}/dev-cert.pem`,
    "-subj", "/CN=framewell-dev",
    "-addext", `subjectAltName=${san}`,
    // iOS rejects TLS certs without serverAuth EKU outright (no "visit anyway" option).
    "-addext", "extendedKeyUsage=serverAuth",
    "-addext", "keyUsage=critical,digitalSignature,keyEncipherment",
    "-addext", "basicConstraints=critical,CA:FALSE",
  ],
  { stdio: "pipe" },
);

console.log(`Certificate written to ${OUT_DIR}/ for: ${san.replaceAll(",", ", ")}`);
const phoneIps = lanIps.filter((ip) => ip.startsWith("192.168.") || ip.startsWith("10."));
for (const ip of phoneIps.length ? phoneIps : lanIps) console.log(`  Phone URL: https://${ip}:3000`);
