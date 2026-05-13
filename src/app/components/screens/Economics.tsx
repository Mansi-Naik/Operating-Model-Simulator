import { useState } from 'react';
import { F5_1_EconomicsDashboard } from './economics/F5_1_EconomicsDashboard';
import { F5_2_AssumptionEditor } from './economics/F5_2_AssumptionEditor';

interface EconomicsProps {
  onBack?: () => void;
  onProceedToF6?: () => void;
  onMissingF4Selection?: () => void;
}

export function Economics({ onBack, onProceedToF6, onMissingF4Selection }: EconomicsProps) {
  const [showAssumptionEditor, setShowAssumptionEditor] = useState(false);
  const [assumptionVersion, setAssumptionVersion] = useState(0);

  return (
    <div className="relative h-full">
      {/* Dimmed overlay when drawer is open */}
      {showAssumptionEditor && (
        <div
          className="absolute inset-0 bg-black/20 z-40"
          onClick={() => setShowAssumptionEditor(false)}
        />
      )}

      {/* Main Dashboard */}
      <div className={showAssumptionEditor ? 'opacity-100' : ''}>
        <F5_1_EconomicsDashboard
          onEditAssumptions={() => setShowAssumptionEditor(true)}
          onBack={onBack}
          onProceedToF6={onProceedToF6}
          onMissingF4Selection={onMissingF4Selection}
          refreshKey={assumptionVersion}
        />
      </div>

      {/* Assumption Editor Drawer */}
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
