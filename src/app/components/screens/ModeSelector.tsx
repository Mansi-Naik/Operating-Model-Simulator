import { FileUp, ClipboardList, ArrowLeft } from 'lucide-react';

interface ModeSelectorProps {
  onModeSelect: (mode: 'upload' | 'guided') => void;
  hasDraft?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}

export function ModeSelector({ onModeSelect, hasDraft = false, showBack = false, onBack }: ModeSelectorProps) {
  return (
    <div className="p-10">
      {showBack && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#161916] mb-2">Business Context Intake</h1>
        <p className="text-[15px] text-[#494949]">
          Choose how you'd like to provide your engagement context.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-[#FDF8F4] border border-[#161916]/12 rounded-xl p-8">
          <FileUp className="w-12 h-12 text-[#FD4E59] mb-2" />
          <h2 className="text-[18px] font-semibold text-[#161916] mb-3">Upload Spreadsheet</h2>
          <p className="text-[14px] text-[#494949] mb-6">
            Upload your intake data as an .xlsx or .csv file using our standard template.
          </p>
          <button
            onClick={() => onModeSelect('upload')}
            className="w-full h-11 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90"
          >
            Choose File
          </button>
          <div className="text-center mt-3">
            <a href="#" className="text-[12px] text-[#FFAB28] underline">
              Download template
            </a>
          </div>
        </div>

        <div className="bg-[#FDF8F4] border border-[#161916]/12 rounded-xl p-8">
          <ClipboardList className="w-12 h-12 text-[#FFAB28] mb-2" />
          <h2 className="text-[18px] font-semibold text-[#161916] mb-3">Fill Guided Form</h2>
          <p className="text-[14px] text-[#494949] mb-6">
            Answer questions step-by-step across 7 sections with AI-assist and smart suggestions.
          </p>
          <button
            onClick={() => onModeSelect('guided')}
            className="w-full h-11 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90"
          >
            Start Form
          </button>
        </div>
      </div>

      {hasDraft && (
        <div className="text-center mt-6">
          <a href="#" className="text-[13px] text-[#FFAB28] underline">
            Resume draft from Step 3 — Tasks →
          </a>
        </div>
      )}
    </div>
  );
}
