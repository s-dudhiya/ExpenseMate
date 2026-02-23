import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogOut, Plus, Check, Utensils, Truck, Receipt, Wallet, User, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { EmptyState } from '@/components/EmptyState';
import { ExpenseFilters, FilterOptions } from '@/components/ExpenseFilters';

interface Expense {
  id: string;
  amount: number;
  category: string;
  note?: string;
  status: 'pending' | 'cleared';
  created_at: string;
  updated_at: string;
}

const categoryConfig = {
  tiffin: { icon: Utensils, amount: 90, label: 'Tiffin' },
  delivery: { icon: Truck, amount: 15, label: 'Delivery' },
  miscellaneous: { icon: Receipt, amount: null, label: 'Miscellaneous' },
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('tiffin');
  const [filters, setFilters] = useState<FilterOptions>({ timeRange: 'all', status: 'all' });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  // Redirect if not authenticated - after all hooks are called
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses((data || []).map(expense => ({
        ...expense,
        status: expense.status as 'pending' | 'cleared'
      })));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch expenses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsCleared = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'cleared' })
        .eq('id', id);

      if (error) throw error;

      setExpenses(prev =>
        prev.map(expense =>
          expense.id === id ? { ...expense, status: 'cleared' as const } : expense
        )
      );

      toast({
        title: 'Success',
        description: 'Expense marked as cleared',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update expense',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExpenses(prev => prev.filter(expense => expense.id !== id));

      toast({
        title: 'Success',
        description: 'Expense deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  const applyFilters = (expenseList: Expense[]) => {
    let filtered = [...expenseList];

    // Filter by time range
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.timeRange) {
        case 'this-month':
          filterDate.setMonth(now.getMonth(), 1);
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'last-month':
          filterDate.setMonth(now.getMonth() - 1, 1);
          filterDate.setHours(0, 0, 0, 0);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          endOfLastMonth.setHours(23, 59, 59, 999);
          filtered = filtered.filter(expense => {
            const expenseDate = new Date(expense.created_at);
            return expenseDate >= filterDate && expenseDate <= endOfLastMonth;
          });
          break;
        case 'this-week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          filterDate.setTime(startOfWeek.getTime());
          break;
      }

      if (filters.timeRange !== 'last-month') {
        filtered = filtered.filter(expense => new Date(expense.created_at) >= filterDate);
      }
    }

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(expense => expense.status === filters.status);
    }

    return filtered;
  };

  const filterExpensesByCategory = (category: string) => {
    const categoryExpenses = expenses.filter(expense => expense.category === category);
    return applyFilters(categoryExpenses);
  };

  const getSummary = () => {
    const filteredExpenses = applyFilters(expenses);

    const totalPending = filteredExpenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCleared = filteredExpenses
      .filter(e => e.status === 'cleared')
      .reduce((sum, e) => sum + e.amount, 0);

    // Category-specific pending amounts
    const tiffinPending = expenses
      .filter(e => e.category === 'tiffin' && e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    const deliveryPending = expenses
      .filter(e => e.category === 'delivery' && e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    return { totalPending, totalCleared, tiffinPending, deliveryPending };
  };

  const { totalPending, totalCleared, tiffinPending, deliveryPending } = getSummary();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="hidden sm:block text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ExpenseMate
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowAddForm(true)}
              size="sm"
              className="bg-gradient-primary hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
            <Button
              onClick={() => navigate('/friends')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">₹{totalPending}</div>
            </CardContent>
          </Card>
          <Card className="shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Cleared</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">₹{totalCleared}</div>
            </CardContent>
          </Card>
          <Card className="shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Tiffin Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">₹{tiffinPending}</div>
            </CardContent>
          </Card>
          <Card className="shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Delivery Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">₹{deliveryPending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Expense Filters */}
        <ExpenseFilters filters={filters} onFiltersChange={setFilters} />

        {/* Expense Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tiffin" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Tiffin
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivery
            </TabsTrigger>
            <TabsTrigger value="miscellaneous" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Miscellaneous
            </TabsTrigger>
          </TabsList>

          {Object.keys(categoryConfig).map(category => (
            <TabsContent key={category} value={category} className="space-y-6">
              <ExpenseCategoryView
                expenses={filterExpensesByCategory(category)}
                category={category}
                onMarkCleared={markAsCleared}
                onDelete={handleDelete}
                filters={filters}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Add Expense Modal */}
      {showAddForm && (
        <AddExpenseForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            fetchExpenses();
          }}
        />
      )}
    </div>
  );
}

function ExpenseCategoryView({
  expenses,
  category,
  onMarkCleared,
  onDelete,
  filters
}: {
  expenses: Expense[];
  category: string;
  onMarkCleared: (id: string) => void;
  onDelete: (id: string) => void;
  filters: FilterOptions;
}) {
  const pendingExpenses = expenses.filter(e => e.status === 'pending');
  const clearedExpenses = expenses.filter(e => e.status === 'cleared');

  if (expenses.length === 0) {
    const isFiltered = filters.timeRange !== 'all' || filters.status !== 'all';
    const message = isFiltered
      ? `No ${categoryConfig[category as keyof typeof categoryConfig]?.label} expenses found for selected filters`
      : `No ${categoryConfig[category as keyof typeof categoryConfig]?.label} expenses yet`;

    return (
      <EmptyState
        category={category}
        message={message}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Dues */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-warning">
          Pending Dues ({pendingExpenses.length})
        </h3>
        {pendingExpenses.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No pending dues
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingExpenses.map(expense => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onMarkCleared={onMarkCleared}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cleared Expenses */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-success">
          Cleared Expenses ({clearedExpenses.length})
        </h3>
        {clearedExpenses.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No cleared expenses
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clearedExpenses.map(expense => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExpenseCard({
  expense,
  onMarkCleared,
  onDelete
}: {
  expense: Expense;
  onMarkCleared?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const config = categoryConfig[expense.category as keyof typeof categoryConfig];
  const Icon = config?.icon || Receipt;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="font-medium">{config?.label || expense.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={expense.status === 'pending' ? 'default' : 'secondary'}
              className={expense.status === 'pending' ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'}
            >
              {expense.status === 'pending' ? 'Pending' : 'Cleared'}
            </Badge>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(expense.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-2xl font-bold">₹{expense.amount}</div>
          {expense.note && (
            <p className="text-sm text-muted-foreground">{expense.note}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(expense.created_at).toLocaleDateString()}
          </p>
        </div>

        {expense.status === 'pending' && onMarkCleared && (
          <Button
            onClick={() => onMarkCleared(expense.id)}
            size="sm"
            className="w-full mt-3 bg-success hover:bg-success/90"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark as Cleared
          </Button>
        )}
      </CardContent>
    </Card>
  );
}