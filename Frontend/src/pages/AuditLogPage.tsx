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

      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="display text-[44px] leading-none text-ink">Audit log</h1>
            {!isLiveMode && (
              <span className="rounded-full border border-amber/30 px-2 py-0.5 text-xs text-amber">Demo data</span>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-[15px] text-ink-2">
            Every upload, comparison, generated answer and review decision, in order.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start xl:self-auto">
          {/* Export Dropdown Trigger */}

          <div className="relative">

            <button

              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}

              className="h-9 px-4 rounded-xl bg-ice hover:brightness-95 text-xs font-semibold text-void transition-all flex items-center gap-2 "

            >

              <Download className="w-3.5 h-3.5" />

              <span>Export Audit Log</span>

            </button>

            {isExportDropdownOpen && (

              <div className="absolute right-0 mt-2 w-56 bg-raised border border-line rounded-xl shadow-2xl p-1.5 z-40 text-xs">

                <div className="px-2.5 py-1 text-xs text-muted">

                  Provenance Export Format

                </div>

                <button

                  onClick={() => handleExport('json')}

                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-line-strong text-ink text-left"

                >

                  <span>Immutable Proof Bundle</span>

                  <span className="font-mono text-ice">.JSON</span>

                </button>

                <button

                  onClick={() => handleExport('csv')}

                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-line-strong text-ink text-left"

                >

                  <span>Structured Event Log</span>

                  <span className="font-mono text-ice">.CSV</span>

                </button>

                <button

                  onClick={() => handleExport('sig')}

                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-line-strong text-ink text-left"

                >

                  <span>Merkle Hash Receipt</span>

                  <span className="font-mono text-amber">.SIG</span>

                </button>

              </div>

            )}

          </div>

        </div>

      </header>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(
          [
            ['Total events', auditEvents.length, 'Entries in this log'],
            [
              'Document changes',
              auditEvents.filter((e) =>
                ['Document Uploaded', 'New Version Added', 'Version Comparison Completed'].includes(e.eventType)
              ).length,
              'Uploads, versions, comparisons',
            ],
            [
              'AI answers logged',
              auditEvents.filter((e) => e.eventType === 'AI Answer Generated').length,
              'Generated with citations',
            ],
            [
              'Review decisions',
              auditEvents.filter((e) => e.eventType === 'Review Decision Recorded').length,
              'Human sign-offs recorded',
            ],
          ] as const
        ).map(([label, value, note]) => (
          <div key={label} className="chart-card flex h-[132px] flex-col justify-between px-5 py-4">
            <span className="label-mono">{label}</span>
            <div>
              <div className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-ink">{value}</div>
              <div className="mt-1.5 text-xs text-muted">{note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Query Toolbar */}

      <div className="bg-panel border border-line rounded-xl p-3 flex flex-col lg:flex-row items-center gap-3">

        <div className="relative flex-1 w-full">

          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-0.5/2 text-muted" />

          <input

            type="text"

            value={filterQuery}

            onChange={(e) => {

              setFilterQuery(e.target.value);

              setCurrentPage(1);

            }}

            placeholder="Search by hash, document, user, or event..."

            className="w-full h-9 pl-9 pr-3 rounded-lg bg-raised border border-line text-xs text-ink placeholder:text-muted focus:outline-none focus:border-line-strong"

          />

        </div>

        <select

          value={filterEventType}

          onChange={(e) => {

            setFilterEventType(e.target.value);

            setCurrentPage(1);

          }}

          className="h-9 px-3 rounded-lg bg-raised border border-line text-xs text-muted focus:outline-none cursor-pointer"

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

          className="h-9 px-3 rounded-lg bg-raised border border-line text-xs text-muted focus:outline-none cursor-pointer"

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

          className="text-xs text-ice hover:underline px-1 whitespace-nowrap"

        >

          Reset

        </button>

      </div>

      {/* Main Cryptographic Data Ledger & Split Inspection Drawer */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column (7 cols): Data Ledger Table */}

        <div className="lg:col-span-7 bg-panel border border-line rounded-[10px] overflow-hidden flex flex-col">

          <div className="px-5 py-3 bg-raised border-b border-line flex items-center justify-between text-xs text-muted">

            <span className="font-semibold text-ink">Ledger Log Entries</span>

            

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse min-w-[700px]">

              <thead>

                <tr className="h-9 bg-raised border-b border-line text-xs font-medium text-muted">

                  <th className="px-5">Timestamp & Block</th>

                  <th className="px-4">Event Type</th>

                  <th className="px-4">Document</th>

                  <th className="px-4">Actor</th>

                  <th className="px-4">Status</th>

                  <th className="px-5 text-right">Action</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-line-strong text-xs">

                {paginatedEvents.length === 0 ? (

                  <tr>

                    <td colSpan={6} className="px-5 py-8 text-center text-muted">

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

                            ? 'bg-ice/15 hover:bg-ice/20'

                            : 'hover:bg-raised'

                        }`}

                      >

                        <td className="px-5">

                          <div className="font-medium text-ink">

                            {evt.timestamp}

                          </div>

                          <div className="font-mono text-xs text-ice">

                            {evt.txHash.slice(0, 10)}...

                          </div>

                        </td>

                        <td className="px-4">

                          <span className="font-medium text-ink">

                            {evt.eventType}

                          </span>

                        </td>

                        <td className="px-4">

                          <div className="text-muted truncate max-w-[140px]">

                            {evt.documentName}

                          </div>

                          <div className="text-xs text-muted">

                            {evt.documentId}

                          </div>

                        </td>

                        <td className="px-4 text-muted truncate max-w-[120px]">

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

                            className="px-2.5 py-1 rounded bg-raised hover:bg-line-strong border border-line text-xs text-ink"

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

          <div className="p-3 bg-raised border-t border-line flex items-center justify-between text-xs text-muted">

            <div>

              Showing <strong className="text-ink">{filteredEvents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredEvents.length)}</strong> of{' '}

              <strong className="text-ink">{filteredEvents.length}</strong> events

            </div>

            <div className="flex items-center gap-1.5">

              <button

                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}

                disabled={currentPage === 1}

                className="px-2.5 py-1 rounded bg-panel border border-line disabled:opacity-40"

              >

                Prev

              </button>

              <span className="font-mono px-1">

                {currentPage} / {totalPages}

              </span>

              <button

                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}

                disabled={currentPage === totalPages}

                className="px-2.5 py-1 rounded bg-panel border border-line disabled:opacity-40"

              >

                Next

              </button>

            </div>

          </div>

        </div>

        {/* Right Column (5 cols): Event Detail Inspection Drawer */}

        <div className="lg:col-span-5 bg-panel border border-line rounded-[10px] sticky top-20 flex flex-col overflow-hidden">

          {selectedEvent ? (

            <>

              {/* Header */}

              <div className="p-5 bg-raised border-b border-line flex flex-col gap-2">

                <div className="flex items-center justify-between">

                  <StatusBadge status={selectedEvent.status} size="sm" />

                  <span className="font-mono text-xs text-muted">

                    {selectedEvent.id}

                  </span>

                </div>

                <h3 className="text-base font-bold text-ink">

                  {selectedEvent.eventType}

                </h3>

                <div className="flex items-center justify-between pt-1">

                  <div className="font-mono text-xs text-ice truncate max-w-[240px]">

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

                    className="px-2 py-0.5 rounded bg-panel border border-line hover:bg-line-strong text-xs text-muted flex items-center gap-1"

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

                  <div className="flex items-center justify-between text-muted text-xs">

                    <span>Cryptographic Provenance</span>

                    <span className="text-ice flex items-center gap-1 font-semibold">

                      <CheckCircle className="w-3 h-3" /> Chain Verified

                    </span>

                  </div>

                  <div className="p-3 rounded-lg bg-panel border border-line space-y-1.5 font-mono text-xs">

                    <div className="flex justify-between">

                      <span className="text-muted">Timestamp:</span>

                      <span className="text-ink">{selectedEvent.timestamp}</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-muted">Ledger Sequence:</span>

                      <span className="text-ink">

                        Block {selectedEvent.blockNumber} (Merkle Leaf 42)

                      </span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-muted">Signature Alg:</span>

                      <span className="text-ink">Ed25519 (SHA-256 match)</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-muted">Actor:</span>

                      <span className="text-ice">{selectedEvent.actor}</span>

                    </div>

                  </div>

                </div>

                {/* Section 2: Target Document */}

                <div className="space-y-2">

                  <span className="text-xs text-muted block">

                    Target Document & Reference

                  </span>

                  <div className="p-3 rounded-lg bg-panel border border-line space-y-2">

                    <div className="flex items-center justify-between font-medium text-ink">

                      <span>{selectedEvent.documentName}</span>

                      <span className="font-mono text-ice">{selectedEvent.documentId}</span>

                    </div>

                    <div className="text-xs text-muted">

                      Version: <strong className="text-ink">{selectedEvent.documentVersion}</strong>

                    </div>

                    <div className="text-xs text-muted">

                      Details: {selectedEvent.details}

                    </div>

                  </div>

                </div>

                {/* Section 3: Blast Radius / Impact */}

                {selectedEvent.blastRadiusSummary && (

                  <div className="p-3 rounded-lg bg-amber/10 border border-amber/30 space-y-1">

                    <span className="text-xs text-amber font-semibold block">

                      Blast Radius Notice

                    </span>

                    <p className="text-xs text-muted">

                      {selectedEvent.blastRadiusSummary}

                    </p>

                  </div>

                )}

                {/* Actions */}

                <div className="pt-2 space-y-2">

                  <button

                    onClick={() => navigate('/dashboard/reviews')}

                    className="w-full py-2 bg-ice hover:brightness-95 text-void rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"

                  >

                    <span>Open in Human Review Center</span>

                    <ArrowRight className="w-3.5 h-3.5" />

                  </button>

                  <button

                    onClick={() => navigate(`/dashboard/documents/${selectedEvent.documentId}`)}

                    className="w-full py-2 bg-raised hover:bg-line-strong border border-line text-xs font-medium text-ink rounded-lg flex items-center justify-center gap-1.5 transition-colors"

                  >

                    <FileText className="w-3.5 h-3.5 text-muted" />

                    <span>View Document ({selectedEvent.documentId})</span>

                  </button>

                </div>

              </div>

            </>

          ) : (

            <div className="p-8 text-center text-muted flex flex-col items-center justify-center min-h-[300px]">

              <History className="w-10 h-10 text-muted mb-3 opacity-50" />

              <p className="font-medium text-sm text-ink">No Audit Event Selected</p>

              <p className="text-xs text-muted mt-1">Select an entry from the ledger to inspect its cryptographic provenance and impact.</p>

            </div>

          )}

        </div>

      </div>

    </div>

  );

};
