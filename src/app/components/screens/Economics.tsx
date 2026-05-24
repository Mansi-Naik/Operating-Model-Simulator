import { useCallback, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useMountPipelineCacheRedirect, usePipelineCacheEntry } from '../../../hooks/usePipelineCacheEntry';
import { clearF5SavedState } from '../../../lib/pipelineRerunClear';
import { PipelineCacheLoading, PipelinePreRunGate } from '../PipelinePreRunGate';
import { F5_1_EconomicsDashboard } from './economics/F5_1_EconomicsDashboard';
import { F5_2_AssumptionEditor } from './economics/F5_2_AssumptionEditor';

type EconomicsView = 'pre-run' | 'dashboard';

interface EconomicsProps {
  onBack?: () => void;
  onProceedToF6?: () => void;
  onMissingF4Selection?: () => void;
  onGoToF1Preferences?: () => void;
}

export function Economics({ onBack, onProceedToF6, onMissingF4Selection, onGoToF1Preferences }: EconomicsProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const [view, setView] = useState<EconomicsView>('pre-run');
  const [showAssumptionEditor, setShowAssumptionEditor] = useState(false);
  const [assumptionVersion, setAssumptionVersion] = useState(0);
  const { isLoading: pipelineLoading, refresh: refreshPipeline } = usePipelineCacheEntry(
    'f5',
    engagementIdFromUrl,
  );
  const goToDashboard = useCallback(() => setView('dashboard'), []);
  useMountPipelineCacheRedirect('f5', engagementIdFromUrl, goToDashboard, {
    enabled: view === 'pre-run',
  });

  const handleReRun = useCallback(async () => {
    if (!engagementIdFromUrl) {
      throw new Error('Missing engagement');
    }
    await clearF5SavedState(engagementIdFromUrl);
    await refreshPipeline();
    setAssumptionVersion((v) => v + 1);
    setView('dashboard');
  }, [engagementIdFromUrl, refreshPipeline]);

  if (view === 'pre-run') {
    if (pipelineLoading) {
      return <PipelineCacheLoading />;
    }

    return (
      <PipelinePreRunGate feature="f5" engagementId={engagementIdFromUrl} onSkipToResults={goToDashboard}>
        <EconomicsPreRun onBack={onBack} onGenerate={goToDashboard} />
      </PipelinePreRunGate>
    );
  }

  return (
    <div className="relative h-full" key={`economics-shell-${engagementIdFromUrl ?? 'none'}-${assumptionVersion}`}>
      {showAssumptionEditor && (
        <div
          className="absolute inset-0 bg-black/20 z-40"
          onClick={() => setShowAssumptionEditor(false)}
        />
      )}

      <div className={showAssumptionEditor ? 'opacity-100' : ''}>
        <F5_1_EconomicsDashboard
          key={`f5-dashboard-${assumptionVersion}`}
          onEditAssumptions={() => setShowAssumptionEditor(true)}
          onBack={onBack}
          onProceedToF6={onProceedToF6}
          onMissingF4Selection={onMissingF4Selection}
          onReRun={handleReRun}
          onGoToF1Preferences={onGoToF1Preferences}
          refreshKey={assumptionVersion}
        />
      </div>

      {showAssumptionEditor && (
        <div className="absolute top-0 right-0 h-full z-50 animate-slide-in-right">
          <F5_2_AssumptionEditor
            onClose={() => setShowAssumptionEditor(false)}
            onSaved={() => setAssumptionVersion((v) => v + 1)}
            onApplied={() => {
              setAssumptionVersion((v) => v + 1);
              setShowAssumptionEditor(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function EconomicsPreRun({
  onBack,
  onGenerate,
}: {
  onBack?: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="p-10 flex justify-center">
      <div className="max-w-[720px] w-full">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
          >
            Back
          </button>
        ) : null}
        <div className="text-[13px] text-[#161916] mb-6">ECONOMICS</div>
        <h1 className="text-[28px] font-bold text-[#161916] mb-4">Compute economics</h1>
        <p className="text-[15px] text-[#494949] mb-8">
          Model current vs. future operating cost, savings, payback, and sensitivity from your selected pod variant and
          role designs.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          className="h-11 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generate economics
        </button>
      </div>
    </div>
  );
}
