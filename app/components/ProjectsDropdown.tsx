'use client';

import { useState } from 'react';

export default function ProjectsDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 cursor-pointer"
        style={{color: 'var(--color-accent)', fontFamily: 'Georgia, "Times New Roman", serif', background: 'none', border: 'none', padding: 0, fontSize: 'inherit'}}
      >
        Projects
        <svg width="10" height="7" viewBox="0 0 10 7" fill="none" strokeLinecap="round"
          style={{transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)'}}>
          <path d="M1 1.5L5 5.5L9 1.5" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Invisible full-screen backdrop — clicking outside the menu closes it */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 min-w-55 pt-3">
            <div style={{backgroundColor: '#241E18', padding: '0.5rem 0', position: 'relative'}}>
              <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'visible'}}>
                <rect x="0" y="0" width="100%" height="100%"
                  fill="none" stroke="#E24B4A" strokeWidth="1"
                  strokeDasharray="12 6"
                />
              </svg>
              <a href="https://github.com/nyimul" target="_blank" rel="noopener noreferrer" className="block px-5 py-2.5" style={{fontSize: '0.875rem'}}>Github</a>
              <a href="#" className="block px-5 py-2.5" style={{fontSize: '0.875rem'}}>Run With Friends App</a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
