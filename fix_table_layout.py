import re

def fix_leads_table():
    with open('src/components/leads/LeadsTable.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix header checkbox alignment
    content = content.replace('<th className="w-8 px-4 py-3">', '<th className="w-8 px-2 py-3">')
    
    with open('src/components/leads/LeadsTable.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

def fix_leads_row():
    with open('src/components/leads/LeadsTableRow.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add getPurpleShade function
    if 'getPurpleShade' not in content:
        import_idx = content.find('const LeadsTableRow =')
        shade_func = """const getPurpleShade = (id: string) => {
  const shades = [
    'bg-[#F2EEFF] text-[#6C4CF6]', 
    'bg-[#E0D4FF] text-[#5b3ce0]',
    'bg-[#D6C7FF] text-[#4a2bb5]',
    'bg-[#8b73f8] text-white',
    'bg-[#6C4CF6] text-white',
    'bg-[#4a2bb5] text-white'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return shades[Math.abs(hash) % shades.length];
};

const AvatarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

"""
        content = content[:import_idx] + shade_func + content[import_idx:]

    # Replace compactMode render name and rut
    target_compact = """        <td className="px-2 py-1.5">
          {renderNameWithBadges(true)}
          {rutVis && lead.rut && <div className="text-[11px] text-[#5B6475] font-mono mt-0.5">RUT: {lead.rut}</div>}
          {nameVis && !rutVis && !lead.rut && <div className="text-[11px] text-[#5B6475] mt-0.5">-</div>}
        </td>"""

    replacement_compact = """        <td className="px-2 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-[4px] shrink-0 flex items-center justify-center shadow-sm ${getPurpleShade(lead.id!)}`}>
              <AvatarIcon />
            </div>
            <div className="flex flex-col min-w-0">
              {renderNameWithBadges(true)}
              {rutVis && lead.rut && <div className="text-[11px] text-[#5B6475] font-mono mt-0.5 truncate">RUT: {lead.rut}</div>}
              {nameVis && !rutVis && !lead.rut && <div className="text-[11px] text-[#5B6475] mt-0.5">-</div>}
            </div>
          </div>
        </td>"""
    
    content = content.replace(target_compact, replacement_compact)

    # Fix renderNameWithBadges truncate
    content = content.replace('className={`font-medium text-xs flex items-center gap-1.5 ${isCompact ? \'\' : \'\'}`}', 'className={`font-medium text-xs flex items-center gap-1.5 min-w-0`}')
    content = content.replace('{isCompact ? shortName(lead.name) : lead.name}', '<span className="truncate">{isCompact ? shortName(lead.name) : lead.name}</span>')

    with open('src/components/leads/LeadsTableRow.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

fix_leads_table()
fix_leads_row()
print("Table fixes applied")
