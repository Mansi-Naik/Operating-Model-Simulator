import { useEffect, useRef, useState } from 'react';
import { useEngagement } from '../../hooks/useEngagement';
import { supabase } from '../../supabaseClient';

interface EngagementListRow {
  id: string;
  client_name: string | null;
  created_at: string | null;
}

interface HeaderProps {
  activeEngagementId?: string | null;
  onSelectEngagement?: (engagementId: string) => void;
}

async function loadEngagementList(): Promise<EngagementListRow[]> {
  const { data, error } = await supabase
    .from('engagements')
    .select('id, client_name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ClientSwitcher] Failed to load engagements:', error);
    throw error;
  }

  return Array.isArray(data) ? (data as EngagementListRow[]) : [];
}

export function Header({ activeEngagementId, onSelectEngagement }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [engagements, setEngagements] = useState<EngagementListRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const { engagement } = useEngagement(activeEngagementId);
  const isActiveEngagementLoaded = Boolean(activeEngagementId && engagement?.id === activeEngagementId);

  const intake = isActiveEngagementLoaded && engagement?.intake_data && typeof engagement.intake_data === 'object'
    ? (engagement.intake_data as Record<string, unknown>)
    : {};
  const engagementIntake = intake.engagement && typeof intake.engagement === 'object'
    ? (intake.engagement as Record<string, unknown>)
    : {};
  const activeClientName =
    (isActiveEngagementLoaded && typeof engagement?.client_name === 'string' && engagement.client_name.trim()) ||
    (typeof engagementIntake.client_name === 'string' && engagementIntake.client_name.trim()) ||
    (activeEngagementId ? 'Loading client...' : 'No client selected');

  const initials = activeClientName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '—';

  const fetchList = () => {
    let cancelled = false;
    const startedAt = Date.now();
    setIsLoading(true);
    setLoadError(false);
    setEngagements([]);

    void loadEngagementList()
      .then((rows) => {
        const elapsed = Date.now() - startedAt;
        window.setTimeout(() => {
          if (cancelled) return;
          setEngagements(rows);
          setIsLoading(false);
        }, Math.max(0, 500 - elapsed));
      })
      .catch(() => {
        const elapsed = Date.now() - startedAt;
        window.setTimeout(() => {
          if (cancelled) return;
          setLoadError(true);
          setIsLoading(false);
        }, Math.max(0, 500 - elapsed));
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    return fetchList();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (engagementId: string) => {
    setIsOpen(false);
    if (engagementId === activeEngagementId) return;
    onSelectEngagement?.(engagementId);
  };

  return (
    <header className="w-full h-14 bg-[#FDF8F4] border-b border-[#161916]/10 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-[#FD4E59] rounded" />
        <span className="text-[16px] font-semibold text-[#161916]">
          Operating Model Simulator
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div ref={switcherRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="px-4 py-1.5 bg-[#FFF0DC] border border-[#FFAB28] rounded-full text-[13px] text-[#161916] hover:bg-[#FFE6B8] transition-colors flex items-center gap-1 max-w-[320px]"
            aria-haspopup="menu"
            aria-expanded={isOpen}
          >
            <span className="truncate">Client: {activeClientName}</span>
            <span className={`text-[11px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 min-w-[240px] max-w-[320px] bg-white border border-[#161916]/12 rounded-lg shadow-[0_12px_30px_rgba(22,25,22,0.14)] p-2">
              <div className="absolute -top-1.5 right-8 w-3 h-3 bg-white border-l border-t border-[#161916]/12 rotate-45" />
              <div className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wide text-[#6D7069]">
                SWITCH CLIENT
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {isLoading ? (
                  <div className="h-20 flex items-center justify-center text-[13px] text-[#6D7069]">
                    Loading...
                  </div>
                ) : loadError ? (
                  <div className="px-3 py-4 text-center">
                    <div className="text-[13px] text-[#6D7069] mb-3">Couldn&apos;t load engagements. Try again.</div>
                    <button
                      type="button"
                      onClick={fetchList}
                      className="h-8 px-3 rounded-md border border-[#FD4E59]/40 text-[#FD4E59] text-[12px] font-semibold hover:bg-[#FD4E59]/10"
                    >
                      Retry
                    </button>
                  </div>
                ) : engagements.length === 0 ? (
                  <div className="h-20 flex items-center justify-center text-[13px] italic text-[#6D7069]">
                    No engagements yet
                  </div>
                ) : (
                  engagements.map((row) => {
                    const isActive = row.id === activeEngagementId;
                    const name = row.client_name?.trim() || 'Untitled client';
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => handleSelect(row.id)}
                        className={`h-10 w-full px-3 rounded-md flex items-center justify-between gap-3 text-left text-[13px] hover:bg-[#FDF8F4] ${
                          isActive ? 'bg-[#FDF8F4] text-[#FD4E59]' : 'bg-white text-[#161916]'
                        }`}
                      >
                        <span className="truncate">{name}</span>
                        {isActive && <span className="text-[#FD4E59] flex-shrink-0">✓</span>}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-[#FD4E59] flex items-center justify-center text-white text-[13px] font-medium">
            {initials}
          </div>
          <svg className="w-4 h-4 text-[#494949]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </header>
  );
}
