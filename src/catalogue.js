export const departments = [
  ['Wiring Accessories','Switched socket|Fused spur|Dimmer switch|Grid module|Blank plate','White|Brushed steel|Black nickel|Polished chrome|Antique brass'],
  ['Power Tools','Drill bit set|Impact driver bit set|Hole saw|Cutting disc|Sanding sheet set','Standard|Workshop|Heavy duty|Precision|Industrial'],
  ['Heating & Ventilation','Extractor grille|Duct coupling|Inline fan|Wall heater|Air vent','White|Black|Silver|Grey|Stainless'],
  ['Bathrooms','Shower outlet|Extractor timer|Ceiling light|Shower isolator|Pull switch','White|Chrome|Matt black|Satin nickel|Grey'],
  ['Lighting','LED downlight|LED batten|Floodlight|Bulkhead light|Track spotlight','Warm white|Neutral white|Cool white|Daylight|Tunable white'],
  ['Cables','Twin and earth cable|Flexible cable|Armoured cable|Data cable|Earth cable','Black|Grey|White|Blue|Brown'],
  ['EV & Solar','PV mounting rail|Solar cable clip|EV cable holder|Panel clamp|PV cable gland','Black|Natural aluminium|Silver|Grey|White'],
  ['Circuit Protection','MCB enclosure|RCBO accessory|DIN rail|Distribution enclosure|Circuit label set','Single|Compact|Standard|Extended|Industrial'],
  ['Containment & Fixings','Cable trunking|Conduit coupling|Cable tie pack|Pipe clip|Junction box','White|Grey|Black|Galvanised|Stainless'],
  ['Security & Fire','Alarm mounting base|Detector cage|Surface back box|Cable junction box|Test accessory','White|Red|Grey|Black|Clear'],
  ['Switchgear & Control','Selector switch|Panel legend|Push button housing|DIN terminal|Relay socket','Black|Green|Red|Grey|Blue'],
  ['Data & Networking','RJ45 faceplate|Patch lead|Data module|Patch panel|Cable organiser','Black|Grey|White|Blue|Green']
];
export const families = Object.fromEntries(departments.map(([name,types])=>[name,types.split('|')]));
export const demoBrands = ['Alder Electrical','Beacon Components','Cobalt Trade','Dale Supply'];
const variants = [1,2,3,4,5,6,7,8];
export const variantProducts = departments.flatMap(([category,types,finishes],department)=>
  types.split('|').flatMap((family,group)=>finishes.split('|').flatMap((finish,colour)=>variants.map((variant,size)=>{
    const sku='BB-'+String(department+1).padStart(2,'0')+'-'+String(group*40+colour*8+size+1).padStart(3,'0');
    const brand=demoBrands[(department+group)%demoBrands.length];
    const pack=size===7?5:1;
    const sizeLabel=category==='Cables'?([1,2,3,5,10,25,50,100][size]+' m'):('Variant '+variant);
    const price=+(3.95+department*1.2+group*4.4+colour*.75+size*2.15).toFixed(2);
    const serial=department*200+group*40+colour*8+size;
    return {sku,part:'DEMO-'+sku,name:family+' · '+finish+' · '+sizeLabel,family,category,brand,price,
      trade:+(price*.87).toFixed(2),cost:+(price*.59).toFixed(2),stock:serial%17===0?0:(serial*13)%114+1,
      pack,unit:category==='Cables'?'coil':'each',spec:finish+' · '+sizeLabel,description:'Sample '+family.toLowerCase()+' catalogue entry for BBEW. Product specifications, pricing and availability are illustrative.',
      bulkQty:pack*10,bulkOff:8,restricted:serial%19===0,tag:serial%29===0?'Clearance':'',sample:true};
  })))
);
