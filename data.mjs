export function parseCSV(text){let rows=[],row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=c}if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row)}if(quoted)throw Error('Neúplný CSV');const head=rows.shift()?.map(s=>s.replace(/^\uFEFF/,''));if(!['timestamp_utc','occupancy','status'].every(x=>head?.includes(x)))throw Error('Neznámy formát CSV');const result=new Map;for(const r of rows){if(r.length!==head.length)continue;const o=Object.fromEntries(head.map((k,i)=>[k,r[i]]));const t=Date.parse(o.timestamp_utc);if(!Number.isFinite(t))continue;const n=o.occupancy.trim()===''?null:Number(o.occupancy);result.set(t,{t,n:o.status==='ok'&&Number.isInteger(n)&&n>=0?n:null,status:o.status})}return [...result.values()].sort((a,b)=>a.t-b.t)}
export function localParts(t){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(t).map(p=>[p.type,p.value]));const date=`${p.year}-${p.month}-${p.day}`;return {date,hour:+p.hour,weekday:(new Date(date+'T12:00:00Z').getUTCDay()+6)%7}}
// Každý dátum má pri výpočte hodinového priemeru rovnakú váhu.
export function groups(rows){
  const map=new Map;
  for(const r of rows){
    const p=localParts(r.t);if(p.hour<6||p.hour>=22)continue;
    const key=`${p.weekday}-${p.hour}`;
    const g=map.get(key)||{rows:[],daily:new Map,count:0,days:new Set};
    g.rows.push(r);
    if(r.n!==null){
      const day=g.daily.get(p.date)||{sum:0,count:0,slots:new Set};
      day.sum+=r.n;day.count++;
      day.slots.add(Math.floor(r.t/600000));
      g.daily.set(p.date,day);g.count++;g.days.add(p.date);
    }
    map.set(key,g);
  }
  for(const g of map.values()){
    g.average=g.days.size?[...g.daily.values()].reduce((s,d)=>s+d.sum/d.count,0)/g.days.size:null;
    g.rows.sort((a,b)=>a.t-b.t);
  }
  return map;
}
