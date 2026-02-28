import { Home, User, SplitSquareHorizontal, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
    currentTab: string;
    onTabChange: (tab: string) => void;
}

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
    const navItems = [
        { id: "overview", label: "Overview", icon: Home },
        { id: "personal", label: "Personal", icon: User },
        { id: "splitwise", label: "Splitwise", icon: SplitSquareHorizontal },
        { id: "tiffin", label: "Tiffin", icon: Utensils },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-xl border-t border-border/40 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-6 pt-3 px-2 sm:px-4 transition-all w-full">
            <div className="flex justify-between items-center max-w-md mx-auto relative px-2">
                {navItems.map((item) => {
                    const isActive = currentTab === item.id;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center w-[72px] h-14 transition-all duration-300 ease-out flex-shrink-0",
                                isActive ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div
                                className={cn(
                                    "absolute inset-0 bg-primary/10 rounded-2xl transition-all duration-300 transform",
                                    isActive ? "scale-100 opacity-100" : "scale-50 opacity-0"
                                )}
                            />
                            <Icon
                                className={cn(
                                    "h-6 w-6 mb-1 transition-all duration-300 relative z-10",
                                    isActive ? "stroke-[2.5px]" : "stroke-2"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-[10px] font-bold tracking-wide transition-all duration-300 relative z-10",
                                    isActive ? "opacity-100" : "opacity-70"
                                )}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
