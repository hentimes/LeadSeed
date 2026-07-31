import React from 'react';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ icon, title, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-3 text-[#111936] font-bold text-[15px] ${className}`}>
      <div className="w-8 h-8 rounded-[10px] bg-[#F2EFFF] text-[#5B42F3] flex items-center justify-center shrink-0 [&_svg]:!w-[18px] [&_svg]:!h-[18px] [&_svg]:!text-[18px]">
        {icon}
      </div>
      <span className="leading-tight">{title}</span>
    </div>
  );
}
