import {departments,demoBrands,variantProducts} from './catalogue.js';
export const categories = departments.map(([name])=>name);
export const money = new Intl.NumberFormat('en-GB', {style:'currency', currency:'GBP'});
export const gbp = value => money.format(value || 0);
export const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
export const date = value => new Date(value).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
export const key = email => email.trim().toLowerCase();

export const seed = [
  {sku:'BB-SK13',part:'SK13-AB',name:'13A Double Switched Socket',brand:'Wiring Accessories',category:categories[0],price:12.95,trade:10.75,cost:6.4,stock:68,pack:1,unit:'each',picture:'socket',spec:'13A · Antique brass · 2 gang',description:'Double switched socket with an antique brass finish.',bulkQty:10,bulkOff:8},
  {sku:'AI937',part:'GSB18V-65',name:'Professional 18V-65 Combi Drill Kit',brand:'Bosch',category:categories[1],price:139.98,trade:126,cost:91,stock:24,pack:1,unit:'kit',picture:'drill',spec:'18V · 65 Nm · 5.0Ah battery',description:'Cordless combi drill kit with battery and carry case.',bulkQty:5,bulkOff:5},
  {sku:'LEV3KW',part:'LEV-AC3',name:'3kW Warm Air Curtain',brand:'Levante',category:categories[2],price:94.5,trade:83,cost:61,stock:7,pack:1,unit:'each',picture:'heating',tag:'Clearance',spec:'3kW · White · Wall mounted',description:'Warm air curtain for entrances and doorways.',bulkQty:5,bulkOff:4},
  {sku:'2681-6746',part:'1.1903.087',name:'Activate Rear Fed High Pressure Shower',brand:'Mira',category:categories[3],price:199.95,trade:182,cost:123,stock:6,pack:1,unit:'each',picture:'shower',spec:'Rear fed · High pressure · Chrome',description:'Chrome shower kit for compatible high-pressure systems.',bulkQty:5,bulkOff:5},
  {sku:'TRADE-180',part:'GSB18V-65-T',name:'Professional 18V Drill Trade Bundle',brand:'Bosch',category:categories[1],price:159,trade:142,cost:105,stock:12,pack:1,unit:'bundle',picture:'drill',spec:'18V · Trade bundle',description:'Illustrative trade-exclusive bundle.',restricted:true,bulkQty:4,bulkOff:5}
];
const ago = days => new Date(Date.now()-days*86400000).toISOString();
const sampleOrder = (id,email,trade,product,qty,days) => {
  const price = trade ? product.trade : product.price;
  const net = round(price * qty);
  return {id,email,name:trade?'Morgan Electrical':'Demo Customer',trade,created:ago(days),status:'Delivered',payment:'Paid (demo)',method:'Delivery',invoice:'INV-'+id,tracking:'DEMO-'+id,lines:[{sku:product.sku,name:product.name,qty,price,cost:product.cost,rule:'Standard',restricted:!!product.restricted}],net,vat:round(net*.2),shipping:0,total:round(net*1.2)};
};
export const initial = {
  catalogueVersion:2,products:[...seed,...variantProducts],categories,tags:['Featured','Clearance'],brands:['Bosch','Levante','Mira','Wiring Accessories',...demoBrands],
  customers:{
    'retail@demo.test':{name:'Demo Customer',email:'retail@demo.test',status:'Retail',lists:[]},
    'trade@demo.test':{name:'Demo Electrician',company:'Morgan Electrical',email:'trade@demo.test',status:'Approved',credit:true,address:'12 Demo Lane',postcode:'B1 1AA',lists:[]}
  },
  orders:[sampleOrder('1003','trade@demo.test',true,seed[1],4,2),sampleOrder('1002','retail@demo.test',false,seed[0],6,5),sampleOrder('1001','trade@demo.test',true,seed[2],2,8)],
  approvals:[],audit:[],inbox:[],campaigns:[],visits:1,visitLog:[],viewEvents:[],views:{},nextOrder:1004,
  settings:{visibility:'Hidden',guest:true,invoice:'Dispatched'}
};
export const isTrade = customer => customer?.status === 'Approved';
export const visible = (product, customer, settings) => !product.restricted || isTrade(customer) || settings.visibility === 'Visible';
export const purchasable = (product, customer) => !product.restricted || isTrade(customer);
export const matches = (p,q) => q.toLowerCase().trim().split(/\s+/).every(word => [p.name,p.brand,p.sku,p.part,p.category,p.family,p.spec].join(' ').toLowerCase().includes(word));
export function quote(product,qty,customer,campaigns=[]) {
  let base = isTrade(customer) ? product.trade : product.price;
  let rule = isTrade(customer) ? 'Trade' : 'Retail';
  const override = customer?.prices?.[product.sku];
  if (typeof override === 'number') { base = override; rule = 'Account price'; }
  const bulk = product.bulkQty > 0 && qty >= product.bulkQty && base*(1-product.bulkOff/100)>=product.cost ? product.bulkOff : 0;
  const today = new Date().toISOString().slice(0,10);
  const eligible = campaigns.filter(c => (!c.start || c.start<=today) && (!c.end || c.end>=today) && (!c.sku || c.sku===product.sku) && (c.audience==='All' || (c.audience==='Trade' && isTrade(customer)) || (c.audience==='Retail' && !isTrade(customer)) || c.audience===customer?.email));
  const campaign = eligible.filter(c => base*(1-c.discount/100)>=product.cost).sort((a,b)=>b.discount-a.discount)[0];
  const off = Math.max(bulk,campaign?.discount || 0);
  if (off) rule = off===bulk ? 'Bulk '+off+'%' : campaign.name;
  return {price:round(base*(1-off/100)),rule};
}
export function validate(product,qty,customer) {
  if (!product || !purchasable(product,customer)) return 'Item unavailable for this account';
  if (!Number.isSafeInteger(qty) || qty<product.pack || qty%product.pack) return 'Use multiples of '+product.pack;
  if (qty>product.stock) return 'Only '+product.stock+' available';
  return '';
}
export function totals(lines, method) {
  const net = round(lines.reduce((sum,l)=>sum+l.qty*l.price,0));
  const shipping = method==='Delivery' && net && net<100 ? 5.95 : 0;
  const vat = round((net+shipping)*.2);
  return {net,shipping,vat,total:round(net+shipping+vat)};
}
export function download(name, data, type='text/csv') {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([data], {type}));
  link.download = name;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
export const csv = rows => rows.map(row=>row.map(field=> {
  const string = String(field??'');
  return '"'+(typeof field==='string' && /^[=+\-@\t\r]/.test(string) ? "'"+string : string).replaceAll('"','""')+'"';
}).join(',')).join('\r\n');

export async function invoicePdf(order) {
  const {jsPDF} = await import('jspdf');
  const pdf = new jsPDF();
  let y = 22;
  const write = (line, size=11) => {
    pdf.setFontSize(size);
    const wrapped = pdf.splitTextToSize(line,174);
    for (const part of wrapped) {
      if (y>270) { pdf.addPage(); y=22; }
      pdf.text(part,18,y); y+=7;
    }
  };
  write('BBEW | Electrical Wholesale',20);
  write(order.invoice ? 'Demo invoice '+order.invoice : 'Demo order receipt '+order.id,14);
  write(order.name+' | '+order.email);
  if (order.address) write(order.address+' '+order.postcode);
  write(date(order.created)+' | Order '+order.id+' | '+order.payment);
  y+=5;
  order.lines.forEach(l=>write(l.sku+'  '+l.name+'  x '+l.qty+'  '+gbp(l.price*l.qty)));
  y+=5;
  write('Net '+gbp(order.net)+'   Delivery '+gbp(order.shipping)+'   VAT '+gbp(order.vat));
  write('Total '+gbp(order.total),15);
  pdf.save((order.invoice || 'receipt-'+order.id)+'.pdf');
}

export function migrate(db) {
  if(db.catalogueVersion===2) return db;
  const skus=new Set(db.products.map(p=>p.sku));
  return {...db,catalogueVersion:2,
    products:[...db.products,...variantProducts.filter(p=>!skus.has(p.sku))],
    categories:[...new Set([...db.categories,...categories])],
    brands:[...new Set([...db.brands,...demoBrands])],
    visitLog:db.visitLog||[],viewEvents:db.viewEvents||[]};
}
