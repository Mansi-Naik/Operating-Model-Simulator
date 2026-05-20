import { useRef, useState } from 'react';
import { FileUp, ClipboardList, ArrowLeft, Loader2, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

interface ExtractionApiBody {
  extraction_quality: string;
  document_relevance_score: number;
  summary_message: string;
  extracted_fields_count: number;
  total_possible_fields: number;
  intake_data: Record<string, unknown>;
  tasks: Record<string, unknown>[];
  extraction_warnings: string[];
  tasks_extracted_count?: number;
  estimated_tasks_in_document?: number;
}

interface ModeSelectorProps {
  onModeSelect: (mode: 'upload' | 'guided') => void;
  onIntakeExtracted?: (engagementId: string) => void;
  onStartGuidedEmpty?: () => void;
  hasDraft?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}

const FILE_ACCEPT =
  '.txt,.md,.docx,.pdf,.xlsx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function mapTasksForInsert(
  engagementId: string,
  tasks: Record<string, unknown>[],
): Record<string, unknown>[] {
  return (tasks ?? []).map((t, idx) => {
    const n = String(idx + 1).padStart(3, '0');
    return {
      engagement_id: engagementId,
      task_id: `t_${n}`,
      task_name: t.task_name ?? null,
      role_performing: t.role_performing ?? null,
      task_type: t.task_type ?? null,
      volume_per_day: t.volume_per_day ?? null,
      avg_time_minutes: t.avg_time_minutes ?? null,
      input_data_type:
        typeof t.input_data_type === 'string' && t.input_data_type.trim()
          ? t.input_data_type
          : 'mixed',
      consequence_of_error:
        typeof t.consequence_of_error === 'string' && t.consequence_of_error.trim()
          ? t.consequence_of_error
          : 'medium',
      data_logged: typeof t.data_logged === 'boolean' ? t.data_logged : true,
      regulatory_constraint:
        typeof t.regulatory_constraint === 'boolean' ? t.regulatory_constraint : true,
      source: 'ai_extracted',
    };
  });
}

export function ModeSelector({
  onModeSelect,
  onIntakeExtracted,
  onStartGuidedEmpty,
  hasDraft = false,
  showBack = false,
  onBack,
}: ModeSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [relevanceModal, setRelevanceModal] = useState<ExtractionApiBody | null>(null);

  const triggerFilePick = () => {
    setErrorMessage(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setExtracting(true);
    setErrorMessage(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/extract-intake', {
        method: 'POST',
        body: fd,
      });
      const raw = await res.text();
      let body = {} as { error?: string } & Partial<ExtractionApiBody>;
      try {
        body = raw ? (JSON.parse(raw) as typeof body) : {};
      } catch {
        body = {};
      }
      if (!res.ok) {
        const fromJson = typeof body?.error === 'string' ? body.error.trim() : '';
        const fallback =
          raw && !fromJson && !raw.trimStart().startsWith('<')
            ? raw.trim().slice(0, 280)
            : '';
        setErrorMessage(
          fromJson || fallback || `Upload failed (${res.status}). Check Vercel → Functions logs and env vars.`,
        );
        return;
      }

      const extracted = body as ExtractionApiBody;
      if (extracted.extraction_quality === 'not_intake_doc' || extracted.document_relevance_score < 0.3) {
        setRelevanceModal(extracted);
        return;
      }

      await persistEngagementAndRoute(extracted);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setExtracting(false);
    }
  };

  const persistEngagementAndRoute = async (extracted: ExtractionApiBody) => {
    const eng = (extracted.intake_data?.engagement as Record<string, unknown>) || {};
    const clientName = typeof eng.client_name === 'string' && eng.client_name.trim() ? eng.client_name.trim() : 'Untitled';
    const domain = typeof eng.domain === 'string' ? eng.domain : null;

    const extraction_metadata = {
      quality: extracted.extraction_quality,
      relevance_score: extracted.document_relevance_score,
      warnings: extracted.extraction_warnings ?? [],
      extracted_at: new Date().toISOString(),
      extracted_fields_count: extracted.extracted_fields_count,
      summary_message: extracted.summary_message,
      tasks_extracted_count:
        typeof extracted.tasks_extracted_count === 'number'
          ? extracted.tasks_extracted_count
          : (extracted.tasks ?? []).length,
      estimated_tasks_in_document: extracted.estimated_tasks_in_document ?? null,
    };

    const { data: row, error: insErr } = await supabase
      .from('engagements')
      .insert([
        {
          client_name: clientName,
          domain,
          status: 'in_progress',
          intake_mode: 'upload',
          values_are_illustrative: true,
          intake_data: extracted.intake_data,
          extraction_metadata,
        },
      ])
      .select('id')
      .single();

    if (insErr || !row?.id) {
      setErrorMessage(insErr?.message ?? 'Could not create engagement');
      return;
    }

    const engagementId = row.id as string;
    const taskRows = mapTasksForInsert(engagementId, extracted.tasks ?? []);
    if (taskRows.length > 0) {
      const { error: taskErr } = await supabase.from('tasks').insert(taskRows);
      if (taskErr) {
        setErrorMessage(taskErr.message);
        return;
      }
    }

    const url = new URL(window.location.href);
    url.searchParams.set('engagementId', engagementId);
    window.history.replaceState({}, '', url.toString());
    onIntakeExtracted?.(engagementId);
  };

  const handleRelevanceProceed = async () => {
    if (!relevanceModal) return;
    setExtracting(true);
    try {
      await persistEngagementAndRoute(relevanceModal);
    } finally {
      setExtracting(false);
      setRelevanceModal(null);
    }
  };

  const handleRelevanceGuided = () => {
    setRelevanceModal(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('engagementId');
    window.history.replaceState({}, '', url.toString());
    onStartGuidedEmpty?.();
  };

  return (
    <div className="p-10 relative">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={FILE_ACCEPT}
        onChange={(e) => void handleFileChange(e)}
      />

      {extracting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-xl border border-[#161916]/10">
            <Loader2 className="w-10 h-10 text-[#FD4E59] animate-spin mx-auto mb-4" />
            <p className="text-[16px] font-semibold text-[#161916] mb-2">Extracting information from your document…</p>
            <p className="text-[13px] text-[#6D7069]">This may take 20–40 seconds</p>
          </div>
        </div>
      )}

      {relevanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl border border-[#161916]/10">
            <h3 className="text-[18px] font-bold text-[#161916] mb-3">Check your document</h3>
            <p className="text-[14px] text-[#494949] leading-relaxed mb-4">
              This document doesn&apos;t appear to be a business intake document. We extracted minimal data (
              {relevanceModal.extracted_fields_count} fields). Do you want to proceed with these values, or use the
              guided form instead?
            </p>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={handleRelevanceGuided}
                className="h-10 px-4 border border-[#494949]/30 text-[#494949] text-[14px] font-medium rounded-md hover:bg-[#FDF8F4]"
              >
                Use guided form
              </button>
              <button
                type="button"
                disabled={extracting}
                onClick={() => void handleRelevanceProceed()}
                className="h-10 px-4 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 disabled:opacity-60"
              >
                Proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}

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
        <p className="text-[15px] text-[#494949]">Choose how you&apos;d like to provide your engagement context.</p>
      </div>

      {errorMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-[#FD4E59]/40 bg-[#FD4E59]/10 text-[14px] text-[#161916]">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-[#FDF8F4] border border-[#161916]/12 rounded-xl p-8">
          <FileUp className="w-12 h-12 text-[#FD4E59] mb-2" />
          <h2 className="text-[18px] font-semibold text-[#161916] mb-3">Upload structured data</h2>
          <p className="text-[14px] text-[#494949] mb-6">
            Upload a scoping document (.txt, .md, .docx, .pdf, or .xlsx). We&apos;ll extract engagement fields with AI
            so you can review them in the guided flow.
          </p>
          <button
            type="button"
            onClick={triggerFilePick}
            className="w-full h-11 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90"
          >
            Choose file
          </button>
          <div className="text-center mt-3">
            <span className="text-[12px] text-[#6D7069]">Max 10 MB · text-based PDFs work best</span>
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
