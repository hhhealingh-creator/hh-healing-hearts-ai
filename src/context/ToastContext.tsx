import {
    createContext, useCallback, useContext, useState, type ReactNode
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
    id: string;
    title: string;
    description?: string;
    tone: ToastTone;
}

const ToastContext = createContext<{
    push: (toast: Omit<ToastItem, 'id'>) => void;
} | null>(null);

const icons = {
    success: CheckCircle2,
    error: AlertTriangle,
    info: Info
};

const tones = {
    success: 'border-forest-200 bg-forest-50 text-forest-900',
    error: 'border-hhred-100 bg-hhred-50 text-hhred-700',
    info: 'border-cream-300 bg-cream-50 text-forest-900'
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const remove = useCallback((id: string) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback(
        (toast: Omit<ToastItem, 'id'>) => {
            const id = crypto.randomUUID();
            setToasts((current) => [...current, { ...toast, id }]);
            window.setTimeout(() => remove(id), 5_000);
        },
        [remove]
    );

    return (
        <ToastContext.Provider value={{ push }}>
            {children}
            <div
                aria-live="polite"
                aria-atomic="false"
                className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
            >
                {toasts.map((toast) => {
                    const Icon = icons[toast.tone];
                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg ${tones[toast.tone]}`}
                        >
                            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{toast.title}</p>
                                {toast.description ? (
                                    <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={() => remove(toast.id)}
                                className="rounded-lg p-1 hover:bg-black/5"
                                aria-label="Dismiss notification"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const value = useContext(ToastContext);
    if (!value) throw new Error('useToast must be used inside ToastProvider');
    return value;
}