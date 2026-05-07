import { ChevronLeft, BarChart3, RefreshCw, AlertTriangle, Check } from 'lucide-react';

interface F6_1_B_DependenciesViewProps {
  onBack: () => void;
  onViewGantt?: () => void;
}

export function F6_1_B_DependenciesView({ onBack, onViewGantt }: F6_1_B_DependenciesViewProps) {
  return (
    <div className="p-10 max-w-[1204px] mx-auto">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#494949] hover:text-[#161916] text-[14px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to timeline
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewGantt}
            className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            View as Gantt
          </button>
          <button className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Reset layout
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-4">
        <h1 className="text-[24px] font-bold text-[#161916] mb-1">Dependencies</h1>
        <p className="text-[13px] text-[#6D7069]">
          What blocks what. Critical path highlighted in coral.
        </p>
      </div>

      {/* Legend Row */}
      <div className="flex items-center gap-6 mb-6 py-3 border-y border-[#494949]/12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-[#FD4E59]" />
          <span className="text-[12px] text-[#494949]">Critical path</span>
        </div>
        <div className="w-px h-4 bg-[#494949]/12" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-[#6D7069]" />
          <span className="text-[12px] text-[#494949]">Soft dependency</span>
        </div>
        <div className="w-px h-4 bg-[#494949]/12" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FD4E59]" />
          <span className="text-[12px] text-[#494949]">Bottleneck</span>
        </div>
        <div className="w-px h-4 bg-[#494949]/12" />
        <div className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[#548235]" />
          <span className="text-[12px] text-[#494949]">Quick win</span>
        </div>
      </div>

      {/* Graph Area with Side Panel */}
      <div className="grid grid-cols-[1fr_280px] gap-6">
        {/* Graph */}
        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 relative" style={{ height: '520px' }}>
          {/* Dotted grid background */}
          <div
            className="absolute inset-6 opacity-5"
            style={{
              backgroundImage: 'radial-gradient(circle, #494949 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* SVG for graph */}
          <svg className="w-full h-full relative z-10" viewBox="0 0 800 500">
            {/* Phase swim-lane backgrounds */}
            <rect x="0" y="0" width="200" height="500" fill="#E2EFDA" opacity="0.08" />
            <rect x="200" y="0" width="200" height="500" fill="#FFF0DC" opacity="0.08" />
            <rect x="400" y="0" width="200" height="500" fill="#FCE4D6" opacity="0.08" />
            <rect x="600" y="0" width="200" height="500" fill="#FD4E59" opacity="0.08" />

            {/* Edges - Critical path (coral solid) */}
            <path d="M 140 80 Q 170 80 200 120" stroke="#FD4E59" strokeWidth="2" fill="none" markerEnd="url(#arrowCoral)" />
            <path d="M 140 180 Q 170 180 200 140" stroke="#FD4E59" strokeWidth="2" fill="none" markerEnd="url(#arrowCoral)" />
            <path d="M 340 130 Q 370 130 400 180" stroke="#FD4E59" strokeWidth="2" fill="none" markerEnd="url(#arrowCoral)" />
            <path d="M 540 180 Q 570 180 600 220" stroke="#FD4E59" strokeWidth="2" fill="none" markerEnd="url(#arrowCoral)" />
            <path d="M 540 320 Q 570 320 600 280" stroke="#FD4E59" strokeWidth="2" fill="none" markerEnd="url(#arrowCoral)" />

            {/* Edges - Soft dependencies (grey dashed) */}
            <path d="M 140 180 Q 170 250 200 280" stroke="#6D7069" strokeWidth="1.5" strokeDasharray="4,4" fill="none" markerEnd="url(#arrowGrey)" />
            <path d="M 340 280 Q 370 300 400 320" stroke="#6D7069" strokeWidth="1.5" strokeDasharray="4,4" fill="none" markerEnd="url(#arrowGrey)" />
            <path d="M 540 340 Q 570 360 600 280" stroke="#6D7069" strokeWidth="1.5" strokeDasharray="4,4" fill="none" markerEnd="url(#arrowGrey)" />
            <path d="M 340 130 Q 370 160 400 200" stroke="#FD4E59" strokeWidth="2" fill="none" opacity="0.5" markerEnd="url(#arrowCoral)" />

            {/* Arrow markers */}
            <defs>
              <marker id="arrowCoral" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#FD4E59" />
              </marker>
              <marker id="arrowGrey" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#6D7069" />
              </marker>
            </defs>

            {/* Phase 1 Nodes */}
            {/* Node A - Critical path */}
            <g>
              <rect x="40" y="60" width="140" height="60" fill="white" stroke="#548235" strokeWidth="2" rx="8" />
              <circle cx="48" cy="68" r="3" fill="#FD4E59" />
              <text x="110" y="85" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Image classifier</text>
              <text x="110" y="100" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">retrain hookups</text>
            </g>

            {/* Node B - Critical path */}
            <g>
              <rect x="40" y="160" width="140" height="60" fill="white" stroke="#548235" strokeWidth="2" rx="8" />
              <circle cx="48" cy="168" r="3" fill="#FD4E59" />
              <text x="110" y="185" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Data logging</text>
              <text x="110" y="200" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">improvements</text>
            </g>

            {/* Node C - Quick win */}
            <g>
              <rect x="40" y="260" width="140" height="60" fill="white" stroke="#548235" strokeWidth="1" rx="8" />
              <circle cx="172" cy="268" r="8" fill="#548235" />
              <path d="M 168 268 L 171 271 L 176 264" stroke="white" strokeWidth="1.5" fill="none" />
              <text x="110" y="285" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Compile daily</text>
              <text x="110" y="300" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">report → auto</text>
            </g>

            {/* Node D - Quick win */}
            <g>
              <rect x="40" y="360" width="140" height="60" fill="white" stroke="#548235" strokeWidth="1" rx="8" />
              <circle cx="172" cy="368" r="8" fill="#548235" />
              <path d="M 168 368 L 171 371 L 176 364" stroke="white" strokeWidth="1.5" fill="none" />
              <text x="110" y="385" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Auto-QA</text>
              <text x="110" y="400" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">on spam</text>
            </g>

            {/* Phase 2 Nodes */}
            {/* Node E - Critical path */}
            <g>
              <rect x="240" y="110" width="140" height="60" fill="white" stroke="#FFAB28" strokeWidth="2" rx="8" />
              <circle cx="248" cy="118" r="3" fill="#FD4E59" />
              <text x="310" y="135" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Auto-QA pilot</text>
              <text x="310" y="150" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">in 1 pod</text>
            </g>

            {/* Node F */}
            <g>
              <rect x="240" y="210" width="140" height="60" fill="white" stroke="#FFAB28" strokeWidth="1" rx="8" />
              <text x="310" y="235" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">AI Output</text>
              <text x="310" y="250" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Auditor onboard</text>
            </g>

            {/* Node G */}
            <g>
              <rect x="240" y="260" width="140" height="60" fill="white" stroke="#FFAB28" strokeWidth="1" rx="8" />
              <text x="310" y="285" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">TL training</text>
              <text x="310" y="300" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">cohort 1</text>
            </g>

            {/* Phase 3 Nodes */}
            {/* Node H - Bottleneck */}
            <g>
              <rect x="440" y="160" width="140" height="60" fill="white" stroke="#FD4E59" strokeWidth="2" rx="8" />
              <circle cx="448" cy="168" r="5" fill="#FD4E59" />
              <text x="510" y="185" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">LLM summarization</text>
              <text x="510" y="200" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">rollout</text>
            </g>

            {/* Node I - Critical path */}
            <g>
              <rect x="440" y="300" width="140" height="60" fill="white" stroke="#FD4E59" strokeWidth="2" rx="8" />
              <circle cx="448" cy="308" r="3" fill="#FD4E59" />
              <text x="510" y="325" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Pod</text>
              <text x="510" y="340" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">restructure</text>
            </g>

            {/* Node J */}
            <g>
              <rect x="440" y="380" width="140" height="60" fill="white" stroke="#FD4E59" strokeWidth="1" rx="8" />
              <text x="510" y="405" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Span-of-control</text>
              <text x="510" y="420" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">increase</text>
            </g>

            {/* Phase 4 Nodes */}
            {/* Node K */}
            <g>
              <rect x="640" y="200" width="140" height="60" fill="white" stroke="#FD4E59" strokeWidth="1" rx="8" />
              <text x="710" y="225" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Refine AI</text>
              <text x="710" y="240" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">confidence</text>
            </g>

            {/* Node L - Critical path */}
            <g>
              <rect x="640" y="260" width="140" height="60" fill="white" stroke="#FD4E59" strokeWidth="2" rx="8" />
              <circle cx="648" cy="268" r="3" fill="#FD4E59" />
              <text x="710" y="285" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Reduce TL</text>
              <text x="710" y="300" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">overhead further</text>
            </g>

            {/* Node M */}
            <g>
              <rect x="640" y="360" width="140" height="60" fill="white" stroke="#FD4E59" strokeWidth="1" rx="8" />
              <text x="710" y="385" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">Backlog</text>
              <text x="710" y="400" fontSize="12" fontWeight="500" fill="#161916" textAnchor="middle">for v2</text>
            </g>
          </svg>
        </div>

        {/* Side Panel */}
        <div className="bg-white border border-[#494949]/12 rounded-xl p-5 h-fit">
          <h3 className="text-[14px] font-bold text-[#161916] mb-2">Critical path summary</h3>
          <p className="text-[13px] text-[#494949] mb-4">
            5 nodes form the critical path. Total duration: 9 months. Any delay on these nodes pushes the whole
            rollout.
          </p>

          {/* Critical path list */}
          <div className="space-y-2 mb-4">
            {[
              'Image classifier retrain hookups',
              'Data logging improvements',
              'Auto-QA pilot in 1 pod',
              'LLM summarization rollout',
              'Reduce TL overhead further',
            ].map((node, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#FD4E59] text-white flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="text-[12px] text-[#161916]">{node}</span>
              </div>
            ))}
          </div>

          {/* Bottleneck callout */}
          <div className="bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FFAB28] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#494949] leading-relaxed">
              LLM summarization rollout is the project bottleneck — 2 paths converge here. Ensure capacity planning is
              locked in by Phase 2 end.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
