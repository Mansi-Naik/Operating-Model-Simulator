import { useState } from 'react';

export type TechLogoProps = {
  name: string;
  logo: string;
  logoAlt?: string;
  brandAbbrev?: string;
  size?: 'sm' | 'md';
  className?: string;
};

export function TechBrandLogo({
  name,
  logo,
  logoAlt,
  brandAbbrev,
  size = 'sm',
  className = '',
}: TechLogoProps) {
  const [srcIndex, setSrcIndex] = useState(0);
  const sources = [logo, logoAlt].filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
  const dim = size === 'md' ? 'w-12 h-12' : 'w-7 h-7'
  const textSize = size === 'md' ? 'text-[14px]' : 'text-[10px]'
  const abbrev = (brandAbbrev ?? name.trim().slice(0, 2)).toUpperCase()

  if (srcIndex >= sources.length) {
    return (
      <span
        className={`${dim} rounded-md bg-[#FFF0DC] border border-[#494949]/15 text-[#161916] ${textSize} font-bold flex items-center justify-center shrink-0 ${className}`}
        aria-hidden
      >
        {abbrev}
      </span>
    )
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={name}
      className={`${dim} rounded-md object-contain bg-white border border-[#494949]/10 shrink-0 ${className}`}
      onError={() => setSrcIndex((i) => i + 1)}
    />
  )
}
