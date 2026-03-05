import React from 'react';

export const Footer = () => {
    return (
        <footer className="absolute bottom-12 left-12 right-12 flex justify-between items-end z-20">
            <div className="flex flex-col gap-1">
                <span className="text-[8px] uppercase tracking-[0.3em] text-white/20">Current Block</span>
                <span className="text-[10px] font-mono text-white/40">#19,482,031</span>
            </div>
            <div className="flex gap-8 text-[10px] uppercase tracking-widest text-white/20">
                <span>© 2026 Block-Tix</span>
                <a href="#" className="hover:text-white/40 transition-colors">Privacy</a>
                <a href="#" className="hover:text-white/40 transition-colors">Terms</a>
            </div>
        </footer>
    );
};
