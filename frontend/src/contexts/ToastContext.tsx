/**
 * ToastContext - Unified toast notification system using notistack.
 * Provides useToast() hook for React components and getToast() for imperative use.
 */
import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react';
import { useSnackbar, VariantType } from 'notistack';
import { useLanguage } from '../i18n';

interface ToastOptions {
  params?: Record<string, string | number>;
  autoHideDuration?: number;
  raw?: boolean; // If true, key is used as-is (not translated)
}

interface ToastApi {
  success: (key: string, options?: ToastOptions) => void;
  error: (key: string, options?: ToastOptions) => void;
  warning: (key: string, options?: ToastOptions) => void;
  info: (key: string, options?: ToastOptions) => void;
  dismiss: (key?: string | number) => void;
}

// Module-level ref for imperative access outside React tree
let toastRef: ToastApi | null = null;

/**
 * Get toast API for imperative use (e.g., from socket handlers in contexts above ToastProvider).
 * Returns null before ToastProvider mounts.
 */
export function getToast(): ToastApi | null {
  return toastRef;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const DEFAULT_DURATIONS: Record<VariantType, number> = {
  success: 3000,
  info: 3000,
  warning: 4000,
  error: 4000,
  default: 3000,
};

/** Inner component that has access to notistack's useSnackbar */
const ToastProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { t } = useLanguage();
  const apiRef = useRef<ToastApi | null>(null);

  const show = useCallback(
    (variant: VariantType, key: string, options?: ToastOptions) => {
      const message = options?.raw ? key : t(key, options?.params);
      const duration = options?.autoHideDuration ?? DEFAULT_DURATIONS[variant];
      enqueueSnackbar(message, {
        variant,
        autoHideDuration: duration,
        // Pass duration to custom ToastContent via CSS variable for progress bar
        style: { '--toast-duration': `${duration}ms` } as React.CSSProperties,
      });
    },
    [enqueueSnackbar, t],
  );

  const api: ToastApi = {
    success: (key, opts) => show('success', key, opts),
    error: (key, opts) => show('error', key, opts),
    warning: (key, opts) => show('warning', key, opts),
    info: (key, opts) => show('info', key, opts),
    dismiss: (key) => closeSnackbar(key),
  };

  // Keep module-level ref in sync
  if (apiRef.current !== api) {
    apiRef.current = api;
    toastRef = api;
  }

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <ToastProviderInner>{children}</ToastProviderInner>;
};

export const useToast = (): ToastApi => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
