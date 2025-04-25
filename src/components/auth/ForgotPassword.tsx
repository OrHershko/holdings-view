import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Check your email for password reset instructions');
    } catch (err) {
      setError('Failed to reset password. Please check your email address.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-400 mt-2">We'll send you instructions to reset your password</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert>
            <AlertDescription className="text-green-400">{message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your.email@example.com"
              className="bg-gray-700 text-white border-gray-600"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Sending...' : 'Reset Password'}
          </Button>
        </form>

        <div className="text-center text-gray-400 text-sm flex flex-col gap-2">
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Back to Login
          </Link>
          <span>
            Need an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300">
              Sign Up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
