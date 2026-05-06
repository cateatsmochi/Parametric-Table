import React, { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function OrientationOverlay() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkState = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth < 1024 && window.innerWidth < window.innerHeight));
    };

    checkState();
    window.addEventListener('resize', checkState);
    return () => window.removeEventListener('resize', checkState);
  }, []);

  return (
    <AnimatePresence>
      {isMobile && isPortrait && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] bg-[#f3f3f3] text-black flex flex-col items-center justify-center p-12 text-center"
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          
          <motion.div
            animate={{ rotate: [0, 90, 90, 0, 0] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.6, 0.9, 1] }}
            className="mb-12 relative"
          >
            <div className="absolute -inset-4 border border-dashed border-black/20 rounded-full animate-[spin_10s_linear_infinity]" />
            <div className="bg-black text-white p-6 shadow-2xl relative z-10">
              <Smartphone size={48} />
            </div>
          </motion.div>
          
          <div className="space-y-6 relative z-10">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">
                Orientation<br/>Required
              </h2>
              <div className="h-1 bg-black w-12 mx-auto"></div>
            </div>
            
            <p className="text-xs font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[240px] border-y border-black/10 py-4">
              为了获得最佳交互体验<br/>请开启系统自动旋转<br/>并将手机横过来
            </p>
          </div>
          
          <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2">
            <span className="text-[8px] font-mono opacity-40 uppercase tracking-[0.5em]">
              System Protocol: Landscape Mode
            </span>
            <div className="w-24 h-0.5 bg-black/10 relative overflow-hidden">
              <motion.div 
                animate={{ x: [-100, 100] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-black w-1/2"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
