import { X, Plus, GripVertical, Check } from 'lucide-react';
import { useState } from 'react';

interface F6_1_A_AddCustomPhaseModalProps {
  onClose: () => void;
}

export function F6_1_A_AddCustomPhaseModal({ onClose }: F6_1_A_AddCustomPhaseModalProps) {
  const [phaseName, setPhaseName] = useState('');
  const [insertPosition, setInsertPosition] = useState(2); // Between P2 and P3
  const [startMonth, setStartMonth] = useState('5');
  const [endMonth, setEndMonth] = useState('6');
  const [selectedColor, setSelectedColor] = useState(2); // Scale-like
  const [scopeItems, setScopeItems] = useState(['', '']);
  const [cumulativeSavings, setCumulativeSavings] = useState('');

  const phases = [
    { number: 1, name: 'Foundation', color: '#E2EFDA' },
    { number: 2, name: 'Pilot', color: '#FFF0DC' },
    { number: 3, name: 'Scale', color: '#FCE4D6' },
    { number: 4, name: 'Optimize', color: '#FD4E59' },
  ];

  const colorOptions = [
    { name: 'Foundation-like', color: '#E2EFDA' },
    { name: 'Pilot-like', color: '#FFF0DC' },
    { name: 'Scale-like', color: '#FCE4D6' },
    { name: 'Optimize-like', color: '#FD4E59' },
  ];

  const getInsertionHelperText = () => {
    if (insertPosition === 0) return 'New phase will be inserted before Foundation';
    if (insertPosition === 4) return 'New phase will be inserted after Optimize';
    return `New phase will be inserted between ${phases[insertPosition - 1].name} and ${phases[insertPosition].name}`;
  };

  const addScopeItem = () => {
    setScopeItems([...scopeItems, '']);
  };

  const removeScopeItem = (index: number) => {
    setScopeItems(scopeItems.filter((_, i) => i !== index));
  };

  const updateScopeItem = (index: number, value: string) => {
    const newItems = [...scopeItems];
    newItems[index] = value;
    setScopeItems(newItems);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="w-[560px] bg-white rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-[22px] font-bold text-[#161916]">Add a custom phase</h2>
          <button onClick={onClose} className="text-[#6D7069] hover:text-[#161916]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[13px] text-[#494949] mb-6">
          Create a new phase or insert one between existing phases. Useful for client-specific milestones.
        </p>

        {/* Form Content */}
        <div className="space-y-5">
          {/* Phase Name */}
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Phase name</label>
            <input
              type="text"
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
              placeholder="e.g., Pre-launch readiness review"
              className="w-full h-10 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
            />
          </div>

          {/* Insert Position */}
          <div>
            <label className="block text-[12px] text-[#494949] mb-2">Insert position</label>
            <div className="flex items-center gap-3 mb-2">
              {/* Before P1 */}
              <button
                onClick={() => setInsertPosition(0)}
                className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                  insertPosition === 0
                    ? 'bg-[#FD4E59] border-[#FD4E59] text-white'
                    : 'bg-[#FFF0DC] border-[#FD4E59] text-[#FD4E59]'
                }`}
              >
                <Plus className="w-3 h-3" />
              </button>

              {phases.map((phase, idx) => (
                <div key={phase.number} className="flex items-center gap-3">
                  <div
                    className="h-8 px-3 rounded flex items-center justify-center text-[12px] font-medium text-[#161916]"
                    style={{ backgroundColor: phase.color, minWidth: '88px' }}
                  >
                    P{phase.number} {phase.name}
                  </div>
                  <button
                    onClick={() => setInsertPosition(idx + 1)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      insertPosition === idx + 1
                        ? 'bg-[#FD4E59] border-[#FD4E59] text-white'
                        : 'bg-[#FFF0DC] border-[#FD4E59] text-[#FD4E59]'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[12px] italic text-[#6D7069]">{getInsertionHelperText()}</p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Duration</label>
            <div className="grid grid-cols-2 gap-4 mb-1">
              <div>
                <div className="relative">
                  <input
                    type="number"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="w-full h-10 px-3 pr-8 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                    placeholder="Start month"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">M</span>
                </div>
              </div>
              <div>
                <div className="relative">
                  <input
                    type="number"
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="w-full h-10 px-3 pr-8 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                    placeholder="End month"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">M</span>
                </div>
              </div>
            </div>
            <p className="text-[12px] italic text-[#6D7069]">Adjacent phase end-dates will shift automatically.</p>
          </div>

          {/* Phase Color */}
          <div>
            <label className="block text-[12px] text-[#494949] mb-2">Phase color</label>
            <div className="flex items-center gap-3">
              {colorOptions.map((option, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setSelectedColor(idx)}
                    className={`w-12 h-8 rounded ${
                      selectedColor === idx ? 'ring-2 ring-[#FD4E59] ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: option.color }}
                  />
                  <span className="text-[11px] text-[#6D7069] text-center leading-tight w-20">
                    {option.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scope Items */}
          <div>
            <label className="block text-[12px] text-[#494949] mb-2">Scope items (what happens in this phase?)</label>
            <div className="space-y-2">
              {scopeItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-[#6D7069] cursor-move flex-shrink-0" />
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateScopeItem(idx, e.target.value)}
                    className="flex-1 h-8 px-3 bg-white border border-[#494949]/30 rounded text-[13px] text-[#161916]"
                    placeholder="Enter scope item"
                  />
                  <button
                    onClick={() => removeScopeItem(idx)}
                    className="text-[#6D7069] hover:text-[#FD4E59] flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addScopeItem}
              className="mt-2 text-[13px] text-[#FD4E59] hover:text-[#FD4E59]/80 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add item
            </button>
          </div>

          {/* Expected Cumulative Savings */}
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">
              Expected cumulative savings (optional)
            </label>
            <div className="relative">
              <input
                type="number"
                value={cumulativeSavings}
                onChange={(e) => setCumulativeSavings(e.target.value)}
                className="w-full h-10 px-3 pr-8 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                placeholder="15"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">%</span>
            </div>
            <p className="text-[12px] italic text-[#6D7069] mt-1">
              We'll fold this into the savings progression chart.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#494949]/12 flex items-center justify-between">
          <button
            onClick={onClose}
            className="h-10 px-5 text-[#494949] text-[14px] hover:bg-[#494949]/5 rounded-md"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button className="h-10 px-5 border border-[#494949]/30 text-[#494949] text-[14px] rounded-md hover:bg-[#494949]/5">
              Save as draft
            </button>
            <button className="h-10 px-5 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Add phase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
