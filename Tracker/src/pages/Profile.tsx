import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LogOut, User, Mail, Calendar, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return profile?.full_name || user?.email?.split('@')[0] || 'User';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Button>
          <h1 className="text-xl font-semibold">Profile</h1>
          <div></div> {/* Spacer for centering */}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Card */}
        <Card className="shadow-elegant">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-gradient-primary text-primary-foreground">
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">{getDisplayName()}</CardTitle>
            <CardDescription>Profile Information</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* User Details */}
            <div className="space-y-4">
              {profile?.full_name && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-primary/5 border border-primary/10">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium text-lg">{profile.full_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">{formatDate(user?.created_at || '')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-success/5 border border-success/10">
                <div className="h-5 w-5 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse"></div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20 font-medium">
                    ✓ Active & Verified
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Account Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Actions</h3>
              
              <Button
                onClick={signOut}
                variant="destructive"
                size="lg"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}