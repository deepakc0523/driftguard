/**
 * DriftGuard Key Writer — writes generated RSA PEM keys directly into .env
 * Run ONCE: node write-keys-to-env.js
 */
const forge = require('node-forge')
const fs = require('fs')
const path = require('path')

console.log('Generating 2048-bit RSA key pair...')
const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 })
const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey)
const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey)

const envPath = path.join(__dirname, '.env')
let envContent = fs.readFileSync(envPath, 'utf8')

// Escape newlines for .env single-line format
const escapedPrivate = privateKeyPem.replace(/\n/g, '\\n')
const escapedPublic = publicKeyPem.replace(/\n/g, '\\n')

envContent = envContent
  .replace(/^PRIVATE_KEY_PEM=.*/m, `PRIVATE_KEY_PEM=${escapedPrivate}`)
  .replace(/^PUBLIC_KEY_PEM=.*/m, `PUBLIC_KEY_PEM=${escapedPublic}`)

fs.writeFileSync(envPath, envContent, 'utf8')
console.log('✅ RSA keys written to backend/.env')
console.log('   Private key fingerprint:', require('js-sha3').sha3_256(publicKeyPem).slice(0, 16) + '...')
