import {useState,useEffect,useCallback,useRef} from "react";
import {Eye,Users} from "lucide-react";
import {Login,Modal,CreateUser} from "./LegacyUI";
import {api} from "./api";
import "./App.css";
import "./Revision.css";
const when=d=>d?new Date(d).toLocaleString("en-PK"):"—";
const body=(method,data)=>({method,body:JSON.stringify(data)});
function Table({rows,open}){return <div className="table-scroll"><table><thead><tr><th>Date / Time</th><th>Customer Name</th><th>Customer City</th></tr></thead><tbody>{rows.map(c=><tr key={c.eventId||c._id} onClick={()=>open(c._id)}><td>{when(c.activityAt||c.lastActivityAt||c.createdAt)}</td><td><button className="text-button" onClick={e=>{e.stopPropagation();open(c._id)}}>{c.name}</button></td><td>{c.city}</td></tr>)}</tbody></table>{!rows.length&&<p className="empty-state">No records to display.</p>}</div>}
function Record({c,close,changed,notify,user,refresh,removeLocal,page,loadHistory}){
 const [busy,setBusy]=useState(false),[file,setFile]=useState(null),[preview,setPreview]=useState(""),[enlarged,setEnlarged]=useState(null),[retry,setRetry]=useState("");
 const input=useRef(null);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 async function upload(e){e.preventDefault();setBusy(true);try{const form=new FormData();form.append("image",file);const data=await api("/customers/"+c._id+"/documents",{method:"POST",body:form});changed(data.customer,true);
refresh();const doc=data.customer.documents.at(-1)._id;setRetry(data.notification.status==="sent"?"":doc);setEnlarged(null);setFile(null);setPreview("");input.current.value="";notify(data.notification.warning||(data.notification.status==="sent"?"Document saved. WhatsApp API accepted the message for assigned Staff.":"Document saved, but WhatsApp was not sent: "+data.notification.error));}catch(err){notify(err.message)}finally{setBusy(false)}}
 async function resend(docId=retry){setBusy(true);try{const data=await api("/customers/"+c._id+"/documents/"+docId+"/send",{method:"POST"});changed(data.customer,false);
refresh();if(data.notification.status==="sent")setRetry("");notify(data.notification.warning||(data.notification.status==="sent"?"WhatsApp API accepted the message for assigned Staff.":data.notification.error));}catch(err){notify(err.message)}finally{setBusy(false)}}
 return <Modal title={c.name} subtitle={c.city} onClose={()=>!busy&&close()}><p>Assigned Staff: <b>{c.staffName||"Staff not recorded"}</b></p>
 <form className="form-stack" onSubmit={upload}><h3>Upload new document</h3>
 <div className="upload-preview"><input ref={input} name="image" aria-label="Document file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required disabled={busy} onChange={e=>{const picked=e.target.files[0]||null;setFile(picked);setPreview(picked?URL.createObjectURL(picked):"")}}/>{file&&preview&&(file.type.startsWith("image/")?<button type="button" className="preview-button" onClick={()=>setEnlarged({url:preview,pdf:false})} aria-label="Enlarge selected image"><img src={preview} alt="Selected document preview"/></button>:<button type="button" className="secondary" onClick={()=>setEnlarged({url:preview,pdf:true})}>Preview selected PDF</button>)}</div>
 <small>Maximum 8 MB. Documents go to the WhatsApp number registered for the assigned Staff.</small><div className="actions"><button className="primary" disabled={busy||!c.staff||!file}>{busy?"Please wait…":"Send Document"}</button>{file&&<button type="button" className="secondary" disabled={busy} onClick={()=>input.current.click()}>Replace</button>}{retry&&<button type="button" className="secondary" disabled={busy} onClick={()=>resend()}>Retry WhatsApp</button>}</div></form>
 <h3>Saved documents</h3><div className="table-scroll"><table><thead><tr><th>Staff</th><th>Uploaded</th><th>Image</th><th>Saved By</th></tr></thead><tbody>{[...c.documents].reverse().sort((a,b)=>new Date(b.uploadedAt)-new Date(a.uploadedAt)).map(d=><tr key={d._id}><td>{d.staffName}</td><td>{when(d.uploadedAt)}{d.lastSend?.status!=="sent"&&<button type="button" className="secondary small" disabled={busy} onClick={()=>resend(d._id)}>Retry WhatsApp</button>}{d.lastSend?.status&&<small className="delivery-status">{d.lastSend.status==="sent"?"WhatsApp API accepted":d.lastSend.status}</small>}</td><td><button type="button" className="icon-button" onClick={()=>setEnlarged({url:d.url,pdf:d.resourceType==="raw"})} aria-label="View image"><Eye/></button></td><td>{d.savedBy?.name||"—"}</td></tr>)}</tbody></table></div>{!c.documents.length&&<p>No documents yet.</p>}<div className="saved-by-row">

<p className="saved-by">
 Customer Saved By: <b>{c.savedBy?.name || "—"}</b>
</p>


{user?.role==="admin" && (

<button
 className="delete-icon-btn"
 title="Delete Customer"

 onClick={async()=>{

 const ok = window.confirm(
 "Are you sure? Customer and all saved documents will be permanently deleted."
 );

 if(!ok) return;


 try{

 await api("/customers/"+c._id,{
   method:"DELETE"
 });


 notify("Customer deleted successfully.");

removeLocal(c._id);

close();

if(page==="history"){
  await loadHistory();
}

refresh();


 }catch(e){

 notify(e.message);

 }

 }}

>
 🗑
</button>

)}

</div>
 {enlarged&&<div className="image-lightbox" role="dialog" aria-label="Document preview" aria-modal="true" onClick={e=>{if(e.target===e.currentTarget)setEnlarged(null)}} onKeyDown={e=>{if(e.key==="Escape")setEnlarged(null)}}><button type="button" className="secondary" autoFocus onClick={()=>setEnlarged(null)}>Close preview</button>{enlarged.pdf?<iframe src={enlarged.url} title="Document PDF preview"/>:<img src={enlarged.url} alt="Document enlarged"/>}</div>}</Modal>
}
function Admin({user,notify,refresh}){
 const [reset,setReset]=useState(null),[showPassword,setShowPassword]=useState(false),[accounts,setAccounts]=useState([]),[staff,setStaff]=useState([]),[months,setMonths]=useState(2),[create,setCreate]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;Promise.all([api("/users"),api("/staff"),api("/settings")]).then(([a,s,t])=>{if(live){setAccounts(a.users);setStaff(s.staff);setMonths(t.setting.retentionMonths)}}).catch(e=>notify(e.message));return()=>{live=false}},[notify]);
 async function password(e){e.preventDefault();const data=Object.fromEntries(new FormData(e.target));if(data.password!==data.confirm)return notify("Passwords do not match.");setBusy(true);try{await api("/users/"+reset.id+"/password",body("PATCH",{password:data.password}));setReset(null);notify("Password changed. Existing sessions have been signed out.");}catch(err){notify(err.message)}finally{setBusy(false)}}
 async function toggle(a){setBusy(true);try{const d=await api("/users/"+a.id+"/status",body("PATCH",{active:!a.active}));setAccounts(prev=>prev.map(u=>u.id===a.id?d.user:u));refresh();notify("Account status updated.");}catch(e){notify(e.message)}finally{setBusy(false)}}
 async function removeStaff(s){if(!window.confirm(`Are you sure you want to delete ${s.name}? Existing customer records and documents will remain, but sending to this Staff will stop.`))return;setBusy(true);try{await api("/staff/"+s._id,{method:"DELETE"});setStaff(prev=>prev.filter(item=>item._id!==s._id));refresh();notify("Staff deleted.");}catch(e){notify(e.message)}finally{setBusy(false)}}
 async function register(e){e.preventDefault();const form=e.target;setBusy(true);try{const d=await api("/staff",body("POST",Object.fromEntries(new FormData(form))));setStaff(p=>[...p,d.staff]);form.reset();refresh();notify("Staff registered. No login account created.");}catch(err){notify(err.message)}finally{setBusy(false)}}
 async function policy(e){e.preventDefault();setBusy(true);try{await api("/settings",body("PUT",{retentionMonths:months}));notify("Rolling retention saved. Background checks run hourly.");}catch(err){notify(err.message)}finally{setBusy(false)}}
 return <section className="records-section"><div className="section-heading"><h2>Login Accounts</h2><button className="primary" onClick={()=>setCreate(true)}>Create User</button></div><div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>WhatsApp</th><th>Role</th><th>Status</th><th>Password</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.email}</td><td>{a.whatsapp||"Not set"}</td><td>{a.role==="admin"?"Admin":"User"}</td><td><span className={a.active?"status-active":"status-inactive"}>{a.active?"Active":"Inactive"}</span> <button className={"secondary small "+(a.active?"status-deactivate":"status-activate")} disabled={busy||a.role==="admin"||a.id===user.id} onClick={()=>toggle(a)}>{a.active?"Deactivate":"Activate"}</button></td><td><button className="secondary small" disabled={busy} onClick={()=>{setShowPassword(false);setReset(a)}}>Reset Password</button></td></tr>)}</tbody></table></div>
 {reset&&<Modal title={"Reset password: "+reset.name} onClose={()=>!busy&&setReset(null)}><form className="form-stack" onSubmit={password}><p>Passwords are securely hashed and cannot be viewed. Changing a password signs out existing sessions, including yours if you reset your own account.</p><label>New password<input name="password" type={showPassword?"text":"password"} required minLength={8} autoComplete="new-password"/></label><label>Confirm new password<input name="confirm" type={showPassword?"text":"password"} required minLength={8} autoComplete="new-password"/></label><label className="checkbox-label"><input type="checkbox" checked={showPassword} onChange={e=>setShowPassword(e.target.checked)}/>Show password</label><button className="primary" disabled={busy}>Reset Password</button></form></Modal>}
 <div className="admin-layout"><section className="panel"><h2>Register Staff</h2><p>Field salespeople — no email, password or login.</p><form className="form-stack" onSubmit={register}><label>Staff Name<input name="name" required maxLength={80}/></label><label>Phone Number<input name="phone" required placeholder="923001234567"/></label><button className="primary" disabled={busy}>Register Staff</button></form><table><thead><tr><th>Staff Name</th><th>Phone</th><th>Action</th></tr></thead><tbody>{staff.map(s=><tr key={s._id}><td>{s.name}</td><td>+{s.phone}</td><td><button type="button" className="secondary small" disabled={busy} onClick={()=>removeStaff(s)}>Delete</button></td></tr>)}</tbody></table></section>
 <section className="panel"><h2>Rolling auto-delete</h2><p>Removes customer records and all attached images older than the chosen period. Uploading a document does not reset customer age.</p><form className="form-stack" onSubmit={policy}><label>Retention<select value={months} onChange={e=>setMonths(Number(e.target.value))}><option value={1}>1 month</option><option value={2}>2 months</option></select></label><button disabled={busy} className="primary">Save Policy</button></form></section></div>{create&&<CreateUser onClose={()=>setCreate(false)} onCreated={a=>{setAccounts(p=>[a,...p]);setCreate(false);refresh();notify("User created.");}}/>}</section>
}
export default function App(){
 const [session,setSession]=useState(()=>{try{const token=localStorage.getItem("customerhub_token"),user=JSON.parse(localStorage.getItem("customerhub_user"));return token&&user?{token,user}:null}catch{return null}});
 const [page,setPage]=useState("home"),[notice,setNotice]=useState(""),[recent,setRecent]=useState([]),[staff,setStaff]=useState([]),[selected,setSelected]=useState(null),[add,setAdd]=useState(false),[busy,setBusy]=useState(false);
 const [searchOpen,setSearchOpen]=useState(false),[search,setSearch]=useState(""),[matches,setMatches]=useState([]),[searching,setSearching]=useState(false),[summary,setSummary]=useState(null);
 const [history,setHistory]=useState({customers:[],total:0,pages:0}),[num,setNum]=useState(1),[from,setFrom]=useState(""),[to,setTo]=useState(""),[loading,setLoading]=useState(false);
 const recentSequence=useRef(0);
 const noticeTimer=useRef(null);
 const notify=useCallback(m=>{clearTimeout(noticeTimer.current);setNotice(m);noticeTimer.current=setTimeout(()=>setNotice(""),7000)},[]);
 useEffect(()=>()=>clearTimeout(noticeTimer.current),[]);
 function navigate(next){if(next!==page){setRecent([]);setPage(next)}}
 const logout=useCallback(()=>{localStorage.removeItem("customerhub_token");localStorage.removeItem("customerhub_user");setSession(null);setRecent([]);setSelected(null);setPage("home");setSummary(null);setSearch("");},[]);
 const login=useCallback(d=>{localStorage.setItem("customerhub_token",d.token);localStorage.setItem("customerhub_user",JSON.stringify(d.user));setRecent([]);setSession(d)},[]);
 useEffect(()=>{window.addEventListener("session-revoked",logout);return()=>window.removeEventListener("session-revoked",logout)},[logout]);
 useEffect(()=>{
  if(!session?.token)return;
  const controller=new AbortController();let retry;const root=(import.meta.env.VITE_API_URL||"/api").replace(/\/$/,"");
  async function connect(){try{const response=await fetch(root+"/auth/events",{headers:{Authorization:"Bearer "+session.token},signal:controller.signal});if(response.status===401){logout();return}if(!response.ok)throw new Error();const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";while(!controller.signal.aborted){const{done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const blocks=buffer.split("\n\n");buffer=blocks.pop();if(blocks.some(b=>b.includes("event: logout"))){notify("Your session was revoked. Please sign in again.");logout();return}}}catch{/* reconnect */}if(!controller.signal.aborted)retry=setTimeout(connect,3000)}
  connect();const poll=setInterval(()=>api("/auth/me").catch(()=>{}),30000);
  api("/auth/me").then(({user})=>setSession(p=>p?{...p,user}:p)).catch(()=>{});
  return()=>{controller.abort();clearTimeout(retry);clearInterval(poll)};
 },[session?.token,logout,notify]);
 const refresh=useCallback(()=>{api("/staff").then(d=>setStaff(d.staff)).catch(e=>notify(e.message));if(session?.user.role==="admin")api("/customers/stats").then(setSummary).catch(e=>notify(e.message));},[session?.user.role,notify]);
 useEffect(()=>{if(session?.token){const id=setTimeout(refresh,0);return()=>clearTimeout(id)}},[session?.token,refresh]);
 useEffect(()=>{if(!session?.token||!searchOpen)return;let alive=true;const timer=setTimeout(()=>{setSearching(true);api("/customers?q="+encodeURIComponent(search)+"&limit=15").then(d=>{if(alive)setMatches(d.customers)}).catch(e=>notify(e.message)).finally(()=>{if(alive)setSearching(false)})},250);return()=>{alive=false;clearTimeout(timer)}},[search,searchOpen,session?.token,notify]);
 const loadHistory=useCallback(()=>{const p=new URLSearchParams({page:num,limit:30});if(from)p.set("from",new Date(from+"T00:00:00").toISOString());if(to)p.set("to",new Date(to+"T23:59:59.999").toISOString());setLoading(true);return api("/customers/history?"+p).then(setHistory).catch(e=>notify(e.message)).finally(()=>setLoading(false));},[num,from,to,notify]);
 useEffect(()=>{if(page==="history"){const id=setTimeout(loadHistory,0);return()=>clearTimeout(id)}},[page,loadHistory]);
 async function open(id){try{const d=await api("/customers/"+id);setSelected(d.customer);setSearchOpen(false);setSearch("");setMatches([])}catch(e){notify(e.message)}}
 function changed(c,isNew){

 setSelected(c);


 if(isNew){

   const latestDoc = c.documents?.[c.documents.length - 1];


   if(latestDoc){

     const entry={
       _id:c._id,
       name:c.name,
       city:c.city,
       activityAt:latestDoc.uploadedAt,
       eventId:"recent-"+(++recentSequence.current)
     };


     setRecent(prev=>[entry,...prev]);

   }

 }


 if(page==="history"){
   loadHistory();
 }

 refresh();

}
function removeLocal(id){

 setRecent(prev =>
   prev.filter(item => item._id !== id)
 );

}
 async function createCustomer(e){e.preventDefault();setBusy(true);try{await api("/customers",body("POST",Object.fromEntries(new FormData(e.target))));setAdd(false);setSearchOpen(false);refresh();if(page==="history")loadHistory();notify("Customer added successfully.");}catch(err){notify(err.message)}finally{setBusy(false)}}
 const banner=notice&&<div className="notice" role="status"><span>{notice}</span><button onClick={()=>setNotice("")}>Close</button></div>;
 if(!session)return <>{banner}<Login onLogin={login}/></>;
 const user=session.user;
 return <>{banner}<main className="app-shell"><header className="topbar"><div className="brand"><Users/>Customer<span>Hub</span></div><div className="actions"><span>{user.role==="admin"?"Admin":"User"} · {user.name}</span><button className="secondary" onClick={logout}>Sign Out</button></div></header><section className="hero"><div><h1>{page==="home"?"Customer Records":page==="history"?"History":"People & Access"}</h1><p>Welcome, {user.name}.</p></div><div className="actions">{page!=="home"&&<button className="secondary" onClick={()=>navigate("home")}>Home</button>}<button className="secondary" onClick={()=>navigate("history")}>History</button>{user.role==="admin"&&<button className="secondary" onClick={()=>navigate("admin")}>Admin Panel</button>}<button className="primary" onClick={()=>setAdd(true)}>Add Customer</button></div></section>
 {user.role==="admin"&&summary&&<section className="stats-grid">{[["Total Customers",summary.totalCustomers],["Active Users",summary.activeUsers],["This Month",summary.thisMonth],["Documents Saved",summary.imagesSaved]].map(([label,value])=><div className="stat-card" key={label}><div><strong>{value}</strong><span>{label}</span></div></div>)}</section>}
 <div className="search-wrap" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setSearchOpen(false)}} onKeyDown={e=>{if(e.key==="Escape")setSearchOpen(false)}}><div className="search-box"><input aria-label="Search name or city" placeholder="Search customer name or city…" value={search} onFocus={()=>{if(!searchOpen){setSearchOpen(true);setSearching(true)}}} onChange={e=>{setSearchOpen(true);setSearching(true);setSearch(e.target.value);setMatches([])}}/></div>{searchOpen&&<div className="search-results">{searching?<p>Searching…</p>:matches.length?matches.map(c=><button key={c._id} onClick={()=>open(c._id)}>{c.name}<span>{c.city}</span></button>):<p>No matching customers.</p>}</div>}</div>
 {page==="home"&&<section className="records-section"><h2>Recent</h2><p>Each document you save appears as a separate entry here. Refreshing or changing pages clears this list.</p><Table rows={recent} open={open}/></section>}
 {page==="history"&&<section className="records-section"><div className="filter-panel"><label>From date<input type="date" value={from} onChange={e=>{setFrom(e.target.value);setNum(1)}}/></label><label>To date<input type="date" value={to} onChange={e=>{setTo(e.target.value);setNum(1)}}/></label><button className="secondary" onClick={()=>{setFrom("");setTo("");setNum(1)}}>Clear</button></div>{loading?<p>Loading…</p>:<Table rows={history.customers} open={open}/>}<div className="actions"><button disabled={num<=1||loading} onClick={()=>setNum(n=>n-1)}>Previous</button><span>{history.total} records · Page {num} of {history.pages||1}</span><button disabled={num>=history.pages||loading} onClick={()=>setNum(n=>n+1)}>Next</button></div></section>}
 {page==="admin"&&user.role==="admin"&&<Admin user={user} notify={notify} refresh={refresh}/>}</main>
 {add&&<Modal title="Add Customer" onClose={()=>setAdd(false)}><form className="form-stack" onSubmit={createCustomer}><label>Customer Name<input name="name" required maxLength={120}/></label><label>Customer City<input name="city" required maxLength={100}/></label><label>Staff<select name="staffId" required defaultValue=""><option value="">Select registered Staff</option>{staff.map(s=><option key={s._id} value={s._id}>{s.name} · +{s.phone}</option>)}</select></label>{!staff.length&&<p>Ask Admin to register Staff first.</p>}<p>Saved By: <b>{user.name}</b></p><button className="primary" disabled={busy}>Save Customer</button></form></Modal>}
 {selected&&<Record 
key={selected._id}
c={selected}
close={()=>setSelected(null)}
changed={changed}
notify={notify}
user={user}
refresh={refresh}
removeLocal={removeLocal}
page={page}
loadHistory={loadHistory}
/>}</>;
}
