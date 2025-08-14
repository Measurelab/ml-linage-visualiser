import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';

interface DevLoginProps {
  onLogin: () => void;
}

const DevLogin: React.FC<DevLoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Get password from environment variable, fallback to default for local dev
  const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD || 'measurelab2024';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === DEV_PASSWORD) {
      // Store auth in localStorage
      localStorage.setItem('devAuth', 'true');
      onLogin();
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">BigQuery Lineage Visualizer</CardTitle>
          <CardDescription>Development Environment</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter dev password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Access Application
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            For development use only
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevLogin;