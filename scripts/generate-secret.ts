// scripts/generate-secret.ts
const secret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
  "hex",
);
console.log(secret);
