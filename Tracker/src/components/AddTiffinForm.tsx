import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AddTiffinFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function AddTiffinForm({ onClose, onSuccess }: AddTiffinFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [category, setCategory] = useState<string>('tiffin');
    const [amount, setAmount] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast({ title: 'Invalid Amount', variant: 'destructive' });
            return;
        }

        setLoading(true);

        try {
            const { error: expError } = await supabase.from('expenses').insert({
                user_id: user.id,
                category,
                amount: parsedAmount,
                status: 'pending',
                split_type: 'none',
                created_at: new Date(date).toISOString(),
            });

            if (expError) throw expError;

            toast({ title: 'Success', description: `${category === 'tiffin' ? 'Tiffin' : 'Delivery'} logged successfully` });
            onSuccess();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to add expense', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Tiffin / Delivery</DialogTitle>
                    <DialogDescription>Track your recurring food expenses.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={category} onValueChange={setCategory} required>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tiffin">Tiffin</SelectItem>
                                    <SelectItem value="delivery">Delivery</SelectItem>
                                </SelectContent>
                            </Select>
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

                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={loading || !category || !amount} className="bg-gradient-primary">
                            {loading ? 'Adding...' : 'Log Expense'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
