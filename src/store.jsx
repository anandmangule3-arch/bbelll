import React, {useEffect,useRef,useState} from 'react';
import {useApp,Link,Picture,Price,Empty} from './main';
import {gbp,key,visible,purchasable,isTrade,validate,matches,quote,totals,date,invoicePdf} from './data';

import {families} from './catalogue';
import {Pagination,pageSlice} from './pagination';

const icons = ['◫','⌁','≋','◉','☼','◎'];
export function Logo() {return <img className="logo" src="/products/logo.webp" alt="BBEW Electrical Wholesale"/>;}
const productLink = p=>'/product/'+encodeURIComponent(p.sku);
const catLink = name=>'/shop?category='+encodeURIComponent(name);
const stages = ['Confirmed','Processing','Dispatched','Delivered'];

function Header() {
  const {db,customer,email,vat,setVat,lines,go,path} = useApp();
  const [q,setQ]=useState('');
  const [open,setOpen]=useState(false);
  const [menu,setMenu]=useState(false);
  const [department,setDepartment]=useState(db.categories[0]);
  useEffect(()=>{setOpen(false);setMenu(false);},[path]);
  const hints = q.trim()?db.products.filter(p=>visible(p,customer,db.settings)&&matches(p,q)).slice(0,5):[];
  return <><div className="utility"><div className="wrap utility-inner"><span>Electrical wholesale · West Midlands</span><div><Link to="/help">Help & quotes</Link><button onClick={()=>setVat(!vat)} aria-pressed={vat}>Prices {vat?'inc.':'ex.'} VAT <span>⇄</span></button></div></div></div>
  <header className="wrap header">
    <Link to="/" aria-label="BBEW home"><Logo/></Link>
    <form className="search" role="search" onSubmit={e=>{e.preventDefault();setOpen(false);go('/shop?q='+encodeURIComponent(q));}}>
      <input aria-label="Search catalogue" placeholder="Search by product name, SKU or part number" value={q} onFocus={()=>setOpen(true)} onChange={e=>{setQ(e.target.value);setOpen(true);}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}} onBlur={e=>{if(!e.currentTarget.parentElement.contains(e.relatedTarget))setOpen(false);}}/>
      <button aria-label="Search" className="btn primary">⌕</button>
      {open&&hints.length>0&&<div className="suggestions">{hints.map(p=><Link to={productLink(p)} key={p.sku}><span>{p.name}</span><small>{p.sku}</small></Link>)}</div>}
    </form>
    <div className="head-links"><Link to="/account"><b>♙</b><span>{email?'My account':'Sign in'}</span></Link><Link to="/basket"><b>◫</b><span>Basket <em>{lines.reduce((n,l)=>n+l.qty,0)}</em></span></Link></div>
  </header>
  <nav className="nav"><div className="wrap nav-inner">
    <button className="dept" aria-expanded={menu} onClick={()=>setMenu(!menu)} onKeyDown={e=>{if(e.key==='Escape')setMenu(false);}}>☰ &nbsp; Departments <span>⌄</span></button>
    <Link to="/quick-order">Quick Order</Link><Link to="/shop">Shop all</Link><Link to="/shop?clearance=1">Clearance</Link><Link to="/news">News</Link><Link className="apply" to="/trade">Apply for a trade account ↗</Link>
    {menu&&<div className="mega" onKeyDown={e=>{if(e.key==='Escape')setMenu(false);}}><div className="mega-departments">{db.categories.map((c,i)=><button type="button" aria-pressed={c===department} key={c} onClick={()=>setDepartment(c)}><span>{icons[i%icons.length]}</span>{c}</button>)}</div><div className="mega-families"><Link className="mega-heading" to={catLink(department)}>{department} →</Link>{(families[department]||[]).map(f=><Link key={f} to={catLink(department)+'&family='+encodeURIComponent(f)}>{f}</Link>)}</div></div>}
  </div></nav></>;
}
function Footer() {
  return <footer><div className="wrap footer-inner"><Link to="/"><Logo/></Link><div><Link to="/trade">Trade accounts</Link><Link to="/help">Help & quotes</Link><Link to="/news">News</Link><Link to="/admin">Admin demo</Link></div><small>BBEW frontend demo · Sample catalogue and simulated transactions</small></div></footer>;
}
function Card({p}) {
  const {customer,db,add}=useApp();
  const can=purchasable(p,customer);
  const [qty,setQty]=useState(p.pack);
  return <article className="product-card">
    <Link to={productLink(p)} className="card-picture"><Picture product={p}/></Link>
    <div className="card-body">{(p.tag||p.restricted)&&<div className="card-tags">{p.tag&&<span>{p.tag}</span>}{p.restricted&&<span>Trade only</span>}</div>}<div className="product-meta"><strong>{p.brand}</strong><span>{p.sku}</span></div>
    <Link className="product-name" to={productLink(p)}>{p.name}</Link>
    <small>{p.spec}</small>
    <div className="card-buy"><div className="price">{can?<Price amount={quote(p,Number(qty),customer,db.campaigns).price}/>:<small>Approved trade account required</small>}</div>
    <span className={'stock '+(!p.stock?'out':p.stock<10?'low':'')}>{p.stock?p.stock<10?'Low stock · '+p.stock:'In stock':'Out of stock'} · {p.unit}</span></div>
    {can?<form className="card-order" onSubmit={e=>{e.preventDefault();add(p,Number(qty));}}><input type="number" aria-label={'Quantity for '+p.sku} min={p.pack} step={p.pack} max={p.stock} value={qty} onChange={e=>setQty(e.target.value)} required/><button className="btn outline full" disabled={p.stock<p.pack}>＋ Add to basket</button></form>:<Link className="btn outline full" to="/trade">Trade access</Link>}</div>
  </article>;
}
function Home() {
  const {db,customer}=useApp();
  return <main>
    <div className="wrap">
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow">BB ELECTRICAL WHOLESALERS</span><h1>Electrical supplies.<br/>Ready for the job.</h1><p>Find the right parts, check stock and get your order moving.</p><div className="actions"><Link className="btn primary" to="/shop">Shop products &nbsp; →</Link><Link className="btn ghost" to="/quick-order">Quick Order</Link></div></div>
        <div className="hero-art"><div className="hero-photo"><img src="/products/drill.webp" alt="Bosch cordless combi drill and carry case"/></div><span>POWER TOOLS / BOSCH PROFESSIONAL</span></div>
      </section>
      <div className="service-strip"><span><b>↗</b> Order by SKU or part number</span><span><b>◫</b> Delivery or collection</span><span><b>♙</b> Account-specific trade prices</span></div>
      <section className="section"><div className="section-title"><h2>Shop by department</h2><Link to="/shop">Browse catalogue →</Link></div><div className="category-grid">{db.categories.map((name,i)=><Link to={catLink(name)} key={name}><span>{icons[i%icons.length]}</span><strong>{name}</strong><b>↗</b></Link>)}</div></section>
      <section className="section"><div className="section-title"><h2>Featured products</h2><Link to="/shop">View all products →</Link></div><div className="products">{db.products.filter(p=>visible(p,customer,db.settings)).slice(0,4).map(p=><Card key={p.sku} p={p}/>)}</div></section>
      <section className="section"><div className="section-title"><h2>Shop by brand</h2><Link to="/shop?clearance=1">Shop clearance →</Link></div><div className="brand-row">{db.brands.map(brand=><Link key={brand} to={'/shop?brand='+encodeURIComponent(brand)}>{brand}</Link>)}</div></section>
      <section className="trade-callout"><div><h2>Buying for your business?</h2><p>Apply for trade pricing, saved delivery details and repeat ordering.</p></div><Link className="btn primary" to="/trade">Apply for a trade account →</Link></section>
    </div>
  </main>;
}
function Shop() {
  const {db,customer,path}=useApp();
  const params=new URLSearchParams(path.split('?')[1]);
  const category=params.get('category')||'';
  const q=params.get('q')||'';
  const [brand,setBrand]=useState(params.get('brand')||'');
  const [family,setFamily]=useState(params.get('family')||'');
  const [page,setPage]=useState(1);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const clearance=params.has('clearance');
  const [stock,setStock]=useState(false);
  const [spec,setSpec]=useState('');
  const [sort,setSort]=useState('recommended');
  const [layout,setLayout]=useState(()=>sessionStorage.getItem('bbew-layout')||'grid');
  function toggleLayout(){const next=layout==='grid'?'list':'grid';setLayout(next);sessionStorage.setItem('bbew-layout',next);}
  const items=db.products.filter(p=>visible(p,customer,db.settings)&&(!stock||p.stock>0)&&(!category||p.category===category)&&(!brand||p.brand===brand)&&(!family||p.family===family)&&(!clearance||p.tag==='Clearance')&&matches(p,q)&&p.spec.toLowerCase().includes(spec.toLowerCase()));
  if(sort!=='recommended') items.sort((a,b)=>(sort==='low'?1:-1)*(quote(a,a.pack,customer,db.campaigns).price-quote(b,b.pack,customer,db.campaigns).price));
  const displayed=pageSlice(items,page);
  const heading=q?'Search results for “'+q+'”':category||(clearance?'Clearance':'Electrical catalogue');
  return <main className="wrap page catalogue"><div className="crumb"><Link to="/">Home</Link> / Catalogue {category&&' / '+category}</div>
    <div className="catalogue-heading"><h1>{heading}</h1><p>Find products by department, brand or technical specification.</p></div>
    <button type="button" className="btn outline mobile-filter" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}>{filtersOpen?'Hide filters':'Show filters'}</button>
    <div className="catalogue-layout"><aside className={'catalogue-filter panel '+(filtersOpen?'filter-open':'')} aria-label="Catalogue filters">
      <div className="section-title"><h2>Filters</h2><Link to="/shop">Clear all</Link></div>
      <fieldset><legend>Department</legend><Link className={!category?'chosen':''} to="/shop">All departments</Link>{db.categories.map(c=><Link key={c} className={category===c?'chosen':''} to={catLink(c)}>{c}</Link>)}</fieldset>
      {category&&families[category]&&<label>Product family<select value={family} onChange={e=>{setFamily(e.target.value);setPage(1);}}><option value="">All families</option>{families[category].map(f=><option key={f}>{f}</option>)}</select></label>}
      <label>Brand<select value={brand} onChange={e=>{setBrand(e.target.value);setPage(1);}}><option value="">All brands</option>{db.brands.map(b=><option key={b}>{b}</option>)}</select></label>
      <label>Specification<input placeholder="e.g. warm white" value={spec} onChange={e=>{setSpec(e.target.value);setPage(1);}}/></label>
      <label className="inline"><input type="checkbox" checked={stock} onChange={e=>{setStock(e.target.checked);setPage(1);}}/> In stock only</label>
    </aside><div className="catalogue-results"><div className="toolbar panel"><strong aria-live="polite">{items.length.toLocaleString('en-GB')} products</strong><div className="actions"><select aria-label="Sort products" value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="recommended">Recommended</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><button className="btn outline" onClick={toggleLayout}>{layout==='grid'?'List view':'Grid view'}</button></div></div>
    {items.length?<><div className={'products '+layout}>{displayed.items.map(p=><Card key={p.sku} p={p}/>)}</div><Pagination {...displayed} onChange={n=>{setPage(n);document.querySelector('.catalogue-results').scrollIntoView?.({block:'start'});}}/></>:<Empty>No products found. <Link to="/shop">Browse all products</Link> or <Link to="/help?kind=Quote">request a quote</Link>.</Empty>}
    </div></div></main>;
}
function Product({sku}) {
  const {db,customer,setDb,add,visitId}=useApp();
  const p=db.products.find(item=>item.sku===sku);
  const access=p&&visible(p,customer,db.settings);
  const [qty,setQty]=useState(p?.pack||1);
  useEffect(()=>{if(access) setDb(d=>({...d,views:{...d.views,[sku]:(d.views[sku]||0)+1},viewEvents:[...d.viewEvents,{sku,at:new Date().toISOString(),trade:isTrade(customer),visitId}]}));},[sku,access,setDb,visitId]);
  if(!access) return <main className="wrap page"><Empty>Product unavailable. <Link to="/shop">Browse the catalogue</Link>.</Empty></main>;
  const can=purchasable(p,customer);
  const pricing=quote(p,Number(qty),customer,db.campaigns);
  return <main className="wrap page"><div className="crumb"><Link to="/">Home</Link> / <Link to={catLink(p.category)}>{p.category}</Link> / {p.sku}</div>
    <div className="detail"><div className="detail-photo"><Picture product={p}/></div><div><div className="product-meta"><strong>{p.brand}</strong><span>{p.sku}</span></div><h1>{p.name}</h1><p>{p.description}</p><p className="stock">{p.stock?p.stock+' available':'Out of stock'}</p>
    {can?<><p className="price"><Price amount={pricing.price}/> / {p.unit}</p>{isTrade(customer)&&pricing.price<p.price&&<p className="stock">Save {gbp(p.price-pricing.price)} ex. VAT per {p.unit}</p>}
    {p.bulkQty>0&&<p className="info">Buy {p.bulkQty}+ for {p.bulkOff}% bulk discount</p>}<form className="actions" onSubmit={e=>{e.preventDefault();add(p,qty);}}><label>Quantity <input type="number" min={p.pack} step={p.pack} value={qty} onChange={e=>setQty(e.target.value)} required/></label><button className="btn primary" disabled={p.stock<p.pack}>Add to basket</button></form></>:<Link className="btn primary" to="/trade">Apply for trade access</Link>}
    <p><Link to={'/help?kind=Quote&sku='+encodeURIComponent(sku)}>Request a quote →</Link></p></div></div>
    <section className="panel"><h2>Technical specifications</h2><dl><dt>Manufacturer part number</dt><dd>{p.part}</dd><dt>Specification</dt><dd>{p.spec}</dd><dt>Unit and minimum pack</dt><dd>{p.unit} · {p.pack}</dd></dl>{p.datasheet&&<a href={p.datasheet} target="_blank" rel="noreferrer">View datasheet ↗</a>}</section>
    <section className="panel"><h2>Delivery & collection</h2><p>Review available fulfilment options and charges at checkout.</p></section>
    {db.products.some(item=>item.sku!==p.sku&&item.category===p.category&&visible(item,customer,db.settings))&&<section className="section"><h2>More in {p.category}</h2><div className="products">{db.products.filter(item=>item.sku!==p.sku&&item.category===p.category&&visible(item,customer,db.settings)).slice(0,4).map(item=><Card key={item.sku} p={item}/>)}</div></section>}
  </main>;
}
function QuickOrder() {
  const {db,customer,basket,setBasket,notify}=useApp();
  const [text,setText]=useState('');
  const [checked,setChecked]=useState(false);
  const totalBySku={};
  const rows=text.trim()?text.trim().split(/\r?\n/).map(line=>line.trim()).filter(Boolean).filter(line=>!/^sku[,;\t ]+(quantity|qty)$/i.test(line)).map(line=>{
    const [code,raw,...extra]=line.split(/[,;\t ]+/);
    const p=db.products.find(p=>purchasable(p,customer)&&[p.sku,p.part].some(v=>v.toUpperCase()===code.toUpperCase()));
    const qty=Number(raw);
    const combined=p?(totalBySku[p.sku]||basket[p.sku]||0)+qty:qty;
    const error=extra.length?'Use one code and quantity per line':!p?'Code unavailable':validate(p,qty,customer)||validate(p,combined,customer);
    if(p&&!error) totalBySku[p.sku]=combined;
    return {code,qty,p,error,price:p&&!error?quote(p,combined,customer,db.campaigns).price:0};
  }):[];
  return <main className="wrap page narrow"><div className="crumb"><Link to="/">Home</Link> / Quick Order</div><h1>Quick Order</h1><p>Paste one SKU or manufacturer part number and quantity per line, or upload a two-column CSV.</p><section className="panel"><label>Product codes and quantities<textarea rows={6} placeholder={'BB-SK13, 10\nAI937, 2'} value={text} onChange={e=>{setText(e.target.value);setChecked(false);}}/></label><div className="actions"><button className="btn primary" disabled={!rows.length} onClick={()=>setChecked(true)}>Check items</button><label className="file-label">Upload CSV<input type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files[0];if(file){setText(await file.text());setChecked(false);}}}/></label></div></section>
    {checked&&<section className="panel"><h2>Order preview</h2><div className="table-scroll"><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Unit price</th><th>Validation</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{r.code}</td><td>{r.p?.name||'—'}</td><td>{Number.isFinite(r.qty)?r.qty:'—'}</td><td>{r.error?'—':<Price amount={r.price}/>}</td><td>{r.error||'Ready'}</td></tr>)}</tbody></table></div><button className="btn primary" disabled={!Object.keys(totalBySku).length} onClick={()=>{setBasket(b=>({...b,...totalBySku}));setText('');setChecked(false);notify('Valid lines added to basket');}}>Add valid lines</button> <Link className="btn outline" to="/basket">View basket</Link></section>}
  </main>;
}
function Summary({sum}) {return <dl className="summary"><dt>Subtotal ex. VAT</dt><dd>{gbp(sum.net)}</dd><dt>Delivery ex. VAT</dt><dd>{gbp(sum.shipping)}</dd><dt>VAT</dt><dd>{gbp(sum.vat)}</dd><dt className="total">Total</dt><dd className="total">{gbp(sum.total)}</dd></dl>;}
function Basket() {
  const {db,lines,setBasket,customer,basket,email,setDb,notify}=useApp();
  return <main className="wrap page"><div className="crumb"><Link to="/">Home</Link> / Basket</div><h1>Your basket</h1>{lines.length?<div className="checkout-grid"><section className="panel"><div className="table-scroll"><table><thead><tr><th>Item</th><th>Quantity</th><th>Unit price</th><th></th></tr></thead><tbody>{lines.map(l=><tr key={l.sku}><td><Link to={productLink(l.p||l)}>{l.name}</Link><br/><small>{l.error||l.rule}</small></td><td><input className="qty" aria-label={'Quantity '+l.sku} type="number" min={1} step={l.p?.pack||1} value={l.qty} onChange={e=>setBasket({...basket,[l.sku]:Number(e.target.value)})}/></td><td><Price amount={l.price}/></td><td><button className="text-button" onClick={()=>setBasket(Object.fromEntries(Object.entries(basket).filter(([sku])=>sku!==l.sku)))}>Remove</button></td></tr>)}</tbody></table></div>
  {customer?<button className="btn outline" onClick={()=>{setDb(d=>({...d,customers:{...d.customers,[email]:{...customer,lists:[...(customer.lists||[]),{id:Date.now(),basket}]}}}));notify('Saved to your account');}}>Save basket</button>:<Link to="/account">Sign in to save a shopping list</Link>}</section><aside className="panel"><h2>Order summary</h2><Summary sum={totals(lines,'Delivery')}/><p><small>Estimated delivery. Collection can be selected at checkout.</small></p>{lines.some(l=>l.error)?<p className="error">Resolve unavailable items or quantities before checkout.</p>:<Link className="btn primary full" to={email||db.settings.guest?'/checkout':'/account'}>{email||db.settings.guest?'Checkout':'Sign in to checkout'}</Link>}</aside></div>:<Empty>Your basket is empty. <Link to="/shop">Start shopping →</Link></Empty>}</main>;
}
function Checkout() {
  const {db,customer,email,setDb,lines,setBasket,go,notify,visitId}=useApp();
  const [method,setMethod]=useState('Delivery');
  const [pay,setPay]=useState('PayPal');
  const submitting=useRef(false);
  const sum=totals(lines,method);
  if(!lines.length||lines.some(l=>l.error)||(!db.settings.guest&&!email)) return <main className="wrap page"><Empty><Link to="/basket">Review your basket</Link> before checkout.</Empty></main>;
  function submit(e) {
    e.preventDefault();
    const f=Object.fromEntries(new FormData(e.currentTarget));
    if(f.scenario==='Declined') {notify('Demo payment declined. Your basket is unchanged.');return;}
    if(submitting.current) return;
    submitting.current=true;
    const id=String(db.nextOrder);
    const identity=key(f.email);
    const order={...f,...sum,id,created:new Date().toISOString(),visitId,email:identity,trade:isTrade(customer),method,status:'Confirmed',payment:pay==='Credit'?'On account (demo)':'Paid (demo)',lines:lines.map(({sku,name,qty,price,cost,rule,p})=>({sku,name,qty,price,cost,rule,restricted:!!p.restricted})),invoice:db.settings.invoice==='Confirmed'?'INV-'+id:null};
    setDb(d=>({...d,nextOrder:d.nextOrder+1,orders:[order,...d.orders],products:d.products.map(p=>({...p,stock:p.stock-(lines.find(l=>l.sku===p.sku)?.qty||0)})),customers:email?{...d.customers,[email]:{...customer,address:f.address||customer.address,postcode:f.postcode||customer.postcode}}:d.customers}));
    sessionStorage.setItem('bbew-last-order',id);
    setBasket({});
    go('/order/'+id);
  }
  return <main className="wrap page"><div className="crumb"><Link to="/basket">Basket</Link> / Checkout</div><h1>Checkout</h1><form className="checkout-grid" onSubmit={submit}><section className="panel"><h2>Contact and fulfilment</h2><div className="form-grid"><label>Full name<input name="name" defaultValue={customer?.name} required/></label><label>Email<input name="email" type="email" defaultValue={email} readOnly={!!email} required/></label><label>Fulfilment<select value={method} onChange={e=>setMethod(e.target.value)}><option>Delivery</option><option>Collection</option></select></label>{isTrade(customer)&&<label>PO / job reference<input name="po"/></label>}{method==='Delivery'&&<><label>Delivery address<input name="address" defaultValue={customer?.address} required/></label><label>Postcode<input name="postcode" defaultValue={customer?.postcode} required/></label></>}<label>Payment<select value={pay} onChange={e=>setPay(e.target.value)}><option value="PayPal">PayPal (simulated)</option>{isTrade(customer)&&customer.credit&&<option value="Credit">Trade credit (simulated)</option>}</select></label>{pay==='PayPal'&&<label>Demo outcome<select name="scenario"><option>Successful</option><option>Declined</option></select></label>}</div><p className="info">Demo checkout. No payment is collected and no email is sent.</p></section><aside className="panel"><h2>Review your order</h2>{lines.map(l=><p key={l.sku}>{l.qty} × {l.name}</p>)}<Summary sum={sum}/><button className="btn primary full">Place demo order</button></aside></form></main>;
}
function Order({id}) {
  const {db,email,notify}=useApp();
  const order=db.orders.find(o=>o.id===id&&(o.email===email||sessionStorage.getItem('bbew-last-order')===id));
  if(!order)return <main className="wrap page"><Empty>Open the order from <Link to="/account">your account</Link>.</Empty></main>;
  const steps=order.method==='Collection'?['Confirmed','Processing','Ready for collection','Collected']:stages;
  return <main className="wrap page narrow"><h1>Order #{order.id}</h1><p>{date(order.created)} · {order.payment} · {order.method}</p><section className="panel"><h2>{order.status}</h2>{order.status!=='Cancelled'&&<div className="steps">{steps.map((s,i)=><span key={s} className={steps.indexOf(order.status)>=i?'done':''}>{s}</span>)}</div>}{order.tracking&&<p>Tracking reference: {order.tracking}</p>}{order.lines.map(l=><p key={l.sku}>{l.qty} × {l.name} · {gbp(l.qty*l.price)} ex. VAT</p>)}<Summary sum={order}/><button className="btn outline" onClick={()=>invoicePdf(order).catch(()=>notify('Unable to generate PDF'))}>Download {order.invoice?'invoice':'order receipt'} (PDF)</button></section><Link className="btn primary" to="/shop">Continue shopping →</Link></main>;
}
function Account() {
  const {db,email,setEmail,customer,setDb,go,notify,setBasket,basket}=useApp();
  function signIn(address,name='') {
    const id=key(address);
    if(!db.customers[id]) setDb(d=>({...d,customers:{...d.customers,[id]:{name:name||id.split('@')[0],email:id,status:'Retail',lists:[]}}}));
    setEmail(id);
    notify('Signed in to demo account');
  }
  if(!customer)return <main className="wrap page narrow"><h1>My account</h1><section className="panel"><h2>Demo sign in</h2><p>Choose a sample account or enter an email to try your own local account.</p><div className="actions"><button className="btn primary" onClick={()=>signIn('retail@demo.test')}>Use retail demo</button><button className="btn outline" onClick={()=>signIn('trade@demo.test')}>Use approved Trade demo</button></div><form className="stack" onSubmit={e=>{e.preventDefault();signIn(new FormData(e.currentTarget).get('email'));}}><label>Email address<input type="email" name="email" required/></label><button className="btn outline">Continue with email</button></form><p><Link to="/trade">Apply for trade pricing →</Link></p></section></main>;
  const orders=db.orders.filter(o=>o.email===email);
  function reorder(order) {
    const next={...basket};
    let skipped=0;
    for(const line of order.lines){
      const p=db.products.find(p=>p.sku===line.sku);
      const qty=(next[line.sku]||0)+line.qty;
      if(validate(p,qty,customer)) skipped++; else next[line.sku]=qty;
    }
    setBasket(next);go('/basket');notify(skipped?skipped+' unavailable line(s) skipped. Current basket pricing applies.':'Items added with current prices and availability.');
  }
  return <main className="wrap page"><div className="section-title"><h1>My account</h1><button className="btn outline" onClick={()=>setEmail('')}>Sign out</button></div><div className="account-banner"><div><h2>{customer.name}</h2><p>{customer.email} · {customer.status==='Retail'?'Retail account':'Trade application: '+customer.status}</p></div><Link className="btn primary" to={isTrade(customer)?'/quick-order':'/trade'}>{isTrade(customer)?'Quick Order':'Trade account'}</Link></div>
  <section className="panel"><h2>Orders & invoices</h2>{orders.length?<div className="table-scroll"><table><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><Link to={'/order/'+o.id}>#{o.id}</Link></td><td>{date(o.created)}</td><td>{o.status}</td><td>{gbp(o.total)}</td><td><button className="text-button" onClick={()=>reorder(o)}>Buy Again</button> · <button className="text-button" onClick={()=>invoicePdf(o).catch(()=>notify('Unable to generate PDF'))}>{o.invoice?'Invoice':'Receipt'} PDF</button></td></tr>)}</tbody></table></div>:<Empty>No orders yet.</Empty>}</section>
  <section className="panel"><h2>Saved baskets</h2>{customer.lists?.length?customer.lists.map((l,i)=><p key={l.id}>Saved basket {i+1} · {Object.keys(l.basket).length} lines <button className="text-button" onClick={()=>{setBasket(l.basket);go('/basket');}}>Restore basket</button> · <button className="text-button" onClick={()=>setDb(d=>({...d,customers:{...d.customers,[email]:{...customer,lists:customer.lists.filter(item=>item.id!==l.id)}}}))}>Delete</button></p>):<p>Save a basket to quickly retrieve it later.</p>}</section></main>;
}
function Trade() {
  const {customer,email,db,setDb,setEmail,go,notify}=useApp();
  const [draft,setDraft]=useState(null);
  function submit() {
    const id=key(draft.email);
    if(['Approved','Pending','Suspended'].includes(db.customers[id]?.status)){notify('This demo account already has a trade record');return;}
    setDb(d=>({...d,customers:{...d.customers,[id]:{...d.customers[id],...draft,email:id,verified:true,status:'Pending',lists:d.customers[id]?.lists||[]}},audit:[{at:new Date().toISOString(),by:id,action:'Submitted trade application'},...d.audit]}));
    setEmail(id);go('/account');notify('Trade application submitted');
  }
  return <main className="wrap page narrow"><h1>Apply for a trade account</h1><p>Get trade prices, saved delivery details and faster repeat orders after approval.</p><section className="panel">{customer&&['Approved','Pending','Suspended'].includes(customer.status)?<p>Application status: <strong>{customer.status}</strong>. <Link to="/account">My account →</Link></p>:draft?<><h2>Verify your email</h2><p>Simulate email verification for {draft.email} to submit this application.</p><button className="btn primary" onClick={submit}>Verify and submit</button> <button className="btn outline" onClick={()=>setDraft(null)}>Edit details</button></>:<form className="form-grid" onSubmit={e=>{e.preventDefault();setDraft(Object.fromEntries(new FormData(e.currentTarget)));}}><label>Full name<input name="name" defaultValue={customer?.name} required/></label><label>Company name<input name="company" required/></label><label>Business email<input name="email" type="email" defaultValue={email} readOnly={!!email} required/></label><label>Phone<input type="tel" name="phone" required/></label><label>Business postcode<input name="postcode" required/></label><label>Company number (optional)<input name="companyNumber"/></label><button className="btn primary">Continue to verification</button></form>}</section></main>;
}
function Help() {
  const {path,customer,setDb,notify}=useApp();
  const params=new URLSearchParams(path.split('?')[1]);
  const [kind,setKind]=useState(params.get('kind')||'Support');
  return <main className="wrap page narrow"><h1>Help & quotes</h1><p>Send a product question, request a quote or ask about an existing order.</p><section className="panel"><form className="form-grid" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const data=Object.fromEntries(new FormData(form));setDb(d=>({...d,inbox:[{...data,kind,at:new Date().toISOString(),id:Date.now(),status:'New'},...d.inbox]}));form.reset();notify('Request saved to the demo admin inbox');}}><label>Request type<select value={kind} onChange={e=>setKind(e.target.value)}><option>Support</option><option>Quote</option></select></label><label>Your name<input name="name" defaultValue={customer?.name} required/></label><label>Email<input type="email" name="email" defaultValue={customer?.email} required/></label>{kind==='Quote'&&<><label>Company<input name="company" defaultValue={customer?.company}/></label><label>Product SKU<input name="sku" defaultValue={params.get('sku')||''} required/></label><label>Quantity<input type="number" min="1" name="qty" required/></label><label>Required by<input type="date" name="requiredDate"/></label></>}<label className="span-two">Message<textarea name="message" required/></label><button className="btn primary">Send request</button></form></section></main>;
}
function ExitBasket() {
  const {path,lines,customer,email,basket,setDb,go,notify}=useApp();
  const dialog=useRef(null);
  useEffect(()=>{
    if(!lines.length||path.startsWith('/checkout')||!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    function leaving(e) {
      if(e.clientY>0||e.relatedTarget||sessionStorage.getItem('bbew-exit-seen')) return;
      sessionStorage.setItem('bbew-exit-seen','yes');
      dialog.current?.showModal();
    }
    document.addEventListener('mouseout',leaving);
    return ()=>document.removeEventListener('mouseout',leaving);
  },[lines.length,path]);
  function save() {
    if(customer) {
      setDb(d=>({...d,customers:{...d.customers,[email]:{...customer,lists:[...(customer.lists||[]),{id:Date.now(),basket}]}}}));
      notify('Saved to your account');
    } else notify('Basket kept in this browser');
    dialog.current.close();
  }
  return <dialog ref={dialog} className="exit-dialog"><h2>Keep your basket?</h2><p>You can save these items and return when you are ready.</p><div className="actions"><button className="btn primary" onClick={()=>{dialog.current.close();go('/basket');}}>Review basket</button><button className="btn outline" onClick={save}>Save for later</button><form method="dialog"><button className="btn outline">Close</button></form></div></dialog>;
}
export default function Store() {
  const {path}=useApp();
  const route=path.split('?')[0];
  const tail=route.split('/').at(-1);
  let content;
  if(route==='/') content=<Home/>;
  else if(route==='/shop') content=<Shop key={path}/>;
  else if(route.startsWith('/product/')) content=<Product key={tail} sku={decodeURIComponent(tail)}/>;
  else if(route==='/quick-order') content=<QuickOrder/>;
  else if(route==='/basket') content=<Basket/>;
  else if(route==='/checkout') content=<Checkout/>;
  else if(route.startsWith('/order/')) content=<Order id={tail}/>;
  else if(route==='/account') content=<Account/>;
  else if(route==='/trade') content=<Trade/>;
  else if(route==='/help') content=<Help key={path}/>;
  else if(route==='/news') content=<main className="wrap page"><h1>News</h1><Empty>No announcements have been published.</Empty></main>;
  else content=<main className="wrap page"><Empty>Page unavailable. <Link to="/">Return to the homepage</Link>.</Empty></main>;
  return <><Header/>{content}<Footer/><ExitBasket/></>;
}
