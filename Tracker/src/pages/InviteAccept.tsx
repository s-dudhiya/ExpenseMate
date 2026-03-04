import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Users, Check, Loader2 } from 'lucide-react';

export default function InviteAccept() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || localStorage.getItem('pending_invite_token');
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [invite, setInvite] = useState<any>(null);
    const [group, setGroup] = useState<any>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'done' | 'error'>('loading');
    const [error, setError] = useState('');

    // Fetch invite details by token (no auth required — open policy)
    useEffect(() => {
        if (!token) { setStatus('error'); setError('Invalid invite link.'); return; }
        const load = async () => {
            const { data, error } = await (supabase as any)
                .from('group_invites')
                .select('*, groups(id, name, emoji, description)')
                .eq('token', token)
                .single();
            if (error || !data) { setStatus('error'); setError('Invite not found or already used.'); return; }
            if (data.status !== 'pending') { setStatus('error'); setError(`This invite has already been ${data.status}.`); return; }
            setInvite(data);
            setGroup(data.groups);
            setStatus('ready');
        };
        load();
    }, [token]);

    // If user is now logged in and invite is ready → auto-accept
    useEffect(() => {
        if (status === 'ready' && user && invite) {
            handleAccept();
        }
    }, [status, user, invite]);

    const handleAccept = async () => {
        if (!user || !invite) return;
        setStatus('accepting');
        try {
            // 1. Add user to group_members (ignore duplicate)
            await supabase.from('group_members').upsert(
                { group_id: invite.group_id, user_id: user.id },
                { onConflict: 'group_id,user_id', ignoreDuplicates: true }
            );

            // 2. Create connection with inviter (if invite has invited_by)
            if (invite.invited_by && invite.invited_by !== user.id) {
                await supabase.from('connections').upsert({
                    requester_id: invite.invited_by,
                    receiver_id: user.id,
                    status: 'accepted',
                }, { onConflict: 'requester_id,receiver_id', ignoreDuplicates: true });
            }

            // 3. Mark invite as accepted
            await (supabase as any)
                .from('group_invites')
                .update({ status: 'accepted' })
                .eq('token', token);

            // 4. Clear the pending invite from localStorage
            localStorage.removeItem('pending_invite_token');

            setStatus('done');
            toast({ title: `Welcome to ${group?.name || 'the group'}! 🎉`, description: "You've been added successfully." });
            setTimeout(() => navigate('/dashboard'), 1800);
        } catch (e: any) {
            setStatus('error');
            setError(e.message);
        }
    };

    if (authLoading || status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="text-center max-w-sm">
                    <div className="text-5xl mb-4">😕</div>
                    <h2 className="text-xl font-extrabold mb-2">Oops!</h2>
                    <p className="text-muted-foreground font-medium mb-6">{error}</p>
                    <Button className="rounded-full" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
                </div>
            </div>
        );
    }

    if (status === 'done') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 rounded-3xl bg-success/10 flex items-center justify-center mx-auto mb-4 text-4xl">
                        {group?.emoji || '🎉'}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center mx-auto -mt-4 mb-4 shadow-lg">
                        <Check className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-extrabold mb-2">You're in!</h2>
                    <p className="text-muted-foreground font-medium">Added to <strong>{group?.name}</strong>. Redirecting…</p>
                </div>
            </div>
        );
    }

    // Ready — user not logged in yet
    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="text-center max-w-sm w-full">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
                    <div className="relative">
                        <div className="text-6xl mb-4">{group?.emoji || '👥'}</div>
                        <h1 className="text-2xl font-extrabold tracking-tight mb-2">{group?.name}</h1>
                        <p className="text-muted-foreground font-medium mb-8">
                            You've been invited to this group on ExpenseMate. Sign in to accept.
                        </p>
                        <div className="space-y-3">
                            <Button className="w-full rounded-full h-12 font-bold" onClick={() => {
                                // Save token to localStorage so it survives the auth redirect flow
                                if (token) localStorage.setItem('pending_invite_token', token);
                                navigate(`/auth?redirect=/invite?token=${token}`);
                            }}>
                                Sign in to Accept
                            </Button>
                            <Button variant="outline" className="w-full rounded-full h-12 font-bold" onClick={() => {
                                // Save token to localStorage so it survives the email confirmation flow
                                if (token) localStorage.setItem('pending_invite_token', token);
                                navigate(`/auth?mode=signup&redirect=/invite?token=${token}`);
                            }}>
                                Create Account & Join
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Joining group…</p>
            </div>
        </div>
    );
}
