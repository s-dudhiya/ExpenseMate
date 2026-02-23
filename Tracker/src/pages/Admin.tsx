import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Lock, Mail, Send, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const ADMIN_PASSWORD = 'exp_admin_2026';

export default function Admin() {
    const { loading: authLoading } = useAuth();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [fetchingMaintenance, setFetchingMaintenance] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isAuthenticated) {
            fetchMaintenanceState();
        }
    }, [isAuthenticated]);

    const fetchMaintenanceState = async () => {
        setFetchingMaintenance(true);
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('is_maintenance_mode')
                .eq('id', 1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setIsMaintenance(data.is_maintenance_mode);
            }
        } catch (error) {
            console.error("Failed to fetch maintenance state", error);
            toast({ title: 'Warning', description: 'Could not fetch current maintenance state.', variant: 'destructive' });
        } finally {
            setFetchingMaintenance(false);
        }
    };

    const toggleMaintenanceMode = async (checked: boolean) => {
        try {
            setIsMaintenance(checked); // Optimistic UI update

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const res = await fetch(`${supabaseUrl}/functions/v1/toggle-maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({ isMaintenance: checked, password: ADMIN_PASSWORD })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to toggle maintenance mode');
            }

            toast({
                title: 'Site State Updated',
                description: `Maintenance mode is now ${checked ? 'ON' : 'OFF'}.`,
            });
        } catch (error: any) {
            console.error("Failed to update maintenance state", error);
            setIsMaintenance(!checked); // Revert optimistic update
            toast({
                title: 'Update Failed',
                description: error.message || 'Could not update maintenance state.',
                variant: 'destructive'
            });
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            </div>
        );
    }



    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            toast({ title: 'Access Granted', description: 'Welcome to the Developer Portal.' });
        } else {
            toast({ title: 'Access Denied', description: 'Incorrect developer password.', variant: 'destructive' });
            setPassword('');
        }
    };

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!subject.trim() || !message.trim()) {
            toast({ title: 'Required Fields', description: 'Please provide both a subject and a message.', variant: 'destructive' });
            return;
        }

        setIsSending(true);

        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const res = await fetch(`${supabaseUrl}/functions/v1/send-admin-mail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({ subject, htmlBody: message })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to send broadcast');
            }

            const data = await res.json();

            toast({
                title: 'Broadcast Sent!',
                description: data?.message || 'The email was successfully dispatched to all users.',
            });

            setSubject('');
            setMessage('');

        } catch (error: any) {
            console.error("Broadcast Error:", error);
            toast({
                title: 'Broadcast Failed',
                description: error.message || 'There was an error communicating with the edge function.',
                variant: 'destructive'
            });
        } finally {
            setIsSending(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <Card className="w-full max-w-sm shadow-elegant">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Developer Access</CardTitle>
                        <CardDescription>Enter the developer key to access the portal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button type="submit" className="w-full bg-gradient-primary">
                                Unlock
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Developer Portal</h1>
                        <p className="text-muted-foreground text-sm">Broadcast messages to all registered ExpenseMate users.</p>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    <Card className="shadow-elegant border-primary/20 h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-primary" />
                                Site Controls
                            </CardTitle>
                            <CardDescription>Manage global application state</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-semibold">Maintenance Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Redirect all users to the maintenance page.
                                    </p>
                                </div>
                                <Switch
                                    checked={isMaintenance}
                                    onCheckedChange={toggleMaintenanceMode}
                                    disabled={fetchingMaintenance}
                                    className="data-[state=checked]:bg-destructive"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-elegant border-primary/20">
                        <CardHeader>
                            <CardTitle>Broadcast Email</CardTitle>
                            <CardDescription>This will send a raw HTML email out to every user via the Supabase Edge Function.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSendBroadcast} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Email Subject</Label>
                                    <Input
                                        id="subject"
                                        placeholder="e.g. Scheduled Maintenance Notice"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        maxLength={100}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">HTML Email Body</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="<p>Hi there,</p><p>We will be performing maintenance on...</p>"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="min-h-[250px] font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">You can use standard HTML tags like &lt;strong&gt;, &lt;br/&gt;, &lt;p&gt;, &lt;h1&gt;.</p>
                                </div>

                                <Button type="submit" disabled={isSending} className="w-full bg-primary hover:bg-primary/90">
                                    {isSending ? (
                                        <>Sending Broadcast...</>
                                    ) : (
                                        <><Send className="h-4 w-4 mr-2" /> Dispatch Email to All Users</>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
