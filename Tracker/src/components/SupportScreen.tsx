import { useState, useEffect, useRef } from 'react';
import { X, ChevronUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function CoffeeWidget() {
    const [visible, setVisible] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const location = useLocation();
    const prevLocation = useRef(location.pathname);

    useEffect(() => {
        // Only reset widget visibility if coming strictly from the auth page
        if (prevLocation.current === '/auth' && location.pathname !== '/auth') {
            setVisible(true);
            setExpanded(false);
        }
        prevLocation.current = location.pathname;
    }, [location.pathname]);

    const handleClose = () => {
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-24 right-4 z-[998] flex flex-col items-end gap-2">
            {/* Expanded card */}
            {expanded && (
                <div className="bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/30 w-64 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
                    <div className="px-4 pt-4 pb-3 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-border/40">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">☕</span>
                            <div>
                                <p className="text-xs font-bold text-foreground leading-none">Buy me a coffee</p>
                                <p className="text-[10px] text-muted-foreground">Keep ExpenseMate running!</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-6 h-6 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="p-4 flex flex-col items-center gap-2">
                        <div className="bg-white rounded-xl p-2 shadow-inner">
                            <img
                                src="/support-qr.png"
                                alt="UPI QR Code"
                                className="w-36 h-36 object-contain rounded-lg"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">
                            Scan with GPay · PhonePe · Paytm
                        </p>
                    </div>
                </div>
            )}

            {/* Floating toggle button */}
            <div className="flex items-center gap-2 text-foreground">
                {!expanded && (
                    <span className="text-[10px] text-muted-foreground bg-secondary/80 backdrop-blur px-2 py-1 rounded-full border border-border/40 font-medium whitespace-nowrap shadow-sm">
                        Support App ☕
                    </span>
                )}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 flex items-center justify-center text-white text-xl hover:scale-110 active:scale-95 transition-transform border border-amber-300/30"
                    title="Support the developer"
                >
                    {expanded ? <ChevronUp className="h-5 w-5" /> : '☕'}
                </button>
            </div>
        </div>
    );
}
