import React,{useMemo,useState} from 'react';
import {useApp,Link,Empty} from './main';
import {csv,date,download,gbp,round} from './data';
import {variantProducts} from './catalogue';
import {Pagination,pageSlice} from './pagination';

const DAY=86400000;
const utc=d=>new Date(d).toISOString().slice(0,10);
const now=new Date();
const until=utc(now);
const defaultFrom=utc(+now-29*DAY);
const makeDate=(days,hour)=>new Date(new Date(until).getTime()-days*DAY+hour*3600000).toISOString();
const sampleProducts=variantProducts.filter((_,i)=>i%143<3).slice(0,45);
const sampleOrders=Array.from({length:260},(_,i)=>{
  const p=sampleProducts[(i*7)%sampleProducts.length];
  const trade=p.restricted||i%3!==0;
  const qty=p.pack*(i%5===0?12:1+i%7);
  const bulk=qty>=p.bulkQty;
  const rule=bulk?'Bulk 8%':i%11===0?'Sample promotion':trade?'Trade':'Retail';
  const price=round((trade?p.trade:p.price)*(bulk?.92:i%11===0?.95:1));
  const net=round(qty*price);
  const account=i%17===0?7:i%7;
  const group=i%2?i%37:365+i%36;
  return {id:'SAMPLE-'+(i+1),created:makeDate(account===7?Math.max(70,group):group,7+i%12),visitId:'sample-'+i,trade,email:trade?'trade-'+account+'@example.test':'retail-'+account+'@example.test',status:'Delivered',lines:[{sku:p.sku,name:p.name,qty,price,cost:p.cost,rule,restricted:!!p.restricted}],net,vat:round(net*.2),total:round(net*1.2),sample:true};
});
const sampleVisits=sampleOrders.flatMap((o,i)=>[...Array.from({length:10+i%9},(_,u)=>({id:u?'sample-other-'+i+'-'+u:o.visitId,at:o.created})),]);
const sampleViews=sampleOrders.flatMap((o,i)=>Array.from({length:2+i%7},()=>({sku:o.lines[0].sku,at:o.created,trade:o.trade})));
const week=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const ukClock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',hour:'2-digit',hourCycle:'h23'});
const inRange=(at,from,to)=>!!at&&at.slice(0,10)>=from&&at.slice(0,10)<=to;
const sum=(rows,f)=>rows.reduce((a,b)=>a+f(b),0);
const iso=d=>Date.parse(d+'T00:00:00Z');
const revenue=o=>o.net;
const periodKey=(at,group)=>{
  const day=at.slice(0,10);
  if(group==='Monthly'||group==='Year over year')return day.slice(0,7);
  if(group!=='Weekly')return day;
  const d=new Date(day);
  return utc(+d-((d.getUTCDay()+6)%7)*DAY);
};

function calculate(db,{from,to,segment,group,sample}) {
  const all=[...db.orders,...(sample?sampleOrders:[])].filter(o=>o.status!=='Cancelled');
  const match=trade=>segment==='All'||trade===(segment==='Trade');
  const orders=all.filter(o=>inRange(o.created,from,to)&&match(o.trade));
  const visits=[...db.visitLog,...(sample?sampleVisits:[])].filter(v=>inRange(v.at,from,to));
  const visitIds=new Set(visits.map(v=>v.id));
  const conversions=new Set(orders.map(o=>o.visitId).filter(id=>visitIds.has(id))).size;
  const trends={},prior={},discounts={Standard:0,Bulk:0,Promotion:0};
  const heat=Array.from({length:7},()=>Array(24).fill(0));
  const products=new Map(db.products.map(p=>[p.sku,{...p,views:0,units:0,revenue:0,restrictedUnits:0,restrictedSales:0,buyers:new Set(),lastSold:''}]));
  const accounts=new Map();
  for(const o of all) {
    if(o.trade&&o.created.slice(0,10)<=to) {
      const row=accounts.get(o.email)||{email:o.email,dates:[],revenue:0,orders:0,sample:!!o.sample};
      row.dates.push(o.created);
      if(inRange(o.created,from,to)&&match(true)){row.revenue+=o.net;row.orders++;}
      accounts.set(o.email,row);
    }
    for(const l of o.lines) {
      const p=products.get(l.sku);
      if(p&&o.created.slice(0,10)<=to&&o.created>p.lastSold)p.lastSold=o.created;
    }
    if(group==='Year over year'&&match(o.trade)){
      const shifted=new Date(o.created);shifted.setUTCFullYear(shifted.getUTCFullYear()+1);
      const day=shifted.toISOString();
      if(inRange(day,from,to)){const k=periodKey(day,group);prior[k]=(prior[k]||0)+o.net;}
    }
  }
  for(const o of orders) {
    const k=periodKey(o.created,group);
    trends[k]=(trends[k]||0)+o.net;
    const time=Object.fromEntries(ukClock.formatToParts(new Date(o.created)).map(({type,value})=>[type,value]));
    heat[week.indexOf(time.weekday)][Number(time.hour)]++;
    for(const l of o.lines) {
      const amount=l.price*l.qty;
      const rule=l.rule?.startsWith('Bulk')?'Bulk':['Standard','Trade','Retail','Account price'].includes(l.rule)||!l.rule?'Standard':'Promotion';
      discounts[rule]+=amount;
      const p=products.get(l.sku);
      if(!p)continue;
      p.units+=l.qty;p.revenue+=amount;
      if(o.trade&&(l.restricted??p.restricted)){
        p.restrictedUnits+=l.qty;p.restrictedSales+=amount;p.buyers.add(o.email);
      }
    }
  }
  for(const v of [...db.viewEvents,...(sample?sampleViews:[])]) {
    const p=products.get(v.sku);
    if(p&&inRange(v.at,from,to)&&match(v.trade))p.views++;
  }
  const points=new Map();
  if(iso(from)<=iso(to)){
    if(group==='Daily'||group==='Weekly'){
      const step=group==='Daily'?DAY:7*DAY;
      for(let t=iso(periodKey(from,group));t<=iso(to);t+=step){
        const day=utc(t); points.set(day,[day,trends[day]||0,prior[day]||0]);
      }
    }else{
      const t=new Date(from.slice(0,7)+'-01');
      while(+t<=iso(to)){
        const month=utc(t).slice(0,7);points.set(month,[month,trends[month]||0,prior[month]||0]);t.setUTCMonth(t.getUTCMonth()+1);
      }
    }
  }
  const productRows=[...products.values()];
  const trade=orders.filter(o=>o.trade);
  const retail=orders.filter(o=>!o.trade);
  const net=sum(orders,revenue);
  const profit=net-sum(orders,o=>sum(o.lines,l=>l.qty*l.cost));
  const tradeAccounts=[...accounts.values()].map(a=>{
    const days=[...new Set(a.dates.map(d=>d.slice(0,10)))].sort();
    const last=days.at(-1);
    const gaps=days.slice(1).map((d,i)=>(iso(d)-iso(days[i]))/DAY).sort((a,b)=>a-b);
    const cycle=gaps.length?Math.max(7,gaps[Math.floor(gaps.length/2)]):30;
    const idle=Math.floor((iso(to)-iso(last))/DAY);
    return {...a,last,cycle,idle,frequency:days.length,dormant:days.length>=2&&idle>cycle*1.5};
  });
  return {orders,visits,conversions,trade,retail,net,profit,tradeNet:sum(trade,revenue),retailNet:sum(retail,revenue),points:[...points.values()],heat,discounts,productRows,tradeAccounts};
}

function GridTable({headers,rows}) {
  return rows.length?<div className="table-scroll"><table><thead><tr>{headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>:<Empty>No records in this view.</Empty>;
}
function SalesChart({points,compare}) {
  if(!points.length)return <Empty>Select a valid date range.</Empty>;
  const W=760,H=180;
  const max=Math.max(1,...points.flatMap(p=>compare?[p[1],p[2]]:[p[1]]));
  const x=i=>points.length===1?W/2:30+i*(W-55)/(points.length-1);
  const y=v=>154-v*128/max;
  const selector=column=>points.map((p,i)=>x(i)+','+y(p[column])).join(' ');
  return <><div className="chart-key"><span>● Current period</span>{compare&&<span>┄ Prior year</span>}<span>Peak {gbp(max)}</span></div><svg className="sales-chart" viewBox={'0 0 '+W+' '+H} aria-label="Product sales net of VAT over time" role="img">
    {[26,68,111,154].map(y=><path key={y} d={`M30 ${y}H735`} stroke="#e2e2de"/>)}
    <polygon fill="#fff3c8" points={`${x(0)},154 ${selector(1)} ${x(points.length-1)},154`}/>
    {compare&&<polyline fill="none" stroke="#66645b" strokeDasharray="5 5" strokeWidth="2.5" points={selector(2)}/>}
    <polyline fill="none" stroke="#9d6600" strokeWidth="2.5" points={selector(1)}/>
    {points.length<=42&&points.map((p,i)=><circle key={p[0]} cx={x(i)} cy={y(p[1])} r="3" fill="#9d6600"><title>{p[0]} · {gbp(p[1])}</title></circle>)}
  </svg><div className="chart-labels"><small>{points[0][0]}</small><small>{points.at(-1)[0]}</small></div></>;
}
function Heatmap({heat}) {
  const peak=Math.max(1,...heat.flat());
  return <div className="heat-scroll"><div className="heatmap" aria-label="Orders by UK weekday and hour"><span/>{Array.from({length:24},(_,i)=><small key={i}>{i%3===0?String(i).padStart(2,'0'):''}</small>)}
    {heat.map((hours,d)=><React.Fragment key={d}><small>{week[d]}</small>{hours.map((n,h)=><span className="heatcell" key={h} aria-label={week[d]+' '+h+':00 — '+n+' orders'} title={week[d]+' '+h+':00 · '+n+' orders'} style={{background:n?`rgba(234,169,10,${.22+n/peak*.78})`:'#f1f0ea'}}/>)}</React.Fragment>)}
  </div></div>;
}
const qtySort=(a,b)=>b.units-a.units||b.revenue-a.revenue;
function Insights({m,to}) {
  const [rank,setRank]=useState('Units');
  const products=m.productRows;
  const top=products.filter(p=>p.units).sort(rank==='Units'?qtySort:(a,b)=>b.revenue-a.revenue).slice(0,8);
  const views=products.filter(p=>p.views||p.units).sort((a,b)=>b.views-a.views).slice(0,8);
  const restricted=products.filter(p=>p.restrictedUnits).sort((a,b)=>b.restrictedSales-a.restrictedSales).slice(0,8);
  const low=products.filter(p=>p.units>=2&&p.stock<=10).sort(qtySort).slice(0,8);
  const dead=products.filter(p=>p.stock>0&&p.lastSold&&iso(to)-Date.parse(p.lastSold)>90*DAY).sort((a,b)=>a.lastSold.localeCompare(b.lastSold)).slice(0,8);
  const accounts=m.tradeAccounts.filter(a=>a.orders).sort((a,b)=>b.revenue-a.revenue).slice(0,8);
  const dormant=m.tradeAccounts.filter(a=>a.dormant).sort((a,b)=>b.idle-a.idle).slice(0,8);
  return <><div className="section-title insight-heading"><h2>Product & inventory insights</h2><Link to="/admin/inventory">Manage inventory →</Link></div><div className="admin-grid analytics-grid">
    <section className="panel"><div className="section-title"><h3>Top-selling products</h3><select aria-label="Rank top products by" value={rank} onChange={e=>setRank(e.target.value)}><option>Units</option><option>Revenue</option></select></div><GridTable headers={['SKU','Units sold','Revenue']} rows={top.map(p=>[p.sku,p.units,gbp(p.revenue)])}/></section>
    <section className="panel"><h3>Most viewed vs. bought</h3><GridTable headers={['SKU','Product views','Units sold']} rows={views.map(p=>[p.sku,p.views,p.units])}/></section>
    <section className="panel"><h3>Restricted product performance</h3><GridTable headers={['SKU','Trade buyers','Units sold','Revenue']} rows={restricted.map(p=>[p.sku,p.buyers.size,p.restrictedUnits,gbp(p.restrictedSales)])}/></section>
    <section className="panel"><h3>Low-stock fast movers</h3><GridTable headers={['SKU','Units sold','Available now']} rows={low.map(p=>[p.sku,p.units,p.stock])}/></section>
    <section className="panel"><h3>Dead stock</h3><p>In stock and last sold over 90 days before the end date.</p><GridTable headers={['SKU','Available now','Last sold']} rows={dead.map(p=>[p.sku,p.stock,date(p.lastSold)])}/></section>
  </div><h2 className="insight-heading">Trade customer activity</h2><div className="admin-grid analytics-grid">
    <section className="panel"><h3>Top trade accounts</h3><GridTable headers={['Account','Orders','Revenue']} rows={accounts.map(a=>[a.email,a.orders,gbp(a.revenue)])}/></section>
    <section className="panel"><h3>Dormant trade accounts</h3><p>Repeat buyers overdue by more than 1.5× their usual order gap.</p><GridTable headers={['Account','Days inactive','Usual gap']} rows={dormant.map(a=>[a.email,a.idle,a.cycle+' days'])}/></section>
  </div></>;
}
function Exports({m}) {
  const {notify}=useApp();
  const [report,setReport]=useState('Order log');
  const [page,setPage]=useState(1);
  const map=new Map();
  for(const o of m.orders){
    const k=(o.trade?'Trade':'Retail')+':'+o.email;
    const row=map.get(k)||[o.email,o.trade?'Trade':'Retail',0,0,0];
    row[2]++;row[3]+=o.net;row[4]+=o.vat;map.set(k,row);
  }
  const reports={
    'Order log':[['Order','Date','Email','Tier','Status','SKU','Qty','Unit net','Pricing rule','Line net','Order VAT','Order total','Source'],...m.orders.flatMap(o=>o.lines.map((l,i)=>[o.id,o.created,o.email,o.trade?'Trade':'Retail',o.status,l.sku,l.qty,l.price,l.rule,round(l.qty*l.price),i?'':o.vat,i?'':o.total,o.sample?'Sample history':'Local order']))],
    'Customer tier summary':[['Email','Tier','Orders','Net sales','VAT'],...[...map.values()].map(([email,tier,count,net,vat])=>[email,tier,count,round(net),round(vat)])],
    'Product movement':[['SKU','Name','Department','Restricted','Views','Units sold','Net sales','Available now'],...m.productRows.map(p=>[p.sku,p.name,p.category,p.restricted?'Yes':'No',p.views,p.units,round(p.revenue),p.stock])]
  };
  const [headers,...rows]=reports[report];
  const [selection,setSelection]=useState({});
  const columns=headers.map((h,i)=>[h,i]).filter(([h])=>selection[report]?.[h]!==false);
  const safeRows=[columns.map(([h])=>h),...rows.map(r=>columns.map(([,i])=>r[i]))];
  const preview=pageSlice(safeRows.slice(1),page,18);
  async function excel(){
    try{const x=await import('xlsx');const b=x.utils.book_new();x.utils.book_append_sheet(b,x.utils.aoa_to_sheet(safeRows),report);x.writeFile(b,report.toLowerCase().replaceAll(' ','-')+'.xlsx');}catch{notify('Excel export failed');}
  }
  return <section className="panel"><div className="section-title"><h2>Report builder</h2><div className="actions"><select aria-label="Report type" value={report} onChange={e=>{setReport(e.target.value);setPage(1);}}>{Object.keys(reports).map(r=><option key={r}>{r}</option>)}</select><button className="btn outline" disabled={!columns.length} onClick={()=>download(report.toLowerCase().replaceAll(' ','-')+'.csv',csv(safeRows))}>Export CSV</button><button className="btn primary" disabled={!columns.length} onClick={excel}>Export Excel</button></div></div>
  <details className="columns"><summary>Choose export columns</summary><div className="chips">{headers.map(h=><label className="inline" key={h}><input type="checkbox" checked={selection[report]?.[h]!==false} onChange={e=>setSelection({...selection,[report]:{...selection[report],[h]:e.target.checked}})}/>{h}</label>)}</div></details>
  {columns.length?<GridTable headers={safeRows[0]} rows={preview.items}/>:<Empty>Select at least one column.</Empty>}<Pagination {...preview} onChange={setPage}/></section>;
}
export default function Analytics({reports=false}) {
  const {db}=useApp();
  const [from,setFrom]=useState(defaultFrom),[to,setTo]=useState(until);
  const [segment,setSegment]=useState('All'),[group,setGroup]=useState('Daily'),[sample,setSample]=useState(true);
  const valid=from&&to&&iso(to)>=iso(from)&&iso(to)-iso(from)<=5*366*DAY;
  const m=useMemo(()=>valid?calculate(db,{from,to,segment,group,sample}):null,[db,from,to,segment,group,sample,valid]);
  const kpis=m?[
    ['Total revenue',gbp(m.net),'Product sales ex. VAT'],
    ['Gross profit',gbp(m.profit),m.net?(100*m.profit/m.net).toFixed(1)+'% gross margin':'No sales in range'],
    ['Trade / Retail split',gbp(m.tradeNet)+' / '+gbp(m.retailNet),m.trade.length+' Trade · '+m.retail.length+' Retail orders'],
    ['Average order value',gbp(m.net/(m.orders.length||1)),gbp(m.tradeNet/(m.trade.length||1))+' Trade · '+gbp(m.retailNet/(m.retail.length||1))+' Retail'],
    ['Checkout conversion',m.visits.length?(100*m.conversions/m.visits.length).toFixed(1)+'%':'—',m.conversions+' converted sessions / '+m.visits.length+' store visits']
  ]:[];
  return <><div className="section-title analytics-head"><div><h1>{reports?'Reports':'Dashboard'}</h1><p>{reports?'Filter, customise and export store data.':'Sales, inventory and trade performance.'}</p></div>{!reports&&<Link to="/admin/reports" className="btn outline">View reports →</Link>}</div>
  <section className="panel analytics-controls"><label>From<input type="date" value={from} max={to||until} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from} max={until} onChange={e=>setTo(e.target.value)}/></label><label>Segment<select value={segment} onChange={e=>setSegment(e.target.value)}><option value="All">All buyers</option><option>Trade</option><option>Retail</option></select></label>{!reports&&<label>Trend interval<select value={group} onChange={e=>setGroup(e.target.value)}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Year over year</option></select></label>}<label className="inline"><input type="checkbox" checked={sample} onChange={e=>setSample(e.target.checked)}/> Include sample history</label></section>
  {!valid?<Empty>Select a date range of five years or less.</Empty>:reports?<Exports m={m}/>:<>
    <div className="metrics">{kpis.map(([name,value,detail])=><section className="metric" key={name}><span>{name}</span><strong>{value}</strong><small>{detail}</small></section>)}</div>
    <div className="dashboard-charts"><section className="panel"><h2>Sales over time</h2><SalesChart points={m.points} compare={group==='Year over year'}/></section><section className="panel"><h2>Discount usage</h2><p>Revenue by applied pricing rule.</p><div className="discount-bars">{Object.entries(m.discounts).map(([label,n])=><div key={label}><div><strong>{label}</strong><span>{gbp(n)}</span></div><meter aria-label={label} min="0" max={Math.max(1,m.net)} value={n}/></div>)}</div></section></div>
    <section className="panel"><div className="section-title"><h2>Best-selling days & times</h2><small>UK local time · darker means more orders</small></div><Heatmap heat={m.heat}/></section>
    <Insights m={m} to={to}/>
  </>}</>;
}
