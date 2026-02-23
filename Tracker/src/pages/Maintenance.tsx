import { Wrench } from "lucide-react";

export default function Maintenance() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-500/10 mb-8 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    <Wrench className="h-12 w-12 text-blue-400 animate-pulse" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                        We'll be right back
                    </h1>
                    <p className="text-lg text-slate-300">
                        Our app is currently undergoing scheduled maintenance to improve your experience. Thank you for your patience!
                    </p>
                </div>

                <div className="pt-8 flex flex-col items-center gap-4 text-sm text-slate-400">
                    <div className="h-1 w-12 rounded-full bg-slate-700"></div>
                    <p>ExpenseMate</p>
                </div>
            </div>
        </div>
    );
}
