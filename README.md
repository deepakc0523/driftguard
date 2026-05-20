# 🔐 DriftGuard

> **Cryptographic Configuration Drift Detection & Security Observability Platform**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

DriftGuard bridges the gap between GitOps configurations and actual runtime environments. It uses high-grade cryptography — **RSA-2048, SHA3-256, and AES-256-GCM** — to mathematically verify that configuration changes are authorized, preventing unauthorized tampering, silent overrides, and security policy drift.

---

## 📸 Screenshots

> Dashboard · Drift Events · Audit Ledger · Change Requests

---

## 🧠 Core Architecture

```
GitHub Repo ──► CNP (Normalize) ──► PCID (Sign & Attest)
                                          │
Runtime Config ──► DIDE (Compare) ◄───────┘
                        │
               CSCS (Risk Score) ──► DriftEvent
                        │
               CLACB (Cross-Layer) ──► Change Request
                        │
               AuditLedger (Hashchain) ──► Immutable Log
```

---

## 🛡️ Cryptographic Modules (The Five Measures)

### 🔏 PCID — Policy Compliance Integrity Detection
The **notary** of the system. Converts config values into secure hashes and signs them with RSA-2048.

- Hashes each field: `SHA3-256(fieldPath:value@repoId)`
- Signs the attestation array: `Signature = Encrypt_PrivKey(SHA256(JSON(attestations)))`
- Private key stored securely in backend env; public key used for verification

### 🔍 DIDE — Drift Identification Engine
The **detective** that compares live state vs. baseline attestations.

| Result | Meaning |
|---|---|
| `AUTHORIZED` | Hashes match — no drift |
| `UNAUTHORIZED` | Hash mismatch — config changed without authorization |
| `SIGNATURE_BROKEN` | Signature invalid — possible DB tampering |

### 📐 CNP — Configuration Normalization Protocol
The **universal translator** for config formats.

Supports `.yaml`, `.yml`, `.json`, `.env`, `Dockerfile`. Flattens nested structures to dot-notation (e.g., `db.auth.username: admin`) and computes a collective SHA256 checksum.

### ⚖️ CSCS — Cloud Security Compliance System
The **risk auditor**. Calculates a mathematical risk score from three weighted properties:

| Property | Factor | Example |
|---|---|---|
| Field Importance | `secret/password/token` → 1.0 | `debug` → 0.2 |
| Infrastructure Layer | `secrets` → 2.5× | `scm` → 1.0× |
| Drift Direction | `DELETION` → 1.5× | `ADDITION` → 0.5× |

**Resulting Tiers:** `CRITICAL (≥0.80)` · `HIGH (≥0.55)` · `MEDIUM (≥0.25)` · `LOW (<0.25)`

### 🔗 CLACB — Cryptographic Layer Access Control Baseline
The **dependency linker**. Builds a cross-layer dependency graph during baselining and flags `Cross-Layer Authorization Gap` drifts when upstream changes lack downstream PCID verification.

---

## ⛓️ Immutable Audit Ledger

Every critical action is logged as a cryptographic block:

```
EntryHash = SHA3-256(eventType + payload + actorId + prevHash + timestamp)
```

Admins can trigger `/api/audit/verify` to traverse the full hashchain and detect any retroactive tampering.

---

## 🔒 Symmetric Encryption

GitHub OAuth tokens are encrypted at rest using **AES-256-GCM**:

```
Storage format: ${iv}:${authTag}:${ciphertext}  (hex)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- GitHub OAuth App credentials

### Installation

```bash
# Clone
git clone https://github.com/deepakc0523/driftguard.git
cd driftguard

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../client && npm install
```

### Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/driftguard
JWT_SECRET=your_jwt_secret_here
PRIVATE_KEY_PEM="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
PUBLIC_KEY_PEM="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
ENCRYPTION_KEY=your_32_byte_hex_key
```

> ⚠️ **Never commit `.env` to version control.**

### Run

```bash
# Backend
cd backend && npm run dev

# Frontend (new terminal)
cd client && npm run dev
```

Open `http://localhost:5173`

---

## 📡 API Reference

| Category | Endpoint | Description |
|---|---|---|
| Auth | `POST /api/auth/register` | Register user |
| Auth | `POST /api/auth/login` | Login (returns JWT) |
| GitHub | `GET /api/auth/github` | Initiate OAuth flow |
| Repos | `POST /api/repos` | Connect repository |
| Repos | `POST /api/repos/:id/baseline` | Capture & sign baseline |
| Repos | `POST /api/repos/:id/scan` | Run full drift scan |
| Repos | `GET /api/repos/:id/install-hook` | Download pre-commit hook |
| Drift | `GET /api/drift` | List all drift events |
| Change Requests | `GET /api/change-requests` | View governance workflow |
| Audit | `GET /api/audit` | View audit ledger |
| Audit | `POST /api/audit/verify` | Verify hashchain integrity |

---

## ⚓ Pre-Commit Hook

Developers can sign baselines **before** pushing:

1. Download hook: `GET /api/repos/:id/install-hook`
2. Place in `.git/hooks/pre-commit`
3. Make executable: `chmod +x .git/hooks/pre-commit`

On each local `git commit`, the hook packages modified config files and registers a signed `PcidRecord` on the server — so the subsequent server-side scan marks it `AUTHORIZED`.

---

## 🗄️ Data Models

| Model | Description |
|---|---|
| `User` | Credentials, role (admin/developer/viewer), encrypted GitHub token |
| `Repository` | Metadata, branch, baseline maps, dependency graphs |
| `PcidRecord` | RSA-signed attestations + public key fingerprint |
| `DriftEvent` | Detected drift details, severity, PCID references |
| `ChangeRequest` | Governance workflow: `DETECTED → SUBMITTED → APPROVED/REJECTED → RESOLVED` |
| `AuditEntry` | Immutable hashchain block |

---

## 🖥️ Frontend Pages

| Page | Description |
|---|---|
| **Dashboard** | Active drift count, critical indicators, last scan status |
| **Repositories** | Connect GitHub repos, capture baselines, download hooks |
| **Drift Events** | Color-coded severity log with field-level diff view |
| **Change Requests** | Developer submit / admin approve/reject governance flow |
| **Audit Log** | Chronological ledger + one-click hashchain verification |

---

## 🔐 Security Design Principles

- **Zero-trust config integrity** — every field is cryptographically attested
- **Tamper-evident storage** — hashchain detects retroactive DB edits
- **Encrypted credentials at rest** — AES-256-GCM for OAuth tokens
- **Role-based access control** — admin / developer / viewer separation
- **Pre-commit defense** — signs configs before they leave the developer's machine

---

## 👤 Author

**Deepak C** — M.Tech Software Engineering, VIT Vellore  
SCORE (School of Computer Science Engineering & Information Systems)  
[GitHub](https://github.com/deepakc0523)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
