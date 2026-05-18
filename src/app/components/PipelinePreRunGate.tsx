import { Loader2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { usePipelineCacheEntry } from '../../hooks/usePipelineCacheEntry';
import { isForceRerun } from '../../lib/pipelineCacheUtils';

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
  const { exists, isLoading } = usePipelineCacheEntry(feature, engagementId);
  const featureLabel = feature.toUpperCase();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceRerun = urlParams.get('forceRerun') === 'true';

    console.log(`[${featureLabel} Prerun] useEffect triggered`, {
      forceRerun,
      exists,
      isLoading,
      url: window.location.href,
      search: window.location.search,
    });

    if (isLoading) return;

    if (forceRerun) {
      console.log(`[${featureLabel} Prerun] forceRerun is true, staying on pre-run screen`);
      return;
    }

    if (exists) onSkipToResults();
  }, [isLoading, exists, onSkipToResults, featureLabel]);

  const forceRerunFromUrl = isForceRerun();

  if (isLoading || (!forceRerunFromUrl && exists)) {
    return <PipelineCacheLoading />;
  }

  return <>{children}</>;
}
