import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  AlertTriangle,
  History,
  CheckCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchModalOpen, setIsSearchModalOpen, documents, reviews, auditEvents } =
    useApp();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(!isSearchModalOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, setIsSearchModalOpen]);

  if (!isSearchModalOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredDocs = q
    ? documents.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.department.toLowerCase().includes(q)
      )
    : documents.slice(0, 3);

  const filteredReviews = q
    ? reviews.filter(
        (r) =>
          r.documentTitle.toLowerCase().includes(q) ||
          r.issueSummary.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      )
    : reviews.slice(0, 2);

  const filteredAudits = q
    ? auditEvents.filter(
        (a) =>
          a.eventType.toLowerCase().includes(q) ||
          a.documentName.toLowerCase().includes(q) ||
          a.txHash.toLowerCase().includes(q)
      )
    : auditEvents.slice(0, 2);

  const handleSelect = (path: string) => {
    setIsSearchModalOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => setIsSearchModalOpen(false)}
      />
      <div className="relative w-full max-w-2xl bg-[#111827] border border-[#263247] rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#263247] bg-[#1E293B]/40">
          <Search className="w-5 h-5 text-[#94A3B8] shrink-0 mr-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, change alerts, answers, audit ledger..."
            className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#64748B] hover:text-[#F8FAFC]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="ml-2 px-1.5 py-0.5 rounded bg-[#1E293B] border border-[#263247] text-[10px] font-mono text-[#94A3B8]">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Documents Section */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Documents ({filteredDocs.length})
            </div>
            <div className="space-y-1 mt-1">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleSelect(`/documents/${doc.id}`)}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#1E293B] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center shrink-0 text-[#3B82F6]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F8FAFC] group-hover:text-[#3B82F6] truncate">
                        {doc.title}
                      </div>
                      <div className="text-xs text-[#64748B] flex items-center gap-2">
                        <span>{doc.id}</span>
                        <span>•</span>
                        <span>{doc.department}</span>
                        <span>•</span>
                        <span className="font-mono">{doc.currentVersion}</span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={doc.integrityStatus} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Review Center Items */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Review Center ({filteredReviews.length})
            </div>
            <div className="space-y-1 mt-1">
              {filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  onClick={() => handleSelect(`/reviews`)}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#1E293B] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0 text-[#F59E0B]">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F8FAFC] group-hover:text-[#F59E0B] truncate">
                        {rev.documentTitle}
                      </div>
                      <div className="text-xs text-[#94A3B8] truncate">
                        {rev.issueSummary}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={rev.status} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Audit Ledger */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Audit Trail ({filteredAudits.length})
            </div>
            <div className="space-y-1 mt-1">
              {filteredAudits.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(`/audit`)}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#1E293B] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center shrink-0 text-[#14B8A6]">
                      <History className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F8FAFC] truncate">
                        {item.eventType}
                      </div>
                      <div className="text-xs text-[#64748B] font-mono truncate">
                        {item.txHash} • {item.timestamp}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#64748B] group-hover:text-[#F8FAFC]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#0A0F1C] border-t border-[#263247] flex items-center justify-between text-xs text-[#64748B]">
          <span>Tip: Use arrow keys or click to open</span>
          <span>Sovereign Black Ice v2.4</span>
        </div>
      </div>
    </div>
  );
};
