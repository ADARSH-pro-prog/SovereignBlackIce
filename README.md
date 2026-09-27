# Sovereign Black Ice

> **A local-first AI knowledge integrity and impact-tracking system that
> helps teams detect changes in trusted documents and identify AI
> answers that may need review.**

Sovereign Black Ice is designed to reduce the risk of relying on
outdated or altered knowledge. It maintains document versions, extracts
and compares claims, connects evidence to generated answers, and helps
users understand which prior outputs may be affected when a source
changes.

This repository contains the backend API and frontend application.

------------------------------------------------------------------------

## Table of Contents

-   [Project Overview](#project-overview)
-   [Problem Statement](#problem-statement)
-   [Key Features](#key-features)
-   [How It Works](#how-it-works)
-   [System Architecture](#system-architecture)
-   [Technology Stack](#technology-stack)
-   [Repository Structure](#repository-structure)
-   [Getting Started](#getting-started)
-   [Configuration](#configuration)
-   [Running the Application](#running-the-application)
-   [Using the Application](#using-the-application)
-   [API Documentation](#api-documentation)
-   [Data and Privacy](#data-and-privacy)
-   [Limitations](#limitations)
-   [Roadmap](#roadmap)
-   [Contributing](#contributing)
-   [License](#license)

------------------------------------------------------------------------

## Project Overview

Organizations rely on policies, manuals, standard operating procedures,
and other internal documents to make decisions. When those documents
change, AI-generated answers based on older versions can become
inaccurate---even if the answer was correct when it was created.

Sovereign Black Ice introduces a knowledge-integrity layer around
document-based AI workflows. It tracks source versions, compares
extracted claims, preserves relationships between evidence and outputs,
and surfaces potentially impacted answers for review.

### Core idea

**Document → Version tracking → Claim extraction and comparison →
Evidence-linked AI answer → Impact analysis → Human review**

The system is intended for workflows such as internal policy assistance,
operational documentation, and knowledge management. It is designed with
local-first components so that document processing and AI inference can
be run on infrastructure controlled by the operator, subject to the
configured models and services.

------------------------------------------------------------------------

## Problem Statement

A document-based AI assistant can continue using old information after a
source document is updated. Conventional retrieval systems may retrieve
the latest content for new questions, but they do not necessarily
identify previously generated answers that depended on a superseded
rule.

For example:

1.  A policy says that an expense report must be submitted within **30
    days**.
2.  An AI assistant answers a user's question using that policy.
3.  A newer policy changes the deadline to **15 days**.
4.  The earlier answer may now be outdated.
5.  The system should identify the change and surface the earlier answer
    for review.

Sovereign Black Ice aims to make this dependency and change visible
instead of treating each AI answer as an isolated response.

------------------------------------------------------------------------

## Key Features

### 1. Document management and versioning

-   Upload and manage source documents.
-   Maintain document versions and source metadata.
-   Use document integrity information to help identify changes.
-   Keep source material available for later comparison and review.

### 2. Claim extraction and comparison

-   Extract factual claims or policy statements from document content.
-   Compare claims across document versions.
-   Surface additions, removals, and potential changes in meaning for
    inspection.
-   Treat automated comparisons as signals for review, not as guaranteed
    legal or factual judgments.

### 3. Retrieval-augmented question answering

-   Ask questions against indexed document content.
-   Retrieve relevant document passages to support answers.
-   Generate responses using the configured language model.
-   Preserve evidence references where supported by the backend.

### 4. Impact analysis

-   Connect documents, claims, and generated answers through
    relationships in the knowledge graph.
-   Trace which stored outputs may depend on a changed claim or source.
-   Surface potentially affected answers so a reviewer can determine
    whether they need updating.

### 5. Review and audit support

-   Help reviewers inspect detected changes and affected outputs.
-   Provide a basis for tracking decisions and reviewing document
    history, depending on the enabled application features.

### 6. Local-first architecture

-   Supports local services and storage components, including a locally
    hosted language model when configured.
-   Reduces reliance on external AI APIs when all required services are
    run locally.
-   Actual privacy and offline behavior depend on configuration, model
    availability, and any external integrations.

------------------------------------------------------------------------

## How It Works

### End-to-end workflow

``` text
Source document uploaded
        |
        v
Text extraction and normalization
        |
        v
Document version and integrity metadata recorded
        |
        v
Text split into searchable chunks
        |
        +----------------------------+
        |                            |
        v                            v
Vector indexing                 Claim extraction
        |                            |
        v                            v
Question answering              Claim/version comparison
        |                            |
        v                            v
Answer with evidence            Changed claims identified
        |                            |
        +--------------+-------------+
                       |
                       v
          Dependency / impact analysis
                       |
                       v
        Potentially affected answers surfaced
                       |
                       v
                Human review
```

### Step-by-step

1.  **Ingest:** A user uploads a document through the application or
    API.
2.  **Extract:** The backend extracts text from supported file types and
    prepares it for processing.
3.  **Version:** The system records document/version information and
    integrity metadata.
4.  **Index:** Text is divided into chunks and added to the retrieval
    index.
5.  **Extract claims:** The claim extraction service identifies
    statements that can be compared across versions.
6.  **Compare:** When a new version is processed, the comparison service
    detects potentially changed claims.
7.  **Answer questions:** The retrieval-augmented generation (RAG) flow
    finds relevant indexed passages and uses the configured language
    model to formulate an answer.
8.  **Track dependencies:** Relationships among source documents,
    claims, and stored answers support impact tracing.
9.  **Review:** The system surfaces potential impacts for a human to
    verify before relying on an updated answer.

> **Important:** Automated claim extraction, semantic comparison, and
> impact tracing can produce false positives or miss subtle changes.
> Human verification is essential for high-impact decisions.

------------------------------------------------------------------------

## System Architecture

``` text
┌───────────────────────────────────────────────┐
│                  Frontend                     │
│          React web application                │
│  Dashboard · Documents · Assistant · Review   │
└───────────────────────┬───────────────────────┘
                        │ HTTP / JSON
                        v
┌───────────────────────────────────────────────┐
│                FastAPI Backend                │
│                                               │
│  API routes                                   │
│   ├── Document operations                     │
│   ├── Claim operations                        │
│   ├── Retrieval / Q&A                         │
│   ├── Impact analysis                         │
│   └── Health checks                           │
│                                               │
│  Services                                     │
│   ├── Text extraction and chunking            │
│   ├── Claim extraction and comparison         │
│   ├── Vector-store operations                 │
│   ├── RAG question answering                  │
│   └── Graph-based impact analysis             │
└───────────────┬─────────────────┬─────────────┘
                │                 │
                v                 v
        ┌──────────────┐  ┌───────────────────┐
        │   SQLite     │  │  ChromaDB /       │
        │ metadata,    │  │  vector index     │
        │ versions,    │  │  semantic search  │
        │ records      │  └───────────────────┘
        └──────────────┘
                │
                v
        ┌───────────────────────┐
        │ NetworkX graph        │
        │ evidence/dependency   │
        │ relationships         │
        └───────────────────────┘

        ┌───────────────────────┐
        │ Ollama (configured)   │
        │ Local language model  │
        └───────────────────────┘
```

The exact runtime path depends on the backend configuration and enabled
features. SQLite stores structured application records; ChromaDB
supports vector-based retrieval; NetworkX supports graph relationships
and traversal; and Ollama can provide local language-model inference.

------------------------------------------------------------------------

## Technology Stack

  -----------------------------------------------------------------------
  Layer                   Technology              Role
  ----------------------- ----------------------- -----------------------
  Frontend                React                   Builds the interactive
                                                  web interface and
                                                  application screens.

  Frontend tooling        Vite (if configured in  Local development
                          the frontend project)   server and frontend
                                                  build tooling.

  Styling                 Tailwind CSS (if        Utility-based styling
                          configured in the       and responsive UI
                          frontend project)       design.

  Backend API             Python, FastAPI         Exposes HTTP endpoints
                                                  and coordinates
                                                  application services.

  API server              Uvicorn                 Runs the ASGI
                                                  application.

  Relational database     SQLite                  Stores structured
                                                  application data and
                                                  metadata.

  Vector database         ChromaDB                Stores embeddings and
                                                  supports semantic
                                                  retrieval.

  Graph processing        NetworkX                Represents and
                                                  traverses relationships
                                                  for impact analysis.

  Local model runtime     Ollama                  Runs a locally
                                                  configured language
                                                  model for AI tasks.

  Testing                 pytest (project         Supports automated
                          includes a tests        backend tests.
                          directory)              

  Configuration           Environment variables / Configures runtime
                          `.env`                  settings and service
                                                  connections.
  -----------------------------------------------------------------------

### Why these technologies?

-   **FastAPI:** Provides a Python API layer with automatic OpenAPI
    documentation.
-   **SQLite:** Offers lightweight local relational storage without
    requiring a separate database server.
-   **ChromaDB:** Enables similarity search over document chunks using
    vector embeddings.
-   **NetworkX:** Makes it possible to represent dependencies and
    traverse related nodes during impact analysis.
-   **Ollama:** Provides a way to run supported language models locally,
    depending on hardware and model choice.
-   **React:** Supports a modular, component-based web interface.

> Check the frontend's `package.json` and backend `requirements.txt` for
> the exact installed versions and dependencies. This README describes
> the intended stack; it does not pin package versions.

------------------------------------------------------------------------

## Repository Structure

The backend structure currently follows this organization:

``` text
SovereignBlackIce/
├── Backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── claims.py
│   │   │       ├── documents.py
│   │   │       ├── health.py
│   │   │       ├── impact.py
│   │   │       └── rag.py
│   │   ├── core/
│   │   ├── database/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── main.py
│   │   └── __init__.py
│   ├── data/
│   ├── scripts/
│   ├── storage/
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
└── Frontend/
    └── (React frontend application)
```

### Backend modules

-   `app/main.py` --- FastAPI application entry point and startup
    configuration.
-   `app/api/routes/` --- HTTP route modules for documents, claims,
    health, impact, and RAG.
-   `app/core/` --- Application configuration, exceptions, and logging.
-   `app/database/` --- Database setup, models, and schemas.
-   `app/repositories/` --- Data access and persistence logic.
-   `app/services/` --- Core processing logic, including text
    extraction, chunking, claim comparison, graph analysis, retrieval,
    and vector-store operations.
-   `app/utils/` --- Shared helper functions.
-   `tests/` --- Backend tests.
-   `data/` and `storage/` --- Local runtime data and storage locations;
    these may contain generated or private data and should not be
    committed unless intentionally needed.

------------------------------------------------------------------------

## Getting Started

### Prerequisites

Install or prepare the following:

-   Python 3.12 (or a compatible version supported by the project
    dependencies).
-   Node.js and npm for the frontend.
-   Git.
-   Ollama, if using local language-model inference.
-   A model downloaded in Ollama that matches the application's
    configuration.

Check versions:

``` powershell
python --version
node --version
npm --version
git --version
```

### 1. Clone the repository

``` powershell
git clone https://github.com/ADARSH-pro-prog/SovereignBlackIce.git
cd SovereignBlackIce
```

### 2. Set up the backend

``` powershell
cd Backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation, you can run the venv's Python directly:

``` powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 3. Configure environment variables

Create a local `.env` file based on the example:

``` powershell
Copy-Item .env.example .env
```

Open `.env` and adjust the settings to match your environment, including
any model runtime URL, model name, storage paths, or database settings.
Do not commit `.env` or secrets.

### 4. Configure Ollama (if required)

Install Ollama from its official website, start the Ollama service, and
download the model specified in your `.env` or application
configuration.

Example only:

``` powershell
ollama pull llama3.2:3b
```

The model name must match the configuration used by the backend.
Hardware requirements vary by model.

------------------------------------------------------------------------

## Running the Application

Use **two terminals**: one for the backend and one for the frontend.

### Terminal 1 --- Backend

From the repository root:

``` powershell
cd Backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

The backend API will be available at:

-   API base: `http://127.0.0.1:8001`
-   Interactive API docs: `http://127.0.0.1:8001/docs`
-   OpenAPI schema: `http://127.0.0.1:8001/api/v1/openapi.json`

To enable automatic reload during development:

``` powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### Terminal 2 --- Frontend

Open a second terminal:

``` powershell
cd Frontend
npm install
npm run dev
```

Open the local URL printed by the frontend development server (often
`http://localhost:5173`).

### Frontend API connection

The frontend must send API requests to the backend address:

``` text
http://127.0.0.1:8001
```

If the frontend uses an environment variable for the API base URL,
configure it according to the variable name used in the frontend source.
Do not assume a variable name without checking the project.

If browser requests are blocked by CORS, configure the backend's allowed
origins to include the exact local frontend origin. Avoid allowing all
origins in production.

------------------------------------------------------------------------

## Using the Application

The exact labels and available actions depend on the frontend version. A
typical workflow is:

1.  Open the dashboard and check service status.
2.  Go to the document library and upload a source document.
3.  Confirm that the document was processed and indexed.
4.  Upload or register a newer version of the same source when testing
    version comparison.
5.  Review extracted claims and any detected changes.
6.  Ask a question in the AI assistant and inspect the answer and
    evidence.
7.  Open the impact view to inspect relationships and potentially
    affected outputs.
8.  Review flagged items and confirm whether they actually require an
    update.

### Suggested demonstration scenario

Use a harmless sample policy document:

-   **Version 1:** "Expense reports must be submitted within 30 days."
-   Ask the AI assistant: "What is the expense report submission
    deadline?"
-   **Version 2:** Change the deadline to "15 days."
-   Run the version comparison and inspect the changed claim.
-   Review whether the system identifies any previously stored answer
    associated with the older rule.
-   Confirm the new answer reflects the updated source and inspect its
    supporting evidence.

This is a demonstration scenario, not a guarantee that every workflow is
fully automated in every build.

------------------------------------------------------------------------

## API Documentation

FastAPI provides interactive API documentation when the backend is
running:

**http://127.0.0.1:8001/docs**

The OpenAPI specification is available at:

**http://127.0.0.1:8001/api/v1/openapi.json**

The backend route modules include document, claim, health, impact, and
RAG-related APIs. For exact endpoint paths, request schemas, and
response formats, use the live Swagger documentation rather than relying
on assumed routes.

------------------------------------------------------------------------

## Data and Privacy

Sovereign Black Ice is designed around a local-first approach. When
configured to use local storage and a locally hosted model, document
content and inference can remain within the operator's environment.

However:

-   Local-first does not automatically mean fully offline.
-   External model APIs, telemetry, remote storage, or other
    integrations may transmit data if enabled.
-   Uploaded documents, embeddings, logs, and database files may contain
    confidential information.
-   Keep `.env` files, credentials, and private source documents out of
    public repositories.
-   Review access controls, backups, retention, and deployment security
    before using sensitive organizational data.

------------------------------------------------------------------------

## Limitations

-   Claim extraction and semantic comparison are probabilistic and may
    miss subtle meaning changes or flag unchanged claims.
-   Retrieval can fail to find relevant passages if documents are poorly
    extracted, indexed, or queried.
-   Generated answers may be incomplete or incorrect; citations should
    be checked against the original source.
-   Impact analysis depends on the quality and completeness of recorded
    relationships between sources, claims, and answers.
-   Supported file types and maximum upload sizes depend on the current
    implementation and configuration.
-   The project is a prototype and should not be treated as a substitute
    for legal, compliance, security, or domain-expert review.

------------------------------------------------------------------------

## Roadmap

Potential future improvements:

-   More robust document-format support and extraction quality checks.
-   Stronger claim-level provenance and evidence visualization.
-   Better semantic diffing and reviewer feedback workflows.
-   Clearer status tracking for stale, reviewed, and superseded answers.
-   Expanded audit and export capabilities.
-   Authentication, role-based access control, and deployment hardening.
-   More automated integration and regression tests.
-   Packaging for easier local or on-premises deployment.

------------------------------------------------------------------------

## Contributing

Contributions and feedback are welcome.

1.  Fork the repository or create a feature branch.
2.  Make a focused change.
3.  Add or update tests where appropriate.
4.  Run the relevant checks.
5.  Submit a pull request describing the change and how it was tested.

Please do not commit secrets, private documents, local databases,
virtual environments, or generated build artifacts.

------------------------------------------------------------------------

## License

No license has been specified yet. Until a license is added, the
repository should not be assumed to grant permission to reuse, modify,
or distribute the code.

------------------------------------------------------------------------

## Acknowledgments

Built as a local-first AI knowledge-integrity project for a hackathon,
exploring document versioning, evidence-aware question answering, and
impact analysis.
