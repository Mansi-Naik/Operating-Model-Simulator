interface VersionChip {
  name: string;
  version: string;
  stale?: boolean;
}

interface FooterStatusBarProps {
  versions?: VersionChip[];
  lastSaved?: string;
  isGenerating?: boolean;
  generatingMessage?: string;
}

export function FooterStatusBar({
  versions = [
    { name: 'Context', version: 'v2' },
    { name: 'Matrix', version: 'v1', stale: true },
  ],
  lastSaved = '2 min ago',
  isGenerating = false,
  generatingMessage = 'Generating role redesigns...',
}: FooterStatusBarProps) {
  return (
    <footer className="w-full h-8 bg-[#161916] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
          <span className="text-[11px] text-white font-mono">SYSTEM ENGINE: ACTIVE</span>
        </div>
        <span className="text-[11px] text-white/60 font-mono">Last saved {lastSaved}</span>
      </div>

      <div className="flex items-center gap-3">
        {isGenerating && (
          <div className="flex items-center gap-2 mr-4">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FD4E59] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FD4E59] animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FD4E59] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[11px] italic text-white/80">{generatingMessage}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-[11px] font-mono text-white">
          {versions.map((v, idx) => (
            <span key={idx} className={v.stale ? 'text-[#FFAB28]' : ''}>
              {v.name && `${v.name} `}{v.version}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
