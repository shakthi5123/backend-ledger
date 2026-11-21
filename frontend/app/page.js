'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const iconPaths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="2.5"/><path d="M3 8h18M16 14h2"/><path d="M6 5V4a2 2 0 0 1 2-2h10"/></>,
  arrow: <><path d="M7 7h13v13"/><path d="M20 7 4 23"/><path d="M17 3h4v4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/></>,
  spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 14 1.1 2.1L22 17l-1.9.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  arrowDown: <><path d="M12 4v16M18 14l-6 6-6-6"/></>,
  arrowUp: <><path d="M12 20V4M6 10l6-6 6 6"/></>,
}

function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  let data = {}
  try { data = await response.json() } catch {}
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`)
  return data
}

function formatMoney(value, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function initials(name = 'Member') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'M'
}

function Field({ label, hint, children }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>
}

function Notice({ notice, onClose }) {
  if (!notice) return null
  return <div className={`notice ${notice.type}`} role="status"><span className="notice-mark">{notice.type === 'error' ? '!' : '✓'}</span><span>{notice.message}</span><button className="notice-close" onClick={onClose} aria-label="Dismiss message"><Icon name="close" size={16}/></button></div>
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const result = await api(path, { method: 'POST', body: values })
      onAuthenticated(result.user)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <main className="auth-page">
    <section className="auth-story">
      <div className="brand brand-light"><span className="brand-mark">L</span><span>ledger<span className="brand-period">.</span></span></div>
      <div className="story-copy"><span className="eyebrow light-eyebrow">MONEY, IN GOOD ORDER</span><h1>A clearer view<br/>of what’s yours.</h1><p>Your accounts and transfers, brought together in one quiet, considered space.</p></div>
      <div className="story-foot"><span><Icon name="shield" size={17}/> Private by design</span><span>01 / 03</span></div>
      <div className="story-orbit orbit-one"/><div className="story-orbit orbit-two"/>
    </section>
    <section className="auth-form-wrap">
      <div className="auth-mobile-brand brand"><span className="brand-mark">L</span><span>ledger<span className="brand-period">.</span></span></div>
      <div className="auth-form-card">
        <span className="eyebrow">YOUR FINANCIAL HOME</span>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="muted">{mode === 'login' ? 'Sign in to see your accounts and activity.' : 'A few details and you’re ready to begin.'}</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <form onSubmit={submit} className="stack-form">
          {mode === 'register' && <Field label="Your name"><input autoComplete="name" required value={values.name} onChange={e=>setValues({...values,name:e.target.value})} placeholder="Full name"/></Field>}
          <Field label="Email address"><input type="email" autoComplete="email" required value={values.email} onChange={e=>setValues({...values,email:e.target.value})} placeholder="you@example.com"/></Field>
          <Field label="Password"><input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={6} required value={values.password} onChange={e=>setValues({...values,password:e.target.value})} placeholder="At least 6 characters"/></Field>
          <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<Icon name="chevron" size={17}/></button>
        </form>
        <p className="auth-switch">{mode === 'login' ? 'New to Ledger?' : 'Already have an account?'} <button onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'Create an account':'Sign in'}</button></p>
        <p className="auth-legal">By continuing, you agree to keep your sign-in details secure.</p>
      </div>
    </section>
  </main>
}

function Sidebar({ active, setActive, user, onLogout, open, setOpen }) {
  const links = [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'accounts', label: 'My accounts', icon: 'wallet' },
    { id: 'transfer', label: 'Send money', icon: 'arrow' },
    { id: 'funding', label: 'System funding', icon: 'spark' },
  ]
  return <>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
    <aside className={`sidebar ${open?'sidebar-open':''}`}>
      <div className="sidebar-top"><div className="brand"><span className="brand-mark">L</span><span>ledger<span className="brand-period">.</span></span></div><button className="mobile-close" aria-label="Close menu" onClick={()=>setOpen(false)}><Icon name="close"/></button></div>
      <span className="nav-caption">WORKSPACE</span>
      <nav className="side-nav" aria-label="Main navigation">{links.map(item=><button key={item.id} onClick={()=>{setActive(item.id);setOpen(false)}} className={`nav-link ${active===item.id?'active':''}`}><Icon name={item.icon}/><span>{item.label}</span>{item.id==='funding'&&<span className="nav-badge">SYS</span>}</button>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="support-card"><div className="support-icon"><Icon name="shield" size={18}/></div><strong>Security first</strong><p>Your password is protected and your session is private.</p></div>
      <div className="sidebar-user"><div className="avatar">{initials(user?.name)}</div><div className="user-meta"><strong>{user?.name || 'Member'}</strong><span>{user?.email}</span></div><button className="logout-icon" onClick={onLogout} aria-label="Sign out" title="Sign out"><Icon name="logout" size={17}/></button></div>
    </aside>
  </>
}

function AccountCard({ account, index, onCopy, copied }) {
  const tones = ['green', 'sand', 'blue', 'rose']
  const tone = tones[index % tones.length]
  const id = String(account._id || '')
  return <article className={`account-card account-${tone}`}>
    <div className="account-card-top"><div className="account-symbol"><Icon name="wallet" size={19}/></div><span className="status-pill"><i/>Active</span></div>
    <div className="account-balance-label">AVAILABLE BALANCE</div>
    <div className="account-balance">{account.balance == null ? '—' : formatMoney(account.balance, account.currency)}</div>
    <div className="account-card-bottom"><div><span className="account-small-label">ACCOUNT ID</span><span className="account-id">{id ? `•••• ${id.slice(-8)}` : 'Unavailable'}</span></div><button className="copy-button" onClick={()=>onCopy(id)} title="Copy account ID" aria-label="Copy account ID"><Icon name={copied===id?'check':'copy'} size={16}/></button></div>
  </article>
}

function AccountRows({ accounts, onCopy, copied }) {
  if (!accounts.length) return <div className="empty-state"><div className="empty-icon"><Icon name="wallet" size={23}/></div><strong>No accounts yet</strong><p>Create an account to start managing your money.</p></div>
  return <div className="account-list">{accounts.map((account,index)=><div className="account-row" key={account._id}><div className={`row-icon row-tone-${index%4}`}><Icon name="wallet" size={18}/></div><div className="account-row-name"><strong>Everyday account</strong><span>{account.currency || 'INR'} · ID ending {String(account._id).slice(-6)}</span></div><div className="account-row-balance">{account.balance==null?'—':formatMoney(account.balance,account.currency)}</div><span className="row-active"><i/>Active</span><button className="icon-button" onClick={()=>onCopy(account._id)} aria-label="Copy account ID"><Icon name={copied===account._id?'check':'copy'} size={17}/></button></div>)}</div>
}

function Dashboard({ user, accounts, active, setActive, onReload, onLogout, onNotice, loading }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')
  const [activity, setActivity] = useState([])
  const [transfer, setTransfer] = useState({fromAccount:'',toAccount:'',amount:''})
  const [funding, setFunding] = useState({toAccount:'',amount:''})
  const [mobileNav, setMobileNav] = useState(false)
  const total = useMemo(()=>accounts.reduce((sum,a)=>sum+(Number(a.balance)||0),0),[accounts])
  const activeAccountCount = accounts.filter(a=>a.status==='ACTIVE').length
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'
  const selectedTitle = {overview:'Overview',accounts:'Your accounts',transfer:'Send money',funding:'System funding'}[active]
  const copyAccount = async (id) => { try { await navigator.clipboard.writeText(id); setCopied(id); setTimeout(()=>setCopied(''),1800); onNotice({type:'success',message:'Account ID copied to clipboard.'}) } catch { onNotice({type:'error',message:'Could not copy the account ID.'}) } }
  const submitTransfer = async (event) => {
    event.preventDefault(); setBusy(true)
    try {
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const result = await api('/api/transactions',{method:'POST',body:{...transfer,amount:Number(transfer.amount),idempotencyKey}})
      setActivity(prev=>[{id:result.transaction?._id || idempotencyKey,title:'Transfer sent',description:`To account · ${transfer.toAccount.slice(-8)}`,amount:Number(transfer.amount),time:new Date()},...prev].slice(0,4))
      onNotice({type:'success',message:'Your transfer was completed.'}); setTransfer({...transfer,amount:''}); await onReload(); setActive('overview')
    } catch(error) { onNotice({type:'error',message:error.message}) } finally { setBusy(false) }
  }
  const submitFunding = async (event) => {
    event.preventDefault(); setBusy(true)
    try {
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `fund-${Date.now()}-${Math.random().toString(36).slice(2)}`
      await api('/api/transactions/system/initial-funds',{method:'POST',body:{...funding,amount:Number(funding.amount),idempotencyKey}})
      onNotice({type:'success',message:'Initial funds were added.'}); setFunding({toAccount:'',amount:''}); await onReload(); setActive('overview')
    } catch(error) { onNotice({type:'error',message:error.message}) } finally { setBusy(false) }
  }
  const addAccount = async () => {
    setBusy(true)
    try { await api('/api/accounts',{method:'POST',body:{}}); await onReload(); onNotice({type:'success',message:'Your new account is ready.'}) }
    catch(error) { onNotice({type:'error',message:error.message}) } finally { setBusy(false) }
  }
  const showTransfer = () => { setActive('transfer'); if(!transfer.fromAccount && accounts[0])setTransfer(v=>({...v,fromAccount:accounts[0]._id})) }
  return <div className="app-shell">
    <Sidebar active={active} setActive={setActive} user={user} onLogout={onLogout} open={mobileNav} setOpen={setMobileNav}/>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open navigation"><Icon name="menu"/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{selectedTitle}</strong></div><div className="topbar-right"><div className="secure-label"><Icon name="shield" size={16}/> Secure session</div><div className="top-avatar">{initials(user?.name)}</div></div></header>
      <div className="content-wrap">
        <div className="page-heading"><div><span className="eyebrow">SATURDAY, NOVEMBER 21</span><h1>{active==='overview'?`Good day, ${firstName}.`:selectedTitle}</h1><p>{active==='overview'?'Here’s where things stand with your money.':active==='accounts'?'A simple view of every account you hold.':active==='transfer'?'Move money securely between accounts.':'A privileged operation for system users only.'}</p></div>{active==='overview'&&<button className="button button-dark" onClick={showTransfer}><Icon name="arrow" size={17}/> Send money</button>}</div>
        {active==='overview'&&<>
          <section className="overview-grid">
            <div className="balance-panel"><div className="balance-panel-head"><div><span className="panel-kicker">TOTAL AVAILABLE BALANCE</span><span className="balance-total">{formatMoney(total)}</span></div><div className="balance-ring"><span>₹</span></div></div><div className="balance-panel-foot"><span><span className="balance-dot"/>Across {accounts.length} {accounts.length===1?'account':'accounts'}</span><button className="panel-link" onClick={()=>setActive('accounts')}>View accounts <Icon name="chevron" size={15}/></button></div><div className="balance-wave wave-one"/><div className="balance-wave wave-two"/></div>
            <div className="metric-panel"><div className="metric-head"><span className="metric-icon"><Icon name="wallet" size={18}/></span><span className="metric-caption">ACCOUNTS</span></div><strong>{String(accounts.length).padStart(2,'0')}</strong><span className="metric-sub">{activeAccountCount} active · {accounts.length-activeAccountCount} inactive</span><div className="metric-line"><i style={{width:accounts.length?`${Math.max(12,Math.min(100,activeAccountCount/accounts.length*100))}%`:'0%'}}/></div></div>
            <div className="metric-panel metric-panel-light"><div className="metric-head"><span className="metric-icon metric-icon-light"><Icon name="clock" size={18}/></span><span className="metric-caption">THIS SESSION</span></div><strong>{String(activity.length).padStart(2,'0')}</strong><span className="metric-sub">{activity.length===1?'transfer':'transfers'} completed here</span><span className="metric-note"><Icon name="spark" size={14}/> Your latest actions</span></div>
          </section>
          <section className="section-block"><div className="section-heading"><div><span className="eyebrow">YOUR MONEY</span><h2>Accounts at a glance</h2></div><button className="text-button" onClick={()=>setActive('accounts')}>All accounts <Icon name="chevron" size={15}/></button></div>
            {loading?<div className="loading-cards"><div/><div/><div/></div>:accounts.length?<div className="account-cards">{accounts.slice(0,3).map((account,index)=><AccountCard key={account._id} account={account} index={index} onCopy={copyAccount} copied={copied}/>)}</div>:<div className="empty-inline"><span className="empty-icon"><Icon name="wallet"/></span><div><strong>Your accounts start here</strong><p>Create your first account to see its balance.</p></div><button className="button button-outline" onClick={addAccount} disabled={busy}><Icon name="plus" size={17}/> Create account</button></div>}
          </section>
          <section className="section-block lower-grid"><div className="activity-panel"><div className="section-heading compact"><div><span className="eyebrow">RECENT ACTIONS</span><h2>Activity</h2></div><span className="session-tag">This session</span></div>{activity.length?<div className="activity-list">{activity.map(item=><div className="activity-item" key={item.id}><div className="activity-icon"><Icon name="arrowUp" size={17}/></div><div className="activity-copy"><strong>{item.title}</strong><span>{item.description} · {item.time.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div><span className="activity-amount">−{formatMoney(item.amount)}</span></div>)}</div>:<div className="activity-empty"><div className="activity-empty-line"/><span>Transfers you make in this session will appear here.</span></div>}</div>
            <div className="shortcut-panel"><div className="shortcut-top"><span className="shortcut-icon"><Icon name="spark" size={18}/></span><span className="eyebrow">A GOOD NEXT STEP</span></div><h3>Keep your accounts<br/>in sync.</h3><p>Check your balances before your next transfer.</p><button className="shortcut-action" onClick={()=>setActive('accounts')}>Review accounts <Icon name="chevron" size={16}/></button><div className="shortcut-decoration">L</div></div></section>
        </>}
        {active==='accounts'&&<section className="section-block accounts-page"><div className="accounts-toolbar"><div><h2>Your accounts</h2><p>{accounts.length} {accounts.length===1?'account':'accounts'} · Default currency INR</p></div><button className="button button-dark" onClick={addAccount} disabled={busy}><Icon name="plus" size={17}/>{busy?'Creating…':'New account'}</button></div><div className="account-table"><div className="table-head"><span>ACCOUNT</span><span>STATUS</span><span>AVAILABLE BALANCE</span><span>ACCOUNT ID</span><span/></div>{loading?<div className="loading-rows"><i/><i/><i/></div>:<AccountRows accounts={accounts} onCopy={copyAccount} copied={copied}/>}</div><div className="table-foot"><Icon name="shield" size={15}/> You can only view balances for accounts associated with your profile.</div></section>}
        {active==='transfer'&&<section className="form-page-grid"><div className="form-panel"><div className="form-panel-head"><div className="form-icon"><Icon name="arrow" size={20}/></div><div><span className="eyebrow">ACCOUNT TO ACCOUNT</span><h2>Send money</h2></div></div><p className="form-intro">Transfers are recorded securely in your ledger and update both account balances together.</p><form className="stack-form" onSubmit={submitTransfer}>
          <Field label="From account">{accounts.length?<select required value={transfer.fromAccount} onChange={e=>setTransfer({...transfer,fromAccount:e.target.value})}><option value="">Choose an account</option>{accounts.map(a=><option key={a._id} value={a._id}>{a.currency||'INR'} ·•••• {String(a._id).slice(-8)} · {formatMoney(a.balance,a.currency)}</option>)}</select>:<input disabled placeholder="Create an account first"/>}</Field>
          <Field label="Recipient account ID" hint="Ask the recipient to share their account ID with you."><input required value={transfer.toAccount} onChange={e=>setTransfer({...transfer,toAccount:e.target.value.trim()})} placeholder="Paste account ID"/></Field>
          <Field label="Amount" hint="Enter an amount greater than zero."><div className="amount-input"><span>₹</span><input type="number" min="0.01" step="0.01" required value={transfer.amount} onChange={e=>setTransfer({...transfer,amount:e.target.value})} placeholder="0.00"/></div></Field>
          <div className="transfer-note"><Icon name="shield" size={17}/><span>We’ll verify your available balance and record the transfer as one secure operation.</span></div>
          <button className="button button-primary button-wide" disabled={busy||!accounts.length}>{busy?'Processing…':'Review and send'}<Icon name="chevron" size={17}/></button>
        </form></div><aside className="side-note"><span className="eyebrow">BEFORE YOU SEND</span><h3>A few things<br/>to keep in mind.</h3><ul><li><span>01</span><p>Double-check the recipient’s account ID.</p></li><li><span>02</span><p>Make sure the account has enough available funds.</p></li><li><span>03</span><p>Completed transfers are recorded in your ledger.</p></li></ul><div className="note-foot"><Icon name="shield" size={16}/> Your session is encrypted and private.</div></aside></section>}
        {active==='funding'&&<section className="form-page-grid"><div className="form-panel"><div className="form-panel-head"><div className="form-icon form-icon-gold"><Icon name="spark" size={20}/></div><div><span className="eyebrow">SYSTEM OPERATION</span><h2>Initial funding</h2></div></div><p className="form-intro">This endpoint is reserved for system users. Requests are checked by the backend before any funds move.</p><form className="stack-form" onSubmit={submitFunding}><Field label="Destination account ID"><input required value={funding.toAccount} onChange={e=>setFunding({...funding,toAccount:e.target.value.trim()})} placeholder="Paste destination account ID"/></Field><Field label="Amount"><div className="amount-input"><span>₹</span><input type="number" min="0.01" step="0.01" required value={funding.amount} onChange={e=>setFunding({...funding,amount:e.target.value})} placeholder="0.00"/></div></Field><div className="transfer-note"><Icon name="shield" size={17}/><span>Only a verified system user can complete an initial funding transaction.</span></div><button className="button button-dark button-wide" disabled={busy}>{busy?'Processing…':'Add initial funds'}<Icon name="chevron" size={17}/></button></form></div><aside className="side-note side-note-gold"><span className="eyebrow">CONTROLLED ACCESS</span><h3>Every entry<br/>has a record.</h3><p>Initial funding uses the system account and is written to the same double-entry ledger as a standard transfer.</p><div className="note-foot"><Icon name="shield" size={16}/> Authorization is enforced by your backend.</div></aside></section>}
      </div>
      <footer className="app-footer"><span>LEDGER <span className="brand-period">·</span> A clear view of your money</span><span>Private by design</span></footer>
    </main>
  </div>
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [active, setActive] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [noticeId, setNoticeId] = useState(0)
  const showNotice = useCallback((value) => { setNotice(value); setNoticeId(v=>v+1) },[])
  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api('/api/accounts')
      const withBalances = await Promise.all((result.accounts || []).map(async account => {
        try { const data = await api(`/api/accounts/${account._id}/balance`); return {...account,balance:data.balance} }
        catch { return {...account,balance:null} }
      }))
      setAccounts(withBalances); return true
    } catch (error) {
      if (/login|token|unauthor/i.test(error.message)) { setUser(null); sessionStorage.removeItem('ledger-user') }
      else showNotice({type:'error',message:error.message})
      setAccounts([]); return false
    } finally { setLoading(false) }
  },[showNotice])
  useEffect(() => {
    let alive = true
    const boot = async () => {
      let stored = null
      try { stored = JSON.parse(sessionStorage.getItem('ledger-user') || 'null') } catch {}
      const ok = await loadAccounts()
      if (!alive) return
      if (ok) setUser(stored || {name:'Welcome back',email:''})
      else setLoading(false)
    }
    boot()
    return ()=>{alive=false}
  },[loadAccounts])
  useEffect(()=>{if(notice){const timer=setTimeout(()=>setNotice(null),4800);return()=>clearTimeout(timer)}},[noticeId,notice])
  const authenticated = useCallback((profile) => { sessionStorage.setItem('ledger-user',JSON.stringify(profile)); setUser(profile); loadAccounts() },[loadAccounts])
  const logout = useCallback(async () => { try { await api('/api/auth/logout',{method:'POST'}) } catch {} sessionStorage.removeItem('ledger-user'); setUser(null); setAccounts([]); setActive('overview') },[])
  if (loading && !user) return <main className="boot-screen"><div className="boot-brand"><span className="brand-mark">L</span> ledger</div><div className="boot-loader"/><span>Opening your workspace…</span></main>
  return <>{user?<Dashboard user={user} accounts={accounts} active={active} setActive={setActive} onReload={loadAccounts} onLogout={logout} onNotice={showNotice} loading={loading}/>:<AuthScreen onAuthenticated={authenticated}/>}<Notice key={noticeId} notice={notice} onClose={()=>setNotice(null)}/></>
}
