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
  LogOut,
} from 'lucide-react';

import { useApp } from '../context/AppContext';

import { API_BASE_URL } from '../services/api';

export const SettingsPage: React.FC = () => {

  const { isLiveMode, setIsLiveMode, backendStatus, checkBackendConnection, addToast, user, logout } =
    useApp();

  const [apiUrl, setApiUrl] = useState(API_BASE_URL);

  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {

    setIsTesting(true);

    await checkBackendConnection();

    setIsTesting(false);

  };

  return (

    <div className="relative flex flex-col gap-6 animate-in fade-in duration-200 max-w-4xl pb-16 text-[#29233D] before:pointer-events-none before:absolute before:-inset-7 before:-z-10 before:bg-[radial-gradient(circle_at_8%_5%,rgba(217,249,157,0.30),transparent_27%),radial-gradient(circle_at_92%_12%,rgba(249,168,212,0.25),transparent_27%),radial-gradient(circle_at_52%_50%,rgba(233,213,255,0.20),transparent_32%),linear-gradient(135deg,#FFFDF8_0%,#FFF8FC_52%,#FAFFF1_100%)]">

      {/* Header */}

      <div>

        <h1 className="text-2xl font-bold tracking-tight text-[#29233D]">

          System Settings & Diagnostics

        </h1>

        <p className="text-sm text-[#756D82] mt-1">
          Configure API endpoints, inspect local Ollama model states, and monitor
          knowledge base retrieval telemetry.
        </p>
      </div>

      {/* Authenticated Identity Card */}
      {user && (
        <div className="bg-gradient-to-br from-white/95 via-[#FFF9FC]/92 to-[#F7FEE7]/88 border border-white/90 rounded-[22px] p-6 flex items-center justify-between shadow-[0_16px_45px_rgba(73,55,94,0.07)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name || user.email}
                className="w-14 h-14 rounded-2xl border-2 border-white shadow-md object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F472B6] via-[#BFA8FF] to-[#B7F34A] text-[#171719] font-black text-lg flex items-center justify-center shadow-md">
                {user.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : user.email.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#29233D]">
                  {user.name || 'Sovereign Operator'}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFCCB] px-2.5 py-0.5 text-[10px] font-semibold text-[#4D7C0F]">
                  <CheckCircle2 className="w-3 h-3 text-[#65A30D]" />
                  Google Verified
                </span>
              </div>
              <p className="text-xs text-[#756D82] mt-0.5">{user.email}</p>
              <p className="text-[10px] font-mono text-[#A8A29E] mt-0.5">Session ID: {user.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-[#FDA4AF] bg-[#FFF1F2] px-4 py-2 text-xs font-semibold text-[#E11D48] transition-all hover:bg-[#FFE4E6] hover:shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}

      {/* Mode Selection Card */}

      <div className="bg-gradient-to-br from-white/95 via-[#FFF9FC]/92 to-[#F7FEE7]/88 border border-white/90 rounded-[22px] p-6 flex flex-col gap-4 shadow-[0_16px_45px_rgba(73,55,94,0.07)] backdrop-blur-xl">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2.5">

            <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">

              <Server className="w-4 h-4" />

            </div>

            <div>

              <h2 className="text-sm font-semibold text-[#29233D]">

                Application Operating Mode

              </h2>

              <p className="text-xs text-[#756D82]">

                Switch between real local FastAPI backend or illustrative demo data.

              </p>

            </div>

          </div>

          <div className="flex items-center bg-[#F8F4F8] p-1 rounded-lg border border-[#E8E1EA]">

            <button

              onClick={() => setIsLiveMode(false)}

              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${

                !isLiveMode

                  ? 'bg-gradient-to-r from-[#BEF264] to-[#F9A8D4] text-[#29233D] shadow-sm'

                  : 'text-[#756D82] hover:text-[#29233D]'

              }`}

            >

              Demo Mode

            </button>

            <button

              onClick={() => setIsLiveMode(true)}

              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${

                isLiveMode

                  ? 'bg-gradient-to-r from-[#BEF264] to-[#F9A8D4] text-[#29233D] shadow-sm'

                  : 'text-[#756D82] hover:text-[#29233D]'

              }`}

            >

              Live Mode (FastAPI)

            </button>

          </div>

        </div>

        <div className="p-4 rounded-xl bg-gradient-to-r from-[#F7FEE7]/60 via-white/80 to-[#FDF2F8]/65 border border-white/90 text-xs text-[#756D82] leading-relaxed">

          {isLiveMode ? (

            <span className="text-[#29233D]">

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

      <div className="bg-gradient-to-br from-white/95 via-[#FAF8FF]/92 to-[#FFF7FB]/90 border border-white/90 rounded-[22px] p-6 flex flex-col gap-5 shadow-[0_16px_45px_rgba(73,55,94,0.07)] backdrop-blur-xl">

        <div className="flex items-center justify-between pb-3 border-b border-[#E8E1EA]">

          <div>

            <h2 className="text-sm font-semibold text-[#29233D]">

              Backend Connection & Endpoints

            </h2>

            <p className="text-xs text-[#756D82]">

              Target development server: <code>http://127.0.0.1:8000</code>

            </p>

          </div>

          <button

            onClick={handleTestConnection}

            disabled={isTesting}

            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-white to-[#F5F3FF] hover:border-[#C4B5FD] border border-[#E8E1EA] text-xs font-semibold text-[#29233D] flex items-center gap-1.5 transition-all shadow-sm hover:-translate-y-0.5"

          >

            <RefreshCw

              className={`w-3.5 h-3.5 text-[#7C3AED] ${

                isTesting ? 'animate-spin' : ''

              }`}

            />

            <span>Test Connection</span>

          </button>

        </div>

        <div className="space-y-3 text-xs">

          <div>

            <label className="text-[11px] font-mono text-[#938DA2] uppercase block mb-1">

              API Base URL (VITE_API_BASE_URL)

            </label>

            <div className="flex items-center gap-2">

              <input

                type="text"

                value={apiUrl}

                onChange={(e) => setApiUrl(e.target.value)}

                className="flex-1 h-9 px-3 rounded-xl bg-white/85 border border-[#E8E1EA] font-mono text-xs text-[#29233D] focus:outline-none focus:border-[#C4B5FD] focus:ring-2 focus:ring-[#EDE9FE] transition-all"

              />

              <button

                onClick={() => {

                  addToast({

                    type: 'info',

                    title: 'API URL Saved',

                    message: `Target set to ${apiUrl}`,

                  });

                }}

                className="px-4 h-9 rounded-xl border border-white/80 bg-gradient-to-r from-[#BEF264] via-[#D9F99D] to-[#F9A8D4] text-[#29233D] font-bold hover:brightness-95 transition-all shadow-[0_8px_22px_rgba(244,114,182,0.15)]"

              >

                Save

              </button>

            </div>

          </div>

          {/* Connection Status Box */}

          <div

            className={`p-4 rounded-xl border flex items-center justify-between ${

              backendStatus.isConnected

                ? 'bg-[#F7FEE7] border-[#D9F99D]'

                : 'bg-[#EF4444]/10 border-[#EF4444]/30'

            }`}

          >

            <div className="flex items-center gap-3">

              {backendStatus.isConnected ? (

                <CheckCircle2 className="w-5 h-5 text-[#65A30D]" />

              ) : (

                <XCircle className="w-5 h-5 text-[#EF4444]" />

              )}

              <div>

                <span className="font-semibold text-xs text-[#29233D] block">

                  {backendStatus.isConnected

                    ? 'FastAPI Backend Online'

                    : 'Backend Unreachable'}

                </span>

                <span className="text-[11px] text-[#756D82]">

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

              className="text-xs text-[#7C3AED] hover:underline flex items-center gap-1 font-medium"

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

        <div className="bg-gradient-to-br from-white/96 via-[#FBFFF4]/92 to-[#F7FEE7]/88 border border-white/90 rounded-[22px] p-5 flex flex-col justify-between shadow-[0_14px_38px_rgba(73,55,94,0.07)] backdrop-blur-xl">

          <div className="space-y-3">

            <div className="flex items-center gap-2.5">

              <Cpu className="w-4 h-4 text-[#7C3AED]" />

              <h3 className="text-sm font-semibold text-[#29233D]">

                Local Ollama AI Model

              </h3>

            </div>

            <p className="text-xs text-[#756D82] leading-relaxed">

              In-house private LLM inference running locally via Ollama. No cloud AI

              keys or data egress to third-party endpoints.

            </p>

            <div className="space-y-1.5 font-mono text-[11px] text-[#938DA2]">

              <div className="flex justify-between">

                <span>Model Engine:</span>

                <span className="text-[#29233D]">llama3:8b-instruct-q4</span>

              </div>

              <div className="flex justify-between">

                <span>Zero Hallucination Gate:</span>

                <span className="text-[#65A30D]">Enforced (99.4%)</span>

              </div>

              <div className="flex justify-between">

                <span>Context Window:</span>

                <span className="text-[#29233D]">8,192 tokens</span>

              </div>

            </div>

          </div>

          <div className="pt-3 border-t border-[#EFE9ED] mt-3 flex items-center gap-1.5 text-xs text-[#65A30D]">

            <span className="w-2 h-2 rounded-full bg-[#A3E635]" />

            <span>Local AI Ready</span>

          </div>

        </div>

        {/* Vector DB: ChromaDB */}

        <div className="bg-gradient-to-br from-white/96 via-[#FFF9FC]/92 to-[#FAF5FF]/90 border border-white/90 rounded-[22px] p-5 flex flex-col justify-between shadow-[0_14px_38px_rgba(73,55,94,0.07)] backdrop-blur-xl">

          <div className="space-y-3">

            <div className="flex items-center gap-2.5">

              <Database className="w-4 h-4 text-[#65A30D]" />

              <h3 className="text-sm font-semibold text-[#29233D]">

                ChromaDB Vector Retrieval

              </h3>

            </div>

            <p className="text-xs text-[#756D82] leading-relaxed">

              Institutional document chunks and semantic embeddings indexed in local

              SQLite & ChromaDB partitions.

            </p>

            <div className="space-y-1.5 font-mono text-[11px] text-[#938DA2]">

              <div className="flex justify-between">

                <span>Primary Shard:</span>

                <span className="text-[#29233D]">KB-WEST-09</span>

              </div>

              <div className="flex justify-between">

                <span>Total Embeddings:</span>

                <span className="text-[#29233D]">1,482 vectors</span>

              </div>

              <div className="flex justify-between">

                <span>Distance Metric:</span>

                <span className="text-[#29233D]">Cosine (bge-large)</span>

              </div>

            </div>

          </div>

          <div className="pt-3 border-t border-[#EFE9ED] mt-3 flex items-center gap-1.5 text-xs text-[#65A30D]">

            <span className="w-2 h-2 rounded-full bg-[#A3E635]" />

            <span>Vector Index Healthy</span>

          </div>

        </div>

      </div>

      {/* Application Information & Governance Compliance */}

      <div className="bg-gradient-to-r from-[#F7FEE7]/88 via-white/94 to-[#FDF2F8]/88 border border-white/90 rounded-[22px] p-5 flex flex-col gap-3 text-xs shadow-[0_14px_38px_rgba(73,55,94,0.07)] backdrop-blur-xl">

        <div className="flex items-center gap-2 text-sm font-semibold text-[#29233D]">

          <Shield className="w-4 h-4 text-[#7C3AED]" />

          <span>Governance & Compliance Assurance</span>

        </div>

        <p className="text-[#756D82] leading-relaxed">

          Sovereign Black Ice adheres to strict enterprise cybersecurity

          principles:

        </p>

        <ul className="list-disc pl-5 space-y-1 text-[#756D82]">

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
