import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Login to FinVest</h1>
          <p className="text-gray-400 mt-2">Access your investment portfolio</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
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

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                Forgot Password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="bg-gray-700 text-white border-gray-600"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center text-gray-400 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
