import React, { useState } from 'react';
import { authAPI } from '../api';
import { useAuth } from '../AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await authAPI.login({ email: form.email, password: form.password })
        : await authAPI.register(form);
      login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      {/* Left branding panel */}
      <div style={s.left}>
        <div style={s.leftInner}>
          <div style={s.brand}>
            <div style={s.brandMark}>⛏</div>
            <span style={s.brandName}>CryptoMine Pro</span>
          </div>
          <h1 style={s.headline}>Mine smarter.<br />Win bigger.</h1>
          <p style={s.sub}>Professional-grade mining platform with automated jackpot detection and real-time earnings tracking.</p>
          <div style={s.features}>
            {[
              'Automated jackpot rewards up to $500,000',
              'Real-time hash rate monitoring',
              'Instant support via live chat',
              'Secure wallet integration',
            ].map((f, i) => (
              <div key={i} style={s.feature}>
                <div style={s.checkmark}>✓</div>
                <span>{f}</span>
              </div>
            ))}
          </div>
          <div style={s.statsRow}>
            <div style={s.stat}><div style={s.statNum}>$2.4M+</div><div style={s.statLabel}>Paid Out</div></div>
            <div style={s.statDiv} />
            <div style={s.stat}><div style={s.statNum}>12,400+</div><div style={s.statLabel}>Active Miners</div></div>
            <div style={s.statDiv} />
            <div style={s.stat}><div style={s.statNum}>99.9%</div><div style={s.statLabel}>Uptime</div></div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={s.right}>
        <div style={s.card}>
          <div style={s.cardTop}>
            <h2 style={s.cardTitle}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <p style={s.cardSub}>{mode === 'login' ? 'Sign in to your dashboard' : 'Start mining in minutes'}</p>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={s.form}>
            {mode === 'register' && (
              <div style={s.field}>
                <label style={s.label}>Username</label>
                <input style={s.input} placeholder="johndoe" value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })} required />
              </div>
            )}
            <div style={s.field}>
              <label style={s.label}>Email address</label>
              <input style={s.input} type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button style={{ ...s.btn, opacity: loading ? 0.75 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={s.divider}><span style={s.dividerText}>or</span></div>
          <p style={s.toggle}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span style={s.link} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </span>
          </p>
        </div>
        <p style={s.legal}>By continuing, you agree to our Terms of Service and Privacy Policy.</p>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input:focus { outline: none; border-color: #C9A84C !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.14) !important; }
        input::placeholder { color: #b0b8c4; }
        .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,168,76,0.4) !important; }
      `}</style>
    </div>
  );
}

const s = {
  root: { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: '#f7f5f0' },
  left: {
    flex: 1,
    background: 'linear-gradient(155deg, #0B1F3A 0%, #122d52 65%, #0d2044 100%)',
    padding: '64px 60px',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  leftInner: { maxWidth: '460px', position: 'relative', zIndex: 1 },
  brand: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '60px' },
  brandMark: { width: '42px', height: '42px', background: 'rgba(201,168,76,0.18)', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1px solid rgba(201,168,76,0.35)' },
  brandName: { color: '#fff', fontSize: '20px', fontWeight: '600', letterSpacing: '-0.2px' },
  headline: { color: '#fff', fontSize: '46px', fontWeight: '700', lineHeight: '1.15', letterSpacing: '-1px', marginBottom: '18px' },
  sub: { color: 'rgba(255,255,255,0.52)', fontSize: '16px', lineHeight: '1.75', marginBottom: '40px' },
  features: { display: 'flex', flexDirection: 'column', gap: '13px', marginBottom: '48px' },
  feature: { display: 'flex', alignItems: 'center', gap: '13px', color: 'rgba(255,255,255,0.78)', fontSize: '15px' },
  checkmark: { width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  statsRow: { display: 'flex', alignItems: 'center', gap: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '20px 28px', border: '1px solid rgba(255,255,255,0.08)' },
  stat: { textAlign: 'center' },
  statNum: { color: '#C9A84C', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '3px', letterSpacing: '0.5px', textTransform: 'uppercase' },
  statDiv: { width: '1px', height: '36px', background: 'rgba(255,255,255,0.12)' },
  right: { width: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 52px' },
  card: { width: '100%', background: '#fff', borderRadius: '22px', padding: '44px', boxShadow: '0 4px 40px rgba(11,31,58,0.09)', border: '1px solid #ece8e0' },
  cardTop: { marginBottom: '30px' },
  cardTitle: { color: '#0B1F3A', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '6px' },
  cardSub: { color: '#8c96a6', fontSize: '15px' },
  error: { background: '#fff5f5', border: '1px solid #f5c6cb', borderRadius: '10px', padding: '12px 16px', color: '#c0392b', fontSize: '14px', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: { color: '#3a4a5c', fontSize: '13px', fontWeight: '600', letterSpacing: '0.3px' },
  input: { border: '1.5px solid #e4dfd5', borderRadius: '11px', padding: '13px 16px', fontSize: '15px', color: '#0B1F3A', background: '#fdfcfa', transition: 'all 0.2s', width: '100%', fontFamily: 'inherit' },
  btn: { background: 'linear-gradient(135deg, #b8922e 0%, #d4a93c 40%, #e8c96a 70%, #C9A84C 100%)', border: 'none', borderRadius: '12px', padding: '15px', color: '#0B1F3A', fontSize: '15px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.1px', marginTop: '6px', boxShadow: '0 4px 16px rgba(201,168,76,0.3)', transition: 'all 0.2s' },
  divider: { margin: '26px 0 20px', textAlign: 'center', position: 'relative', borderTop: '1px solid #ece8e0' },
  dividerText: { background: '#fff', padding: '0 14px', color: '#b0b8c4', fontSize: '13px', position: 'relative', top: '-10px' },
  toggle: { color: '#6b7685', fontSize: '14px', textAlign: 'center' },
  link: { color: '#C9A84C', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' },
  legal: { color: '#b0b8c4', fontSize: '12px', textAlign: 'center', marginTop: '24px', lineHeight: '1.6' },
};
