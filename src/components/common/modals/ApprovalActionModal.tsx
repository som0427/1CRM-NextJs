import React from 'react';
import { X } from 'lucide-react';

interface ApprovalActionModalProps {
  open: boolean;
  onClose: () => void;
}

const ApprovalActionModal: React.FC<ApprovalActionModalProps> = ({ open, onClose }) => {
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

        <h2 className="text-base font-semibold text-[#3F4254]">Feature Coming Soon</h2>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6">
          <p className="text-sm leading-relaxed text-slate-600">
            This action is not active yet—we're launching it soon to enhance your workflow.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApprovalActionModal;
