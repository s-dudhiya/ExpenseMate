import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Trash2 } from 'lucide-react';

export interface EditableExpense {
    id: string;
    category: string;
    amount: number;
    note?: string | null;
    status: string;
    created_at: string;
    expense_splits?: {
        id: string;
        user_id: string;
        amount_owed: number;
        has_paid: boolean;
        profiles?: { full_name: string; user_id: string };
    }[];
    payer_profile?: { full_name: string };
    paid_by: string;
}

interface EditExpenseDialogProps {
    expense: EditableExpense;
    currentUserId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditExpenseDialog({ expense, currentUserId, onClose, onSuccess }: EditExpenseDialogProps) {
    const { toast } = useToast();
    const [name, setName] = useState(expense.category);
    const [amount, setAmount] = useState(String(expense.amount));
    const [note, setNote] = useState(expense.note || '');
    const [date, setDate] = useState(expense.created_at.split('T')[0]);
    const [status, setStatus] = useState(expense.status);
    const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        expense.expense_splits?.forEach(s => { init[s.id] = String(s.amount_owed); });
        return init;
    });
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const hasSplits = (expense.expense_splits?.length || 0) > 0;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
            toast({ title: 'Invalid fields', description: 'Name and amount are required.', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            // 1. Update expense
            const { error: expErr } = await supabase
                .from('expenses')
                .update({
                    category: name.trim(),
                    amount: parsedAmount,
                    note: note.trim() || null,
                    status,
                    created_at: new Date(date).toISOString(),
                })
                .eq('id', expense.id);
            if (expErr) throw expErr;

            // 2. Update individual split amounts if any
            if (hasSplits) {
                for (const split of expense.expense_splits || []) {
                    const newAmt = parseFloat(splitAmounts[split.id] || String(split.amount_owed));
                    if (!isNaN(newAmt) && newAmt !== split.amount_owed) {
                        const { error: splitErr } = await supabase
                            .from('expense_splits')
                            .update({ amount_owed: newAmt })
                            .eq('id', split.id);
                        if (splitErr) throw splitErr;
                    }
                }
            }

            toast({ title: '✓ Saved', description: 'Expense updated successfully.' });
            onSuccess();
        } catch (e: any) {
            toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        setDeleting(true);
        try {
            const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
            if (error) throw error;
            toast({ title: 'Deleted', description: 'Expense removed.' });
            onSuccess();
        } catch (e: any) {
            toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
            setDeleting(false);
        }
    };

    const toggleSplitPaid = async (splitId: string, currentPaid: boolean) => {
        try {
            const { error } = await supabase.from('expense_splits').update({ has_paid: !currentPaid }).eq('id', splitId);
            if (error) throw error;
            // Re-fetch would happen on success; toast only
            toast({ title: currentPaid ? 'Marked unpaid' : 'Marked paid' });
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-extrabold">Edit Expense</DialogTitle>
                    <DialogDescription>Update the details for this expense.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-4 pt-2">
                    {/* Name & Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-name" className="font-semibold text-sm">Name *</Label>
                            <Input
                                id="edit-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Expense name"
                                required
                                className="rounded-xl font-medium"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-date" className="font-semibold text-sm">Date</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-amount" className="font-semibold text-sm">Amount (₹) *</Label>
                        <Input
                            id="edit-amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                            className="text-lg font-bold rounded-xl"
                        />
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-note" className="font-semibold text-sm">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input
                            id="edit-note"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Add a note..."
                            className="rounded-xl"
                        />
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <Label className="font-semibold text-sm">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="cleared">Cleared</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Split Breakdown Editor */}
                    {hasSplits && (
                        <div className="space-y-2 p-3 bg-secondary/30 rounded-xl border border-border/40">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Splits</p>
                            {expense.expense_splits?.map(split => (
                                <div key={split.id} className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {split.user_id === currentUserId ? 'You' : split.profiles?.full_name || 'Member'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="flex items-center gap-1 w-24">
                                            <span className="text-xs text-muted-foreground">₹</span>
                                            <Input
                                                className="h-7 text-right rounded-lg text-xs font-bold px-1"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={splitAmounts[split.id] ?? String(split.amount_owed)}
                                                onChange={e => setSplitAmounts(prev => ({ ...prev, [split.id]: e.target.value }))}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleSplitPaid(split.id, split.has_paid)}
                                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full transition-colors ${split.has_paid
                                                    ? 'bg-success/10 text-success hover:bg-success/20'
                                                    : 'bg-warning/10 text-warning hover:bg-warning/20'
                                                }`}
                                        >
                                            {split.has_paid ? 'Paid' : 'Owes'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        {/* Delete button */}
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={`rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 transition-all ${confirmDelete ? 'bg-destructive/10 w-auto px-3 gap-2' : 'w-10'}`}
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            <Trash2 className="h-4 w-4 shrink-0" />
                            {confirmDelete && <span className="text-xs font-bold">Confirm?</span>}
                        </Button>

                        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl font-bold shadow-lg shadow-primary/20"
                        >
                            <Save className="h-4 w-4 mr-1.5" />
                            {loading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
