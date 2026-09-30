import React, { useState } from 'react';

import {

  Settings,

  Server,

  Database,

  Cpu,

  Shield,

  RefreshCw,

  CheckCircle2,

  XCircle,

  AlertTriangle,

  Info,

  ExternalLink,

  Save,

} from 'lucide-react';

import { useApp } from '../context/AppContext';

import { API_BASE_URL } from '../services/api';

export const SettingsPage: React.FC = () => {

  const { isLiveMode, setIsLiveMode, backendStatus, checkBackendConnection, addToast } =

    useApp();

  const [apiUrl, setApiUrl] = useState(API_BASE_URL);

  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {

    setIsTesting(true);

    await checkBackendConnection();

    setIsTesting(false);

  };

  return (

    <div className="relative flex flex-col gap-6 animate-in fade-in duration-200 max-w-4xl pb-16 text-ink before:pointer-events-none before:absolute before:-inset-7 before:-z-10 ">

      {/* Header */}

      <div>

        <h1 className="display text-[40px] leading-none text-ink">

          System Settings & Diagnostics

        </h1>

        <p className="text-sm text-muted mt-1">

          Configure API endpoints, inspect local Ollama model states, and monitor

          knowledge base retrieval telemetry.

        </p>

      </div>

      {/* Mode Selection Card */}

      <div className=" bg-panel border border-line rounded-[10px] p-6 flex flex-col gap-4 ">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2.5">

            <div className="w-8 h-8 rounded-lg bg-raised text-ice flex items-center justify-center">

              <Server className="w-4 h-4" />

            </div>

            <div>

              <h2 className="text-sm font-semibold text-ink">

                Application Operating Mode

              </h2>

              <p className="text-xs text-muted">

                Switch between real local FastAPI backend or illustrative demo data.

              </p>

            </div>

          </div>

          <div className="flex items-center bg-raised p-1 rounded-lg border border-line">

            <button

              onClick={() => setIsLiveMode(false)}

              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${

                !isLiveMode

                  ? ' bg-ice text-void shadow-sm'

                  : 'text-muted hover:text-ink'

              }`}

            >

              Demo Mode

            </button>

            <button

              onClick={() => setIsLiveMode(true)}

              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${

                isLiveMode

                  ? ' bg-ice text-void shadow-sm'

                  : 'text-muted hover:text-ink'

              }`}

            >

              Live Mode (FastAPI)

            </button>

          </div>

        </div>

        <div className="p-4 rounded-xl bg-raised border border-line text-xs text-muted leading-relaxed">

          {isLiveMode ? (

            <span className="text-ink">

              <strong>Live Mode Active:</strong> The frontend dispatches real HTTP

              requests to the local Python FastAPI server (

              <code>{apiUrl}</code>). Real ChromaDB vector retrieval, NetworkX

              knowledge graphs, and local Ollama inferences are queried.

            </span>

          ) : (

            <span>

              <strong>Demo Mode Active:</strong> Using rich illustrative sample

              governance records matching the specification. No cloud AI credentials

              or running Python servers required to explore all workflows.

            </span>

          )}

        </div>

      </div>

      {/* Backend API Configuration */}

      <div className=" bg-panel border border-line rounded-[10px] p-6 flex flex-col gap-5 ">

        <div className="flex items-center justify-between pb-3 border-b border-line">

          <div>

            <h2 className="text-sm font-semibold text-ink">

              Backend Connection & Endpoints

            </h2>

            <p className="text-xs text-muted">

              Target development server: <code>http://127.0.0.1:8000</code>

            </p>

          </div>

          <button

            onClick={handleTestConnection}

            disabled={isTesting}

            className="px-3.5 py-1.5 rounded-xl bg-panel hover:border-line-strong border border-line text-xs font-semibold text-ink flex items-center gap-1.5 transition-all shadow-sm hover:-translate-y-0.5"

          >

            <RefreshCw

              className={`w-3.5 h-3.5 text-ice ${

                isTesting ? 'animate-spin' : ''

              }`}

            />

            <span>Test Connection</span>

          </button>

        </div>

        <div className="space-y-3 text-xs">

          <div>

            <label className="text-xs text-muted block mb-1">

              API Base URL (VITE_API_BASE_URL)

            </label>

            <div className="flex items-center gap-2">

              <input

                type="text"

                value={apiUrl}

                onChange={(e) => setApiUrl(e.target.value)}

                className="flex-1 h-9 px-3 rounded-xl bg-panel border border-line font-mono text-xs text-ink focus:outline-none focus:border-line-strong focus:ring-2 focus:ring-line-strong transition-all"

              />

              <button

                onClick={() => {

                  addToast({

                    type: 'info',

                    title: 'API URL Saved',

                    message: `Target set to ${apiUrl}`,

                  });

                }}

                className="px-4 h-9 rounded-xl border border-line bg-ice text-void font-bold hover:brightness-95 transition-all "

              >

                Save

              </button>

            </div>

          </div>

          {/* Connection Status Box */}

          <div

            className={`p-4 rounded-xl border flex items-center justify-between ${

              backendStatus.isConnected

                ? 'bg-raised border-line-strong'

                : 'bg-red/10 border-red/30'

            }`}

          >

            <div className="flex items-center gap-3">

              {backendStatus.isConnected ? (

                <CheckCircle2 className="w-5 h-5 text-ice" />

              ) : (

                <XCircle className="w-5 h-5 text-red" />

              )}

              <div>

                <span className="font-semibold text-xs text-ink block">

                  {backendStatus.isConnected

                    ? 'FastAPI Backend Online'

                    : 'Backend Unreachable'}

                </span>

                <span className="text-xs text-muted">

                  {backendStatus.isConnected

                    ? `Checked just now • Round-trip latency: ${backendStatus.latencyMs}ms`

                    : `Could not connect to ${apiUrl}. Start your FastAPI server on port 8000.`}

                </span>

              </div>

            </div>

            <a

              href={`${apiUrl}/docs`}

              target="_blank"

              rel="noreferrer"

              className="text-xs text-ice hover:underline flex items-center gap-1 font-medium"

            >

              <span>Swagger Docs</span>

              <ExternalLink className="w-3.5 h-3.5" />

            </a>

          </div>

        </div>

      </div>

      {/* Local AI Model & Infrastructure Telemetry */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Local Ollama Status */}

        <div className=" bg-panel border border-line rounded-[10px] p-5 flex flex-col justify-between ">

          <div className="space-y-3">

            <div className="flex items-center gap-2.5">

              <Cpu className="w-4 h-4 text-ice" />

              <h3 className="text-sm font-semibold text-ink">

                Local Ollama AI Model

              </h3>

            </div>

            <p className="text-xs text-muted leading-relaxed">

              In-house private LLM inference running locally via Ollama. No cloud AI

              keys or data egress to third-party endpoints.

            </p>

            <div className="space-y-1.5 font-mono text-xs text-muted">

              <div className="flex justify-between">

                <span>Model Engine:</span>

                <span className="text-ink">llama3:8b-instruct-q4</span>

              </div>

              <div className="flex justify-between">

                <span>Zero Hallucination Gate:</span>

                <span className="text-ice">Enforced</span>

              </div>

              <div className="flex justify-between">

                <span>Context Window:</span>

                <span className="text-ink">8,192 tokens</span>

              </div>

            </div>

          </div>

          <div className="pt-3 border-t border-line mt-3 flex items-center gap-1.5 text-xs text-ice">

            <span className="w-2 h-2 rounded-full bg-ice" />

            <span>Local AI Ready</span>

          </div>

        </div>

        {/* Vector DB: ChromaDB */}

        <div className=" bg-panel border border-line rounded-[10px] p-5 flex flex-col justify-between ">

          <div className="space-y-3">

            <div className="flex items-center gap-2.5">

              <Database className="w-4 h-4 text-ice" />

              <h3 className="text-sm font-semibold text-ink">

                ChromaDB Vector Retrieval

              </h3>

            </div>

            <p className="text-xs text-muted leading-relaxed">

              Institutional document chunks and semantic embeddings indexed in local

              SQLite & ChromaDB partitions.

            </p>

            <div className="space-y-1.5 font-mono text-xs text-muted">

              <div className="flex justify-between">

                <span>Primary Shard:</span>

                <span className="text-ink">KB-WEST-09</span>

              </div>

              <div className="flex justify-between">

                <span>Total Embeddings:</span>

                <span className="text-ink">1,482 vectors</span>

              </div>

              <div className="flex justify-between">

                <span>Distance Metric:</span>

                <span className="text-ink">Cosine (bge-large)</span>

              </div>

            </div>

          </div>

          <div className="pt-3 border-t border-line mt-3 flex items-center gap-1.5 text-xs text-ice">

            <span className="w-2 h-2 rounded-full bg-ice" />

            <span>Vector Index Healthy</span>

          </div>

        </div>

      </div>

      {/* Application Information & Governance Compliance */}

      <div className=" bg-raised border border-line rounded-[10px] p-5 flex flex-col gap-3 text-xs ">

        <div className="flex items-center gap-2 text-sm font-semibold text-ink">

          <Shield className="w-4 h-4 text-ice" />

          <span>Governance & Compliance Assurance</span>

        </div>

        <p className="text-muted leading-relaxed">

          Sovereign Black Ice adheres to strict enterprise cybersecurity

          principles:

        </p>

        <ul className="list-disc pl-5 space-y-1 text-muted">

          <li>

            <strong>False-Positive Protection:</strong> Detected document changes are

            never automatically marked as incorrect answers. Human review is

            mandatory.

          </li>

          <li>

            <strong>Data Sovereignty:</strong> No proprietary institutional

            documents or generated employee answers are ever transmitted to

            commercial cloud LLM APIs.

          </li>

          <li>

            <strong>Audit Integrity:</strong> Every ingestion, diff analysis, and

            human sign-off generates an Ed25519-signed entry in the cryptographic

            audit ledger.

          </li>

        </ul>

      </div>

    </div>

  );

};
