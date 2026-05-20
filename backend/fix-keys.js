/**
 * DriftGuard Key Fixer
 * Regens keys and writes them as a single line with escaped \n, quoted.
 */
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error('No .env found');
    process.exit(1);
}

console.log('Regenerating 2048-bit RSA key pair...');
const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

// Single line with \n escaped, wrapped in ""
const escapedPrivate = `"${privateKeyPem.replace(/\r?\n/g, '\\n')}"`;
const escapedPublic = `"${publicKeyPem.replace(/\r?\n/g, '\\n')}"`;

let envContent = fs.readFileSync(envPath, 'utf8');

// Use a regex that handles the multi-line mess I created previously
// We want to replace everything from PRIVATE_KEY_PEM= until the next key or end of section
envContent = envContent.replace(/PRIVATE_KEY_PEM=([.\s\S]*?)PUBLIC_KEY_PEM=/, `PRIVATE_KEY_PEM=${escapedPrivate}\nPUBLIC_KEY_PEM=`);
envContent = envContent.replace(/PUBLIC_KEY_PEM=([.\s\S]*?)PORT=/, `PUBLIC_KEY_PEM=${escapedPublic}\nPORT=`);

fs.writeFileSync(envPath, envContent, 'utf8');
console.log('✅ PEM keys fixed in .env');
