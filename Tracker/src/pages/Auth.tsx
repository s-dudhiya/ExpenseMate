import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";

import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [loadingForm, setLoadingForm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const location = useLocation();
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    return location.hash.includes('type=recovery') || location.search.includes('reset=true') || window.location.href.includes('type=recovery');
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const { user, signIn, signUp, resetPassword, updatePassword, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (location.hash.includes('type=recovery') || location.search.includes('reset=true') || window.location.href.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }
  }, [location.hash, location.search]);

  useEffect(() => {
    if (!isSignUp || username.length < 3) {
      setUsernameStatus(username.length > 0 ? 'taken' : 'idle');
      return;
    }

    const checkUsername = async () => {
      setUsernameStatus('checking');
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (error || data) {
        setUsernameStatus('taken');
      } else {
        setUsernameStatus('available');
      }
    };

    const debounceTimer = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [username, isSignUp]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (isRecoveryMode && !user) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elegant text-center">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-destructive">Invalid or Expired Link</CardTitle>
            <CardDescription>
              We couldn't verify your recovery session. The link might have expired or was incorrectly copied.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setIsRecoveryMode(false);
                navigate('/auth', { replace: true });
              }}
              className="w-full"
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && !isRecoveryMode) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (isRecoveryMode) {
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }
      setLoadingForm(true);
      const { error } = await updatePassword(password);
      setLoadingForm(false);
      if (!error) {
        setIsRecoveryMode(false);
        // Clear history to prevent getting stuck in recovery mode upon reload
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/dashboard');
      }
      return;
    }

    if (isForgotPassword) {
      setLoadingForm(true);
      await resetPassword(forgotEmail);
      setLoadingForm(false);
      setIsForgotPassword(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (isSignUp && usernameStatus !== 'available') {
      setPasswordError('Please choose a valid & unique username.');
      return;
    }

    setLoadingForm(true);

    if (isSignUp) {
      await signUp(email, password, fullName, username);
    } else {
      await signIn(email, password);
    }

    setLoadingForm(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left side: Branding / Immersive (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-primary p-12 flex-col justify-between relative overflow-hidden">
        {/* Abstract ambient shapes */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-black/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-primary-foreground tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-primary rounded-sm" />
            </div>
            ExpenseMate
          </h1>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-5xl font-black text-primary-foreground leading-[1.1] tracking-tighter mb-6">
            Master your money seamlessly.
          </h2>
          <p className="text-lg text-primary-foreground/80 font-medium leading-relaxed">
            Track daily expenses, split bills with friends instantly, and achieve financial clarity in one beautifully simple space.
          </p>
        </div>
      </div>

      {/* Right side: Clean Form Area */}
      <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 sm:p-12 relative bg-background">
        <div className="w-full max-w-[400px] space-y-8 relative z-10">

          {/* Mobile Header (Hidden on desktop) */}
          <div className="md:hidden mb-12 flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <div className="w-4 h-4 bg-white rounded-sm" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              ExpenseMate
            </h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {isRecoveryMode
                ? 'Reset Password'
                : isForgotPassword
                  ? 'Forgot Password'
                  : isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-muted-foreground font-medium text-base">
              {isRecoveryMode
                ? 'Enter your new password below.'
                : isForgotPassword
                  ? 'We will send you a reset link.'
                  : isSignUp ? 'Sign up to get started immediately.' : 'Enter your details to access your dashboard.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRecoveryMode ? (
              <>
                <div className="space-y-1.5 relative">
                  <Label htmlFor="password" className="text-sm font-semibold">New Password</Label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter completely new password"
                    minLength={6}
                    className="h-12 bg-muted/50 border-border hover:bg-muted/80 focus-visible:bg-background transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="space-y-1.5 relative">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm your new password"
                    minLength={6}
                    className="h-12 bg-muted/50 border-border hover:bg-muted/80 focus-visible:bg-background transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {passwordError && <p className="text-sm text-destructive font-medium mt-1">{passwordError}</p>}
                </div>
              </>
            ) : isForgotPassword ? (
              <div className="space-y-1.5">
                <Label htmlFor="forgotEmail" className="text-sm font-semibold">Email address</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="h-12 bg-muted/50 border-border hover:bg-muted/80 focus-visible:bg-background transition-all"
                />
              </div>
            ) : (
              <>
                {isSignUp && (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-sm font-semibold">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="e.g. Jane Doe"
                        className="h-12 bg-muted/50 border-border hover:bg-muted/80 focus-visible:bg-background transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
                      <div className="relative">
                        <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          required
                          placeholder="Choose a unique username"
                          className={`h-12 bg-muted/50 border-border hover:bg-muted/80 focus-visible:bg-background transition-all pr-10 ${usernameStatus === 'taken' ? 'border-destructive focus-visible:ring-destructive' :
                              usernameStatus === 'available' ? 'border-success focus-visible:ring-success' : ''
                            }`}
                        />
                        <div className="absolute right-3 top-3.5 flex items-center">
                          {usernameStatus === 'checking' && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                          {usernameStatus === 'available' && <Check className="h-5 w-5 text-success" />}
                          {usernameStatus === 'taken' && <X className="h-5 w-5 text-destructive" />}
                        </div>
                      </div>
                      {usernameStatus === 'taken' && username.length >= 3 && (
                        <p className="text-xs font-medium text-destructive mt-1">Username is already taken.</p>
                      )}
                      {username.length > 0 && username.length < 3 && (
                        <p className="text-xs font-medium text-muted-foreground mt-1">Username must be at least 3 characters.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="h-12 bg-muted/50 border-border hover:bg-muted/80 focus-visible:bg-background transition-all"
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                    {!isSignUp && !isForgotPassword && (
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      minLength={6}
                      className="h-12 bg-muted/50 border-border hover:bg-muted/80 focus-visible:bg-background transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-1.5 relative">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm your password"
                        minLength={6}
                        className="h-12 bg-muted/50 border-border hover:bg-muted/80 focus-visible:bg-background transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordError && <p className="text-sm font-medium text-destructive mt-1">{passwordError}</p>}
                  </div>
                )}
              </>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-14 rounded-xl text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 mt-8"
              disabled={loadingForm || (!isRecoveryMode && isSignUp && usernameStatus !== 'available')}
            >
              {loadingForm ? (
                <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Processing...</span>
              ) : isRecoveryMode ? 'Update Password' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          {!isRecoveryMode && (
            <div className="pt-2 text-center">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Sign In
                </button>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setPasswordError('');
                    }}
                    className="text-primary hover:text-primary/80 font-bold transition-colors"
                  >
                    {isSignUp ? 'Sign in' : "Sign up"}
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
