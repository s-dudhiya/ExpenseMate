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
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            ExpenseMate
          </CardTitle>
          <CardDescription className="text-lg font-medium">Track Smarter</CardDescription>
          <CardDescription>
            {isRecoveryMode
              ? 'Set your new password'
              : isForgotPassword
                ? 'Reset your password'
                : isSignUp ? 'Create your account' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRecoveryMode ? (
              <>
                <div className="space-y-2 relative">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter completely new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-black"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm your new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-black"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                </div>
              </>
            ) : isForgotPassword ? (
              <div className="space-y-2">
                <Label htmlFor="forgotEmail">Email address</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
            ) : (
              <>
                {isSignUp && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          required
                          placeholder="Choose a unique username"
                          className={
                            usernameStatus === 'taken' ? 'border-destructive focus-visible:ring-destructive' :
                              usernameStatus === 'available' ? 'border-success focus-visible:ring-success' : ''
                          }
                        />
                        <div className="absolute right-3 top-2.5 flex items-center">
                          {usernameStatus === 'checking' && <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />}
                          {usernameStatus === 'available' && <Check className="h-5 w-5 text-success" />}
                          {usernameStatus === 'taken' && <X className="h-5 w-5 text-destructive" />}
                        </div>
                      </div>
                      {usernameStatus === 'taken' && username.length >= 3 && (
                        <p className="text-xs text-destructive">Username is already taken or invalid.</p>
                      )}
                      {username.length > 0 && username.length < 3 && (
                        <p className="text-xs text-muted-foreground">Username must be at least 3 characters.</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-black"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {isSignUp && (
                  <div className="space-y-2 relative">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm your password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-9 text-gray-500 hover:text-black"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                  </div>
                )}

                {!isSignUp && !isForgotPassword && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={loadingForm || (!isRecoveryMode && isSignUp && usernameStatus !== 'available')}
            >
              {loadingForm ? 'Please wait...' : isRecoveryMode ? 'Update Password' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          {!isRecoveryMode && (
            <div className="mt-4 text-center space-y-2">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Back to Sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setPasswordError('');
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
