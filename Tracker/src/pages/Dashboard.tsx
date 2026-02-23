import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogOut, Plus, Check, Utensils, Truck, Receipt, Wallet, User, Trash2, Users, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { EmptyState } from '@/components/EmptyState';
import { ExpenseFilters, FilterOptions } from '@/components/ExpenseFilters';

interface Profile {
  full_name: string;
  username: string;
}

interface ExpenseSplit {
  id: string;
  user_id: string;
  amount_owed: number;
  has_paid: boolean;
  profiles?: Profile;
}

interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note?: string;
  status: 'pending' | 'cleared';
  split_type?: string;
  created_at: string;
  updated_at: string;
  expense_splits?: ExpenseSplit[];
  profiles?: Profile;
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

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          profiles!expenses_user_id_fkey(full_name, username),
          expense_splits(id, user_id, amount_owed, has_paid, profiles!expense_splits_user_id_fkey(full_name, username))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as unknown as Expense[]);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch expenses', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const markAsCleared = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').update({ status: 'cleared' }).eq('id', id);
      if (error) throw error;
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'cleared' as const } : e));
      toast({ title: 'Success', description: 'Expense marked as cleared' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update expense', variant: 'destructive' });
    }
  };

  const markSplitAsPaid = async (splitId: string) => {
    try {
      const { error } = await supabase.from('expense_splits').update({ has_paid: true }).eq('id', splitId);
      if (error) throw error;
      fetchExpenses(); // Re-fetch to update all nested states safely
      toast({ title: 'Settled', description: 'Marked split as paid!' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update split', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(prev => prev.filter(expense => expense.id !== id));
      toast({ title: 'Success', description: 'Expense deleted successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete expense', variant: 'destructive' });
    }
  };

  const applyFilters = (expenseList: Expense[]) => {
    let filtered = [...expenseList];

    if (filters.timeRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      switch (filters.timeRange) {
        case 'this-month':
          filterDate.setMonth(now.getMonth(), 1); filterDate.setHours(0, 0, 0, 0); break;
        case 'last-month':
          filterDate.setMonth(now.getMonth() - 1, 1); filterDate.setHours(0, 0, 0, 0);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          endOfLastMonth.setHours(23, 59, 59, 999);
          filtered = filtered.filter(e => {
            const d = new Date(e.created_at); return d >= filterDate && d <= endOfLastMonth;
          });
          break;
        case 'this-week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
          filterDate.setTime(startOfWeek.getTime());
          break;
      }
      if (filters.timeRange !== 'last-month') {
        filtered = filtered.filter(e => new Date(e.created_at) >= filterDate);
      }
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(e => {
        // Custom logic: if it's a split I owe, check my split status.
        if (user && e.user_id !== user.id) {
          const mySplit = e.expense_splits?.find(s => s.user_id === user.id);
          if (mySplit) return filters.status === 'cleared' ? mySplit.has_paid : !mySplit.has_paid;
        }
        return e.status === filters.status;
      });
    }

    return filtered;
  };

  const filterExpensesByCategory = (category: string) => applyFilters(expenses.filter(e => e.category === category));

  const getSummary = () => {
    if (!user) return { totalPending: 0, totalLent: 0 };
    const filteredExpenses = applyFilters(expenses);

    let totalPending = 0; // What I owe (my pending expenses + splits where I owe)
    let totalLent = 0;    // What others owe me

    filteredExpenses.forEach(e => {
      if (e.user_id === user.id) {
        // I created this. 
        if (e.expense_splits && e.expense_splits.length > 0) {
          // Friends owe me money for this
          e.expense_splits.forEach(s => {
            if (!s.has_paid) totalLent += s.amount_owed;
          });
        } else {
          // Personal expense
          if (e.status === 'pending') totalPending += e.amount;
        }
      } else {
        // Someone else created this, I might owe them
        const mySplit = e.expense_splits?.find(s => s.user_id === user.id);
        if (mySplit && !mySplit.has_paid) {
          totalPending += mySplit.amount_owed;
        }
      }
    });

    return { totalPending, totalLent };
  };

  const { totalPending, totalLent } = getSummary();

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="hidden sm:block text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ExpenseMate
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setShowAddForm(true)} size="sm" className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" /> Add Expense
            </Button>
            <Button onClick={() => navigate('/friends')} variant="outline" size="sm" title="Friends Hub">
              <Users className="h-4 w-4" />
            </Button>
            <Button onClick={() => navigate('/profile')} variant="outline" size="sm" title="Profile Settings">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-elegant border-warning/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-warning" /> You Owe / Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">₹{totalPending.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="shadow-elegant border-success/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-success" /> You are Owed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">₹{totalLent.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <ExpenseFilters filters={filters} onFiltersChange={setFilters} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tiffin" className="flex items-center gap-2"><Utensils className="h-4 w-4" /> Tiffin</TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2"><Truck className="h-4 w-4" /> Delivery</TabsTrigger>
            <TabsTrigger value="miscellaneous" className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Misc</TabsTrigger>
          </TabsList>

          {Object.keys(categoryConfig).map(category => (
            <TabsContent key={category} value={category} className="space-y-6">
              <ExpenseCategoryView
                expenses={filterExpensesByCategory(category)}
                category={category}
                currentUserId={user.id}
                onMarkCleared={markAsCleared}
                onMarkSplitPaid={markSplitAsPaid}
                onDelete={handleDelete}
                filters={filters}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {showAddForm && <AddExpenseForm onClose={() => setShowAddForm(false)} onSuccess={() => { setShowAddForm(false); fetchExpenses(); }} />}
    </div>
  );
}

function ExpenseCategoryView({
  expenses, category, currentUserId, onMarkCleared, onMarkSplitPaid, onDelete, filters
}: {
  expenses: Expense[]; category: string; currentUserId: string;
  onMarkCleared: (id: string) => void; onMarkSplitPaid: (id: string) => void; onDelete: (id: string) => void; filters: FilterOptions;
}) {
  const pendingExpenses = expenses.filter(e => {
    if (e.user_id !== currentUserId) {
      const mySplit = e.expense_splits?.find(s => s.user_id === currentUserId);
      return mySplit && !mySplit.has_paid;
    }
    return e.status === 'pending';
  });

  const clearedExpenses = expenses.filter(e => {
    if (e.user_id !== currentUserId) {
      const mySplit = e.expense_splits?.find(s => s.user_id === currentUserId);
      return mySplit && mySplit.has_paid;
    }
    return e.status === 'cleared';
  });

  if (expenses.length === 0) return <EmptyState category={category} message={`No ${categoryConfig[category as keyof typeof categoryConfig]?.label} expenses found`} />;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-warning">Pending ({pendingExpenses.length})</h3>
        {pendingExpenses.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">No pending dues</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingExpenses.map(expense => (
              <ExpenseCard key={expense.id} expense={expense} currentUserId={currentUserId} onMarkCleared={onMarkCleared} onMarkSplitPaid={onMarkSplitPaid} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-success">Cleared ({clearedExpenses.length})</h3>
        {clearedExpenses.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">No cleared expenses</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clearedExpenses.map(expense => (
              <ExpenseCard key={expense.id} expense={expense} currentUserId={currentUserId} onMarkSplitPaid={onMarkSplitPaid} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExpenseCard({
  expense, currentUserId, onMarkCleared, onMarkSplitPaid, onDelete
}: {
  expense: Expense; currentUserId: string;
  onMarkCleared?: (id: string) => void; onMarkSplitPaid?: (id: string) => void; onDelete?: (id: string) => void;
}) {
  const config = categoryConfig[expense.category as keyof typeof categoryConfig];
  const Icon = config?.icon || Receipt;

  const isCreator = expense.user_id === currentUserId;
  const isSplitExpense = Array.isArray(expense.expense_splits) && expense.expense_splits.length > 0;

  // If I didn't create it, find my specific split details
  const mySplit = !isCreator ? expense.expense_splits?.find(s => s.user_id === currentUserId) : null;

  const displayAmount = isCreator ? expense.amount : (mySplit?.amount_owed || expense.amount);
  const isPending = isCreator ? expense.status === 'pending' : (mySplit ? !mySplit.has_paid : false);

  return (
    <Card className={`shadow-md hover:shadow-lg transition-shadow border-t-4 ${isCreator && isSplitExpense ? 'border-t-primary' : !isCreator ? 'border-t-warning' : 'border-t-transparent'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="font-medium">{config?.label || expense.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isPending ? 'default' : 'secondary'} className={isPending ? 'bg-warning' : 'bg-success'}>
              {isPending ? 'Pending' : 'Cleared'}
            </Badge>
            {isCreator && onDelete && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => onDelete(expense.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1 mb-3">
          <div className="text-2xl font-bold">₹{displayAmount}</div>

          {!isCreator && expense.profiles && (
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3" /> Owed to {expense.profiles.full_name}
            </p>
          )}

          {expense.note && <p className="text-sm text-foreground/80 mt-1">{expense.note}</p>}
          <p className="text-xs text-muted-foreground">{new Date(expense.created_at).toLocaleDateString()}</p>
        </div>

        {/* SPLIT BREAKDOWN FOR CREATOR */}
        {isCreator && isSplitExpense && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">SPLIT DETAILS</p>
            {expense.expense_splits?.map(split => (
              <div key={split.id} className="flex items-center justify-between text-sm">
                <span>{split.profiles?.full_name}</span>
                <span className="flex items-center gap-2">
                  ₹{split.amount_owed}
                  {split.has_paid
                    ? <Badge variant="secondary" className="bg-success/20 text-success text-[10px] px-1 py-0">Paid</Badge>
                    : <Badge variant="outline" className="text-warning text-[10px] px-1 py-0">Owes</Badge>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="mt-4">
          {isCreator && !isSplitExpense && isPending && onMarkCleared && (
            <Button onClick={() => onMarkCleared(expense.id)} size="sm" className="w-full bg-success hover:bg-success/90">
              <Check className="h-4 w-4 mr-2" /> Mark as Cleared
            </Button>
          )}

          {!isCreator && mySplit && isPending && onMarkSplitPaid && (
            <Button onClick={() => onMarkSplitPaid(mySplit.id)} size="sm" className="w-full bg-primary hover:bg-primary/90">
              <Check className="h-4 w-4 mr-2" /> Pay ₹{mySplit.amount_owed}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}