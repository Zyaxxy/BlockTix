import React from 'react';

export const Header = () => {
    return (
        <header className="absolute top-12 left-12 right-12 flex justify-between items-center z-20">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded-full font-bold text-xs">BT</div>
                <span className="text-sm font-medium tracking-tighter uppercase">Block-Tix</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] text-white/50">
                <a href="#" className="font-medium text-sm hover:text-white transition-colors">Experiences</a>
                <a href="#" className="font-medium text-sm hover:text-white transition-colors">Security</a>
                <a href="#" className="font-medium text-sm hover:text-white transition-colors">Protocol</a>
                <button className="px-10 py-4 rounded-full bg-white text-black font-medium text-sm transition-all duration-200 hover:bg-white/90 cursor-pointer">
                    Book Now
                </button>
            </nav>
        </header>
    );
};
