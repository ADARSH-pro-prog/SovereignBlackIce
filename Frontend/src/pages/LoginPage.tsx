import React, { useState, useEffect } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loginWithGoogle } = useApp();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setErrorMessage(null);

    const credential = credentialResponse.credential;
    if (!credential) {
      setErrorMessage('Google did not return an authentication token. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Send Google credential to FastAPI backend for verification
      await loginWithGoogle(credential);
      // Backend verified and stored user session; redirect to dashboard
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const displayMsg =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify that the backend is running.';
      setErrorMessage(displayMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setIsLoading(false);
    setErrorMessage('Google Sign-In failed. Please try again.');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0C0B0E] px-4 overflow-hidden select-none">
      {/* Ambient background glows matching Sovereign Black Ice palette */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#A3E635]/10 blur-[100px]" />
        <div className="absolute -right-24 top-[30%] h-80 w-80 rounded-full bg-[#F472B6]/10 blur-[110px]" />
        <div className="absolute -bottom-24 left-[35%] h-72 w-72 rounded-full bg-[#C4B5FD]/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-[#302F34] bg-[#171719]/95 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        {/* Brand Shield Logo */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-[#BEF264] to-[#F9A8D4] opacity-40 blur-md" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#3A393F] bg-gradient-to-br from-[#B7F34A] via-[#BFA8FF] to-[#F472B6] shadow-[0_10px_26px_rgba(163,230,53,0.22)]">
              <Shield className="h-7 w-7 text-[#171719]" />
            </div>
          </div>
        </div>

        <h1 className="mb-1 text-2xl font-black uppercase tracking-wider text-[#F8F7F4]">
          Sovereign Black Ice
        </h1>

        <p className="mb-7 text-xs font-medium text-[#8D8992]">
          Sign in to continue
        </p>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#FB7185]/35 bg-[#FB7185]/10 p-3.5 text-left text-xs text-[#FDA4AF] animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#FB7185] mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#B7F34A]" />
            <p className="text-xs font-semibold tracking-wide text-[#F8F7F4]">
              Signing in...
            </p>
            <p className="text-[11px] text-[#8D8992]">
              Verifying Google credentials with Sovereign Black Ice engine
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                shape="rectangular"
                theme="filled_black"
                size="large"
                width="280"
                text="signin_with"
              />
            </div>
          </div>
        )}

        {/* Security badge footer */}
        <div className="mt-8 pt-6 border-t border-[#29282D] flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-[#77737E]">
          <Shield className="h-3 w-3 text-[#A3E635]" />
          <span>Local-First AI Knowledge Integrity System</span>
        </div>
      </div>
    </div>
  );
}