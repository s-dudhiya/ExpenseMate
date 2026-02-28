import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, UserPlus, Inbox, Search, Check, X, UserMinus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
    id: string; // The row UUID (we may not strictly need this anymore)
    user_id: string; // The Auth UUID 
    username: string;
    full_name: string;
}

interface Connection {
    id: string;
    requester_id: string;
    receiver_id: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    profiles: Profile; // The joined profile data
}

export default function Friends() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState('friends');
    const [loading, setLoading] = useState(true);

    // State for connections
    const [friends, setFriends] = useState<Connection[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<Connection[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<Connection[]>([]);

    // State for searching
    const [searchUsername, setSearchUsername] = useState('');
    const [searchResult, setSearchResult] = useState<Profile | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (user) {
            fetchConnections();
        }
    }, [user]);

    if (!authLoading && !user) {
        return <Navigate to="/auth" replace />;
    }

    const fetchConnections = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Fetch where user is the requester
            const { data: requestedData, error: reqError } = await supabase
                .from('connections')
                .select(`
          id, requester_id, receiver_id, status, created_at,
          profiles!connections_receiver_id_fkey(user_id, username, full_name)
        `)
                .eq('requester_id', user.id);

            if (reqError) throw reqError;

            // 2. Fetch where user is the receiver
            const { data: receivedData, error: recError } = await supabase
                .from('connections')
                .select(`
          id, requester_id, receiver_id, status, created_at,
          profiles!connections_requester_id_fkey(user_id, username, full_name)
        `)
                .eq('receiver_id', user.id);

            if (recError) throw recError;

            // Process and categorize
            const formatConnection = (conn: any): Connection => ({
                id: conn.id,
                requester_id: conn.requester_id,
                receiver_id: conn.receiver_id,
                status: conn.status,
                created_at: conn.created_at,
                profiles: conn.profiles as Profile
            });

            const allRequested = (requestedData || []).map(formatConnection);
            const allReceived = (receivedData || []).map(formatConnection);

            // Friends: Accepted connections (from both arrays)
            const accepted = [
                ...allRequested.filter(c => c.status === 'accepted'),
                ...allReceived.filter(c => c.status === 'accepted')
            ];

            // Pending Outgoing: Requested by me, still pending
            const pendingOut = allRequested.filter(c => c.status === 'pending');

            // Pending Incoming: Received by me, still pending
            const pendingIn = allReceived.filter(c => c.status === 'pending');

            setFriends(accepted);
            setOutgoingRequests(pendingOut);
            setIncomingRequests(pendingIn);

        } catch (error: any) {
            toast({ title: 'Error fetching connections', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchUsername.trim() || !user) return;

        if (searchUsername.toLowerCase() === user.user_metadata?.username?.toLowerCase()) {
            toast({ title: 'Invalid Search', description: "You cannot add yourself.", variant: 'destructive' });
            return;
        }

        setIsSearching(true);
        setSearchResult(null);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, user_id, username, full_name')
                .eq('username', searchUsername.toLowerCase())
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                toast({ title: 'Not Found', description: `No user found with username '${searchUsername}'`, variant: 'destructive' });
            } else {
                setSearchResult(data);
            }
        } catch (error: any) {
            toast({ title: 'Search Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSearching(false);
        }
    };

    const sendRequest = async (receiverId: string) => {
        if (!user) return;

        // Check if a connection already exists
        const existingConnection =
            friends.find(f => f.profiles.user_id === receiverId) ||
            outgoingRequests.find(f => f.profiles.user_id === receiverId) ||
            incomingRequests.find(f => f.profiles.user_id === receiverId);

        if (existingConnection) {
            toast({ title: 'Cannot Send', description: 'A connection with this user already exists or is pending.', variant: 'destructive' });
            return;
        }

        try {
            const { error } = await supabase
                .from('connections')
                .insert({
                    requester_id: user.id,
                    receiver_id: receiverId,
                    status: 'pending'
                });

            if (error) throw error;

            toast({ title: 'Request Sent', description: 'Friend request sent successfully!' });
            setSearchUsername('');
            setSearchResult(null);
            fetchConnections(); // refresh lists
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const updateConnectionStatus = async (connectionId: string, status: 'accepted' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('connections')
                .update({ status })
                .eq('id', connectionId);

            if (error) throw error;

            toast({ title: 'Success', description: `Friend request ${status}.` });
            fetchConnections();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const deleteConnection = async (connectionId: string) => {
        try {
            const { error } = await supabase
                .from('connections')
                .delete()
                .eq('id', connectionId);

            if (error) throw error;

            toast({ title: 'Removed', description: 'Connection removed.' });
            fetchConnections();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
            {/* Header */}
            <header className="border-b bg-card/40 backdrop-blur-xl supports-[backdrop-filter]:bg-card/40 sticky top-0 z-50 border-border/40 px-4 py-4">
                <div className="container mx-auto flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-bold">Friends</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-8">
                        <TabsTrigger value="friends" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">My Friends</span>
                            <Badge variant="secondary" className="ml-1">{friends.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="add" className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            <span className="hidden sm:inline">Add Friend</span>
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="flex items-center gap-2">
                            <Inbox className="h-4 w-4" />
                            <span className="hidden sm:inline">Requests</span>
                            {incomingRequests.length > 0 && (
                                <Badge variant="destructive" className="ml-1">{incomingRequests.length}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="friends" className="space-y-4">
                        {friends.length === 0 ? (
                            <Card className="text-center py-10 shadow-sm border-border/40 bg-card/40 backdrop-blur-xl transition-all duration-300">
                                <CardContent>
                                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                                    <p className="text-muted-foreground">You don&apos;t have any friends added yet.<br />Go to the "Add Friend" tab to connect with someone!</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {friends.map(friend => (
                                    <Card key={friend.id} className="shadow-sm border-border/40 bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-300">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-lg">{friend.profiles.full_name}</p>
                                                <p className="text-sm text-muted-foreground font-medium">@{friend.profiles.username}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0" onClick={() => deleteConnection(friend.id)}>
                                                <UserMinus className="h-5 w-5" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="add" className="space-y-6">
                        <Card className="shadow-sm border-border/60 bg-card/95">
                            <CardHeader>
                                <CardTitle>Find Friends</CardTitle>
                                <CardDescription>Search for someone using their exact `@username`.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSearch} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="e.g. john_doe"
                                            className="pl-9 bg-card"
                                            value={searchUsername}
                                            onChange={(e) => setSearchUsername(e.target.value)}
                                        />
                                    </div>
                                    <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium rounded-md" disabled={isSearching || !searchUsername.trim()}>
                                        {isSearching ? 'Searching...' : 'Search'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {searchResult && (
                            <Card className="shadow-sm border-primary/40 bg-card/95">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-lg">{searchResult.full_name}</p>
                                        <p className="text-sm text-muted-foreground font-medium">@{searchResult.username}</p>
                                    </div>
                                    <Button onClick={() => sendRequest(searchResult.user_id)} className="bg-primary hover:bg-primary/90 transition-colors shrink-0">
                                        Send Request
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* TAB: REQUESTS */}
                    <TabsContent value="requests" className="space-y-8">
                        {/* Incoming */}
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                Incoming Requests
                                <Badge variant="secondary">{incomingRequests.length}</Badge>
                            </h3>
                            {incomingRequests.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No pending incoming requests.</p>
                            ) : (
                                <div className="grid gap-3">
                                    {incomingRequests.map(req => (
                                        <Card key={req.id} className="shadow-sm border-border/40 bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-300">
                                            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-lg">{req.profiles.full_name}</p>
                                                    <p className="text-sm text-muted-foreground font-medium">@{req.profiles.username}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 transition-colors" onClick={() => updateConnectionStatus(req.id, 'accepted')}>
                                                        <Check className="h-4 w-4 mr-1" /> Accept
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="border-border text-destructive hover:bg-destructive/10 transition-colors" onClick={() => updateConnectionStatus(req.id, 'rejected')}>
                                                        <X className="h-4 w-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Outgoing */}
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                Sent Requests
                                <Badge variant="secondary">{outgoingRequests.length}</Badge>
                            </h3>
                            {outgoingRequests.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No pending outgoing requests.</p>
                            ) : (
                                <div className="grid gap-3">
                                    {outgoingRequests.map(req => (
                                        <Card key={req.id} className="shadow-sm border-border/40 bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-300">
                                            <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-lg">{req.profiles.full_name}</p>
                                                    <p className="text-sm text-muted-foreground font-medium">@{req.profiles.username}</p>
                                                </div>
                                                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 transition-colors" onClick={() => deleteConnection(req.id)}>
                                                    Cancel
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                </Tabs>
            </main>
        </div>
    );
}
