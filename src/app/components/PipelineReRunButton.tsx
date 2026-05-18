import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { PIPELINE_RERUN_CONFIRM_MESSAGES } from '../../lib/pipelineRerunClear';

type PipelineRerunFeature = 'f2' | 'f3' | 'f4' | 'f5' | 'f6';

interface PipelineReRunButtonProps {
  feature: PipelineRerunFeature;
  onConfirmRerun: () => void | Promise<void>;
  className?: string;
  confirmMessage?: string;
}

export function PipelineReRunButton({
  feature,
  onConfirmRerun,
  className = '',
  confirmMessage,
}: PipelineReRunButtonProps) {
  const [open, setOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const message = confirmMessage ?? PIPELINE_RERUN_CONFIRM_MESSAGES[feature];

  const handleConfirm = async () => {
    setIsClearing(true);
    try {
      await onConfirmRerun();
      setOpen(false);
    } catch (error) {
      console.error(`[${feature} Re-run] Failed to clear saved state:`, error);
      window.alert("Couldn't re-run. Try again.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isClearing}
        className={`h-9 px-4 border border-[#FD4E59] text-[#FD4E59] text-[13px] rounded-md hover:bg-[#FD4E59]/5 flex items-center gap-2 disabled:opacity-60 ${className}`}
      >
        <RefreshCw className={`w-4 h-4 ${isClearing ? 'animate-spin' : ''}`} />
        Re-run
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <motionlessDialog
            isClearing={isClearing}
            message={message}
            onCancel={() => setOpen(false)}
            onConfirm={() => void handleConfirm()}
          />
        </div>
      ) : null}
    </>
  );
}

function motionlessDialog({
  isClearing,
  message,
  onCancel,
  onConfirm,
}: {
  isClearing: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-[#494949]/12 max-w-md w-full p-6 shadow-lg"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-[18px] font-bold text-[#161916] mb-2">Re-run this feature?</h2>
      <p className="text-[14px] text-[#494949] mb-6 leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isClearing}
          className="h-10 px-5 border border-[#494949]/30 text-[#494949] text-[14px] rounded-md hover:bg-[#494949]/5 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isClearing}
          className="h-10 px-5 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 disabled:opacity-60"
        >
          {isClearing ? 'Clearing…' : 'Re-run'}
        </button>
      </div>
    </div>
  );
}
