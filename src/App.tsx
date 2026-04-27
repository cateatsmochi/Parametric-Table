/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Maximize2, Minimize2, X, MousePointer2, Brush, Wand2, 
  Rotate3d, Maximize, Move, Ruler, MessageSquare, 
  Send, RefreshCcw, Download
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Scene } from './components/Scene';
import { TableConfig, DEFAULT_CONFIG, MaterialType } from './types';
import { processChatCommand } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MATERIAL_COLORS: Record<MaterialType, string> = {
  oak: '#8B5E3C',
  steel: '#333333',
  glass: '#ffffff',
  chrome: '#c7c6c6',
  marble: '#ffffff'
};

export default function App() {
  const [config, setConfig] = useState<TableConfig>(DEFAULT_CONFIG);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string; time: string }[]>([
    { role: 'ai', text: 'Hello. How can I optimize your table configuration today?', time: '09:41' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat window state
  const [chatPos, setChatPos] = useState({ x: 48, y: 48 });
  const [chatSize, setChatSize] = useState({ width: 320, height: 320 });
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const validateConfig = (cfg: TableConfig): TableConfig => {
    let validated = { ...cfg };

    // 1. Geometric integrity: frameThickness MUST be >= legTopSize
    // This ensures the "rectangle-based" leg doesn't poke out of the frame boundaries
    if (validated.frameThickness < validated.legTopSize) {
      validated.frameThickness = validated.legTopSize;
    }

    // 2. Leg integrity (pentagon mode): sum must allow at least 1mm gap/extension
    const minSum = validated.legTopSize + 5; 
    if (validated.legInnerDepth + validated.frameThickness < minSum) {
      // Prioritize increasing frameThickness slightly or maintaining balance
      validated.frameThickness = Math.max(validated.frameThickness, minSum - validated.legInnerDepth);
    }

    // 3. Center-crossing prevention
    const maxExtension = Math.min(validated.width, validated.depth) * 5 - 20; 
    const currentExtension = validated.frameInwardOffset + validated.frameThickness + validated.legInnerDepth;

    if (currentExtension > maxExtension) {
      const overflow = currentExtension - maxExtension;
      if (validated.legInnerDepth >= overflow) {
        validated.legInnerDepth -= overflow;
      } else {
        const remainingOverflow = overflow - validated.legInnerDepth;
        validated.legInnerDepth = 0;
        validated.frameInwardOffset = Math.max(0, validated.frameInwardOffset - remainingOverflow);
        // If still overflowing, we might need to reduce thickness as a last resort
        if (validated.frameInwardOffset + validated.frameThickness > maxExtension) {
          validated.frameThickness = maxExtension - validated.frameInwardOffset;
        }
      }
    }

    // 4. Ensure legTopSize doesn't exceed center (avoiding overlap of opposing legs)
    const maxLts = (Math.min(validated.width, validated.depth) * 5) - validated.frameInwardOffset - 20;
    if (validated.legTopSize > maxLts) {
      validated.legTopSize = Math.max(20, maxLts);
      // Re-run thickness check if lts changed
      if (validated.frameThickness < validated.legTopSize) {
        validated.frameThickness = validated.legTopSize;
      }
    }

    return validated;
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isProcessing) return;

    const userMsg = chatInput;
    setChatInput('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: userMsg, time: now }]);
    
    setIsProcessing(true);
    const result = await processChatCommand(userMsg, config);
    
    if (Object.keys(result.config).length > 0) {
      setConfig(prev => validateConfig({ ...prev, ...result.config }));
    }
    
    setMessages(prev => [...prev, { role: 'ai', text: result.message, time: now }]);
    setIsProcessing(false);
  };

  const updateParam = (key: keyof TableConfig, value: any) => {
    setConfig(prev => validateConfig({ ...prev, [key]: value }));
  };

  const handleMaterialChange = (type: MaterialType) => {
    setConfig(prev => validateConfig({ 
      ...prev, 
      material: type,
      color: MATERIAL_COLORS[type]
    }));
  };

  // Chat dragging logic
  const onChatMouseDown = (e: React.MouseEvent) => {
    setIsDraggingChat(true);
    dragStartPos.current = { x: e.clientX - chatPos.x, y: e.clientY - chatPos.y };
  };

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizingChat(true);
    resizeStartSize.current = { width: chatSize.width, height: chatSize.height };
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingChat) {
        setChatPos({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        });
      } else if (isResizingChat) {
        const deltaX = e.clientX - resizeStartPos.current.x;
        const deltaY = e.clientY - resizeStartPos.current.y;
        setChatSize({
          width: Math.max(240, resizeStartSize.current.width + deltaX),
          height: Math.max(200, resizeStartSize.current.height + deltaY)
        });
      }
    };
    const onMouseUp = () => {
      setIsDraggingChat(false);
      setIsResizingChat(false);
    };

    if (isDraggingChat || isResizingChat) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingChat, isResizingChat]);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f9f9f9] text-black font-['Space_Grotesk'] overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-10 border-b-2 border-white shadow-[inset_-1px_-1px_0px_0px_#808080] flex justify-between items-center px-2 z-50 bg-[#f9f9f9]">
        <div className="flex items-center gap-4">
          <span className="text-lg font-black tracking-tighter uppercase">TABLE_CONFIG.EXE</span>
          <nav className="hidden md:flex gap-4 ml-6 text-xs font-bold uppercase tracking-tighter">
            <button className="underline hover:bg-black hover:text-white px-2 py-0.5">File</button>
            <button className="text-gray-500 hover:bg-black hover:text-white px-2 py-0.5">Edit</button>
            <button className="text-gray-500 hover:bg-black hover:text-white px-2 py-0.5">View</button>
            <button className="text-gray-500 hover:bg-black hover:text-white px-2 py-0.5">Help</button>
          </nav>
        </div>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-gray-200 shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080]"><Minimize2 size={14} /></button>
          <button className="p-1 hover:bg-gray-200 shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080]"><Maximize2 size={14} /></button>
          <button className="p-1 hover:bg-red-500 hover:text-white shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080]"><X size={14} /></button>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* Left Toolbar */}
        <aside className="w-16 border-r-2 border-white shadow-[inset_-1px_0px_0px_0px_#808080] flex flex-col items-center py-4 gap-2 z-40 bg-[#f9f9f9]">
          <div className="grid grid-cols-2 gap-1 px-1">
            <ToolbarButton active icon={<MousePointer2 size={14} />} />
            <ToolbarButton icon={<Brush size={14} />} />
            <ToolbarButton icon={<Wand2 size={14} />} />
            <ToolbarButton icon={<Rotate3d size={14} />} />
            <ToolbarButton icon={<Maximize size={14} />} />
            <ToolbarButton icon={<Move size={14} />} />
            <ToolbarButton icon={<Ruler size={14} />} />
            <ToolbarButton icon={<MessageSquare size={14} />} />
          </div>
          <div className="mt-auto mb-4 flex flex-col items-center">
            <span className="text-[8px] text-gray-400 font-mono mb-2">V1.0.4</span>
            <div className="w-8 h-8 bg-black"></div>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 relative bg-white">
          <Scene config={config} />

          {/* Floating Chat Window */}
          <div 
            ref={chatRef}
            style={{ left: chatPos.x, top: chatPos.y, width: chatSize.width, height: chatSize.height }}
            className="absolute bg-[#f3f3f3] shadow-[inset_2px_2px_0px_0px_#ffffff,inset_-2px_-2px_0px_0px_#474747] flex flex-col z-[100] overflow-hidden"
          >
            <div 
              onMouseDown={onChatMouseDown}
              className="bg-black text-white px-2 py-1 flex justify-between items-center h-7 cursor-move shrink-0"
            >
              <span className="text-[10px] font-bold tracking-widest uppercase font-mono">AI_SYSTEM.EXE</span>
              <button className="bg-[#c6c6c6] text-black h-4 w-4 flex items-center justify-center shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080]">
                <X size={10} />
              </button>
            </div>
            <div className="p-1 flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto bg-white/50 backdrop-blur-sm shadow-[inset_-1px_-1px_0px_0px_#ffffff,inset_1px_1px_0px_0px_#808080] p-3 flex flex-col gap-3 text-[11px]">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col gap-1", msg.role === 'user' ? "items-end" : "items-start")}>
                    <span className="font-mono text-[9px] text-gray-400 uppercase">
                      {msg.role === 'ai' ? `SYSTEM_LOG_${msg.time}` : `USER_INPUT_${msg.time}`}
                    </span>
                    <p className={cn(
                      "p-2 max-w-[90%]",
                      msg.role === 'user' ? "bg-black text-white" : "text-black font-medium"
                    )}>
                      {msg.text}
                    </p>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex flex-col gap-1 items-start">
                    <span className="font-mono text-[9px] text-gray-400 uppercase animate-pulse">PROCESSING...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
            <form onSubmit={handleChatSubmit} className="p-2 flex gap-1 shrink-0">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="TYPE COMMAND..."
                className="flex-1 bg-white border-none text-[10px] uppercase font-mono px-2 py-1 focus:ring-0 shadow-[inset_-1px_-1px_0px_0px_#ffffff,inset_1px_1px_0px_0px_#808080]"
              />
              <button 
                type="submit"
                disabled={isProcessing}
                className="bg-black text-white px-3 py-1 font-bold text-[10px] hover:bg-gray-800 disabled:opacity-50"
              >
                EXEC
              </button>
            </form>
            {/* Resize Handle */}
            <div 
              onMouseDown={onResizeMouseDown}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5"
            >
              <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-gray-400"></div>
            </div>
          </div>

          {/* Material Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-[#eeeeee] shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080] z-40">
            <div className="px-3 border-r border-gray-400 mr-2">
              <span className="font-mono text-[10px] font-bold">MATERIAL</span>
            </div>
            <div className="flex gap-1">
              <MaterialButton type="oak" color={MATERIAL_COLORS.oak} active={config.material === 'oak'} onClick={() => handleMaterialChange('oak')} />
              <MaterialButton type="steel" color={MATERIAL_COLORS.steel} active={config.material === 'steel'} onClick={() => handleMaterialChange('steel')} />
              <MaterialButton type="glass" color={MATERIAL_COLORS.glass} active={config.material === 'glass'} onClick={() => handleMaterialChange('glass')} isGlass />
              <MaterialButton type="chrome" color={MATERIAL_COLORS.chrome} active={config.material === 'chrome'} onClick={() => handleMaterialChange('chrome')} />
              <MaterialButton type="marble" color={MATERIAL_COLORS.marble} active={config.material === 'marble'} onClick={() => handleMaterialChange('marble')} />
            </div>
          </div>
        </main>

        {/* Right Inspector */}
        <aside className="w-72 bg-[#f3f3f3] shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080] p-4 flex flex-col gap-6 z-40">
          <div>
            <h2 className="font-black text-lg tracking-tighter mb-1 uppercase">Inspector</h2>
            <div className="h-0.5 bg-black w-full"></div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
            <InspectorSlider 
              label="WIDTH" 
              unit="CM" 
              value={config.width} 
              min={100} 
              max={300} 
              axis="X-Axis"
              onChange={(v) => updateParam('width', v)} 
            />
            <InspectorSlider 
              label="DEPTH" 
              unit="CM" 
              value={config.depth} 
              min={60} 
              max={150} 
              axis="Y-Axis"
              onChange={(v) => updateParam('depth', v)} 
            />
            <InspectorSlider 
              label="HEIGHT" 
              unit="CM" 
              value={config.height} 
              min={50} 
              max={110} 
              axis="Z-Axis"
              onChange={(v) => updateParam('height', v)} 
            />
            <InspectorSlider 
              label="LEG TAPER" 
              unit="CM" 
              value={config.legTaper} 
              min={-20} 
              max={20} 
              axis="Tilt"
              onChange={(v) => updateParam('legTaper', v)} 
            />
            <InspectorSlider 
              label="TOP THICKNESS" 
              unit="MM" 
              value={config.topThickness} 
              min={10} 
              max={100} 
              axis="Z-Axis"
              onChange={(v) => updateParam('topThickness', v)} 
            />
            <InspectorSlider 
              label="FRAME DEPTH" 
              unit="MM" 
              value={config.frameDepth} 
              min={20} 
              max={150} 
              axis="Y-Depth"
              onChange={(v) => updateParam('frameDepth', v)} 
            />
            <InspectorSlider 
              label="FRAME INSET" 
              unit="MM" 
              value={config.frameInwardOffset} 
              min={0} 
              max={300} 
              axis="Inset"
              onChange={(v) => updateParam('frameInwardOffset', v)} 
            />
            <InspectorSlider 
              label="FRAME THICKNESS" 
              unit="MM" 
              value={config.frameThickness} 
              min={20} 
              max={200} 
              axis="Width"
              onChange={(v) => updateParam('frameThickness', v)} 
            />
            <InspectorSlider 
              label="LEG TOP SIZE" 
              unit="MM" 
              value={config.legTopSize} 
              min={20} 
              max={120} 
              axis="Top"
              onChange={(v) => updateParam('legTopSize', v)} 
            />
            <InspectorSlider 
              label="LEG BOTTOM SIZE" 
              unit="MM" 
              value={config.legBottomSize} 
              min={10} 
              max={100} 
              axis="Bottom"
              onChange={(v) => updateParam('legBottomSize', v)} 
            />
            <InspectorSlider 
              label="LEG INNER DEPTH" 
              unit="MM" 
              value={config.legInnerDepth} 
              min={0} 
              max={200} 
              axis="Core"
              onChange={(v) => updateParam('legInnerDepth', v)} 
            />

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="font-mono text-[10px] font-bold uppercase text-black">Material Color</label>
                <span className="text-[10px] text-gray-400 uppercase">{config.material}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['#8B5E3C', '#333333', '#ffffff', '#c7c6c6', '#2D4F4F', '#8B0000', '#00008B', '#006400', '#FFD700', '#000000'].map((c) => (
                  <button
                    key={c}
                    onClick={() => updateParam('color', c)}
                    className={cn(
                      "w-6 h-6 shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080] border-2 transition-transform active:scale-95",
                      config.color === c ? "border-black scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <div className="relative w-6 h-6 shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080] overflow-hidden">
                  <input 
                    type="color" 
                    value={config.color}
                    onChange={(e) => updateParam('color', e.target.value)}
                    className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-2">
            <button className="w-full bg-black text-white py-3 font-bold text-xs uppercase tracking-widest hover:bg-gray-800 active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2">
              <Download size={14} /> RENDER_EXPORT
            </button>
            <button 
              onClick={() => setConfig(DEFAULT_CONFIG)}
              className="w-full bg-[#e8e8e8] py-3 font-bold text-xs uppercase tracking-widest hover:bg-gray-200 shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2"
            >
              <RefreshCcw size={14} /> RESET_DEFAULTS
            </button>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="h-8 border-t-2 border-white shadow-[inset_0px_1px_0px_0px_#808080] flex items-center px-4 justify-between bg-[#f9f9f9] text-[10px] font-mono tracking-widest uppercase z-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span>
            SYSTEM_STATUS: READY
          </span>
          <span className="text-gray-400 ml-4">|</span>
          <span className="ml-4">OBJECT: TABLE_04_MIN</span>
        </div>
        <div className="flex h-full">
          <div className="px-4 border-l border-gray-400 flex items-center">X: {config.width.toFixed(2)}</div>
          <div className="px-4 border-l border-gray-400 flex items-center">Y: {config.depth.toFixed(2)}</div>
          <div className="px-4 border-l border-gray-400 flex items-center">Z: {config.height.toFixed(2)}</div>
          <div className="px-4 border-l border-gray-400 bg-black text-white flex items-center">USER_ADMIN</div>
        </div>
      </footer>
    </div>
  );
}

function ToolbarButton({ icon, active = false }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button className={cn(
      "w-6 h-6 flex items-center justify-center transition-all active:translate-x-[1px] active:translate-y-[1px]",
      active 
        ? "bg-white shadow-[inset_1px_1px_0px_0px_#000000,inset_-1px_-1px_0px_0px_#ffffff]" 
        : "bg-[#f9f9f9] shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080] hover:bg-gray-200"
    )}>
      {icon}
    </button>
  );
}

function MaterialButton({ type, color, active, onClick, isGlass }: { type: string; color: string; active: boolean; onClick: () => void; isGlass?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-8 h-8 p-1 transition-all group relative shadow-[inset_-1px_-1px_0px_0px_#ffffff,inset_1px_1px_0px_0px_#808080]",
        active && "ring-2 ring-black"
      )}
    >
      <div 
        className={cn("w-full h-full shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080]", isGlass && "opacity-40")} 
        style={{ backgroundColor: color }} 
      />
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-mono px-1 hidden group-hover:block uppercase whitespace-nowrap z-50">
        {type}
      </span>
    </button>
  );
}

function InspectorSlider({ label, unit, value, min, max, axis, onChange }: { label: string; unit: string; value: number; min: number; max: number; axis: string; onChange: (v: number) => void }) {
  const percentage = ((value - min) / (max - min)) * 100;
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateValue = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const val = min + (x / rect.width) * (max - min);
    onChange(Math.round(val));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e.clientX);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateValue(e.clientX);
      }
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <label className="font-mono text-[10px] font-bold text-black">{label} ({value}{unit})</label>
        <span className="text-[10px] text-gray-400 uppercase">{axis}</span>
      </div>
      <div 
        ref={sliderRef}
        onMouseDown={onMouseDown}
        className="relative h-4 flex items-center group cursor-pointer"
      >
        <div className="absolute w-full h-[1px] bg-gray-300"></div>
        <div 
          className={cn(
            "absolute w-3 h-3 bg-black shadow-[inset_1px_1px_0px_0px_#ffffff,inset_-1px_-1px_0px_0px_#808080] -translate-x-1/2 transition-transform",
            isDragging && "scale-125"
          )}
          style={{ left: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
