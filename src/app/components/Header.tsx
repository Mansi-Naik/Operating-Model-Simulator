export function Header() {
  return (
    <header className="w-full h-14 bg-[#FDF8F4] border-b border-[#161916]/10 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-[#FD4E59] rounded" />
        <span className="text-[16px] font-semibold text-[#161916]">
          Operating Model Simulator
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="px-4 py-1.5 bg-[#FFF0DC] border border-[#FFAB28] rounded-full text-[13px] text-[#161916]">
          Client: Acme Corp
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-[#FD4E59] flex items-center justify-center text-white text-[13px] font-medium">
            AC
          </div>
          <svg className="w-4 h-4 text-[#494949]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </header>
  );
}
