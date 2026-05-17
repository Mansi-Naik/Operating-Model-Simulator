import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { setForceRerunFlag } from '../../lib/pipelineCacheUtils';

interface PipelineReRunButtonProps {
  onConfirmRerun: () => void;
  className?: string;
}

export function PipelineReRunButton({ onConfirmRerun, className = '' }: PipelineReRunButtonProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    setForceRerunFlag(true);
    onConfirmRerun();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-9 px-4 border border-[#FD4E59] text-[#FD4E59] text-[13px] rounded-md hover:bg-[#FD4E59]/5 flex items-center gap-2 ${className}`}
      >
        <RefreshCw className="w-4 h-4" />
        Re-run
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-[#494949]/12 max-w-md w-full p-6 shadow-lg"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[18px] font-bold text-[#161916] mb-2">Re-run this feature?</h2>
            <p className="text-[14px] text-[#494949] mb-6 leading-relaxed">
              Re-running will use API credits and overwrite the saved results for this feature. Continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 px-5 border border-[#494949]/30 text-[#494949] text-[14px] rounded-md hover:bg-[#494949]/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="h-10 px-5 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90"
              >
                Re-run
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
