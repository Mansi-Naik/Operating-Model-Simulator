import { X, RefreshCw, Clock } from 'lucide-react';
import { useState } from 'react';

interface F2_5_BulkModalProps {
  onClose: () => void;
  onReRun: () => void;
}

export function F2_5_BulkModal({ onClose, onReRun }: F2_5_BulkModalProps) {
  const [resetOverrides, setResetOverrides] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[480px] bg-white rounded-xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-bold text-[#161916]">
            Re-run allocation predictions?
          </h2>
          <button onClick={onClose} className="text-[#6D7069] hover:text-[#161916]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <p className="text-[14px] text-[#494949] mb-5 leading-relaxed">
          This will replace 9 AI predictions with new ones based on the new appetite (Aggressive).
          Constraint-locked tasks (1) won't change.
        </p>

        {/* Checkbox */}
        <label className="flex items-start gap-3 mb-2 cursor-pointer group">
          <div
            onClick={() => setResetOverrides(!resetOverrides)}
            className={`
              w-5 h-5 mt-0.5 border rounded flex items-center justify-center flex-shrink-0
              ${resetOverrides
                ? 'bg-[#FD4E59] border-[#FD4E59]'
                : 'border-[#6D7069] group-hover:border-[#FD4E59]'
              }
            `}
          >
            {resetOverrides && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <div className="text-[14px] text-[#161916]">Also reset my 2 user overrides</div>
            <div className="text-[12px] text-[#6D7069] mt-1">
              Off by default — your overrides will be preserved.
            </div>
          </div>
        </label>

        {/* Estimated Time */}
        <div className="flex items-center gap-2 text-[13px] text-[#6D7069] mt-5 mb-6">
          <Clock className="w-4 h-4" />
          <span>Estimated time: ~30 seconds</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="h-10 px-6 border border-[#494949]/30 text-[#494949] text-[14px] font-medium rounded-md hover:bg-[#494949]/5"
          >
            Cancel
          </button>
          <button
            onClick={onReRun}
            className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Re-run
          </button>
        </div>
      </div>
    </div>
  );
}
