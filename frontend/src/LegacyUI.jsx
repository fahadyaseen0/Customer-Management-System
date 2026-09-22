import { useState } from "react";
import { Users, ShieldCheck, Search, AlertCircle, LoaderCircle, X } from "lucide-react";
import { api } from "./api";
function Modal({ title, subtitle, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true">
      <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></header>
      {children}
    </section>
  </div>;
}


function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError("");
    try { const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ ...form, adminMode }) }); onLogin(data); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  return <main className="login-page">
    <section className="login-brand"><div className="brand-mark"><Users /></div>
      <span className="eyebrow">CUSTOMER MANAGEMENT</span><h1>Keep every customer<br/>record within reach.</h1>
      <p>Secure records, fast search, document sharing and a clear trail of who saved what.</p>
      <div className="feature-pills"><span><ShieldCheck /> Role-based access</span><span><Search /> Instant search</span></div>
    </section>
    <section className="login-card">
      <div className="login-logo"><div className="mini-mark"><Users /></div><b>Customer<span>Hub</span></b></div>
      <div className="mode-switch"><button type="button" className={!adminMode ? "active" : ""} onClick={() => setAdminMode(false)}>User Sign In</button>
        <button type="button" className={adminMode ? "active" : ""} onClick={() => setAdminMode(true)}><ShieldCheck /> Admin</button></div>
      <h2>{adminMode ? "Admin access" : "Welcome back"}</h2>
      <p className="muted">Enter your registered Gmail and password.</p>
      <form onSubmit={submit} className="form-stack">
        <label>Email address<input type="email" required autoComplete="email" placeholder="name@gmail.com" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>
        <label>Password<input type="password" required autoComplete="current-password" placeholder="At least 8 characters" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}/></label>
        {error && <div className="inline-error"><AlertCircle />{error}</div>}
        <button className="primary full" disabled={loading}>{loading && <LoaderCircle className="spin" />}{adminMode ? "Sign in as Admin" : "Sign In"}</button>
      </form><p className="login-help">Account inactive or unable to sign in? Contact your administrator.</p>
    </section>
  </main>;
}


function CreateUser({onClose,onCreated}) { const [form,setForm]=useState({name:"",email:"",whatsapp:"",password:"",role:"user"});const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  const submit=async(e)=>{e.preventDefault();setLoading(true);setError("");try{const data=await api("/users",{method:"POST",body:JSON.stringify(form)});onCreated(data.user);}catch(err){setError(err.message);setLoading(false);}};
  return <Modal title="Create User" subtitle="Create an app login using an existing Gmail address." onClose={onClose}><form className="form-stack" onSubmit={submit}>
    <div className="two-cols"><label>Full name<input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></label><label>Role<select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}><option value="user">User</option><option value="admin">Admin</option></select></label></div>
    <label>Gmail address<input required type="email" placeholder="seller@gmail.com" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></label>
    <label>WhatsApp number <small>(country code, no +)</small><input inputMode="tel" placeholder="923001234567" value={form.whatsapp} onChange={(e)=>setForm({...form,whatsapp:e.target.value})}/></label>
    <label>Temporary password<input required type="password" minLength="8" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/></label>
    {error&&<div className="inline-error"><AlertCircle/>{error}</div>}<div className="form-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={loading}>{loading&&<LoaderCircle className="spin"/>}Create user</button></div></form></Modal>;
}


export { Login, Modal, CreateUser };
