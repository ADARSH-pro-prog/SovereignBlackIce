import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DocumentItem,
  ReviewItem,
  AuditEvent,
  BackendConnectionStatus,
  ReviewStatus,
} from '../types';
import {
  DEMO_DOCUMENTS,
  DEMO_REVIEWS,
  DEMO_AUDIT_EVENTS,
} from '../data/demoData';
import { apiService, API_BASE_URL } from '../services/api';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
}

interface AppContextType {
  isLiveMode: boolean;
  setIsLiveMode: (live: boolean) => void;
  backendStatus: BackendConnectionStatus;
  checkBackendConnection: () => Promise<void>;
  documents: DocumentItem[];
  reviews: ReviewItem[];
  auditEvents: AuditEvent[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  uploadDocument: (
    file: File,
    baselineId?: string,
    documentName?: string
  ) => Promise<DocumentItem>;
  deleteDocument: (documentId: string) => Promise<void>;
  updateReviewDecision: (
    reviewId: string,
    action: 'mark_reviewed' | 'refresh_answers' | 'dismiss' | 'escalate',
    notes: string,
    assignee?: string
  ) => Promise<void>;
  recalculateImpact: (docId?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Default to live mode if localStorage has it or if no setting yet
  const [isLiveMode, setIsLiveModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem('sbi_live_mode');
    return saved === null ? true : saved === 'true';
  });

  const [backendStatus, setBackendStatus] = useState<BackendConnectionStatus>({
    isConnected: false,
    checkedAt: new Date().toISOString(),
    baseUrl: API_BASE_URL,
    version: '0.1.0',
    ollamaStatus: 'unknown',
    chromaStatus: 'unknown',
  });

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch real data from backend
  const loadBackendData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [realDocs, realReviews, realAudit] = await Promise.all([
        apiService.getDocuments(),
        apiService.getReviewItems(),
        apiService.getAuditEvents(),
      ]);

      setDocuments(realDocs);
      setReviews(realReviews);
      setAuditEvents(realAudit.events);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Failed to load data from FastAPI backend';
      addToast({
        type: 'error',
        title: 'Backend Sync Failed',
        message: errMsg,
      });
      // In live mode, we do NOT silently overwrite with demo data!
      // Keep empty or existing live records
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Load demo mock data
  const loadDemoData = useCallback(() => {
    setDocuments(DEMO_DOCUMENTS);
    setReviews(DEMO_REVIEWS);
    setAuditEvents(DEMO_AUDIT_EVENTS);
  }, []);

  // Check health and sync data
  const checkBackendConnection = useCallback(async () => {
    const status = await apiService.checkHealth();
    setBackendStatus(status);

    if (status.isConnected) {
      if (isLiveMode) {
        await loadBackendData();
      }
    } else if (isLiveMode) {
      addToast({
        type: 'error',
        title: 'FastAPI Backend Unreachable',
        message:
          status.error ||
          `Ensure backend is running at ${status.baseUrl} (run: uvicorn app.main:app --port 8000)`,
      });
    }
  }, [isLiveMode, loadBackendData, addToast]);

  const setIsLiveMode = (live: boolean) => {
    setIsLiveModeState(live);
    localStorage.setItem('sbi_live_mode', String(live));
    if (live) {
      addToast({
        type: 'info',
        title: 'Switched to LIVE Mode',
        message: 'Syncing with FastAPI backend at ' + API_BASE_URL,
      });
      checkBackendConnection();
    } else {
      loadDemoData();
      addToast({
        type: 'warning',
        title: 'Switched to DEMO Mode',
        message: 'Displaying illustrative sample governance data.',
      });
    }
  };

  // Initial load
  useEffect(() => {
    if (isLiveMode) {
      checkBackendConnection();
    } else {
      loadDemoData();
    }
  }, [isLiveMode, checkBackendConnection, loadDemoData]);

  // Document Upload
  const uploadDocument = async (
    file: File,
    baselineId?: string,
    documentName?: string
  ): Promise<DocumentItem> => {
    if (isLiveMode) {
      try {
        const res = await apiService.uploadDocument(
          file,
          baselineId,
          documentName
        );
        // Refresh full dataset to update document versions, review items, and audit trail
        await loadBackendData();
        addToast({
          type: 'success',
          title: 'Document Uploaded & Processed',
          message: `${res.document.title} (${res.document.currentVersion}) analyzed.`,
        });
        return res.document;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Backend upload failed';
        addToast({ type: 'error', title: 'Upload Failed', message: msg });
        throw err;
      }
    }

    // Demo Mode mock upload
    const newDocId = `DOC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newDoc: DocumentItem = {
      id: newDocId,
      title: file.name.replace(/\.[^/.]+$/, ''),
      department: 'Corporate Governance',
      currentVersion: 'v2.0',
      previousVersion: baselineId ? 'v1.0' : undefined,
      lastModified: 'Just now',
      integrityStatus: baselineId ? 'Review required' : 'Verified',
      affectedAnswerCount: baselineId ? 2 : 0,
      lastAnalyzed: 'Just now',
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      fileType: (file.name.split('.').pop() || 'pdf').toLowerCase() as DocumentItem['fileType'],
      owner: 'Auditor (DEMO)',
      repositorySource: 'Local Upload',
      classification: 'Internal Use Only',
      activeDiffSummary: baselineId
        ? 'Ingested file analyzed against baseline. Changed claims identified.'
        : undefined,
      versions: [
        {
          version: 'v2.0',
          releaseDate: 'Today',
          sha256: `0x${Math.random().toString(16).substring(2, 34)}`,
          status: 'Active',
          author: 'Demo User',
          summary: 'Newly ingested document version.',
        },
      ],
    };

    setDocuments((prev) => [newDoc, ...prev]);
    addToast({
      type: 'success',
      title: '[DEMO] Document Added',
      message: `${newDoc.title} added in Demo Mode.`,
    });
    return newDoc;
  };

  // Delete Document
  const deleteDocument = async (documentId: string): Promise<void> => {
    if (isLiveMode) {
      try {
        await apiService.deleteDocument(documentId);
        await loadBackendData();
        addToast({
          type: 'success',
          title: 'Document Deleted',
          message: `Document ${documentId} removed from knowledge index.`,
        });
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Delete failed';
        addToast({ type: 'error', title: 'Delete Failed', message: msg });
        throw err;
      }
    }

    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    addToast({
      type: 'info',
      title: '[DEMO] Document Removed',
      message: `Document ${documentId} removed from demo view.`,
    });
  };

  // Review Decision Handler
  const updateReviewDecision = async (
    reviewId: string,
    action: 'mark_reviewed' | 'refresh_answers' | 'dismiss' | 'escalate',
    notes: string,
    assignee = 'Compliance Auditor'
  ) => {
    let nextStatus: ReviewStatus = 'Pending';
    if (action === 'mark_reviewed' || action === 'dismiss') nextStatus = 'Resolved';
    if (action === 'escalate') nextStatus = 'Escalated';
    if (action === 'refresh_answers') nextStatus = 'In Progress';

    if (isLiveMode) {
      try {
        await apiService.updateReviewStatus(reviewId, {
          status: nextStatus,
          notes,
          assignee,
          action,
        });
        await loadBackendData();
        addToast({
          type: 'success',
          title: 'Review Decision Committed',
          message: `Alert ${reviewId} updated to ${nextStatus}.`,
        });
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Backend update failed';
        addToast({ type: 'error', title: 'Review Update Failed', message: msg });
        throw err;
      }
    }

    // Demo Mode
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== reviewId) return r;
        return {
          ...r,
          status: nextStatus,
          auditorNotes: notes || r.auditorNotes,
          assignee: assignee || r.assignee,
          reviewHistory: [
            ...r.reviewHistory,
            {
              timestamp: 'Just now',
              actor: assignee,
              action: `Action: ${action.replace('_', ' ')}`,
              details: notes || 'Disposition recorded by human auditor.',
            },
          ],
        };
      })
    );
    addToast({
      type: 'success',
      title: '[DEMO] Review Updated',
      message: `Review ${reviewId} marked as ${nextStatus}.`,
    });
  };

  // Recalculate Impact
  const recalculateImpact = async (docId?: string) => {
    addToast({
      type: 'info',
      title: 'Calculating Impact Graph',
      message: 'Running NetworkX dependency traversal and impact reconciliation...',
    });

    if (isLiveMode && docId) {
      try {
        await apiService.analyzeDocument(docId);
        await loadBackendData();
        addToast({
          type: 'success',
          title: 'Impact Analysis Complete',
          message: 'Graph topology refreshed and answer statuses updated.',
        });
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Impact analysis failed';
        addToast({ type: 'error', title: 'Impact Analysis Failed', message: msg });
        return;
      }
    }

    setTimeout(() => {
      addToast({
        type: 'success',
        title: 'Recalculation Complete',
        message: 'Graph topology refreshed with 0 circular dependencies.',
      });
    }, 800);
  };

  return (
    <AppContext.Provider
      value={{
        isLiveMode,
        setIsLiveMode,
        backendStatus,
        checkBackendConnection,
        documents,
        reviews,
        auditEvents,
        isLoading,
        refreshData: loadBackendData,
        searchQuery,
        setSearchQuery,
        isSearchModalOpen,
        setIsSearchModalOpen,
        toasts,
        addToast,
        removeToast,
        uploadDocument,
        deleteDocument,
        updateReviewDecision,
        recalculateImpact,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
