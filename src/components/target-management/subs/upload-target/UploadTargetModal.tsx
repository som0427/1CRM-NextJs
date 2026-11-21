import React from 'react';
import { X } from 'lucide-react';

interface UploadTargetModalProps {
  open: boolean;
  onClose: () => void;
  targetId?: number | null;
}

const UploadTargetModal: React.FC<UploadTargetModalProps> = ({ open, onClose, targetId }) => {
  if (!open) {
    return null;
  }

  const handleBackdropClick = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md rounded-[24px] bg-white px-5 py-7 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-500 bg-white text-black transition hover:bg-slate-50"
        >
          <X className="h-4 w-4 font-bold text-black" strokeWidth={2.5} />
        </button>

        <h2 className="text-base font-semibold text-[#3F4254]">Upload Target Feature Coming Soon</h2>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6">
          <p className="text-sm leading-relaxed text-slate-600">
            Uploading targets from this screen will be available soon. For now, please continue using existing
            target actions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadTargetModal;
