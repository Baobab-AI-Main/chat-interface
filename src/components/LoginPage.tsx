import { useEffect, useState, type FormEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { fetchOrgOnce } from '../hooks/useOrg';
import { appConfig } from '../config';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const [orgLogo, setOrgLogo] = useState<string | null>(appConfig.brandLogoUrl || null);
  const [orgName, setOrgName] = useState<string>(appConfig.brandFallbackName);

  // Load org branding on each login page visit
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchOrgOnce();
        if (data) {
          setOrgLogo(data.org_logo);
          setOrgName(data.org_name || appConfig.brandFallbackName);
        }
      } catch (error) {
        console.error("Unable to load org branding", error);
      }
    })();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.login(email, password);
    } catch (err) {
      console.error('Login attempt failed', err);
      setError('Unable to log you in, please check with your administrator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          {orgLogo && (
            <div className="flex justify-center">
              <img src={orgLogo} alt={orgName} className="h-12" />
            </div>
          )}
          <CardTitle>Welcome to {orgName || appConfig.brandFallbackName}</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            <Button type="submit" className="w-full bg-black hover:bg-gray-800" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
