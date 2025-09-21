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
    <Card className="p-12 text-center">
      <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Expenses Yet</h3>
      <p className="text-muted-foreground mb-4">{message}</p>
      <p className="text-sm text-muted-foreground">
        Click the "Add Expense" button to get started!
      </p>
    </Card>
  );
}