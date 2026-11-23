import React, {useState,useEffect,createContext,useContext} from 'react';
import {createRoot} from 'react-dom/client';
import {initial,migrate,validate,quote,gbp} from './data';
import Store from './store';
import Admin from './admin';
import '@fontsource-variable/inter';
import './style.css';

const Context = createContext(null);
export const useApp = () => useContext(Context);
export function Link({to,children,...props}) {
  const {go} = useApp();
  return <a href={to} {...props} onClick={e=>{if (!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0) {e.preventDefault();go(to);}}}>{children}</a>;
}
export function Picture({product}) {
  const image = product.image || (product.picture && '/products/'+product.picture+'.webp');
  return image?<img className="product-image" src={image} alt={product.name}/>:<div className="image-empty"><strong>{product.family||product.category}</strong><small>{product.sku} · {product.sample?'Sample item':'Image unavailable'}</small></div>;
}
export function Empty({children}) { return <div className="empty">{children}</div>; }
export function Price({amount}) {
  const {vat} = useApp();
  return <>{gbp(vat?amount*1.2:amount)} <small>{vat?'inc.':'ex.'} VAT</small></>;
}
function useLocal(name,fallback) {
  const key = 'bbew-v1:'+name;
  const [value,set] = useState(()=>{
    try {const saved=JSON.parse(localStorage.getItem(key));return saved==null?fallback:name==='db'?migrate(saved):saved;} catch {return fallback;}
  });
  useEffect(()=>{localStorage.setItem(key,JSON.stringify(value));},[key,value]);
  useEffect(()=>{
    function sync(event) {if (event.key===key&&event.newValue) set(JSON.parse(event.newValue));}
    window.addEventListener('storage',sync);
    return ()=>window.removeEventListener('storage',sync);
  },[key]);
  return [value,set];
}
function App() {
  const [db,setDb] = useLocal('db',initial);
  const [email,setEmail] = useLocal('email','');
  const [vat,setVat] = useLocal('vat',false);
  const [baskets,setBaskets] = useLocal('baskets',{});
  const [path,setPath] = useState(location.pathname+location.search);
  const [toast,setToast] = useState('');
  const [visitId] = useState(()=>sessionStorage.getItem('bbew-visit')||crypto.randomUUID());
  const admin = path.startsWith('/admin');
  const customer = db.customers[email];
  const owner = email || 'guest';
  const basket = baskets[owner] || {};
  const go = to => { if(to!==path) {history.pushState(null,'',to);setPath(to);window.scrollTo(0,0);} };
  const notify = message => setToast(message);
  const setBasket = changes => setBaskets(prev=>({...prev,[owner]:typeof changes==='function'?changes(prev[owner]||{}):changes}));
  const add = (product,qty) => {
    const count = Number(qty)+(basket[product.sku]||0);
    const error = validate(product,count,customer);
    if(error) {notify(error);return false;}
    setBasket(old=>({...old,[product.sku]:count}));
    notify('Added to basket');
    return true;
  };
  const lines = Object.entries(basket).map(([sku,qty])=>{
    const p = db.products.find(item=>item.sku===sku);
    return {sku,qty,p,name:p?.name||sku,cost:p?.cost||0,...(p&&!validate(p,qty,customer)?quote(p,qty,customer,db.campaigns):{price:0}),error:validate(p,qty,customer)};
  });
  useEffect(()=>{
    const pop = ()=>{setPath(location.pathname+location.search);window.scrollTo(0,0);};
    window.addEventListener('popstate',pop);
    return ()=>window.removeEventListener('popstate',pop);
  },[]);
  useEffect(()=>{
    if(!toast) return;
    const id = setTimeout(()=>setToast(''),3300);
    return ()=>clearTimeout(id);
  },[toast]);
  const visit = React.useRef(sessionStorage.getItem('bbew-visit')===visitId);
  useEffect(()=>{
    if(admin||visit.current) return;
    visit.current=true;
    sessionStorage.setItem('bbew-visit',visitId);
    setDb(prev=>({...prev,visits:prev.visits+1,visitLog:[...prev.visitLog,{id:visitId,at:new Date().toISOString()}]}));
  },[admin,setDb]);
  return <Context.Provider value={{db,setDb,visitId,customer,email,setEmail,vat,setVat,basket,setBasket,lines,add,go,path,notify}}>{admin?<Admin/>:<Store/>}{toast&&<div className="toast" role="status" onClick={()=>setToast('')}>{toast}</div>}</Context.Provider>;
}
createRoot(document.getElementById('root')).render(<App/>);
