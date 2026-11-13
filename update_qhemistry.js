const fs = require('fs');
let serverCode = fs.readFileSync('server.js', 'utf8');

// Add Qhemistry to whitelist registry if not present
const newRegistryEntries = `
  "qhemistry": { lane: "FLAGSHIP_PODCAST", host: "Juelz Santana & Lil Wayne", block: "Evening Prime Syndicate" },
  "gold booth": { lane: "FREESTYLE_FRIDAY", host: "School Heroes & Diamond Mic", block: "Late Night Weekend Vault" },
  "diamond mic": { lane: "FREESTYLE_FRIDAY", host: "School Heroes & Diamond Mic", block: "Late Night Weekend Vault" },
  "juelz": { lane: "FLAGSHIP_PODCAST", host: "Juelz Santana & Lil Wayne", block: "Evening Prime Syndicate" },
  "wayne": { lane: "FLAGSHIP_PODCAST", host: "Juelz Santana & Lil Wayne", block: "Evening Prime Syndicate" }
`;

if (!serverCode.includes('"qhemistry"')) {
  serverCode = serverCode.replace(
    'const whitelistRegistry = {',
    `const whitelistRegistry = {${newRegistryEntries},`
  );
  fs.writeFileSync('server.js', serverCode);
  console.log('⚡ QHEMISTRY REGISTRY BAKED INTO SERVER.JS ⚡');
}
