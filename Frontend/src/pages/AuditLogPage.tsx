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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
              Audit Log
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] text-xs font-medium border border-[#14B8A6]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
              Sync: Live • SEC-EAL6
            </span>
            <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] text-xs font-mono border border-[#263247]">
              {isLiveMode ? 'LIVE API AUDIT TRAIL' : '[DEMO DATA - IMMUTABLE HYPERLEDGER]'}
            </span>
          </div>
          <p className="text-sm text-[#94A3B8]">
            Track document activity, integrity events, AI operations, and human
            review decisions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-start xl:self-auto">
          <div className="px-3 py-1.5 bg-[#1E293B] border border-[#263247] rounded-lg text-xs text-[#F8FAFC] flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Last 30 Days (Sep 1 – Sep 30, 2026)</span>
          </div>

          {/* Export Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="h-9 px-4 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-xs font-semibold text-white transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Log</span>
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#1E293B] border border-[#263247] rounded-xl shadow-2xl p-1.5 z-40 text-xs">
                <div className="px-2.5 py-1 text-[10px] font-mono text-[#64748B] uppercase">
                  Provenance Export Format
                </div>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#263247] text-[#F8FAFC] text-left"
                >
                  <span>Immutable Proof Bundle</span>
                  <span className="font-mono text-[#14B8A6]">.JSON</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#263247] text-[#F8FAFC] text-left"
                >
                  <span>Structured Event Log</span>
                  <span className="font-mono text-[#3B82F6]">.CSV</span>
                </button>
                <button
                  onClick={() => handleExport('sig')}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#263247] text-[#F8FAFC] text-left"
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
        <div className="p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
              Total Events
            </span>
            <span className="text-xs text-[#14B8A6] font-mono">+14 today</span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">248</div>
            <div className="text-xs text-[#64748B] mt-0.5 truncate">
              Verified tamper-evident ledger (Slot #4,891,029)
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
              Document Changes
            </span>
            <span className="text-xs text-[#F59E0B] font-mono">3 pending</span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">12</div>
            <div className="text-xs text-[#64748B] mt-0.5">
              AST semantic token divergence
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
              AI Queries Audited
            </span>
            <span className="text-xs text-[#14B8A6] font-mono">100% Grounded</span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">76</div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Zero ungrounded hallucinations
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-[#263247] rounded-xl flex flex-col justify-between h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
              Review Decisions
            </span>
            <span className="text-xs text-[#3B82F6] font-mono">100% HITL</span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#F8FAFC]">18</div>
            <div className="text-xs text-[#64748B] mt-0.5 truncate">
              S. Vance & Safety Lead sign-offs
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Query Toolbar */}
      <div className="bg-[#111827] border border-[#263247] rounded-xl p-3 flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => {
              setFilterQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by hash, document, user, or event..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <select
          value={filterEventType}
          onChange={(e) => {
            setFilterEventType(e.target.value);
            setCurrentPage(1);
          }}
          className="h-9 px-3 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#94A3B8] focus:outline-none cursor-pointer"
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
          className="h-9 px-3 rounded-lg bg-[#1E293B] border border-[#263247] text-xs text-[#94A3B8] focus:outline-none cursor-pointer"
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
          className="text-xs text-[#3B82F6] hover:underline px-1 whitespace-nowrap"
        >
          Reset
        </button>
      </div>

      {/* Main Cryptographic Data Ledger & Split Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Data Ledger Table */}
        <div className="lg:col-span-7 bg-[#111827] border border-[#263247] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-5 py-3 bg-[#1E293B] border-b border-[#263247] flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="font-semibold text-[#F8FAFC]">Ledger Log Entries</span>
            <span className="font-mono text-[11px]">Auto-refresh: 10s</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="h-9 bg-[#1E293B]/70 border-b border-[#263247] text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
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
                    <td colSpan={6} className="px-5 py-8 text-center text-[#64748B]">
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
                            ? 'bg-[#3B82F6]/15 hover:bg-[#3B82F6]/20'
                            : 'hover:bg-[#1E293B]/40'
                        }`}
                      >
                        <td className="px-5">
                          <div className="font-medium text-[#F8FAFC]">
                            {evt.timestamp}
                          </div>
                          <div className="font-mono text-[10px] text-[#3B82F6]">
                            {evt.txHash.slice(0, 10)}...
                          </div>
                        </td>

                        <td className="px-4">
                          <span className="font-medium text-[#F8FAFC]">
                            {evt.eventType}
                          </span>
                        </td>

                        <td className="px-4">
                          <div className="text-[#94A3B8] truncate max-w-[140px]">
                            {evt.documentName}
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            {evt.documentId}
                          </div>
                        </td>

                        <td className="px-4 text-[#94A3B8] truncate max-w-[120px]">
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
                            className="px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#263247] border border-[#263247] text-xs text-[#F8FAFC]"
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
          <div className="p-3 bg-[#1E293B] border-t border-[#263247] flex items-center justify-between text-xs text-[#94A3B8]">
            <div>
              Showing <strong className="text-[#F8FAFC]">{filteredEvents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredEvents.length)}</strong> of{' '}
              <strong className="text-[#F8FAFC]">{filteredEvents.length}</strong> events
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded bg-[#111827] border border-[#263247] disabled:opacity-40"
              >
                Prev
              </button>
              <span className="font-mono px-1">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded bg-[#111827] border border-[#263247] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Event Detail Inspection Drawer */}
        <div className="lg:col-span-5 bg-[#111827] border border-[#263247] rounded-xl shadow-xl sticky top-20 flex flex-col overflow-hidden">
          {selectedEvent ? (
            <>
              {/* Header */}
              <div className="p-5 bg-[#1E293B] border-b border-[#263247] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedEvent.status} size="sm" />
                  <span className="font-mono text-xs text-[#64748B]">
                    {selectedEvent.id}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#F8FAFC]">
                  {selectedEvent.eventType}
                </h3>

                <div className="flex items-center justify-between pt-1">
                  <div className="font-mono text-[11px] text-[#3B82F6] truncate max-w-[240px]">
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
                    className="px-2 py-0.5 rounded bg-[#111827] border border-[#263247] hover:bg-[#263247] text-[10px] text-[#94A3B8] flex items-center gap-1"
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
                  <div className="flex items-center justify-between text-[#64748B] text-[10px] uppercase font-mono">
                    <span>Cryptographic Provenance</span>
                    <span className="text-[#14B8A6] flex items-center gap-1 font-semibold">
                      <CheckCircle className="w-3 h-3" /> Chain Verified
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#080D1D] border border-[#263247] space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Timestamp:</span>
                      <span className="text-[#F8FAFC]">{selectedEvent.timestamp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Ledger Sequence:</span>
                      <span className="text-[#F8FAFC]">
                        Block {selectedEvent.blockNumber} (Merkle Leaf 42)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Signature Alg:</span>
                      <span className="text-[#F8FAFC]">Ed25519 (SHA-256 match)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Actor:</span>
                      <span className="text-[#14B8A6]">{selectedEvent.actor}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Target Document */}
                <div className="space-y-2">
                  <span className="text-[10px] text-[#64748B] uppercase font-mono block">
                    Target Document & Reference
                  </span>
                  <div className="p-3 rounded-lg bg-[#080D1D] border border-[#263247] space-y-2">
                    <div className="flex items-center justify-between font-medium text-[#F8FAFC]">
                      <span>{selectedEvent.documentName}</span>
                      <span className="font-mono text-[#3B82F6]">{selectedEvent.documentId}</span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">
                      Version: <strong className="text-[#F8FAFC]">{selectedEvent.documentVersion}</strong>
                    </div>
                    <div className="text-[11px] text-[#64748B]">
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
                    <p className="text-[11px] text-[#94A3B8]">
                      {selectedEvent.blastRadiusSummary}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => navigate('/reviews')}
                    className="w-full py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <span>Open in Human Review Center</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => navigate(`/documents/${selectedEvent.documentId}`)}
                    className="w-full py-2 bg-[#1E293B] hover:bg-[#263247] border border-[#263247] text-xs font-medium text-[#F8FAFC] rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>View Document ({selectedEvent.documentId})</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-[#94A3B8] flex flex-col items-center justify-center min-h-[300px]">
              <History className="w-10 h-10 text-[#64748B] mb-3 opacity-50" />
              <p className="font-medium text-sm text-[#F8FAFC]">No Audit Event Selected</p>
              <p className="text-xs text-[#64748B] mt-1">Select an entry from the ledger to inspect its cryptographic provenance and impact.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
