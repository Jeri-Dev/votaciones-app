import { useEffect } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { initials } from '../../utils/ballot.js';

const VARIANTS = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950 disabled:bg-slate-300',
  success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:bg-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-slate-300',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-base gap-2 rounded-xl',
  lg: 'h-14 px-6 text-lg gap-2 rounded-xl',
  // Botones de la estación: grandes en tablet, más contenidos en celular.
  xl: 'min-h-14 px-5 text-lg gap-2 rounded-2xl sm:min-h-20 sm:px-8 sm:text-2xl sm:gap-3',
};

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, className = '', children, disabled, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="size-[1.2em] animate-spin" /> : Icon ? <Icon className="size-[1.2em]" /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = 'size-6' }) {
  return <LoaderCircle className={`animate-spin text-navy-700 ${className}`} aria-label="Cargando" />;
}

const TONES = {
  green: 'bg-green-100 text-green-800 ring-green-600/20',
  blue: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  amber: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  red: 'bg-red-100 text-red-800 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  navy: 'bg-navy-100 text-navy-900 ring-navy-700/20',
};

export function Badge({ tone = 'slate', children, dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${width} animate-fade-in rounded-2xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {onClose && (
              <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
                <X className="size-5" />
              </button>
            )}
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', variant = 'primary', loading, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-slate-600">{message}</p>
    </Modal>
  );
}

export function Card({ className = '', children }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function Avatar({ name, photoUrl, className = 'size-14 text-xl', tone = 'bg-navy-100 text-navy-900' }) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={`${className} shrink-0 rounded-full object-cover`} draggable="false" />;
  }
  return (
    <span className={`${className} ${tone} inline-flex shrink-0 items-center justify-center rounded-full font-bold`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
