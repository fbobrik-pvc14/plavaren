import {localParts} from './data.mjs';
const DAY=86400000, HOUR=3600000;
function clock(t){const p=localParts(t);const minute=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Bratislava',minute:'2-digit'}).format(t));return {...p,minute:p.hour*60+minute}}
function quantile(values,q){const s=[...values].sort((a,b)=>a-b),i=(s.length-1)*q,l=Math.floor(i);return s[l]+(s[Math.ceil(i)]-s[l])*(i-l)}
export function forecast(rows,now=Date.now()){
  const today=clock(now),good=rows.filter(r=>r.n!==null&&Number.isFinite(r.n)&&r.n>=0&&r.t<=now).sort((a,b)=>a.t-b.t),latest=good.at(-1);
  const fresh=!!latest&&now-latest.t<=25*60000;
  // One median per date prevents dense or manually repeated samples dominating.
  const history=good.filter(r=>r.t>=now-56*DAY&&clock(r.t).date<today.date);
  function samples(target){const result=new Map;for(const r of history){const p=clock(r.t);if(p.weekday!==target.weekday||p.hour<6||p.hour>=22||Math.abs(p.minute-target.minute)>30)continue;const list=result.get(p.date)||[];list.push(r.n);result.set(p.date,list)}return new Map([...result].map(([d,v])=>[d,quantile(v,.5)]))}
  return [1,2,3].map(hours=>{
    const target=now+hours*HOUR,p=clock(target),base={hours,target};
    if(p.hour<6||p.hour>=22)return {...base,status:'closed'};
    const future=samples(p),paired=[];
    if(fresh&&today.date===p.date&&today.hour>=6&&today.hour<22){const past=samples(today);for(const [d,n] of future)if(past.has(d))paired.push(n-past.get(d))}
    const adjusted=paired.length>=3,values=adjusted?paired:[...future.values()];
    if(values.length<3)return {...base,status:'insufficient',days:values.length};
    const anchor=adjusted?latest.n:0,estimate=Math.max(0,Math.round(anchor+quantile(values,.5)));
    return {...base,status:'ok',estimate,low:Math.max(0,Math.floor(anchor+quantile(values,.2))),high:Math.max(0,Math.ceil(anchor+quantile(values,.8))),days:values.length,method:adjusted?'change':'level',delta:fresh?estimate-latest.n:null,baselineTime:fresh?latest.t:null};
  });
}
