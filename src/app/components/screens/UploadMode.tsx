import { useState } from 'react';
import { Upload, File, X, ArrowLeft } from 'lucide-react';

interface UploadModeProps {
  onFileUploaded: () => void;
  onBack?: () => void;
}

export function UploadMode({ onFileUploaded, onBack }: UploadModeProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleParse = () => {
    setIsLoading(true);
    setTimeout(() => {
      onFileUploaded();
    }, 2000);
  };

  return (
    <div className="p-10">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <h1 className="text-[24px] font-bold text-[#161916] mb-2">Upload Your Intake File</h1>
      <p className="text-[14px] text-[#494949] mb-8">
        Upload an .xlsx or .csv file matching our intake template.
      </p>

      <div className="flex justify-center">
        {!selectedFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              w-[500px] h-60 border-2 border-dashed rounded-xl flex flex-col items-center justify-center
              transition-colors cursor-pointer
              ${isDragging
                ? 'border-[#FD4E59] bg-[#FDF8F4]'
                : 'border-[#FFAB28] bg-[#FFF0DC] hover:bg-[#FDF8F4] hover:border-[#FD4E59]'
              }
            `}
          >
            <Upload className="w-12 h-12 text-[#FFAB28] mb-4" />
            <p className="text-[15px] font-medium text-[#494949] mb-2">Drag and drop your file here</p>
            <p className="text-[13px] text-[#6D7069] mb-3">or</p>
            <label className="h-9 px-8 border border-[#FD4E59] text-[#FD4E59] text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/10 flex items-center justify-center cursor-pointer">
              Browse Files
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <p className="text-[12px] text-[#6D7069] mt-6">
              Accepted formats: .xlsx, .csv — max 10MB
            </p>
          </div>
        ) : (
          <div className="w-[500px]">
            <div className="border border-[#161916]/10 rounded-lg p-4 bg-white flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <File className="w-6 h-6 text-[#FD4E59]" />
                <div>
                  <div className="text-[14px] font-medium text-[#161916]">{selectedFile.name}</div>
                  <div className="text-[12px] text-[#6D7069]">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-[#6D7069] hover:text-[#FD4E59]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleParse}
              disabled={isLoading}
              className="w-full h-11 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 disabled:bg-[#6D7069] disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[13px] text-[#494949]">Reading your file...</span>
                </>
              ) : (
                'Parse File'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
