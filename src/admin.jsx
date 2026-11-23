import React,{createContext,useContext,useState} from 'react';
import {Empty,Link,useApp} from './main';
import {Logo} from './store';
import {gbp,date,csv,download,invoicePdf,round,key} from './data';

import Analytics from './analytics';
import {Pagination,pageSlice} from './pagination';

const roles = ['Supervisor','Product editor','Warehouse','Sales','Owner'];
const nav = [
  ['','Overview','◫',roles],['products','Products','◇',['Owner','Supervisor','Product editor']],
  ['inventory','Inventory','▥',['Owner','Supervisor','Warehouse']],['orders','Orders','▤',['Owner','Supervisor','Warehouse','Sales']],
  ['customers','Customers & trade','♙',['Owner','Supervisor','Sales']],['approvals','Approvals','✓',['Owner','Supervisor']],
  ['campaigns','Promotions','%',['Owner','Supervisor','Sales']],['inbox','Requests','✉',['Owner','Supervisor','Sales']],
  ['reports','Reports','↗',['Owner','Supervisor','Sales']],['settings','Settings','⚙',['Owner']],['audit','Audit log','◷',['Owner','Supervisor']]
];
const AdminContext=createContext(null);
const useAdmin=()=>useContext(AdminContext);
const timestamp=()=>new Date().toISOString();
const audit=(db,by,action)=>[{at:timestamp(),by,action},...db.audit];
const statusClass=s=>['Approved','Paid (demo)','Delivered','Collected','Published'].includes(s)?'positive':['Pending','Processing','Ready for collection'].includes(s)?'warning':'';
const Badge=({children})=><span className={'badge '+statusClass(children)}>{children}</span>;
const Table=({headers,rows})=>rows.length?<div className="table-scroll"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((cells,i)=><tr key={i}>{cells.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>:<Empty>No records to show.</Empty>;

const productFields=[
  ['sku','SKU'],['part','Manufacturer part'],['name','Name'],['family','Product family'],['brand','Brand'],['category','Category'],['price','Retail ex. VAT',0.01],['trade','Trade ex. VAT',0.01],['cost','Unit cost',0.01],['stock','Available stock',1],['pack','Pack multiple',1],['unit','Unit'],['spec','Specification'],['bulkQty','Bulk threshold',1],['bulkOff','Bulk discount %',0.01],['tag','Tag'],['image','Image URL'],['datasheet','Datasheet URL'],['description','Description']
];
function productData(raw,existing={}) {
  const p={...existing,...raw};
  p.sku=String(p.sku||'').trim().toUpperCase();
  for(const [field,,step] of productFields) if(step) p[field]=Number(p[field]||(field==='pack'?1:0));
  const required=['sku','part','name','brand','category','price','trade','cost','stock','pack','unit','spec','description'];
  const missing=required.find(f=>raw[f]===undefined||String(raw[f]).trim()==='');
  if(missing) throw Error('Missing '+missing);
  if(!/^[A-Z0-9][A-Z0-9._-]*$/.test(p.sku)||p.pack<1||p.price<0||p.trade<0||p.stock<0||p.cost<0||p.bulkQty<0||p.bulkOff<0||p.bulkOff>99||[p.stock,p.pack,p.bulkQty].some(n=>!Number.isSafeInteger(n))||[p.price,p.trade,p.cost,p.bulkOff].some(n=>!Number.isFinite(n))) throw Error('Check SKU, prices, stock, pack and bulk values');
  for(const field of ['datasheet','image']) if(p[field]&&!/^https?:\/\/[^\s]+$/i.test(p[field])) throw Error(field+' must be an HTTP or HTTPS URL');
  p.restricted=raw.restricted===true||['true','1','yes','on'].includes(String(raw.restricted).toLowerCase());
  return p;
}
function Products() {
  const {db,notify}=useApp();
  const {request}=useAdmin();
  const [edit,setEdit]=useState(null);
  const [bulk,setBulk]=useState(null);
  const [q,setQ]=useState('');
  const [page,setPage]=useState(1);
  const matched=db.products.filter(p=>(p.name+' '+p.sku+' '+p.category).toLowerCase().includes(q.toLowerCase()));
  const displayed=pageSlice(matched,page,25);
  const [error,setError]=useState('');
  const headers=[...productFields.map(([name])=>name),'restricted'];
  function save(e){
    e.preventDefault();
    try {
      const form=new FormData(e.currentTarget);
      const p=productData(Object.fromEntries(form),edit);
      if(!edit.sku&&db.products.some(item=>item.sku===p.sku))throw Error('SKU already exists');
      request('Products',p.sku,[p]);setEdit(null);setError('');
    } catch(err){setError(err.message);}
  }
  async function upload(e){
    const file=e.target.files[0];
    if(!file)return;
    try {
      const XLSX=await import('xlsx');
      const book=XLSX.read(await file.text(),{type:'string',raw:true});
      const seen=new Set();
      const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:''}).map((raw,i)=>{
        try {
          const p=productData(raw,db.products.find(item=>item.sku===String(raw.sku).toUpperCase()));
          if(seen.has(p.sku)) throw Error('Duplicate SKU in this file');
          seen.add(p.sku);
          return {row:i+2,p,action:db.products.some(item=>item.sku===p.sku)?'Update':'Add'};
        } catch(err){return {row:i+2,error:err.message};}
      });
      setBulk(rows);
    } catch {notify('Unable to read CSV');}
    e.target.value='';
  }
  return <><div className="section-title"><div><h1>Products</h1><p>Catalogue, brands and publishing approvals</p></div><div className="actions"><button className="btn primary" onClick={()=>{setError('');setEdit({});}}>Add product</button><label className="file-label">Import CSV<input type="file" accept=".csv" onChange={upload}/></label><button className="btn outline" onClick={()=>download('products-template.csv',csv([headers,headers.map(k=>db.products[0]?.[k]??'')]))}>CSV template</button></div></div>
  {edit&&<section className="panel"><h2>{edit.sku?'Edit '+edit.sku:'New product'}</h2><form className="form-grid" key={edit.sku||'new'} onSubmit={save}>{productFields.map(([field,label,step])=><label key={field}>{label}{['brand','category','tag'].includes(field)?<select name={field} defaultValue={edit[field]||''} required={field!=='tag'}><option value="">{field==='tag'?'No tag':'Select '+field}</option>{db[field==='category'?'categories':field==='brand'?'brands':'tags'].map(v=><option key={v}>{v}</option>)}</select>:field==='description'?<textarea name={field} defaultValue={edit[field]} required/>:<input name={field} type={step?'number':['image','datasheet'].includes(field)?'url':'text'} min={field==='pack'?1:0} max={field==='bulkOff'?99:undefined} step={step} defaultValue={edit[field]??(step?(field==='pack'?1:0):'')} readOnly={field==='sku'&&!!edit.sku} required={!['family','image','datasheet','bulkQty','bulkOff'].includes(field)}/>}</label>)}<label className="inline"><input type="checkbox" name="restricted" defaultChecked={edit.restricted}/> Trade-only item</label>{error&&<p className="error">{error}</p>}<div className="actions"><button className="btn primary">Submit for approval</button><button type="button" className="btn outline" onClick={()=>setEdit(null)}>Cancel</button></div></form></section>}
  {bulk&&<section className="panel"><h2>CSV import preview</h2><Table headers={['Row','SKU','Result']} rows={bulk.map(r=>[r.row,r.p?.sku||'—',r.error||r.action])}/><div className="actions"><button className="btn primary" disabled={!bulk.some(r=>r.p)} onClick={()=>{request('Products','Bulk product import',bulk.filter(r=>r.p).map(r=>r.p));setBulk(null);}}>Submit valid rows</button><button className="btn outline" onClick={()=>download('import-errors.csv',csv([['Row','Error'],...bulk.filter(r=>r.error).map(r=>[r.row,r.error])]))}>Download errors</button><button className="btn outline" onClick={()=>setBulk(null)}>Close preview</button></div></section>}
  <section className="panel"><label>Search catalogue<input value={q} onChange={e=>{setQ(e.target.value);setPage(1);}} placeholder="Name, SKU or department"/></label><Table headers={['SKU','Product','Retail','Trade','Stock','Access','']} rows={displayed.items.map(p=>[p.sku,p.name,gbp(p.price),gbp(p.trade),p.stock,p.restricted?'Trade only':'Public',<button className="text-button" onClick={()=>{setError('');setEdit(p);window.scrollTo(0,0);}}>Edit product</button>])}/><small>{matched.length.toLocaleString('en-GB')} products</small><Pagination {...displayed} onChange={setPage}/></section>
  <section className="panel"><h2>Categories, brands & tags</h2><div className="chips">{[...db.categories,...db.brands,...db.tags].map((t,i)=><Badge key={i}>{t}</Badge>)}</div><form className="form-grid" onSubmit={e=>{e.preventDefault();const f=e.currentTarget;const d=Object.fromEntries(new FormData(f));d.name=d.name.trim();if(!d.name||db[d.kind].some(n=>n.toLowerCase()===d.name.toLowerCase())){notify('Enter a unique name');return;}request('Taxonomy',d.name,d);f.reset();}}><label>Type<select name="kind"><option value="categories">Category</option><option value="brands">Brand</option><option value="tags">Tag</option></select></label><label>Name<input name="name" required/></label><button className="btn primary">Submit for approval</button></form></section></>;
}
function Approvals() {
  const {db,setDb,notify}=useApp();
  const {role}=useAdmin();
  const [selected,setSelected]=useState('');
  const entry=db.approvals.find(a=>a.id===selected);
  function decide(approve) {
    if(!entry||entry.by===role||entry.status!=='Pending')return;
    setDb(d=>{
      const next={...d,approvals:d.approvals.map(a=>a.id===entry.id?{...a,status:approve?'Published':'Rejected',reviewer:role}:a),audit:audit(d,role,(approve?'Approved ':'Rejected ')+entry.title)};
      if(!approve)return next;
      if(entry.type==='Products') {
        const products=new Map(d.products.map(p=>[p.sku,p]));
        for(const p of entry.data) {
          const current=products.get(p.sku);
          const baseline=entry.stockAtRequest?.[p.sku];
          products.set(p.sku,current&&baseline===p.stock?{...p,stock:current.stock}:p);
        }
        next.products=[...products.values()];
      }
      if(entry.type==='Taxonomy') { const {kind,name}=entry.data; if(!next[kind].some(n=>n.toLowerCase()===name.toLowerCase()))next[kind]=[...d[kind],name]; }
      if(entry.type==='Promotion') next.campaigns=[...d.campaigns,entry.data];
      if(entry.type==='Account pricing') {const {email,sku,price}=entry.data;const c=d.customers[email];if(c)next.customers={...d.customers,[email]:{...c,prices:{...c.prices,[sku]:price}}};}
      return next;
    });
    notify(approve?'Change published':'Request rejected');setSelected('');
  }
  return <><h1>Approval queue</h1><section className="panel"><Table headers={['Change','Type','Requester','Date','Status','']} rows={db.approvals.map(a=>[a.title,a.type,a.by,date(a.at),<Badge>{a.status}</Badge>,<button className="text-button" onClick={()=>setSelected(a.id)}>Review</button>])}/></section>{entry&&<section className="panel"><h2>{entry.title}</h2><p>{entry.status} · Requested by {entry.by}</p>{entry.type==='Products'?<Table headers={['SKU','Name','Retail','Trade','Stock','Access']} rows={entry.data.map(p=>[p.sku,p.name,gbp(p.price),gbp(p.trade),p.stock,p.restricted?'Trade only':'Public'])}/>:<dl>{Object.entries(entry.data).map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd>{String(v)}</dd></React.Fragment>)}</dl>}{entry.status==='Pending'&&(entry.by===role?<p>A different approver must review this change.</p>:<div className="actions"><button className="btn primary" onClick={()=>decide(true)}>Approve & publish</button><button className="btn outline" onClick={()=>decide(false)}>Reject</button></div>)}</section>}<section className="panel"><div className="section-title"><h2>Pending trade applications</h2><Link to="/admin/customers">Review trade accounts →</Link></div><Table headers={['Company','Email']} rows={Object.values(db.customers).filter(c=>c.status==='Pending').map(c=>[c.company,c.email])}/></section></>;
}
function Inventory() {
 const {db,setDb,notify}=useApp();const {role}=useAdmin();
 const [q,setQ]=useState(''),[page,setPage]=useState(1);
 const displayed=pageSlice(db.products.filter(p=>(p.sku+' '+p.name).toLowerCase().includes(q.toLowerCase())),page,25);
 const reserved={};
 for(const o of db.orders)if(['Confirmed','Processing','Ready for collection'].includes(o.status))for(const l of o.lines)reserved[l.sku]=(reserved[l.sku]||0)+l.qty;
 return <><h1>Inventory</h1><section className="panel"><label>Search inventory<input value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/></label><Table headers={['SKU','Product','Available','Open order units','Adjustment']} rows={displayed.items.map(p=>[p.sku,p.name,<Badge>{p.stock+' available'}</Badge>,reserved[p.sku]||0,<form className="actions" onSubmit={e=>{e.preventDefault();const f=e.currentTarget;const change=Number(new FormData(f).get('delta'));if(!Number.isSafeInteger(change)||!change||p.stock+change<0){notify('Adjustment would create invalid stock');return;}setDb(d=>({...d,products:d.products.map(item=>item.sku===p.sku?{...item,stock:item.stock+change}:item),audit:audit(d,role,p.sku+' stock adjustment '+change)}));f.reset();notify('Inventory updated');}}><input className="qty" type="number" name="delta" aria-label={'Adjust '+p.sku} placeholder="± Qty" required/><button className="btn outline">Apply</button></form>])}/><Pagination {...displayed} onChange={setPage}/></section></>;
}
function Orders() {
  const {db,setDb,notify}=useApp();
  const {role}=useAdmin();
  const [id,setId]=useState('');
  const [statusFilter,setStatus]=useState('All');
  const order=db.orders.find(o=>o.id===id);
  const statuses=['Confirmed','Processing','Dispatched','Delivered','Ready for collection','Collected','Cancelled'];
  const flow=order?.method==='Collection'?['Confirmed','Processing','Ready for collection','Collected']:statuses.slice(0,4);
  const stage=flow.indexOf(order?.status);
  const choices=stage>=0&&stage<flow.length-1?[flow[stage+1],...(stage<2?['Cancelled']:[])]:[];
  function update(e) {
    e.preventDefault();
    const {status,tracking}=Object.fromEntries(new FormData(e.currentTarget));
    if(!choices.includes(status))return;
    if(status==='Dispatched'&&!tracking.trim()){notify('Enter a courier tracking reference');return;}
    const trigger=db.settings.invoice==='Dispatched'&&order.method==='Collection'?'Ready for collection':db.settings.invoice;
    const invoice=order.invoice||(status===trigger?'INV-'+order.id:null);
    setDb(d=>({...d,orders:d.orders.map(o=>o.id===order.id?{...o,status,tracking,invoice,payment:status==='Cancelled'&&o.payment==='Paid (demo)'?'Refunded (demo)':status==='Cancelled'?'Voided (demo)':o.payment}:o),products:status==='Cancelled'?d.products.map(p=>({...p,stock:p.stock+(order.lines.find(l=>l.sku===p.sku)?.qty||0)})):d.products,audit:audit(d,role,'Order '+order.id+' → '+status)}));
    notify('Order updated');
  }
  return <><div className="section-title"><h1>Orders</h1><select aria-label="Filter order status" value={statusFilter} onChange={e=>setStatus(e.target.value)}><option>All</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><section className="panel"><Table headers={['Order','Customer','Payment','Fulfilment','Total','']} rows={db.orders.filter(o=>statusFilter==='All'||o.status===statusFilter).map(o=>['#'+o.id,o.name,<Badge>{o.payment}</Badge>,<Badge>{o.status}</Badge>,gbp(o.total),<button className="text-button" onClick={()=>setId(o.id)}>Open order</button>])}/></section>
  {order&&<section className="panel"><h2>Order #{order.id}</h2><p>{order.name} · {order.email} · {order.method} · {order.status}</p>{order.address&&<p>{order.address} {order.postcode}</p>}{order.po&&<p>PO / job: {order.po}</p>}<Table headers={['SKU','Item','Quantity','Unit price','Price rule']} rows={order.lines.map(l=>[l.sku,l.name,l.qty,gbp(l.price),l.rule])}/>
  {choices.length>0&&role!=='Sales'&&<form className="form-grid" key={id+order.status} onSubmit={update}><label>Next status<select name="status">{choices.map(s=><option key={s}>{s}</option>)}</select></label><label>Courier tracking<input name="tracking" defaultValue={order.tracking||''}/></label><button className="btn primary">Update order</button></form>}
  <button className="btn outline" onClick={()=>invoicePdf(order).catch(()=>notify('Unable to generate PDF'))}>Download {order.invoice?'invoice':'receipt'} PDF</button></section>}</>;
}
function Customers() {
  const {db,setDb,notify}=useApp();
  const {role,request}=useAdmin();
  const [id,setId]=useState('');
  const c=db.customers[id];
  function update(values) {
    setDb(d=>({...d,customers:{...d.customers,[id]:{...c,...values}},audit:audit(d,role,'Updated trade account '+id)}));
    notify('Customer updated');
  }
  return <><h1>Customers & trade</h1><section className="panel"><Table headers={['Customer','Company','Email','Status','']} rows={Object.values(db.customers).map(item=>[item.name,item.company||'—',item.email,<Badge>{item.status}</Badge>,<button className="text-button" onClick={()=>setId(item.email)}>Review account</button>])}/></section>
  {c&&<section className="panel"><h2>{c.company||c.name}</h2><p>{c.name} · {c.email} · {c.phone||'No phone recorded'} · {c.postcode||'No postcode recorded'}</p><p>Status: {c.status}{c.verified?' · Demo email verified':''}</p>
  {role!=='Sales'&&<div className="actions">{c.status==='Pending'&&<><button className="btn primary" onClick={()=>update({status:'Approved'})}>Approve trade account</button><button className="btn outline" onClick={()=>update({status:'Rejected'})}>Reject</button></>}{c.status==='Approved'&&<button className="btn outline" onClick={()=>update({status:'Suspended'})}>Suspend trade access</button>}{c.status==='Suspended'&&<button className="btn primary" onClick={()=>update({status:'Approved'})}>Restore trade access</button>}{c.status==='Approved'&&<label className="inline"><input type="checkbox" checked={!!c.credit} onChange={e=>update({credit:e.target.checked})}/> Allow demo trade credit</label>}</div>}
  <h3>Account-specific pricing</h3><Table headers={['SKU','Agreed unit price ex. VAT']} rows={Object.entries(c.prices||{}).map(([sku,p])=>[sku,gbp(p)])}/><form className="form-grid" onSubmit={e=>{e.preventDefault();const f=e.currentTarget;const {sku,price}=Object.fromEntries(new FormData(f));const p=db.products.find(p=>p.sku===sku);if(Number(price)<p.cost){notify('Agreed price must cover demo unit cost');return;}request('Account pricing',c.email+' · '+sku,{email:c.email,sku,price:Number(price)});f.reset();}}><label>Product<select name="sku">{db.products.map(p=><option key={p.sku}>{p.sku}</option>)}</select></label><label>Price ex. VAT<input name="price" type="number" min="0" step=".01" required/></label><button className="btn primary">Request pricing change</button></form></section>}</>;
}
function Campaigns() {
  const {db,notify}=useApp();const {request}=useAdmin();
  return <><h1>Promotions</h1><section className="panel"><h2>Schedule an offer</h2><p>Eligible offers apply at checkout. The larger of a bulk discount and an eligible offer is used.</p><form className="form-grid" onSubmit={e=>{e.preventDefault();const f=e.currentTarget;const c=Object.fromEntries(new FormData(f));if(c.end<c.start){notify('End date must follow start date');return;}c.discount=Number(c.discount);request('Promotion',c.name,c);f.reset();}}><label>Offer name<input name="name" required/></label><label>Audience<select name="audience"><option>All</option><option>Trade</option><option>Retail</option>{Object.keys(db.customers).map(e=><option key={e}>{e}</option>)}</select></label><label>Product<select name="sku"><option value="">All items</option>{db.products.map(p=><option key={p.sku}>{p.sku}</option>)}</select></label><label>Discount %<input name="discount" type="number" min="1" max="99" required/></label><label>Start<input name="start" type="date" required/></label><label>End<input name="end" type="date" required/></label><button className="btn primary">Submit for approval</button></form></section><section className="panel"><h2>Published offers</h2><Table headers={['Name','Audience','Product','Discount','Starts','Ends']} rows={db.campaigns.map(c=>[c.name,c.audience,c.sku||'All',c.discount+'%',c.start,c.end])}/></section></>;
}
function Inbox() {
  const {db,setDb}=useApp();
  const [id,setId]=useState(null);
  const item=db.inbox.find(i=>i.id===id);
  return <><h1>Support & quote requests</h1><section className="panel"><Table headers={['Kind','Contact','Date','Status','']} rows={db.inbox.map(i=>[i.kind,i.name,date(i.at),i.status,<button className="text-button" onClick={()=>setId(i.id)}>Open request</button>])}/></section>{item&&<section className="panel"><h2>{item.kind} request</h2><p>{item.name} · {item.email} · {item.company}</p>{item.sku&&<p>{item.qty} × {item.sku} {item.requiredDate&&'by '+item.requiredDate}</p>}<p>{item.message}</p>{item.status!=='Resolved'&&<button className="btn primary" onClick={()=>setDb(d=>({...d,inbox:d.inbox.map(i=>i.id===id?{...i,status:'Resolved'}:i)}))}>Mark resolved</button>}</section>}</>;
}
function Settings() {
  const {db,setDb,notify}=useApp();const {role}=useAdmin();
  return <><h1>Store settings</h1><section className="panel"><h2>Demo business rules</h2><form className="form-grid" onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));setDb(d=>({...d,settings:{visibility:f.visibility,guest:f.guest==='on',invoice:f.invoice},audit:audit(d,role,'Updated store rules')}));notify('Store rules updated');}}><label>Trade-only visibility<select name="visibility" defaultValue={db.settings.visibility}><option value="Hidden">Hide from Retail</option><option value="Visible">Visible, approved Trade purchase only</option></select></label><label>Invoice trigger<select name="invoice" defaultValue={db.settings.invoice}><option value="Dispatched">Dispatch / ready for collection</option><option value="Confirmed">Order confirmation</option></select></label><label className="inline"><input type="checkbox" name="guest" defaultChecked={db.settings.guest}/> Allow guest checkout</label><button className="btn primary">Save rules</button></form></section><section className="panel"><h2>Integrations</h2><p><Badge>Demo</Badge> PayPal outcomes are simulated. EQx and email require backend connections.</p><button className="btn outline" onClick={()=>download('bbew-demo-backup.json',JSON.stringify(db,null,2),'application/json')}>Download demo data</button></section></>;
}
function Audit() {const {db}=useApp();return <><h1>Audit log</h1><section className="panel"><Table headers={['Time','Actor','Change']} rows={db.audit.map(a=>[new Date(a.at).toLocaleString('en-GB'),a.by,a.action])}/></section></>;}

const Reports=()=> <Analytics reports/>;
const views={products:Products,inventory:Inventory,orders:Orders,customers:Customers,approvals:Approvals,campaigns:Campaigns,inbox:Inbox,reports:Reports,settings:Settings,audit:Audit};
export default function Admin() {
  const {path,db,setDb,notify}=useApp();
  const [role,setRole]=useState(()=>sessionStorage.getItem('bbew-role')||'Supervisor');
  const tab=path.split('?')[0].split('/')[2]||'';
  const item=nav.find(([slug])=>slug===tab);
  const View=tab?views[tab]:Analytics;
  function request(type,title,data) {
    const stockAtRequest=type==='Products'?Object.fromEntries(data.map(p=>[p.sku,db.products.find(item=>item.sku===p.sku)?.stock])):null;
    setDb(d=>({...d,approvals:[{id:crypto.randomUUID(),type,title,data,by:role,at:timestamp(),status:'Pending',stockAtRequest},...d.approvals],audit:audit(d,role,'Requested '+title)}));
    notify('Submitted for approval');
  }
  return <AdminContext.Provider value={{role,request}}><div className="admin-shell"><aside className="sidebar"><Link to="/admin"><Logo/></Link><span className="eyebrow">OPERATIONS</span><nav aria-label="Admin navigation">{nav.filter(([, , ,allowed])=>allowed.includes(role)).map(([slug,label,icon])=><Link key={slug} className={slug===tab?'current':''} to={'/admin'+(slug?'/'+slug:'')}><span>{icon}</span>{label}</Link>)}</nav><Link className="to-store" to="/">↗ Open storefront</Link></aside><div className="admin-main"><header className="admin-top"><span>BBEW Admin <Badge>Frontend demo</Badge></span><label>Demo role<select value={role} onChange={e=>{setRole(e.target.value);sessionStorage.setItem('bbew-role',e.target.value);}}>{roles.map(r=><option key={r}>{r}</option>)}</select></label></header><main className="admin-content">{item&&View&&item[3].includes(role)?<View key={tab+role}/>:<Empty>This view is unavailable for the selected demo role. <Link to="/admin">Open dashboard</Link>.</Empty>}</main></div></div></AdminContext.Provider>;
}
