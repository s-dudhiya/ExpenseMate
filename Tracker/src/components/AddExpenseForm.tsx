import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AddExpenseFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Friend {
  user_id: string;
  full_name: string;
}

export function AddExpenseForm({ onClose, onSuccess }: AddExpenseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Splitting state
  const [isSplit, setIsSplit] = useState(false);
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percentage'>('equal');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [paidBy, setPaidBy] = useState<string>(''); // Will initialize to user.id when available

  useEffect(() => {
    if (user && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user, paidBy]);

  useEffect(() => {
    if (user && isSplit && friends.length === 0) {
      fetchFriends();
    }
  }, [user, isSplit]);

  const fetchFriends = async () => {
    if (!user) return;
    try {
      const { data: requestedData, error: reqError } = await supabase
        .from('connections')
        .select('profiles!connections_receiver_id_fkey(user_id, full_name)')
        .eq('requester_id', user.id)
        .eq('status', 'accepted');

      const { data: receivedData, error: recError } = await supabase
        .from('connections')
        .select('profiles!connections_requester_id_fkey(user_id, full_name)')
        .eq('receiver_id', user.id)
        .eq('status', 'accepted');

      if (reqError) throw reqError;
      if (recError) throw recError;

      const fList: Friend[] = [];
      requestedData?.forEach((d: any) => d.profiles && fList.push(d.profiles));
      receivedData?.forEach((d: any) => d.profiles && fList.push(d.profiles));

      setFriends(fList);
    } catch (e) {
      console.error(e);
    }
  };

  // No special category change handler needed anymore

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleSplitValueChange = (friendId: string, val: string) => {
    setSplitValues(prev => ({ ...prev, [friendId]: val }));
  };

  // Calculate dynamic equal split breakdown for UI display
  const equalSplitAmount = amount && !isNaN(Number(amount)) && selectedFriends.length > 0
    ? (Number(amount) / (selectedFriends.length + 1)).toFixed(2)
    : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Invalid Amount', variant: 'destructive' });
      return;
    }

    // Split Validation
    if (isSplit && selectedFriends.length === 0) {
      toast({ title: 'Select Friends', description: 'Please select at least one friend to split with.', variant: 'destructive' });
      return;
    }

    const calculatedSplits: { user_id: string, amount_owed: number }[] = [];

    if (isSplit) {
      // The total pool of people splitting is: Selected Friends + Current User (if they are taking a share).
      // When tracking debts, anyone who is NOT the `paidBy` person gets an `expense_split` row.
      const allParticipants = [...selectedFriends, user.id]; // Everyone involved

      if (splitType === 'equal') {
        // Exclude the payer from getting a debt split. They paid.
        const perPerson = parsedAmount / allParticipants.length;

        allParticipants.forEach(pId => {
          if (pId !== paidBy) {
            calculatedSplits.push({ user_id: pId, amount_owed: Number(perPerson.toFixed(2)) });
          }
        });
      }
      else if (splitType === 'exact') {
        let totalAllocated = 0;
        for (const pId of allParticipants) {
          if (pId === user.id && pId === paidBy) continue; // If I paid, I don't owe.

          const valStr = pId === user.id ? splitValues['me'] : splitValues[pId];
          const val = parseFloat(valStr || '0');

          if (isNaN(val) || val < 0) {
            toast({ title: 'Invalid split amount', variant: 'destructive' }); return;
          }
          totalAllocated += val;
          if (pId !== paidBy && val > 0) { // Only log debts > 0 for non-payers
            calculatedSplits.push({ user_id: pId, amount_owed: val });
          }
        }
        if (totalAllocated >= parsedAmount + 0.05 || totalAllocated <= parsedAmount - 0.05) {
          toast({ title: 'Amount Mismatch', description: 'Total allocated exact amounts must roughly equal the total expense.', variant: 'destructive' }); return;
        }
      }
      else if (splitType === 'percentage') {
        let totalPercent = 0;
        for (const pId of allParticipants) {
          const valStr = pId === user.id ? splitValues['me'] : splitValues[pId];
          const val = parseFloat(valStr || '0');

          if (isNaN(val) || val < 0) {
            toast({ title: 'Invalid split percentage', variant: 'destructive' }); return;
          }
          totalPercent += val;
          if (pId !== paidBy && val > 0) {
            const owed = (parsedAmount * (val / 100));
            calculatedSplits.push({ user_id: pId, amount_owed: Number(owed.toFixed(2)) });
          }
        }
        if (totalPercent > 100.1 || totalPercent < 99.9) {
          toast({ title: 'Percentage Mismatch', description: 'Percentages must total exactly 100%.', variant: 'destructive' }); return;
        }
      }
    }

    setLoading(true);

    try {
      // 1. Insert Expense
      const { data: expenseData, error: expError } = await supabase.from('expenses').insert({
        user_id: user.id,
        paid_by: isSplit ? paidBy : user.id,
        category,
        amount: parsedAmount,
        status: 'pending',
        split_type: isSplit ? splitType : 'none',
        created_at: new Date(date).toISOString(),
      }).select('id').single();

      if (expError || !expenseData) throw expError;

      // 2. Insert Splits
      if (isSplit && calculatedSplits.length > 0) {
        const splitsToInsert = calculatedSplits.map(split => ({
          expense_id: expenseData.id,
          user_id: split.user_id,
          amount_owed: split.amount_owed,
          has_paid: false
        }));

        const { error: splitError } = await supabase.from('expense_splits').insert(splitsToInsert);
        if (splitError) throw splitError;
      }

      toast({ title: 'Success', description: 'Expense added successfully' });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add expense', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>Track an expense and optionally split it with friends.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Expense Name</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Goa Trip, Dinner"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Total Amount (₹)</Label>
            <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required min="1" className="text-lg font-semibold" />
          </div>

          {/* SPLIT TOGGLE */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 mt-4">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Split Expense</Label>
              <div className="text-sm text-muted-foreground">Divide this cost with friends</div>
            </div>
            <Switch checked={isSplit} onCheckedChange={setIsSplit} />
          </div>

          {/* SPLIT OPTIONS */}
          {isSplit && (
            <div className="space-y-4 p-4 border rounded-lg bg-card shadow-sm">
              <div className="space-y-4 mb-4">
                <Label className="font-semibold text-base py-2 block">Step 1: Select Friends to Split With</Label>
                <ScrollArea className="h-40 rounded-md border p-2 bg-background">
                  {friends.length === 0 ? (
                    <div className="text-sm text-center text-muted-foreground pt-4">No accepted friends found.</div>
                  ) : (
                    <div className="space-y-3 p-1">
                      {friends.map(friend => {
                        const isSelected = selectedFriends.includes(friend.user_id);
                        return (
                          <div key={friend.user_id} className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox id={`friend-${friend.user_id}`} checked={isSelected} onCheckedChange={() => toggleFriendSelection(friend.user_id)} />
                              <Label htmlFor={`friend-${friend.user_id}`} className="font-medium cursor-pointer">{friend.full_name}</Label>
                            </div>

                            {/* Dynamic Inputs when Selected */}
                            {isSelected && splitType !== 'equal' && (
                              <div className="flex items-center gap-1 w-24">
                                <Input
                                  className="h-7 text-right"
                                  placeholder="0"
                                  type="number"
                                  step="0.01"
                                  value={splitValues[friend.user_id] || ''}
                                  onChange={(e) => handleSplitValueChange(friend.user_id, e.target.value)}
                                  disabled={paidBy === friend.user_id && splitType !== 'exact'} // Payer doesn't need to specify debt to themselves
                                />
                                <span className="text-xs text-muted-foreground">{splitType === 'percentage' ? '%' : '₹'}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Your own split input for exact/percentage if someone else paid, or if calculating exact proportions */}
                      {selectedFriends.length > 0 && splitType !== 'equal' && (
                        <div className="flex items-center justify-between space-x-2 pt-2 border-t mt-2">
                          <Label className="font-medium">Your Share</Label>
                          <div className="flex items-center gap-1 w-24">
                            <Input
                              className="h-7 text-right bg-primary/10"
                              placeholder="0"
                              type="number"
                              step="0.01"
                              value={splitValues['me'] || ''}
                              onChange={(e) => handleSplitValueChange('me', e.target.value)}
                              disabled={paidBy === user?.id && splitType !== 'exact'} // You don't owe yourself
                            />
                            <span className="text-xs text-muted-foreground">{splitType === 'percentage' ? '%' : '₹'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Step 2: Who Paid?</Label>
                  <Select value={paidBy} onValueChange={(v: string) => setPaidBy(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user?.id || 'me'}>You</SelectItem>
                      {friends.filter(f => selectedFriends.includes(f.user_id)).map(f => (
                        <SelectItem key={f.user_id} value={f.user_id}>{f.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Step 3: Split Strategy</Label>
                  <Select value={splitType} onValueChange={(v: any) => setSplitType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equal">Equally</SelectItem>
                      <SelectItem value="exact">Exact Amounts</SelectItem>
                      <SelectItem value="percentage">By Percentages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Display equal split breakdown */}
              {splitType === 'equal' && selectedFriends.length > 0 && amount && (
                <div className="text-sm text-muted-foreground text-center bg-muted/50 py-2 rounded">
                  Each person (including you) pays: <span className="font-bold text-foreground">₹{equalSplitAmount}</span>
                </div>
              )}
            </div>
          )}

          {/* Removed Miscellaneous note field since expense name acts as description */}

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !category || !amount} className="bg-gradient-primary">
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}