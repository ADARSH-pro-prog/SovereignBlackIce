# Sovereign Black Ice

> **A local-first AI knowledge integrity and impact-tracking system that detects document changes, compares policy claims, traces their downstream impact on AI answers, and routes potentially affected outputs for human review.**

Sovereign Black Ice is a document-aware AI integrity layer built around a simple problem: **an AI answer can remain correct at the moment it is generated, but become outdated when the source document changes later.**

The system maintains document versions, computes cryptographic fingerprints, extracts structured claims, indexes document evidence for retrieval, stores grounded AI answers, builds a dependency graph, detects claim changes between versions, and traces potentially affected answers. Instead of silently rewriting historical outputs, the system surfaces the change and sends it through a human-review workflow.

The project is designed as a **local-first** system. The current backend uses SQLite, ChromaDB, NetworkX, and Ollama, while the frontend is a React + TypeScript + Vite application.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Problem Statement](#2-problem-statement)
- [3. Core Idea](#3-core-idea)
- [4. Key Features](#4-key-features)
- [5. End-to-End Workflow](#5-end-to-end-workflow)
- [6. System Architecture](#6-system-architecture)
- [7. Knowledge Integrity Pipeline](#7-knowledge-integrity-pipeline)
- [8. Impact Analysis](#8-impact-analysis)
- [9. Human Review Workflow](#9-human-review-workflow)
- [10. Live Mode and Demo Mode](#10-live-mode-and-demo-mode)
- [11. Authentication](#11-authentication)
- [12. Technology Stack](#12-technology-stack)
- [13. Repository Structure](#13-repository-structure)
- [14. Backend Architecture](#14-backend-architecture)
- [15. Frontend Architecture](#15-frontend-architecture)
- [16. Data Model](#16-data-model)
- [17. Getting Started](#17-getting-started)
- [18. Backend Configuration](#18-backend-configuration)
- [19. Frontend Configuration](#19-frontend-configuration)
- [20. Running the Application](#20-running-the-application)
- [21. Using the Application](#21-using-the-application)
- [22. Recommended Demonstration](#22-recommended-demonstration)
- [23. API Overview](#23-api-overview)
- [24. Local Data Reset](#24-local-data-reset)
- [25. Testing](#25-testing)
- [26. Security and Privacy](#26-security-and-privacy)
- [27. Limitations](#27-limitations)
- [28. Troubleshooting](#28-troubleshooting)
- [29. Project Status](#29-project-status)
- [30. Future Improvements](#30-future-improvements)
- [31. Contributing](#31-contributing)
- [32. License](#32-license)

---

# 1. Project Overview

Sovereign Black Ice treats an AI knowledge base as a system that can **drift**.

Traditional RAG systems generally answer a question using whatever documents are currently retrievable. That is useful for generating new answers, but it does not by itself answer another important question:

> **Which previously generated AI answers were based on information that has since changed?**

Sovereign Black Ice adds a provenance and impact layer around document-based AI workflows.

The system tracks relationships such as:

```text
Document
   ↓
Document Version
   ↓
Claims / Chunks
   ↓
Evidence
   ↓
AI Answer
```

When a new version changes a claim, the system can traverse these relationships and identify answers that may have become outdated.

The core design principle is:

```text
Detect → Trace → Surface → Review
```

rather than:

```text
Detect → Silently Rewrite
```

---

# 2. Problem Statement

Organizations depend on documents such as:

- Internal policies
- Standard operating procedures
- Employee guidelines
- Security standards
- Compliance documents
- Operational manuals
- Rules containing deadlines, limits, thresholds, or requirements

An AI assistant may generate an answer using one version of such a document.

Later, the document may change.

For example:

### Version 1

```text
Employees must submit expense claims within 30 days.
```

The AI answers:

```text
Employees have 30 days to submit an expense claim.
```

### Version 2

The policy is changed to:

```text
Employees must submit expense claims within 15 days.
```

A new question can retrieve the new 15-day rule. However, an answer generated earlier may still contain the old 30-day rule.

Sovereign Black Ice identifies the document change and traces the changed knowledge to the historical answer so that a human reviewer can determine what should happen next.

---

# 3. Core Idea

The complete conceptual flow is:

```text
                 SOURCE DOCUMENT
                       │
                       ▼
                SHA-256 HASHING
                       │
                       ▼
               VERSION TRACKING
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   CLAIM EXTRACTION            TEXT CHUNKING
          │                         │
          ▼                         ▼
   CLAIM COMPARISON             CHROMADB
          │                         │
          │                         ▼
          │                    RAG RETRIEVAL
          │                         │
          │                         ▼
          │                  GROUNDED ANSWER
          │                         │
          └──────────┬──────────────┘
                     ▼
              NETWORKX GRAPH
                     │
                     ▼
              IMPACT ANALYSIS
                     │
                     ▼
             ALERT / REVIEW GATE
                     │
                     ▼
              HUMAN DECISION
```

---

# 4. Key Features

## 4.1 Document Management

The application supports source-document ingestion and management.

Current backend-supported upload formats are:

- `.txt`
- `.pdf`

The configured maximum upload size is **10 MB**.

For each new document, the backend:

1. Validates the file.
2. Sanitizes the filename.
3. Computes a SHA-256 hash of the uploaded bytes.
4. Extracts readable text.
5. Creates the document record.
6. Creates version 1.
7. Extracts claims.
8. Indexes the version for retrieval.

---

## 4.2 Immutable Version History

A document is represented as a sequence of versions.

Example:

```text
Policy.pdf
   ├── v1
   ├── v2
   └── v3
```

When a new version is uploaded, the system:

- Compares its SHA-256 hash with the current version.
- Avoids creating a duplicate version when the content is unchanged.
- Creates the next version number when content changes.
- Preserves historical versions.
- Extracts claims from the new version.
- Compares claims with the previous version.
- Indexes the new version.
- Runs impact analysis.

If new content matches an older version, the backend also detects the reversion while preserving the version history.

---

## 4.3 Cryptographic Fingerprinting

Each uploaded version receives a SHA-256 fingerprint based on its raw file bytes.

Conceptually:

```text
Raw document bytes
       │
       ▼
   SHA-256
       │
       ▼
Unique content fingerprint
```

This allows the application to distinguish identical content from changed content.

---

## 4.4 Claim Extraction

The claim extraction layer attempts to identify structured, verifiable statements from a document, including:

- Policy rules
- Numerical thresholds
- Deadlines
- Allowances
- Quotas
- Operational requirements
- Other factual or policy statements

The preferred extraction path uses the configured local Ollama model.

If Ollama is unreachable, the backend contains a deterministic heuristic fallback path.

The stored claim structure includes information such as:

```text
Subject
Predicate
Value
Unit
Category
Confidence
Source location
Version
```

This allows later versions to be compared at the claim level instead of relying only on raw text differences.

---

## 4.5 Claim Comparison

When a new version is processed, claims from the old and new versions can be compared.

The comparison system can identify categories such as:

- Added
- Removed
- Modified
- Unchanged
- Uncertain

Example:

```text
Previous:
Employees must submit within 30 days.

Current:
Employees must submit within 15 days.

Result:
MODIFIED
```

The comparison also records information such as the changed field, confidence, explanation, and whether human review is required.

---

## 4.6 Retrieval-Augmented Generation

Sovereign Black Ice contains a local RAG pipeline for document-grounded question answering.

The process is:

```text
User question
     │
     ▼
Semantic retrieval
     │
     ▼
Relevant ChromaDB chunks
     │
     ▼
Relevant claims/evidence
     │
     ▼
Ollama grounded generation
     │
     ▼
Answer + evidence
```

The RAG system is designed to ground responses in retrieved evidence rather than allowing the language model to answer from unrestricted general knowledge.

Stored answers retain links to their evidence so they can later participate in impact analysis.

---

## 4.7 Evidence Tracking

Evidence is retained as part of the answer record.

An answer can be associated with:

- Document
- Version
- Chunk
- Claim
- Page number
- Similarity score
- Citation text

This creates a provenance chain between the answer and the source material used to produce it.

---

## 4.8 NetworkX Dependency Graph

The graph layer represents relationships between knowledge entities.

The graph includes entities such as:

```text
Document
Version
Chunk
Claim
Answer
Claim Change
```

Important relationships include:

```text
Document ──HAS_VERSION──> Version
Version ──CONTAINS_CHUNK──> Chunk
Version ──CONTAINS_CLAIM──> Claim
Claim ──GROUNDS──> Answer
Chunk ──GROUNDS──> Answer
Version ──GROUNDS──> Answer
Claim Change ──MODIFIES──> Old Claim
Claim Change ──RESULTS_IN──> New Claim
```

The graph allows downstream relationships to be traversed when a claim changes.

---

# 5. End-to-End Workflow

The complete runtime pipeline is:

```text
┌─────────────────────┐
│  Upload Document    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Validate File       │
│ TXT/PDF, size       │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ SHA-256 Fingerprint │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Extract Text        │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Create Version      │
└──────────┬──────────┘
           ├───────────────────┐
           ▼                   ▼
┌─────────────────────┐  ┌─────────────────────┐
│ Extract Claims      │  │ Chunk + Index       │
│ Ollama / Fallback   │  │ ChromaDB            │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           │                        ▼
           │                ┌───────────────────┐
           │                │ RAG Question      │
           │                │ Answer + Evidence │
           │                └─────────┬─────────┘
           │                          │
           └────────────┬─────────────┘
                        ▼
              ┌────────────────────┐
              │ Version Comparison │
              └─────────┬──────────┘
                        ▼
              ┌────────────────────┐
              │ Claim Changes      │
              └─────────┬──────────┘
                        ▼
              ┌────────────────────┐
              │ Impact Analysis    │
              │ NetworkX traversal │
              └─────────┬──────────┘
                        ▼
              ┌────────────────────┐
              │ Alerts / Reviews   │
              └─────────┬──────────┘
                        ▼
              ┌────────────────────┐
              │ Human Review       │
              └────────────────────┘
```

---

# 6. System Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                         FRONTEND                           │
│                                                            │
│ React 19 + TypeScript + Vite + Tailwind CSS                │
│                                                            │
│ Login · Overview · Documents · AI Assistant                │
│ Impact Analysis · Review Center · Audit Log · Settings     │
└───────────────────────────┬────────────────────────────────┘
                            │ HTTP / JSON
                            │ Bearer JWT
                            ▼
┌────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                       │
│                                                            │
│ Authentication                                             │
│ Document APIs                                              │
│ Claims & Comparison APIs                                   │
│ RAG APIs                                                   │
│ Impact & Alert APIs                                        │
│ Health & System Status                                     │
│                                                            │
│                  Service Layer                             │
│ ┌────────────┐ ┌─────────────┐ ┌────────────────────────┐ │
│ │ Documents  │ │ Claims      │ │ RAG / Retrieval        │ │
│ └────────────┘ └─────────────┘ └────────────────────────┘ │
│ ┌────────────┐ ┌─────────────┐ ┌────────────────────────┐ │
│ │ Hashing    │ │ Comparison  │ │ Impact / Graph         │ │
│ └────────────┘ └─────────────┘ └────────────────────────┘ │
└───────────────┬───────────────┬──────────────┬─────────────┘
                │               │              │
                ▼               ▼              ▼
        ┌──────────────┐ ┌─────────────┐ ┌───────────────┐
        │   SQLite     │ │  ChromaDB   │ │    Ollama     │
        │ Metadata &   │ │ Vector      │ │ Local LLM     │
        │ relationships│ │ Retrieval   │ │               │
        └──────────────┘ └─────────────┘ └───────────────┘
                │
                ▼
        ┌──────────────────┐
        │ NetworkX         │
        │ Dependency Graph │
        └──────────────────┘
```

---

# 7. Knowledge Integrity Pipeline

Sovereign Black Ice maintains multiple layers of information rather than treating a document as one opaque object.

## Layer 1 — Source

The original uploaded file.

## Layer 2 — Version

A historical snapshot of that source, identified by version number and SHA-256 hash.

## Layer 3 — Text

Extracted text and page information.

## Layer 4 — Chunks

Searchable sections used by semantic retrieval.

## Layer 5 — Claims

Structured statements extracted from the document.

## Layer 6 — Answers

Questions answered using retrieved evidence.

## Layer 7 — Evidence

Links between answers and the exact document/version/chunk/claim evidence used.

## Layer 8 — Change

Differences between claims across versions.

## Layer 9 — Impact

Relationships from changed claims to potentially affected answers.

## Layer 10 — Human Review

A review gate where a person can inspect and resolve the detected impact.

---

# 8. Impact Analysis

Impact analysis is the feature that differentiates the system from a basic document version tracker.

A version change does not automatically mean every AI answer is invalid.

The system therefore attempts to trace the actual dependency path.

Example:

```text
Policy v1
   │
   ├── Claim: reimbursement deadline = 30 days
   │                  │
   │                  ▼
   │          Historical Answer A
   │          "You have 30 days..."
   │
   └── Other unrelated claims
                      │
                      ▼
               Other answers
```

After v2:

```text
Policy v2
   │
   ├── Claim: reimbursement deadline = 15 days
   │                  │
   │                  ▼
   │            CLAIM CHANGE
   │                  │
   │                  ▼
   │            IMPACT TRACE
   │                  │
   │                  ▼
   │          Historical Answer A
   │                  │
   │                  ▼
   │            Review Required
   │
   └── Unchanged claims → unrelated answers remain unaffected
```

The backend's `ImpactService` works with the NetworkX graph and stored claim changes to identify affected answers and create alerts.

---

# 9. Human Review Workflow

The system intentionally includes a human review gate.

```text
Changed Claim
     ↓
Potentially Affected Answer
     ↓
Alert Generated
     ↓
Review Center
     ↓
Human Investigation
     ↓
Decision
```

Possible review actions exposed by the current frontend include:

- Mark as reviewed / resolve
- Refresh affected answers
- Dismiss as false positive
- Escalate to committee

The review UI is designed around the principle that automated impact detection is a signal for human verification rather than an unquestionable decision.

---

# 10. Live Mode and Demo Mode

The frontend has two distinct data modes.

## Live Mode

Live Mode communicates with the real FastAPI backend.

It uses actual:

- SQLite records
- ChromaDB data
- Uploaded documents
- Extracted claims
- Versions
- Answers
- Evidence
- Alerts
- Review items
- Audit information

Uploading a document in Live Mode creates real backend data and triggers the actual processing pipeline.

## Demo Mode

Demo Mode uses frontend demonstration data from the project's demo-data layer.

It is intentionally isolated from Live Mode so that a demonstration can be run without requiring a populated backend repository.

The project includes explicit switching between Live and Demo modes rather than silently replacing backend failures with fake data.

This distinction is important:

```text
LIVE
  → Real backend data

DEMO
  → Demonstration data
```

---

# 11. Authentication

The current application supports Google Sign-In for user authentication.

The authentication flow is:

```text
User
 │
 ▼
Google Sign-In
 │
 ▼
Google ID Token
 │
 ▼
FastAPI /api/v1/auth/google
 │
 ▼
Google token verification
 │
 ▼
Local SQLite user record
 │
 ▼
Application JWT
 │
 ▼
Frontend localStorage
 │
 ▼
Bearer token on protected API calls
```

The backend validates:

- Google token validity
- Token audience against the configured Google client ID
- Verified Google email
- Required Google account identifiers

The application then issues a local JWT used to protect business APIs.

Protected backend areas include document, claim, RAG, and impact functionality.

For development/testing, the backend also contains a development login endpoint that is only permitted in development configuration.

---

# 12. Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React 19 | Component-based web UI |
| TypeScript | Static typing |
| Vite | Development server and production build |
| Tailwind CSS | Utility-first styling |
| React Router | Frontend routing |
| Lucide React | UI icons |
| Recharts | Data visualization |
| Motion | UI animation |
| React Three Fiber / Three.js | 3D/visual interface capabilities |
| XYFlow | Graph-oriented UI visualization |
| `@react-oauth/google` | Google authentication integration |

## Backend

| Technology | Purpose |
|---|---|
| Python | Backend implementation |
| FastAPI | HTTP API framework |
| Uvicorn | ASGI application server |
| Pydantic / pydantic-settings | Validation and configuration |
| SQLAlchemy | Database ORM |
| SQLite | Local relational persistence |
| ChromaDB | Local vector storage and semantic retrieval |
| NetworkX | Dependency graph and impact traversal |
| PyMuPDF | PDF text extraction |
| Google Auth | Google ID token verification |
| PyJWT | Application JWT sessions |
| HTTPX | HTTP communication, including Ollama checks |
| pytest | Automated backend testing |

## AI / Retrieval

| Component | Purpose |
|---|---|
| Ollama | Local language-model runtime |
| `llama3.2:3b` | Current configured local LLM default |
| `all-minilm` | Current configured embedding model name |
| ChromaDB | Vector retrieval |
| RAG pipeline | Evidence-grounded question answering |

---

# 13. Repository Structure

The repository is divided into frontend and backend applications:

```text
SovereignBlackIce/
│
├── Backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dependencies.py
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── claims.py
│   │   │       ├── documents.py
│   │   │       ├── health.py
│   │   │       ├── impact.py
│   │   │       └── rag.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── exceptions.py
│   │   │   ├── logging_config.py
│   │   │   └── security.py
│   │   │
│   │   ├── database/
│   │   │   ├── database.py
│   │   │   ├── models.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── repositories/
│   │   │   ├── alert_repository.py
│   │   │   ├── answer_repository.py
│   │   │   ├── chunk_repository.py
│   │   │   └── document_repository.py
│   │   │
│   │   ├── services/
│   │   │   ├── hashing_service.py
│   │   │   ├── text_extraction_service.py
│   │   │   ├── chunking_service.py
│   │   │   ├── vector_store_service.py
│   │   │   ├── claim_extraction_service.py
│   │   │   ├── claim_service.py
│   │   │   ├── claim_comparison_service.py
│   │   │   ├── document_service.py
│   │   │   ├── rag_service.py
│   │   │   ├── graph_service.py
│   │   │   └── impact_service.py
│   │   │
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── data/
│   ├── storage/
│   ├── scripts/
│   │   ├── run_demo.py
│   │   ├── reset_local_data.py
│   │   └── verification scripts
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── data/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── ...
│   ├── package.json
│   ├── .env.example
│   ├── index.html
│   └── vite configuration
│
└── README.md
```

---

# 14. Backend Architecture

The backend follows a layered architecture.

```text
HTTP Request
     │
     ▼
API Route
     │
     ▼
Service Layer
     │
     ├──────────────► Repository Layer ─────► SQLite
     │
     ├──────────────► Vector Store ─────────► ChromaDB
     │
     ├──────────────► Ollama
     │
     └──────────────► NetworkX
```

## API Layer

`Backend/app/api/routes/` contains HTTP endpoint definitions.

## Service Layer

Services contain the application's domain logic.

Examples:

- `DocumentService` — document validation, hashing, storage, version creation, and processing orchestration.
- `ClaimExtractionService` — structured claim extraction.
- `ClaimComparisonService` — cross-version claim comparison.
- `RAGService` — indexing, semantic retrieval, and grounded question answering.
- `GraphService` — dependency graph construction and traversal.
- `ImpactService` — impact analysis and alert generation.
- `HashingService` — SHA-256 content fingerprinting.
- `TextExtractionService` — TXT/PDF text extraction.

## Repository Layer

Repositories isolate persistence operations from service logic.

Examples include document, answer, chunk, and alert repositories.

## Database Layer

SQLAlchemy models represent the application's structured records, while Pydantic schemas define API contracts.

---

# 15. Frontend Architecture

The frontend is a React application written in TypeScript.

The major architectural pieces are:

```text
React UI
   │
   ├── Pages
   │
   ├── Components
   │
   ├── AppContext
   │
   └── API Service
             │
             ▼
        FastAPI Backend
```

## AppContext

The application context coordinates global application state such as:

- Current user
- Authentication state
- Live/Demo mode
- Documents
- Review items
- Audit events
- Backend status
- Toast notifications
- Upload actions
- Review actions
- Impact analysis actions

## API Service

`Frontend/src/services/api.ts` centralizes backend communication.

The API base URL is configured through:

```text
VITE_API_BASE_URL
```

The service automatically attaches the stored application JWT as a Bearer token for authenticated API requests.

---

# 16. Data Model

At a conceptual level, the backend maintains these major entities:

```text
User
 │
 └── authentication/session identity

Document
 │
 └── DocumentVersion
       │
       ├── EvidenceChunk
       └── Claim
             │
             └── ClaimChange

Answer
 │
 └── AnswerEvidence

Alert
 │
 ├── Document / Version
 ├── Claim Change
 └── Affected Answer
```

This can be visualized as:

```text
Document
   │
   ├── Version 1 ──┐
   │                ├── Claims
   │                └── Chunks
   │
   └── Version 2 ──┐
                    ├── Claims
                    └── Chunks
                         │
                         ▼
                    Claim Changes
                         │
                         ▼
                       Alerts
                         │
                         ▼
                      Answers
```

The graph service then builds a runtime dependency graph from these records.

---

# 17. Getting Started

## Prerequisites

Install:

- Git
- Python 3.12
- Node.js and npm
- Ollama for local AI inference

Check the installed versions:

```powershell
python --version
node --version
npm --version
git --version
```

---

## Clone the repository

```powershell
git clone https://github.com/ADARSH-pro-prog/SovereignBlackIce.git
cd SovereignBlackIce
```

---

## Backend setup

```powershell
cd Backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell activation is unavailable, the virtual environment's Python can be used directly:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

---

## Frontend setup

Open another terminal:

```powershell
cd "C:\path\to\SovereignBlackIce\Frontend"
npm install
```

---

# 18. Backend Configuration

Backend configuration is managed through environment variables and `.env`.

Start from the provided example:

```powershell
cd Backend
Copy-Item .env.example .env
```

The current configuration class defines values such as:

```text
APP_NAME=Sovereign Black Ice
APP_ENV=development
DEBUG=True
HOST=0.0.0.0
PORT=8000
DATABASE_URL=sqlite:///./data/database.db
STORAGE_DIR=./storage
CHROMA_DIR=./storage/chroma
MAX_UPLOAD_SIZE_MB=10
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
EMBEDDING_MODEL=all-minilm
GOOGLE_CLIENT_ID=<your-client-id>
JWT_SECRET_KEY=<development-secret>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
```

The exact values should be kept in `.env` and should not be committed if they contain secrets.

### CORS

The backend currently includes local frontend origins such as:

```text
http://localhost:3000
http://127.0.0.1:3000
http://localhost:5173
http://127.0.0.1:5173
http://localhost:8081
```

If the frontend is moved to a different origin, the backend CORS configuration must be updated accordingly.

---

# 19. Frontend Configuration

The frontend uses Vite environment variables.

Create a local `.env` from the example if required:

```powershell
cd Frontend
Copy-Item .env.example .env
```

Important variables include:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

`VITE_API_BASE_URL` determines where the browser sends backend requests.

Do not place private secrets in Vite variables. Vite variables exposed to frontend code should be treated as public configuration.

---

# 20. Running the Application

The normal local development setup uses two terminals.

## Terminal 1 — Backend

From the repository root:

```powershell
cd Backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

ReDoc:

```text
http://127.0.0.1:8000/redoc
```

OpenAPI JSON:

```text
http://127.0.0.1:8000/api/v1/openapi.json
```

Health check:

```text
http://127.0.0.1:8000/health
```

---

## Terminal 2 — Frontend

```powershell
cd Frontend
npm run dev
```

The current frontend package is configured to use port `3000`:

```text
http://localhost:3000
```

The Vite dev server is configured with `--host 0.0.0.0`.

---

# 21. Using the Application

A typical Live Mode workflow is:

### Step 1 — Login

Use Google Sign-In.

For development/testing, a development login path is also available when backend development mode allows it.

### Step 2 — Open Documents

Navigate to the Documents section.

Upload a `.txt` or `.pdf` file within the configured size limit.

### Step 3 — Processing

The backend creates:

```text
Document
   ↓
Version 1
   ↓
SHA-256
   ↓
Extracted text
   ↓
Claims
   ↓
Chunks
   ↓
ChromaDB index
```

### Step 4 — Ask a Question

Open the AI Assistant and ask a question whose answer should be present in the uploaded document.

The RAG pipeline retrieves evidence and produces a grounded response.

### Step 5 — Create a New Version

Upload a modified version of the same document.

The backend creates the next version and automatically processes its claims, comparison, indexing, and impact analysis.

### Step 6 — Inspect Comparison

The version comparison identifies changed claims.

### Step 7 — Inspect Impact Analysis

The graph shows relationships among the changed knowledge and stored answers.

### Step 8 — Review Alerts

Potentially affected answers appear in the Review Center.

### Step 9 — Human Decision

The reviewer can inspect the evidence and choose the appropriate review action.

---

# 22. Recommended Demonstration

The following scenario demonstrates the project's core concept clearly.

## 1. Create Version 1

Create a text file called:

```text
travel_policy.txt
```

Example content:

```text
Travel Reimbursement Policy

Employees must submit travel reimbursement claims within 30 days of the travel date.
Valid receipts must be attached to every reimbursement claim.
```

Upload it.

---

## 2. Ask the AI

Ask:

```text
How many days does an employee have to submit a reimbursement claim?
```

Expected knowledge:

```text
30 days
```

Inspect the evidence associated with the answer.

---

## 3. Create Version 2

Modify the policy:

```text
Employees must submit travel reimbursement claims within 15 days of the travel date.
Valid receipts must be attached to every reimbursement claim.
```

Upload it as a new version.

---

## 4. Compare Versions

The system should detect that the deadline changed.

Conceptually:

```text
30 days
   ↓
15 days
   ↓
MODIFIED CLAIM
```

---

## 5. Analyze Impact

The system traces the changed claim through the dependency graph.

If an earlier answer was grounded in the old version, it may be identified as potentially affected.

---

## 6. Review

Open Review Center and inspect the affected answer and the source change.

The reviewer then makes the human decision.

---

# 23. API Overview

The FastAPI application exposes versioned APIs under:

```text
/api/v1
```

The exact request and response schemas are available in Swagger at `/docs`.

## Authentication

```text
POST /api/v1/auth/google
GET  /api/v1/auth/me
POST /api/v1/auth/logout
POST /api/v1/auth/dev-login
```

## Health

```text
GET /health
GET /api/v1/health
GET /api/v1/system/status
```

## Documents

```text
POST   /api/v1/documents/upload
GET    /api/v1/documents
GET    /api/v1/documents/{document_id}
DELETE /api/v1/documents/{document_id}
GET    /api/v1/documents/{document_id}/versions
GET    /api/v1/documents/{document_id}/versions/{version_id}
GET    /api/v1/documents/{document_id}/versions/{version_id}/text
POST   /api/v1/documents/{document_id}/versions
```

## Claims and comparison

```text
POST /api/v1/documents/{document_id}/versions/{version_id}/claims/extract
GET  /api/v1/documents/{document_id}/versions/{version_id}/claims
GET  /api/v1/documents/{document_id}/claims
GET  /api/v1/claims/{claim_id}
GET  /api/v1/documents/{document_id}/compare
POST /api/v1/documents/{document_id}/compare
GET  /api/v1/documents/{document_id}/changes
```

## RAG and answers

```text
POST /api/v1/documents/{document_id}/versions/{version_id}/index
GET  /api/v1/documents/{document_id}/versions/{version_id}/chunks
POST /api/v1/search
POST /api/v1/qa/ask
GET  /api/v1/answers
GET  /api/v1/answers/{answer_id}
```

## Impact and alerts

```text
POST  /api/v1/impact/analyze
GET   /api/v1/impact/graph
GET   /api/v1/alerts
GET   /api/v1/alerts/{alert_id}
PATCH /api/v1/alerts/{alert_id}/resolve
GET   /api/v1/answers/{answer_id}/impact
```

All business APIs are protected by the backend's current authenticated-user dependency.

---

# 24. Local Data Reset

During development, repeated testing can accumulate documents, claims, answers, vectors, and alerts in the local Live repository.

The repository includes:

```text
Backend/scripts/reset_local_data.py
```

It is intentionally destructive and requires an explicit confirmation flag.

Run:

```powershell
cd Backend
.\venv\Scripts\Activate.ps1
python scripts/reset_local_data.py --confirm
```

The reset utility clears application Live data including:

- Documents
- Document versions
- Claims
- Claim changes
- Evidence chunks
- Answers
- Answer evidence
- Alerts
- Stored uploaded document directories
- ChromaDB vectors

It preserves the SQLite schema, source code, `.env`, authentication users by default, tests, and Demo Mode data.

To also remove local user profiles:

```powershell
python scripts/reset_local_data.py --confirm --include-users
```

### Important

Do not run the reset command against a production database or a directory containing data that must be preserved.

---

# 25. Testing

The backend contains automated tests under:

```text
Backend/tests/
```

Run the backend tests from the `Backend` directory:

```powershell
pytest
```

For a more verbose run:

```powershell
pytest -v
```

Frontend TypeScript validation:

```powershell
cd Frontend
npm run lint
```

Production frontend build:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run preview
```

A useful pre-commit verification sequence is:

```powershell
cd Backend
pytest

cd ..\Frontend
npm run lint
npm run build
```

---

# 26. Security and Privacy

Sovereign Black Ice is designed to support local-first operation, but **local-first is not automatically the same as secure or fully offline**.

## Data locality

When configured entirely with local services, the primary processing components are local:

```text
Document
   ↓
Local FastAPI
   ↓
SQLite / ChromaDB
   ↓
Local Ollama
```

However, Google Sign-In requires communication with Google during authentication, and other integrations may introduce external communication depending on configuration.

## Secrets

Never commit:

- `.env`
- Google OAuth secrets
- JWT secrets intended for production
- Private documents
- Local databases
- Credentials

## JWT

The backend issues local JWT access tokens after authentication.

The development configuration contains a default JWT secret value intended to be replaced for production use.

## CORS

Only trusted frontend origins should be configured for production deployments.

## Human review

The system should not be treated as an autonomous compliance or legal decision-maker. Detected changes and impacted answers require appropriate human verification.

---

# 27. Limitations

## AI-generated claims are not guaranteed to be perfect

Claim extraction can miss subtle meaning or produce incorrect interpretations.

## Semantic comparison is not legal interpretation

A detected `MODIFIED` claim means the system detected a meaningful difference according to its comparison logic. It does not establish legal significance.

## RAG answers require verification

Even when evidence is attached, users should verify important answers against the source document.

## Impact analysis depends on provenance

If an answer was not properly linked to source evidence, impact tracing cannot reliably determine whether that answer depends on a changed claim.

## Local model performance depends on hardware

Ollama inference speed and model quality depend on available CPU/GPU/RAM and the selected model.

## Prototype / hackathon scope

The project is intended as a working prototype and hackathon system. Production use with sensitive organizational information would require additional security, access control, deployment, observability, backup, and governance work.

---

# 28. Troubleshooting

## Backend says port 8000 is already in use

Do not automatically start a second backend.

First check whether the existing backend is healthy:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

A healthy response resembles:

```text
status : ok
app_name : Sovereign Black Ice
version : 0.1.0
```

If the health endpoint works, the backend is already running.

---

## Frontend cannot connect to backend

Check:

```text
Frontend VITE_API_BASE_URL
        ↓
http://127.0.0.1:8000
```

Then verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Also check backend CORS origins.

---

## Ollama is disconnected

Check that Ollama is running.

The default backend target is:

```text
http://localhost:11434
```

You can inspect installed models with:

```powershell
ollama list
```

The configured default model is:

```text
llama3.2:3b
```

The backend also contains a deterministic claim-extraction fallback when Ollama cannot be reached.

---

## Review Center has no alerts

This is expected when the Live repository has no unresolved impact alerts.

A review item is normally produced after the workflow:

```text
Document v1
   ↓
Question / stored answer
   ↓
Document v2
   ↓
Changed claim
   ↓
Impact analysis
   ↓
Affected answer
   ↓
Alert
   ↓
Review Center
```

---

## Live Mode contains old test data

Use the local reset utility:

```powershell
cd Backend
python scripts/reset_local_data.py --confirm
```

Then restart/reconnect the application and verify Live Mode begins empty.

Demo Mode data is intentionally separate and should remain available after a normal reset.

---

# 29. Project Status

Sovereign Black Ice currently provides an end-to-end prototype covering:

- Google authentication
- Protected application APIs
- Document upload
- SHA-256 document fingerprinting
- Document version history
- TXT/PDF text extraction
- Claim extraction
- Ollama-based claim extraction with heuristic fallback
- Claim comparison
- ChromaDB indexing
- Semantic search
- RAG question answering
- Answer evidence tracking
- NetworkX dependency graph
- Version-change impact analysis
- Impact alerts
- Human review workflow
- Live Mode
- Demo Mode
- Local development data reset
- Backend automated tests
- Frontend TypeScript checking and production builds

The repository is primarily structured for local development and demonstration.

---

# 30. Future Improvements

Potential future improvements include:

### Deployment

- Production-grade backend hosting
- Persistent managed database options
- Persistent vector-store deployment
- Production model serving
- Secure secrets management
- HTTPS and deployment hardening

### AI and retrieval

- Stronger claim extraction validation
- Better semantic contradiction detection
- More robust citation verification
- Multiple embedding-model support
- Better retrieval evaluation

### Impact analysis

- More sophisticated dependency scoring
- Improved semantic impact ranking
- Better stale-answer detection
- More detailed blast-radius visualization
- Automated answer regeneration workflows with governance controls

### Governance

- Role-based access control
- Reviewer roles
- Approval policies
- Richer audit records
- Exportable compliance reports

### Documents

- Additional file formats
- OCR for scanned PDFs
- Better table extraction
- Document metadata enrichment

### Testing

- Larger regression suite
- More frontend end-to-end tests
- Load testing
- Retrieval quality benchmarks
- Security testing

---

# 31. Contributing

Contributions are welcome.

Recommended workflow:

```text
Create branch
    ↓
Make focused change
    ↓
Add/update tests
    ↓
Run backend tests
    ↓
Run frontend typecheck/build
    ↓
Review git diff
    ↓
Commit
    ↓
Push branch
```

Before committing, check:

```powershell
git status
git diff
```

Avoid committing:

```text
.env
venv/
.venv/
node_modules/
dist/
local databases
private uploaded documents
ChromaDB runtime data
credentials/secrets
```

---

# 32. License

No open-source license has currently been specified for this repository.

Unless a license is added, the code should not be assumed to grant permission for unrestricted reuse, modification, or redistribution.

---

# Architecture Summary

For a quick technical overview:

```text
                         SOVEREIGN BLACK ICE
                                  │
                    Local-First Knowledge Integrity
                                  │
              ┌───────────────────┴──────────────────┐
              │                                      │
          FRONTEND                                BACKEND
              │                                      │
     React + TypeScript                         FastAPI
          + Vite                                  │
      + Tailwind CSS                              │
              │                    ┌───────────────┼────────────────┐
              │                    │               │                │
              │                 SQLite          ChromaDB          Ollama
              │                    │               │                │
              │                    └───────┬───────┘                │
              │                            │                        │
              │                         NetworkX                    │
              │                            │                        │
              └─────────────── HTTP ───────┴────────────────────────┘
                                           │
                                           ▼
                              Document → Version → Claims
                                           │
                                           ▼
                                  RAG → Answer → Evidence
                                           │
                                           ▼
                              Change Detection → Impact
                                           │
                                           ▼
                                    Human Review
```

## The central principle

> **Sovereign Black Ice does not only ask what the AI knows now. It tracks how that knowledge changed and which previously generated answers may have depended on the changed information.**

---

## Repository

GitHub:

https://github.com/ADARSH-pro-prog/SovereignBlackIce
