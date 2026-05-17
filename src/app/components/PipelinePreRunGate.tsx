import { Loader2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { usePipelineCacheEntry } from '../../hooks/usePipelineCacheEntry';

type PipelineFeature = 'f2' | 'f3' | 'f4' | 'f5' | 'f6';

interface PipelinePreRunGateProps {
  feature: PipelineFeature;
  engagementId?: string | null;
  onSkipToResults: () => void;
  children: ReactNode;
}

export function PipelineCacheLoading() {
  return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[320px] gap-3">
      <Loader2 className="w-8 h-8 text-[#FD4E59] animate-spin" />
      <p className="text-[14px] text-[#6D7069]">Loading saved results…</p>
    </div>
  );
}

export function PipelinePreRunGate({
  feature,
  engagementId,
  onSkipToResults,
  children,
}: PipelinePreRunGateProps) {
  const { forceRerun, exists, isLoading } = usePipelineCacheEntry(feature, engagementId);

  useEffect(() => {
    if (isLoading || forceRerun) return;
    if (exists) onSkipToResults();
  }, [isLoading, forceRerun, exists, onSkipToResults]);

  if (isLoading || (!forceRerun && exists)) {
    return <PipelineCacheLoading />;
  }

  return <>{children}</>;
}
