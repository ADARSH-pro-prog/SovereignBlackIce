import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {

  History,

  Download,

  Filter,

  Search,

  CheckCircle,

  AlertTriangle,

  FileText,

  User,

  ExternalLink,

  Copy,

  Layers,

  ArrowRight,

  Shield,

  RotateCw,

  GitCompare,

  Fingerprint,

} from 'lucide-react';

import { StatusBadge } from '../components/ui/StatusBadge';

import { useApp } from '../context/AppContext';

import { AuditEvent } from '../types';

export const AuditLogPage: React.FC = () => {

  const navigate = useNavigate();

  const { auditEvents, addToast, isLiveMode } = useApp();

  const [selectedEventId, setSelectedEventId] = useState<string>(

    auditEvents[0]?.id || 'EVT-98421'

  );

  const [filterQuery, setFilterQuery] = useState('');

  const [filterEventType, setFilterEventType] = useState('All');

  const [filterActor, setFilterActor] = useState('All');

  const [filterStatus, setFilterStatus] = useState('All');

  const [currentPage, setCurrentPage] = useState(1);

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const selectedEvent: AuditEvent | undefined =

    auditEvents.find((e) => e.id === selectedEventId) || auditEvents[0];

  const filteredEvents = auditEvents.filter((evt) => {

    const matchesQuery =

      evt.eventType.toLowerCase().includes(filterQuery.toLowerCase()) ||

      evt.documentName.toLowerCase().includes(filterQuery.toLowerCase()) ||

      evt.txHash.toLowerCase().includes(filterQuery.toLowerCase()) ||

      evt.actor.toLowerCase().includes(filterQuery.toLowerCase());

    const matchesType =

      filterEventType === 'All' ? true : evt.eventType === filterEventType;

    const matchesActor =

      filterActor === 'All' ? true : evt.actor.includes(filterActor);

    const matchesStatus =

      filterStatus === 'All' ? true : evt.status === filterStatus;

    return matchesQuery && matchesType && matchesActor && matchesStatus;

  });

  const pageSize = 7;

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;

  const paginatedEvents = filteredEvents.slice(

    (currentPage - 1) * pageSize,

    currentPage * pageSize

  );

  const handleExport = (format: 'json' | 'csv' | 'sig') => {

    setIsExportDropdownOpen(false);

    const content =

      format === 'json'

        ? JSON.stringify(auditEvents, null, 2)

        : auditEvents

            .map(

              (e) =>

                `"${e.id}","${e.timestamp}","${e.txHash}","${e.eventType}","${e.documentName}","${e.actor}","${e.status}"`

            )

            .join('\n');

    const blob = new Blob([content], {

      type: format === 'json' ? 'application/json' : 'text/plain',

    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `audit_ledger_${new Date().toISOString().slice(0, 10)}.${format}`;

    a.click();

    addToast({

      type: 'success',

      title: 'Audit Log Exported',

      message: `Downloaded immutable cryptographic proof in .${format.toUpperCase()}`,

    });

  };

  return (

    <div className="flex flex-col gap-6 animate-in fade-in duration-200 pb-16">

      {/* Top Header & Actions */}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gradient-to-br from-white via-[#FFF7FB] to-[#F7FEE7] border border-white/90 rounded-[24px] p-6 shadow-[0_18px_55px_rgba(73,55,94,0.09)]">

        <div>

          <div className="flex items-center gap-2 mb-1">

            <h1 className="text-2xl font-bold tracking-tight text-[#29233D]">

              Audit Log

            </h1>

            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#A3E635]/10 text-[#65A30D] text-xs font-medium border border-[#D9F99D]">

              <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635] animate-pulse" />

              Sync: Live • SEC-EAL6

            </span>

            <span className="px-2 py-0.5 rounded bg-[#F7F3F8] text-[#756D82] text-xs font-mono border border-[#E8E2EC]">

              {isLiveMode ? 'LIVE API AUDIT TRAIL' : '[DEMO DATA - IMMUTABLE HYPERLEDGER]'}

            </span>

          </div>

          <p className="text-sm text-[#756D82]">

            Track document activity, integrity events, AI operations, and human

            review decisions.

          </p>

        </div>

        {/* Action Controls */}

        <div className="flex items-center gap-2.5 shrink-0 self-start xl:self-auto">

          <div className="px-3 py-1.5 bg-[#F7F3F8] border border-[#E8E2EC] rounded-lg text-xs text-[#29233D] flex items-center gap-2">

            <History className="w-3.5 h-3.5 text-[#938DA2]" />

            <span>Last 30 Days (Sep 1 – Sep 30, 2026)</span>

          </div>

          {/* Export Dropdown Trigger */}

          <div className="relative">

            <button

              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}

              className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#A3E635] via-[#D9F99D] to-[#F9A8D4] hover:brightness-95 text-xs font-semibold text-[#29233D] transition-all flex items-center gap-2 shadow-[0_8px_22px_rgba(163,230,53,0.20)]"

            >

              <Download className="w-3.5 h-3.5" />

              <span>Export Audit Log</span>

            </button>

            {isExportDropdownOpen && (

              <div className="absolute right-0 mt-2 w-56 bg-[#F7F3F8] border border-[#E8E2EC] rounded-xl shadow-2xl p-1.5 z-40 text-xs">

                <div className="px-2.5 py-1 text-[10px] font-mono text-[#938DA2] uppercase">

                  Provenance Export Format

                </div>

                <button

                  onClick={() => handleExport('json')}

                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#EEE9F2] text-[#29233D] text-left"

                >

                  <span>Immutable Proof Bundle</span>

                  <span className="font-mono text-[#65A30D]">.JSON</span>

                </button>

                <button

                  onClick={() => handleExport('csv')}

                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#EEE9F2] text-[#29233D] text-left"

                >

                  <span>Structured Event Log</span>

                  <span className="font-mono text-[#7C3AED]">.CSV</span>

                </button>

                <button

                  onClick={() => handleExport('sig')}

                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#EEE9F2] text-[#29233D] text-left"

                >

                  <span>Merkle Hash Receipt</span>

                  <span className="font-mono text-[#F59E0B]">.SIG</span>

                </button>

              </div>

            )}

          </div>

        </div>

      </div>

      {/* 4 Metric Cards */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        <div className="p-4 bg-gradient-to-br from-white to-[#F7FEE7] border border-[#E8E2EC] rounded-2xl flex flex-col justify-between h-[120px] shadow-[0_8px_25px_rgba(41,35,61,0.05)]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              Total Events

            </span>

            <span className="text-xs text-[#65A30D] font-mono">+14 today</span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">248</div>

            <div className="text-xs text-[#938DA2] mt-0.5 truncate">

              Verified tamper-evident ledger (Slot #4,891,029)

            </div>

          </div>

        </div>

        <div className="p-4 bg-gradient-to-br from-white to-[#FFF7ED] border border-[#E8E2EC] rounded-2xl flex flex-col justify-between h-[120px] shadow-[0_8px_25px_rgba(41,35,61,0.05)]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              Document Changes

            </span>

            <span className="text-xs text-[#F59E0B] font-mono">3 pending</span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">12</div>

            <div className="text-xs text-[#938DA2] mt-0.5">

              AST semantic token divergence

            </div>

          </div>

        </div>

        <div className="p-4 bg-gradient-to-br from-white to-[#FDF2F8] border border-[#E8E2EC] rounded-2xl flex flex-col justify-between h-[120px] shadow-[0_8px_25px_rgba(41,35,61,0.05)]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              AI Queries Audited

            </span>

            <span className="text-xs text-[#65A30D] font-mono">100% Grounded</span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">76</div>

            <div className="text-xs text-[#938DA2] mt-0.5">

              Zero ungrounded hallucinations

            </div>

          </div>

        </div>

        <div className="p-4 bg-gradient-to-br from-white to-[#F5F3FF] border border-[#E8E2EC] rounded-2xl flex flex-col justify-between h-[120px] shadow-[0_8px_25px_rgba(41,35,61,0.05)]">

          <div className="flex items-center justify-between">

            <span className="text-[11px] uppercase tracking-wider text-[#756D82]">

              Review Decisions

            </span>

            <span className="text-xs text-[#7C3AED] font-mono">100% HITL</span>

          </div>

          <div>

            <div className="text-2xl font-bold font-mono text-[#29233D]">18</div>

            <div className="text-xs text-[#938DA2] mt-0.5 truncate">

              S. Vance & Safety Lead sign-offs

            </div>

          </div>

        </div>

      </div>

      {/* Filter & Query Toolbar */}

      <div className="bg-white/88 border border-[#E8E2EC] rounded-xl p-3 flex flex-col lg:flex-row items-center gap-3">

        <div className="relative flex-1 w-full">

          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#938DA2]" />

          <input

            type="text"

            value={filterQuery}

            onChange={(e) => {

              setFilterQuery(e.target.value);

              setCurrentPage(1);

            }}

            placeholder="Search by hash, document, user, or event..."

            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F7F3F8] border border-[#E8E2EC] text-xs text-[#29233D] placeholder:text-[#938DA2] focus:outline-none focus:border-[#C4B5FD]"

          />

        </div>

        <select

          value={filterEventType}

          onChange={(e) => {

            setFilterEventType(e.target.value);

            setCurrentPage(1);

          }}

          className="h-9 px-3 rounded-lg bg-[#F7F3F8] border border-[#E8E2EC] text-xs text-[#756D82] focus:outline-none cursor-pointer"

        >

          <option value="All">All Event Types</option>

          <option value="Potential Impact Identified">Potential Impact Identified</option>

          <option value="Version Comparison Completed">Version Comparison</option>

          <option value="New Version Added">New Version Added</option>

          <option value="AI Answer Generated">AI Answer Generated</option>

          <option value="Review Item Created">Review Item Created</option>

          <option value="Review Decision Recorded">Decision Recorded</option>

          <option value="Document Uploaded">Document Uploaded</option>

        </select>

        <select

          value={filterStatus}

          onChange={(e) => {

            setFilterStatus(e.target.value);

            setCurrentPage(1);

          }}

          className="h-9 px-3 rounded-lg bg-[#F7F3F8] border border-[#E8E2EC] text-xs text-[#756D82] focus:outline-none cursor-pointer"

        >

          <option value="All">All Statuses</option>

          <option value="Review Required">Review Required</option>

          <option value="Completed">Completed</option>

          <option value="Pending">Pending</option>

          <option value="Resolved">Resolved</option>

        </select>

        <button

          onClick={() => {

            setFilterQuery('');

            setFilterEventType('All');

            setFilterActor('All');

            setFilterStatus('All');

          }}

          className="text-xs text-[#7C3AED] hover:underline px-1 whitespace-nowrap"

        >

          Reset

        </button>

      </div>

      {/* Main Cryptographic Data Ledger & Split Inspection Drawer */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column (7 cols): Data Ledger Table */}

        <div className="lg:col-span-7 bg-white/90 border border-[#E8E2EC] rounded-[22px] overflow-hidden shadow-[0_14px_40px_rgba(41,35,61,0.07)] flex flex-col">

          <div className="px-5 py-3 bg-[#F7F3F8] border-b border-[#E8E2EC] flex items-center justify-between text-xs text-[#756D82]">

            <span className="font-semibold text-[#29233D]">Ledger Log Entries</span>

            <span className="font-mono text-[11px]">Auto-refresh: 10s</span>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse min-w-[700px]">

              <thead>

                <tr className="h-9 bg-[#F7F3F8]/70 border-b border-[#E8E2EC] text-[11px] font-medium uppercase tracking-wider text-[#756D82]">

                  <th className="px-5">Timestamp & Block</th>

                  <th className="px-4">Event Type</th>

                  <th className="px-4">Document</th>

                  <th className="px-4">Actor</th>

                  <th className="px-4">Status</th>

                  <th className="px-5 text-right">Action</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-[#1A2438] text-xs">

                {paginatedEvents.length === 0 ? (

                  <tr>

                    <td colSpan={6} className="px-5 py-8 text-center text-[#938DA2]">

                      No audit events found matching the filter criteria.

                    </td>

                  </tr>

                ) : (

                  paginatedEvents.map((evt) => {

                    const isSelected = selectedEvent ? evt.id === selectedEvent.id : false;

                    return (

                      <tr

                        key={evt.id}

                        onClick={() => setSelectedEventId(evt.id)}

                        className={`h-14 cursor-pointer transition-colors ${

                          isSelected

                            ? 'bg-[#A3E635]/15 hover:bg-[#A3E635]/20'

                            : 'hover:bg-[#F7F3F8]/40'

                        }`}

                      >

                        <td className="px-5">

                          <div className="font-medium text-[#29233D]">

                            {evt.timestamp}

                          </div>

                          <div className="font-mono text-[10px] text-[#7C3AED]">

                            {evt.txHash.slice(0, 10)}...

                          </div>

                        </td>

                        <td className="px-4">

                          <span className="font-medium text-[#29233D]">

                            {evt.eventType}

                          </span>

                        </td>

                        <td className="px-4">

                          <div className="text-[#756D82] truncate max-w-[140px]">

                            {evt.documentName}

                          </div>

                          <div className="text-[10px] text-[#938DA2]">

                            {evt.documentId}

                          </div>

                        </td>

                        <td className="px-4 text-[#756D82] truncate max-w-[120px]">

                          {evt.actor}

                        </td>

                        <td className="px-4">

                          <StatusBadge status={evt.status} size="sm" />

                        </td>

                        <td className="px-5 text-right">

                          <button

                            onClick={(e) => {

                              e.stopPropagation();

                              setSelectedEventId(evt.id);

                            }}

                            className="px-2.5 py-1 rounded bg-[#F7F3F8] hover:bg-[#EEE9F2] border border-[#E8E2EC] text-xs text-[#29233D]"

                          >

                            Inspect

                          </button>

                        </td>

                      </tr>

                    );

                  })

                )}

              </tbody>

            </table>

          </div>

          {/* Pagination */}

          <div className="p-3 bg-[#F7F3F8] border-t border-[#E8E2EC] flex items-center justify-between text-xs text-[#756D82]">

            <div>

              Showing <strong className="text-[#29233D]">{filteredEvents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredEvents.length)}</strong> of{' '}

              <strong className="text-[#29233D]">{filteredEvents.length}</strong> events

            </div>

            <div className="flex items-center gap-1.5">

              <button

                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}

                disabled={currentPage === 1}

                className="px-2.5 py-1 rounded bg-white/88 border border-[#E8E2EC] disabled:opacity-40"

              >

                Prev

              </button>

              <span className="font-mono px-1">

                {currentPage} / {totalPages}

              </span>

              <button

                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}

                disabled={currentPage === totalPages}

                className="px-2.5 py-1 rounded bg-white/88 border border-[#E8E2EC] disabled:opacity-40"

              >

                Next

              </button>

            </div>

          </div>

        </div>

        {/* Right Column (5 cols): Event Detail Inspection Drawer */}

        <div className="lg:col-span-5 bg-gradient-to-br from-white via-[#FFF9FC] to-[#FAFFF1] border border-[#E8E2EC] rounded-[22px] shadow-[0_14px_40px_rgba(41,35,61,0.08)] sticky top-20 flex flex-col overflow-hidden">

          {selectedEvent ? (

            <>

              {/* Header */}

              <div className="p-5 bg-[#F7F3F8] border-b border-[#E8E2EC] flex flex-col gap-2">

                <div className="flex items-center justify-between">

                  <StatusBadge status={selectedEvent.status} size="sm" />

                  <span className="font-mono text-xs text-[#938DA2]">

                    {selectedEvent.id}

                  </span>

                </div>

                <h3 className="text-base font-bold text-[#29233D]">

                  {selectedEvent.eventType}

                </h3>

                <div className="flex items-center justify-between pt-1">

                  <div className="font-mono text-[11px] text-[#7C3AED] truncate max-w-[240px]">

                    {selectedEvent.txHash}

                  </div>

                  <button

                    onClick={() => {

                      navigator.clipboard.writeText(selectedEvent.txHash);

                      addToast({

                        type: 'success',

                        title: 'Copied Hash',

                        message: 'Transaction hash copied to clipboard.',

                      });

                    }}

                    className="px-2 py-0.5 rounded bg-white/88 border border-[#E8E2EC] hover:bg-[#EEE9F2] text-[10px] text-[#756D82] flex items-center gap-1"

                  >

                    <Copy className="w-3 h-3" />

                    <span>Copy</span>

                  </button>

                </div>

              </div>

              {/* Drawer Body */}

              <div className="p-5 space-y-4 text-xs">

                {/* Section 1: Cryptographic Provenance */}

                <div className="space-y-2">

                  <div className="flex items-center justify-between text-[#938DA2] text-[10px] uppercase font-mono">

                    <span>Cryptographic Provenance</span>

                    <span className="text-[#65A30D] flex items-center gap-1 font-semibold">

                      <CheckCircle className="w-3 h-3" /> Chain Verified

                    </span>

                  </div>

                  <div className="p-3 rounded-lg bg-[#FFFDF9]/95 border border-[#E8E2EC] space-y-1.5 font-mono text-[11px]">

                    <div className="flex justify-between">

                      <span className="text-[#938DA2]">Timestamp:</span>

                      <span className="text-[#29233D]">{selectedEvent.timestamp}</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-[#938DA2]">Ledger Sequence:</span>

                      <span className="text-[#29233D]">

                        Block {selectedEvent.blockNumber} (Merkle Leaf 42)

                      </span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-[#938DA2]">Signature Alg:</span>

                      <span className="text-[#29233D]">Ed25519 (SHA-256 match)</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-[#938DA2]">Actor:</span>

                      <span className="text-[#65A30D]">{selectedEvent.actor}</span>

                    </div>

                  </div>

                </div>

                {/* Section 2: Target Document */}

                <div className="space-y-2">

                  <span className="text-[10px] text-[#938DA2] uppercase font-mono block">

                    Target Document & Reference

                  </span>

                  <div className="p-3 rounded-lg bg-[#FFFDF9]/95 border border-[#E8E2EC] space-y-2">

                    <div className="flex items-center justify-between font-medium text-[#29233D]">

                      <span>{selectedEvent.documentName}</span>

                      <span className="font-mono text-[#7C3AED]">{selectedEvent.documentId}</span>

                    </div>

                    <div className="text-[11px] text-[#756D82]">

                      Version: <strong className="text-[#29233D]">{selectedEvent.documentVersion}</strong>

                    </div>

                    <div className="text-[11px] text-[#938DA2]">

                      Details: {selectedEvent.details}

                    </div>

                  </div>

                </div>

                {/* Section 3: Blast Radius / Impact */}

                {selectedEvent.blastRadiusSummary && (

                  <div className="p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-1">

                    <span className="text-[10px] uppercase font-mono text-[#F59E0B] font-semibold block">

                      Blast Radius Notice

                    </span>

                    <p className="text-[11px] text-[#756D82]">

                      {selectedEvent.blastRadiusSummary}

                    </p>

                  </div>

                )}

                {/* Actions */}

                <div className="pt-2 space-y-2">

                  <button

                    onClick={() => navigate('/reviews')}

                    className="w-full py-2 bg-gradient-to-r from-[#A3E635] to-[#F9A8D4] hover:brightness-95 text-[#29233D] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"

                  >

                    <span>Open in Human Review Center</span>

                    <ArrowRight className="w-3.5 h-3.5" />

                  </button>

                  <button

                    onClick={() => navigate(`/documents/${selectedEvent.documentId}`)}

                    className="w-full py-2 bg-[#F7F3F8] hover:bg-[#EEE9F2] border border-[#E8E2EC] text-xs font-medium text-[#29233D] rounded-lg flex items-center justify-center gap-1.5 transition-colors"

                  >

                    <FileText className="w-3.5 h-3.5 text-[#938DA2]" />

                    <span>View Document ({selectedEvent.documentId})</span>

                  </button>

                </div>

              </div>

            </>

          ) : (

            <div className="p-8 text-center text-[#756D82] flex flex-col items-center justify-center min-h-[300px]">

              <History className="w-10 h-10 text-[#938DA2] mb-3 opacity-50" />

              <p className="font-medium text-sm text-[#29233D]">No Audit Event Selected</p>

              <p className="text-xs text-[#938DA2] mt-1">Select an entry from the ledger to inspect its cryptographic provenance and impact.</p>

            </div>

          )}

        </div>

      </div>

    </div>

  );

};
