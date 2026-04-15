import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    let hasError = false;
    try {
      const success = await login(username, password, rememberMe);
      if (!success) {
        setError('Invalid username or password');
        hasError = true;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred during login');
      hasError = true;
    } finally {
      // If there was an error, clear the loading state so the user can try again.
      // If success, keep loading spinner active until unmounted by auth state change.
      if (hasError) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'hsl(222 30% 8%)' }}>
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full opacity-[0.12]" style={{ background: 'radial-gradient(circle, hsl(220 65% 50%), transparent 70%)' }} />
        <div className="absolute -bottom-[30%] -right-[15%] w-[60%] h-[60%] rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, hsl(260 55% 50%), transparent 70%)' }} />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, hsl(200 60% 50%), transparent 70%)' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(hsl(220 20% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(220 20% 50%) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px] mx-4"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, hsla(220, 65%, 50%, 0.8), hsla(220, 65%, 62%, 0.8))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <Zap className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Plant Motor Management
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'hsl(220 15% 55%)' }}>
            Sign in to your account
          </p>
        </div>

        {/* Glass Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium" style={{ color: 'hsl(220 15% 55%)' }}>Username</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="h-11 rounded-xl border text-white placeholder:text-white/20 focus-visible:ring-1"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium" style={{ color: 'hsl(220 15% 55%)' }}>Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-11 rounded-xl border text-white placeholder:text-white/20 focus-visible:ring-1 pr-10"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'hsl(220 15% 40%)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="border-white/20 data-[state=checked]:bg-[hsl(220,65%,50%)] data-[state=checked]:border-[hsl(220,65%,50%)]"
              />
              <Label htmlFor="rememberMe" className="text-xs cursor-pointer" style={{ color: 'hsl(220 15% 55%)' }}>
                Remember me
              </Label>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400 px-3.5 py-2.5 rounded-xl border"
                style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)', backdropFilter: 'blur(8px)' }}
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-medium text-sm rounded-xl text-white border-0 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, hsla(220, 65%, 44%, 0.9), hsla(220, 65%, 56%, 0.9))', backdropFilter: 'blur(8px)' }}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: 'hsl(220 15% 30%)' }}>
          Paper Mills Electrical Dept © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
