import { Loader2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { isForceRerun } from '../../lib/pipelineCacheUtils';
import { usePipelineRuns } from '../../hooks/usePipelineRuns';

type PipelineFeature = 'f2' | 'f3' | 'f4' | 'f5' | 'f6';

interface PipelinePreRunGateProps {
  feature: PipelineFeature;
  engagementId?: string | null;
  onSkipToResults: () => void;
  children: ReactNode;
}

function featureExists(
  feature: PipelineFeature,
  pipeline: ReturnType<typeof usePipelineRuns>,
): boolean {
  switch (feature) {
    case 'f2':
      return pipeline.f2_exists;
    case 'f3':
      return pipeline.f3_exists;
    case 'f4':
      return pipeline.f4_exists;
    case 'f5':
      return pipeline.f5_exists;
    case 'f6':
      return pipeline.f6_exists;
    default:
      return false;
  }
}

export function PipelinePreRunGate({
  feature,
  engagementId,
  onSkipToResults,
  children,
}: PipelinePreRunGateProps) {
  const pipeline = usePipelineRuns(engagementId ?? null);
  const forceRerun = isForceRerun();
  const exists = featureExists(feature, pipeline);

  useEffect(() => {
    if (pipeline.isLoading || forceRerun) return;
    if (exists) onSkipToResults();
  }, [pipeline.isLoading, forceRerun, exists, onSkipToResults]);

  if (pipeline.isLoading || (!forceRerun && exists)) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[320px] gap-3">
        <Loader2 className="w-8 h-8 text-[#FD4E59] animate-spin" />
        <p className="text-[14px] text-[#6D7069]">Loading saved results…</p>
      </div>
    );
  }

  return <>{children}</>;
}
