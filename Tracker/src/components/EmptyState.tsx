import { Receipt, Utensils, Truck } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  category: string;
  message: string;
}

const categoryIcons = {
  tiffin: Utensils,
  delivery: Truck,
  miscellaneous: Receipt,
};

export function EmptyState({ category, message }: EmptyStateProps) {
  const Icon = categoryIcons[category as keyof typeof categoryIcons] || Receipt;

  return (
    <div className="p-10 sm:p-12 text-center bg-secondary/20 rounded-3xl border border-border/40">
      <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-secondary/40 flex items-center justify-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold mb-2 text-foreground">No Expenses Yet</h3>
      <p className="text-muted-foreground font-medium mb-4">{message}</p>
      <p className="text-[13px] text-muted-foreground font-bold uppercase tracking-wider">
        Click the "Add Expense" button to get started!
      </p>
    </div>
  );
}