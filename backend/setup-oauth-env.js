/**
 * Setup OAuth Env
 * Adds GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and ENCRYPTION_KEY to .env
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

const encKey = crypto.randomBytes(32).toString('hex');

const newVars = [
    '',
    '# GitHub OAuth',
    'GITHUB_CLIENT_ID=your_github_client_id_here',
    'GITHUB_CLIENT_SECRET=your_github_client_secret_here',
    `ENCRYPTION_KEY=${encKey}`,
    ''
].join('\n');

if (!envContent.includes('GITHUB_CLIENT_ID')) {
    fs.appendFileSync(envPath, newVars);
    console.log('✅ Added GITHUB and ENCRYPTION placeholders to .env');
} else {
    console.log('ℹ️ GITHUB variables already exist in .env');
}
