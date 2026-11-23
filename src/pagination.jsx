import React from 'react';

export function pageSlice(items,page,size=24) {
  const pages=Math.max(1,Math.ceil(items.length/size));
  const current=Math.min(page,pages);
  return {pages,current,items:items.slice((current-1)*size,current*size)};
}
export function Pagination({current,pages,onChange}) {
  if(pages<2)return null;
  return <nav className="pagination" aria-label="Pagination">
    <button className="btn outline" disabled={current===1} onClick={()=>onChange(current-1)}>Previous</button>
    <label className="inline">Page <select aria-label="Page number" value={current} onChange={e=>onChange(Number(e.target.value))}>{Array.from({length:pages},(_,i)=><option key={i}>{i+1}</option>)}</select> of {pages}</label>
    <button className="btn outline" disabled={current===pages} onClick={()=>onChange(current+1)}>Next</button>
  </nav>;
}
