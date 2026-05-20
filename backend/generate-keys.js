/**
 * DriftGuard Key Generator
 * Run this ONCE to generate your RSA key pair.
 * Copy the output into your backend/.env file.
 */
require('dotenv').config({ path: '../.env' })
const forge = require('node-forge')

console.log('Generating 2048-bit RSA key pair...')
const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 })
const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey)
const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey)

const privateLine = `PRIVATE_KEY_PEM=${privateKeyPem.replace(/\n/g, '\\n')}`
const publicLine = `PUBLIC_KEY_PEM=${publicKeyPem.replace(/\n/g, '\\n')}`

console.log('\n========== COPY THESE INTO backend/.env ==========\n')
console.log(privateLine)
console.log('\n')
console.log(publicLine)
console.log('\n====================================================')
console.log('\nDone! Paste the above two lines into backend/.env')
