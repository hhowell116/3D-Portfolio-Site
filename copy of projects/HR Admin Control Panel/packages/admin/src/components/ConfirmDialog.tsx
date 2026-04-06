import { type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
          <h3 className="text-base font-semibold text-brand-deep-brown">{title}</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-brand-off-white">
            <X size={18} className="text-brand-taupe" />
          </button>
        </div>
        <div className="px-6 py-4 text-sm text-brand-text-brown">{message}</div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-brand-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-brand-border text-brand-text-brown hover:bg-brand-off-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg text-white transition-colors ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-brand-warm-brown hover:bg-brand-deep-brown'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
