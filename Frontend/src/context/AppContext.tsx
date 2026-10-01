import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DocumentItem,
  ReviewItem,
  AuditEvent,
  BackendConnectionStatus,
  ReviewStatus,
  AuthUser,
} from '../types';
import {
  DEMO_DOCUMENTS,
  DEMO_REVIEWS,
  DEMO_AUDIT_EVENTS,
} from '../data/demoData';
import { apiService, authService, API_BASE_URL, BackendImpactAnalysisResult } from '../services/api';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
}

interface AppContextType {
  // Authentication State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  loginWithGoogle: (credential: string) => Promise<AuthUser>;
  loginWithDevAccount: () => Promise<AuthUser>;
  logout: () => void;

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
  recalculateImpact: (docId?: string, oldVersionId?: string, newVersionId?: string) => Promise<BackendImpactAnalysisResult | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Persisted authenticated user state (key: blackice_user and blackice_token)
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('blackice_user');
      const token = localStorage.getItem('blackice_token');
      if (saved && token) {
        return JSON.parse(saved) as AuthUser;
      }
    } catch {
      localStorage.removeItem('blackice_user');
      localStorage.removeItem('blackice_token');
    }
    return null;
  });

  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => {
    return Boolean(typeof window !== 'undefined' && localStorage.getItem('blackice_token'));
  });

  // Verify active session with backend on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('blackice_token') : null;
    if (!token) {
      setIsAuthChecking(false);
      return;
    }

    authService
      .getMe()
      .then((verifiedUser) => {
        setUser(verifiedUser);
        localStorage.setItem('blackice_user', JSON.stringify(verifiedUser));
      })
      .catch((err) => {
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 401) {
          localStorage.removeItem('blackice_token');
          localStorage.removeItem('blackice_user');
          setUser(null);
        }
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, []);

  const isAuthenticated = Boolean(user && user.id && typeof window !== 'undefined' && localStorage.getItem('blackice_token'));

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

  // Google Sign-In backend verification handler
  const loginWithGoogle = async (credential: string): Promise<AuthUser> => {
    if (!credential || !credential.trim()) {
      throw new Error('Google credential is required.');
    }
    const response = await authService.googleLogin(credential);
    if (!response || !response.user) {
      throw new Error('Invalid response received from authentication server.');
    }
    if (response.access_token) {
      localStorage.setItem('blackice_token', response.access_token);
    }
    setUser(response.user);
    localStorage.setItem('blackice_user', JSON.stringify(response.user));
    addToast({
      type: 'success',
      title: 'Authenticated',
      message: `Signed in as ${response.user.name || response.user.email}.`,
    });
    return response.user;
  };

  // Dev account login handler for local development and automated workflows
  const loginWithDevAccount = async (): Promise<AuthUser> => {
    const response = await authService.devLogin();
    if (!response || !response.user) {
      throw new Error('Invalid response received from authentication server.');
    }
    if (response.access_token) {
      localStorage.setItem('blackice_token', response.access_token);
    }
    setUser(response.user);
    localStorage.setItem('blackice_user', JSON.stringify(response.user));
    addToast({
      type: 'success',
      title: 'Dev Operator Authenticated',
      message: `Signed in as ${response.user.name || response.user.email} (Local Testing Mode).`,
    });
    return response.user;
  };

  // Sign out handler
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('blackice_token');
    localStorage.removeItem('blackice_user');
    authService.logout().catch(() => {});
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been signed out of Sovereign Black Ice.',
    });
  }, [addToast]);

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

        if (res.is_duplicate || res.status === 'unchanged') {
          addToast({
            type: 'warning',
            title: 'Document Unchanged (Duplicate Detected)',
            message: res.message || 'The uploaded file is identical to the current version. No duplicate was created.',
          });
        } else if (baselineId) {
          addToast({
            type: 'success',
            title: 'New Version Created & Processed',
            message: res.message || `Version ${res.document.currentVersion} created and claim diffs indexed.`,
          });
        } else {
          addToast({
            type: 'success',
            title: 'Document Uploaded & Processed',
            message: res.message || `${res.document.title} (${res.document.currentVersion}) analyzed.`,
          });
        }
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
  const recalculateImpact = async (docId?: string, oldVersionId?: string, newVersionId?: string): Promise<BackendImpactAnalysisResult | null> => {
    addToast({
      type: 'info',
      title: 'Calculating Impact Graph',
      message: 'Running NetworkX dependency traversal and impact reconciliation...',
    });

    if (isLiveMode && docId) {
      try {
        const result = await apiService.analyzeDocument(docId, oldVersionId, newVersionId);
        await loadBackendData();
        addToast({
          type: 'success',
          title: 'Impact Analysis Complete',
          message: `${result.affected_answers_count} affected answer(s) flagged, ${result.alerts_generated} alert(s) generated.`,
        });
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Impact analysis failed';
        addToast({ type: 'error', title: 'Impact Analysis Failed', message: msg });
        return null;
      }
    }

    setTimeout(() => {
      addToast({
        type: 'success',
        title: 'Recalculation Complete',
        message: 'Graph topology refreshed with 0 circular dependencies.',
      });
    }, 800);
    return null;
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        isAuthChecking,
        loginWithGoogle,
        loginWithDevAccount,
        logout,
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
