import React, { useEffect, useState } from 'react';

export interface SystemOption {
  id: string | number;
  name: string;
}

interface SelectSystemModalProps {
  open: boolean;
  onClose: () => void;
  onProceed?: (payload: { systemId: string | number; setDefault: boolean }) => void;
  userName?: string;
  systems?: SystemOption[];
  defaultSystemId?: string | number;
  initialSelectedId?: string | number;
}

const SelectSystemModal: React.FC<SelectSystemModalProps> = ({
  open,
  onClose,
  onProceed,
  userName = 'User',
  systems = [],
  defaultSystemId,
  initialSelectedId,
}) => {
  const [selected, setSelected] = useState<string | number>(defaultSystemId || (systems[0]?.id ?? ''));
  const [setDefault, setSetDefault] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      const initial = initialSelectedId ?? systems[0]?.id ?? '';
      setSelected(initial);
      setSetDefault(String(initial) === String(defaultSystemId ?? ''));
    }
  }, [open, defaultSystemId, systems, initialSelectedId]);

  // When selection changes, auto-sync the checkbox based on defaultSystemId
  useEffect(() => {
    setSetDefault(String(selected) === String(defaultSystemId ?? ''));
  }, [selected, defaultSystemId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] modalBackground p-4">
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Select System</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-gray-700">
            Dear {userName},
          </p>
          <p className="text-sm text-gray-600">
            You are registered as a user on multiple systems. Please select the one you want to access now. You can also set a default to avoid selection every time you login. You can change the system or reset the default from the navigation bar at any time.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <label className="text-sm font-medium text-gray-700">
              System Name <span className="text-[#F64E60]">*</span>
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {systems.length === 0 ? (
                  <option value="">No systems available</option>
                ) : (
                  systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <input
                id="setDefault"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={setDefault}
                onChange={(e) => setSetDefault(e.target.checked)}
              />
              <label htmlFor="setDefault" className="text-sm text-gray-700 select-none">
                Set as Default <span className="text-[#F64E60]">*</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onProceed?.({ systemId: selected, setDefault });
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectSystemModal;
