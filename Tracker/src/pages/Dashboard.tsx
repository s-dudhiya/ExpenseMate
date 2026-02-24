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
import { AddTiffinForm } from '@/components/AddTiffinForm';
import { EmptyState } from '@/components/EmptyState';
import { ExpenseFilters, FilterOptions } from '@/components/ExpenseFilters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  paid_by: string; // NEW FIELD
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
  const [showAddTiffinForm, setShowAddTiffinForm] = useState(false);
  const [mainTab, setMainTab] = useState('overview');
  const [tiffinTab, setTiffinTab] = useState('tiffin');
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

  const markSplitAsPaid = async (splitId: string, expenseId: string) => {
    try {
      const { error } = await supabase.from('expense_splits').update({ has_paid: true }).eq('id', splitId);
      if (error) throw error;

      // Check if all splits for this expense are now paid
      const parentExpense = expenses.find(e => e.id === expenseId);
      if (parentExpense && parentExpense.expense_splits) {
        const remainingUnpaid = parentExpense.expense_splits.filter(s => s.id !== splitId && !s.has_paid);
        if (remainingUnpaid.length === 0) {
          // Auto-clear the parent expense!
          await supabase.from('expenses').update({ status: 'cleared' }).eq('id', expenseId);
          toast({ title: 'Expense Cleared!', description: 'All splits have been settled.' });
        } else {
          toast({ title: 'Settled', description: 'Marked split as paid!' });
        }
      } else {
        toast({ title: 'Settled', description: 'Marked split as paid!' });
      }

      fetchExpenses(); // Re-fetch to update all nested states safely
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
        if (user && e.paid_by !== user.id) {
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
    if (!user) return { totalPending: 0, totalLent: 0, chartData: [], totalPersonalSpent: 0, tiffinPending: 0, deliveryPending: 0, tiffinCleared: 0, splitOwe: 0, splitOwed: 0 };
    const filteredExpenses = applyFilters(expenses);

    let totalPending = 0;
    let totalLent = 0;
    let totalPersonalSpent = 0;
    let tiffinPending = 0;
    let deliveryPending = 0;
    let tiffinCleared = 0;
    let splitOwe = 0;
    let splitOwed = 0;

    const categoryTotals: Record<string, number> = {};
    Object.keys(categoryConfig).forEach(k => categoryTotals[k] = 0);

    filteredExpenses.forEach(e => {
      const isActuallySplit = e.expense_splits && e.expense_splits.length > 0;
      const isPayer = e.paid_by === user.id;
      const mySplit = !isPayer ? e.expense_splits?.find(s => s.user_id === user.id) : null;
      const isTiffinOrDelivery = e.category === 'tiffin' || e.category === 'delivery';

      // 1. Personal Ledger Tracking (Not Tiffin/Delivery)
      if (!isTiffinOrDelivery) {
        if (isPayer) {
          if (!isActuallySplit) {
            totalPersonalSpent += e.amount;
          } else {
            const sumOwedByOthers = e.expense_splits!.reduce((acc, s) => acc + s.amount_owed, 0);
            totalPersonalSpent += (e.amount - sumOwedByOthers);
          }
        } else if (mySplit) {
          totalPersonalSpent += mySplit.amount_owed;
        }
      }

      // 2. Tiffin/Delivery Tracking
      if (isTiffinOrDelivery) {
        if (e.status === 'pending') {
          if (e.category === 'tiffin') tiffinPending += e.amount;
          if (e.category === 'delivery') deliveryPending += e.amount;
        } else if (e.status === 'cleared') {
          // Both Tiffin and Delivery count towards total cleared
          tiffinCleared += e.amount;
        }
      }

      // 3. Splitwise Tracking (For debts/credits)
      // Only for expenses we are involved in and are strictly "Pending" or involve unpaid splits
      if (isPayer) {
        if (isActuallySplit) {
          e.expense_splits!.forEach(s => {
            if (!s.has_paid) {
              totalLent += s.amount_owed;
              if (!isTiffinOrDelivery) splitOwed += s.amount_owed;
            }
          });
        } else {
          if (e.status === 'pending') totalPending += e.amount;
        }

        if (categoryTotals[e.category] !== undefined) {
          categoryTotals[e.category] += e.amount;
        }
      } else {
        if (mySplit && !mySplit.has_paid) {
          totalPending += mySplit.amount_owed;
          if (!isTiffinOrDelivery) splitOwe += mySplit.amount_owed;
        }
      }
    });

    const chartData = Object.keys(categoryConfig).map(key => ({
      name: categoryConfig[key as keyof typeof categoryConfig].label,
      total: categoryTotals[key]
    }));

    return { totalPending, totalLent, chartData, totalPersonalSpent, tiffinPending, deliveryPending, tiffinCleared, splitOwe, splitOwed };
  };

  const { totalPending, totalLent, chartData, totalPersonalSpent, tiffinPending, deliveryPending, tiffinCleared, splitOwe, splitOwed } = getSummary();

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
          <div className="flex items-center gap-2 md:gap-4">
            <Button onClick={() => setShowAddForm(true)} size="sm" className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Expense</span>
            </Button>
            <Button onClick={() => setShowAddTiffinForm(true)} size="sm" variant="outline" className="border-primary/20 bg-secondary/20 hover:bg-secondary/40">
              <Plus className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Tiffin</span>
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

        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-12">
            <TabsTrigger value="overview" className="text-sm md:text-base">Overview</TabsTrigger>
            <TabsTrigger value="personal" className="text-sm md:text-base">Personal</TabsTrigger>
            <TabsTrigger value="splitwise" className="text-sm md:text-base">Splitwise</TabsTrigger>
            <TabsTrigger value="tiffin" className="text-sm md:text-base">Tiffin</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
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

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip cursor={{ fill: 'transparent' }} formatter={(value) => [`₹${value}`, 'Total']} />
                      <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personal" className="space-y-6 mt-0">
            <div className="grid grid-cols-1">
              <Card className="shadow-elegant border-primary/20">
                <CardHeader className="pb-3 text-center">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Lifetime Spent
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-4xl font-bold text-primary">₹{totalPersonalSpent.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-2">Your actual share across all expenses</p>
                </CardContent>
              </Card>
            </div>
            <ExpenseFilters filters={filters} onFiltersChange={setFilters} />

            <div className="space-y-4">
              {applyFilters(expenses).filter(e => e.category !== 'tiffin' && e.category !== 'delivery').length === 0 ? (
                <EmptyState category="general" message="No personal expenses logged yet" />
              ) : (
                applyFilters(expenses)
                  .filter(e => e.category !== 'tiffin' && e.category !== 'delivery')
                  .map(expense => (
                    <PersonalLedgerCard key={expense.id} expense={expense} currentUserId={user.id} onDelete={handleDelete} />
                  ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="splitwise" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
              <Card className="shadow-elegant border-warning/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ArrowDownRight className="h-4 w-4 text-warning" /> You Owe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">₹{splitOwe.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card className="shadow-elegant border-success/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-success" /> You are Owed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">₹{splitOwed.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>
            <ExpenseFilters filters={filters} onFiltersChange={setFilters} />

            <ExpenseCategoryView
              expenses={applyFilters(expenses).filter(e => e.expense_splits && e.expense_splits.length > 0 && e.category !== 'tiffin' && e.category !== 'delivery')}
              category="splitwise"
              currentUserId={user.id}
              onMarkCleared={markAsCleared}
              onMarkSplitPaid={markSplitAsPaid}
              onDelete={handleDelete}
              filters={filters}
            />
          </TabsContent>

          <TabsContent value="tiffin" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
              <Card className="shadow-elegant border-warning/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-warning" /> Tiffin Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">₹{tiffinPending.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card className="shadow-elegant border-warning/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4 text-warning" /> Delivery Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">₹{deliveryPending.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card className="shadow-elegant border-success/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" /> Total Cleared
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">₹{tiffinCleared.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>
            <ExpenseFilters filters={filters} onFiltersChange={setFilters} />
            <Tabs value={tiffinTab} onValueChange={setTiffinTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tiffin" className="flex items-center gap-2"><Utensils className="h-4 w-4" /> Tiffin</TabsTrigger>
                <TabsTrigger value="delivery" className="flex items-center gap-2"><Truck className="h-4 w-4" /> Delivery</TabsTrigger>
              </TabsList>

              {['tiffin', 'delivery'].map(category => (
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
          </TabsContent>
        </Tabs>
      </div>

      {showAddForm && <AddExpenseForm onClose={() => setShowAddForm(false)} onSuccess={() => { setShowAddForm(false); fetchExpenses(); }} />}
      {showAddTiffinForm && <AddTiffinForm onClose={() => setShowAddTiffinForm(false)} onSuccess={() => { setShowAddTiffinForm(false); fetchExpenses(); }} />}
    </div>
  );
}

function PersonalLedgerCard({ expense, currentUserId, onDelete }: { expense: Expense; currentUserId: string; onDelete?: (id: string) => void }) {
  const isPayer = expense.paid_by === currentUserId;
  let myShare = 0;
  if (isPayer) {
    if (expense.expense_splits && expense.expense_splits.length > 0) {
      const otherShares = expense.expense_splits.reduce((acc, s) => acc + s.amount_owed, 0);
      myShare = expense.amount - otherShares;
    } else {
      myShare = expense.amount;
    }
  } else {
    const mySplit = expense.expense_splits?.find(s => s.user_id === currentUserId);
    if (mySplit) myShare = mySplit.amount_owed;
  }

  // Hide 0 value shares or negative errors
  if (myShare <= 0) return null;

  // Personal cards can be deleted by the creator (the actual logger)
  const isCreator = expense.user_id === currentUserId;

  return (
    <Card className="shadow-sm border-l-4 border-l-primary hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-base">{expense.category}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{new Date(expense.created_at).toLocaleDateString()}</p>
          {expense.note && <p className="text-sm text-foreground/80 mt-1">{expense.note}</p>}
        </div>
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="text-xl font-bold">₹{myShare.toFixed(2)}</div>
          {isCreator && onDelete && (
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => onDelete(expense.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExpenseCategoryView({
  expenses, category, currentUserId, onMarkCleared, onMarkSplitPaid, onDelete, filters
}: {
  expenses: Expense[]; category: string; currentUserId: string;
  onMarkCleared: (id: string) => void; onMarkSplitPaid: (splitId: string, expenseId: string) => void; onDelete: (id: string) => void; filters: FilterOptions;
}) {
  const pendingExpenses = expenses.filter(e => {
    // If you didn't pay for it (you are a debtor or just the logger who owes)
    if (e.paid_by !== currentUserId) {
      const mySplit = e.expense_splits?.find(s => s.user_id === currentUserId);
      return mySplit ? !mySplit.has_paid : false;
    }
    // If you DID pay for it, it's pending if the main status is pending (waiting for anyone to pay)
    return e.status === 'pending';
  });

  const clearedExpenses = expenses.filter(e => {
    // If you didn't pay for it (you are a debtor)
    if (e.paid_by !== currentUserId) {
      const mySplit = e.expense_splits?.find(s => s.user_id === currentUserId);
      return mySplit ? mySplit.has_paid : false;
    }
    // If you DID pay for it, it's only truly cleared history when everyone has paid
    return e.status === 'cleared';
  });

  if (expenses.length === 0) return <EmptyState category={category} message={`No expenses found here`} />;

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
        <h3 className="text-lg font-semibold mb-4 text-success">Cleared History ({clearedExpenses.length})</h3>
        {clearedExpenses.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">No cleared expenses</Card>
        ) : (
          <div className="space-y-4">
            {clearedExpenses.map(expense => (
              category === 'splitwise'
                ? <SplitHistoryCard key={expense.id} expense={expense} currentUserId={currentUserId} onDelete={onDelete} />
                : <ExpenseCard key={expense.id} expense={expense} currentUserId={currentUserId} onMarkSplitPaid={onMarkSplitPaid} onDelete={onDelete} />
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
  onMarkCleared?: (id: string) => void; onMarkSplitPaid?: (splitId: string, expenseId: string) => void; onDelete?: (id: string) => void;
}) {
  const config = categoryConfig[expense.category as keyof typeof categoryConfig];
  const Icon = config?.icon || Receipt;

  const isCreator = expense.user_id === currentUserId; // Can delete it
  const isPayer = expense.paid_by === currentUserId;  // Is owed money
  const isSplitExpense = Array.isArray(expense.expense_splits) && expense.expense_splits.length > 0;

  // If I didn't pay for it, find my specific split details (what I owe)
  const mySplit = !isPayer ? expense.expense_splits?.find(s => s.user_id === currentUserId) : null;

  const displayAmount = isPayer ? expense.amount : (mySplit?.amount_owed || expense.amount);
  const isPending = isPayer ? expense.status === 'pending' : (mySplit ? !mySplit.has_paid : false);

  // Note text if someone else paid
  let paidByNote = '';
  if (!isPayer && expense.profiles) {
    if (expense.paid_by !== expense.user_id) {
      paidByNote = `Owed to a friend`;
      // If we could perfectly join paid_by profile name, we'd use it here.
      // For now, if paid_by is different than the creator, we just say friend.
    } else {
      paidByNote = `Owed to ${expense.profiles.full_name}`;
    }
  }

  return (
    <Card className={`shadow-md hover:shadow-lg transition-shadow border-t-4 ${isPayer && isSplitExpense ? 'border-t-primary' : !isPayer ? 'border-t-warning' : 'border-t-transparent'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="font-medium max-w-[120px] sm:max-w-none truncate" title={expense.category}>
              {config?.label || expense.category}
            </span>
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

          {!isPayer && (
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3" /> {paidByNote}
            </p>
          )}

          {expense.note && <p className="text-sm text-foreground/80 mt-1">{expense.note}</p>}
          <p className="text-xs text-muted-foreground">{new Date(expense.created_at).toLocaleDateString()}</p>
        </div>

        {/* SPLIT BREAKDOWN FOR PAYER */}
        {isPayer && isSplitExpense && (
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
          {isPayer && !isSplitExpense && isPending && onMarkCleared && (
            <Button onClick={() => onMarkCleared(expense.id)} size="sm" className="w-full bg-success hover:bg-success/90">
              <Check className="h-4 w-4 mr-2" /> Mark as Cleared
            </Button>
          )}

          {!isPayer && mySplit && isPending && onMarkSplitPaid && (
            <Button onClick={() => onMarkSplitPaid(mySplit.id, expense.id)} size="sm" className="w-full bg-primary hover:bg-primary/90">
              <Check className="h-4 w-4 mr-2" /> Pay ₹{mySplit.amount_owed}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SplitHistoryCard({ expense, currentUserId, onDelete }: { expense: Expense; currentUserId: string; onDelete?: (id: string) => void }) {
  const isPayer = expense.paid_by === currentUserId;
  let myShare = 0;

  if (isPayer) {
    if (expense.expense_splits && expense.expense_splits.length > 0) {
      // You lent this money out, so your "share" is the total others owed YOU
      myShare = expense.expense_splits.reduce((acc, s) => acc + s.amount_owed, 0);
    } else {
      myShare = expense.amount;
    }
  } else {
    // You owed this money, so your "share" was whatever you owed the payer
    const mySplit = expense.expense_splits?.find(s => s.user_id === currentUserId);
    if (mySplit) myShare = mySplit.amount_owed;
  }

  if (myShare <= 0) return null;

  // For cleared history, anyone involved can potentially delete the log, but let's stick to the creator avoiding accidental wipes
  const isCreator = expense.user_id === currentUserId;

  return (
    <Card className={`shadow-sm border-l-4 ${isPayer ? 'border-l-success' : 'border-l-muted'} hover:shadow-md transition-shadow opacity-90`}>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isPayer ? 'text-success border-success/30' : 'text-muted-foreground'}>Settled</Badge>
            <h4 className="font-semibold text-base">{expense.category}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{new Date(expense.created_at).toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isPayer ? `You were paid back` : `You paid back someone`}
          </p>
        </div>
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className={`text-xl font-bold ${isPayer ? 'text-success' : 'text-muted-foreground'}`}>
            {isPayer ? '+' : '-'}₹{myShare.toFixed(2)}
          </div>
          {isCreator && onDelete && (
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => onDelete(expense.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}