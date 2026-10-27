import {forecast} from './forecast.mjs';
import {parseCSV,localParts,groups} from './data.mjs?v=hour-detail-1';
const URL='https://raw.githubusercontent.com/fbobrik-pvc14/plavaren/refs/heads/main/data/occupancy.csv';
const $=id=>document.getElementById(id), days=['Po','Ut','St','Št','Pi','So','Ne'];let records=[],busy=false;
const fmt=(t,opts={})=>new Intl.DateTimeFormat('sk-SK',{timeZone:'Europe/Bratislava',...opts}).format(t);
const full=t=>fmt(t,{day:'numeric',month:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
function freshness(){const latest=records.filter(r=>r.n!==null).at(-1);if(!latest)return;const mins=Math.max(0,Math.floor((Date.now()-latest.t)/60000));$('age').textContent=mins<1?'Meranie pred menej než minútou':`Meranie pred ${mins} min · plánovaný interval 10 min`;$('fresh').textContent=mins>25?'Staršie meranie':'Posledné meranie';$('fresh').className='badge'+(mins>25?' warn':'');if(records.at(-1)?.n===null){$('fresh').textContent='Posledný pokus zlyhal';$('fresh').className='badge warn'}}
function render(){const good=records.filter(r=>r.n!==null), last=good.at(-1),today=localParts(Date.now()).date;const during=good.filter(r=>{const p=localParts(r.t);return p.date===today&&p.hour>=6&&p.hour<22});$('todaymin').textContent=during.length?Math.min(...during.map(r=>r.n)):'—';$('todayavg').textContent=during.length?Math.round(during.reduce((s,r)=>s+r.n,0)/during.length):'—';if(last){$('occupancy').textContent=last.n;$('percent').textContent=Math.round(last.n/160*100)+' %';$('meter').style.width=Math.min(100,last.n/160*100)+'%';$('measured').textContent='Namerané '+full(last.t);$('mood').textContent=last.n<55?'Pri poslednom meraní bolo pokojnejšie.':last.n<110?'Pri poslednom meraní bola plaváreň stredne zaplnená.':'Pri poslednom meraní bolo rušnejšie.';$('moodtext').textContent='Orientačné zaradenie podľa podielu z kapacity 160 osôb. Počet návštevníkov jednotlivých bazénov nepoznáme.';freshness()}else{$('occupancy').textContent='—';$('fresh').textContent='Bez merania';$('measured').textContent='Zatiaľ nemáme úspešné meranie.'}$('day').max=today;if(records.length)$('day').min=localParts(records[0].t).date;chart();heat();renderForecast();if($('hourdetail').open)renderHourDetail()}
function chart(){const selected=$('day').value,range=$('range').value,today=localParts(Date.now()).date;let start=range==='all'?'0000':new Date(Date.parse(today+'T00:00:00Z')-(Number(range)-1)*86400000).toISOString().slice(0,10);const filtered=records.filter(r=>{const d=localParts(r.t).date;return selected?d===selected:d>=start&&d<=today});const valid=filtered.filter(r=>r.n!==null);$('clear').hidden=!selected;$('range').disabled=!!selected;$('chartnote').textContent=`Úspešné merania: ${valid.length} · Neúspešné pokusy: ${filtered.length-valid.length}`;if(!valid.length){$('chart').innerHTML='<div class="empty">V tomto období zatiaľ nie sú úspešné merania.</div>';return}let min=valid[0].t,max=valid.at(-1).t;if(min===max){min-=1800000;max+=1800000}const ymax=Math.max(160,...valid.map(r=>r.n)),w=1000,h=270,p={l:40,r:18,t:15,b:38},x=t=>p.l+(t-min)/(max-min)*(w-p.l-p.r),y=n=>h-p.b-n/ymax*(h-p.t-p.b);let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Obsadenosť v čase, ${valid.length} meraní"><title>História obsadenosti</title>`;for(let i=0;i<=4;i++){let n=Math.round(ymax*i/4);svg+=`<line x1="40" x2="982" y1="${y(n)}" y2="${y(n)}" stroke="#e6ece8"/><text x="29" y="${y(n)+4}" text-anchor="end" fill="#72847c" font-size="11">${n}</text>`}let prev=null;for(const r of filtered){if(r.n===null){prev=null;continue}if(prev&&r.t-prev.t<=25*60000)svg+=`<line x1="${x(prev.t)}" y1="${y(prev.n)}" x2="${x(r.t)}" y2="${y(r.n)}" stroke="#247762" stroke-width="2.5"/>`;svg+=`<circle cx="${x(r.t)}" cy="${y(r.n)}" r="${valid.length<10?5:2.5}" fill="#247762"><title>${full(r.t)}: ${r.n} osôb</title></circle>`;prev=r}for(let i=0;i<5;i++){const t=min+(max-min)*i/4;svg+=`<text x="${x(t)}" y="260" text-anchor="${i===0?'start':i===4?'end':'middle'}" fill="#72847c" font-size="11">${fmt(t,{...(max-min>86400000?{day:'numeric',month:'numeric'}:{}),hour:'2-digit',minute:'2-digit'})}</text>`}$('chart').innerHTML=svg+'</svg>';if(valid.length===1)$('chartnote').textContent+=' · Zatiaľ jeden bod; graf pribudne s ďalšími meraniami.'}
function heat(){const map=groups(records);let html='<div class="heat-grid"><span></span>';for(let h=6;h<22;h++)html+=`<span class="heat-label">${h}:00</span>`;for(let d=0;d<7;d++){html+=`<span class="heat-label">${days[d]}</span>`;for(let h=6;h<22;h++){const g=map.get(`${d}-${h}`),avg=g?.count?Math.round(g.average):null;const title=g?.count?`${days[d]} ${h}:00–${h+1}:00: priemer ${avg} osôb, počet meraní: ${g.count}, počet dní: ${g.days.size}`:`${days[d]} ${h}:00–${h+1}:00: bez dát`;html+=`<button type="button" class="heat-cell" data-weekday="${d}" data-hour="${h}" title="${title}" aria-label="${title}" style="${g?.count?`background:${occupancyColor(avg)};color:${(avg<=15||avg>=140)?'white':'#172b22'}`:''}">${avg===null?'—':avg}</button>`}}$('heatmap').innerHTML=html+'</div>';$('patternnote').textContent='Priemer hodinových priemerov jednotlivých dní; každý dátum má rovnakú váhu. Kliknutím na políčko zobrazíte merania.';const candidates=[...map.entries()].filter(([,g])=>g.days.size>=3).sort((a,b)=>a[1].average-b[1].average);if(!candidates.length){$('recommend').textContent='Zatiaľ zbierame podklady. Odporúčanie zobrazíme, keď bude aspoň jedno časové pásmo zastúpené v troch rôznych dňoch rovnakého dňa v týždni. Prvé hodnoty berte iba orientačne.'}else{const [key,g]=candidates[0],[d,h]=key.split('-').map(Number);$('recommend').textContent=`Z dostatočne zastúpených pásiem malo najnižší priemer ${days[d]} ${h}:00–${h+1}:00: ${Math.round(g.average)} osôb (${g.count} meraní počas ${g.days.size} dní). Ide o pozorovanie histórie, nie záruku budúcej návštevnosti.`}}
async function refresh(){if(busy)return;busy=true;$('refresh').disabled=true;try{const response=await fetch(URL+'?t='+Math.floor(Date.now()/60000),{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);records=parseCSV(await response.text());$('message').textContent=records.length?'':'Dátový súbor zatiaľ neobsahuje merania.';render()}catch(e){$('message').textContent='Údaje sa nepodarilo načítať. '+(records.length?'Zobrazené zostávajú posledné načítané hodnoty. ':'')+'Skúste Obnoviť neskôr.';if(!records.length){$('fresh').textContent='Nedostupné';$('chart').innerHTML='<div class="empty">História je momentálne nedostupná.</div>'}freshness();renderForecast()}finally{busy=false;$('refresh').disabled=false}}
$('refresh').onclick=refresh;$('range').onchange=chart;$('day').onchange=chart;$('clear').onclick=()=>{$('day').value='';chart()};refresh();setInterval(()=>{if(!document.hidden)refresh()},60000);setInterval(()=>{freshness();renderForecast()},30000);

function renderForecast(){
  $('forecasts').innerHTML=forecast(records).map(f=>{
    const heading=`<div class="forecasttime">O ${f.hours===1?'1 hodinu':f.hours+' hodiny'} <span>${fmt(f.target,{hour:'2-digit',minute:'2-digit'})}</span></div>`;
    if(f.status==='closed')return `<article class="forecastitem">${heading}<h3>Mimo otváracích hodín</h3><p>Pre tento čas odhad neuvádzame. Overte si aktuálnu prevádzku plavárne.</p></article>`;
    if(f.status==='insufficient')return `<article class="forecastitem">${heading}<h3>Nedostatok dát</h3><p>Porovnateľné historické dni: ${f.days} z potrebných 3. Odhad sa zobrazí automaticky po nazbieraní podkladov.</p></article>`;
    const change=f.delta===null?'Zmenu neuvádzame: chýba čerstvé meranie.':f.delta===0?'Približne bez zmeny oproti poslednému meraniu.':`${f.delta>0?'Nárast':'Pokles'} asi o ${Math.abs(f.delta)} osôb oproti meraniu z ${fmt(f.baselineTime,{hour:'2-digit',minute:'2-digit'})}.`;
    return `<article class="forecastitem">${heading}<div class="forecastnumber">~${f.estimate} <span>osôb</span></div><p class="forecastchange">${change}</p><p>Historické rozpätie: <strong>${f.low}–${f.high} osôb</strong></p><p class="small">Podkladové dni: ${f.days} · ${f.method==='change'?'Historická zmena + posledné meranie':'Historická obsadenosť'}</p></article>`;
  }).join('');
}

let selectedHour=null;
const dayNames=['Pondelky','Utorky','Stredy','Štvrtky','Piatky','Soboty','Nedele'];
$('heatmap').addEventListener('click',e=>{
  const cell=e.target.closest('button[data-hour]');if(!cell)return;
  selectedHour={weekday:Number(cell.dataset.weekday),hour:Number(cell.dataset.hour)};
  $('detaildate').value='';renderHourDetail();$('hourdetail').showModal();
});
$('closedetail').onclick=()=>$('hourdetail').close();
$('detaildate').onchange=renderHourDetail;
function renderHourDetail(){
  if(!selectedHour)return;
  const {weekday,hour}=selectedHour,g=groups(records).get(`${weekday}-${hour}`);
  $('detailtitle').textContent=`${dayNames[weekday]}, ${hour}:00–${hour+1}:00`;
  const dates=[...new Set((g?.rows||[]).map(r=>localParts(r.t).date))].sort().reverse();
  const prior=$('detaildate').value;
  $('detaildate').innerHTML='<option value="">Všetky dátumy</option>'+dates.map(d=>`<option value="${d}">${d.split('-').reverse().join('. ')}</option>`).join('');
  $('detaildate').value=dates.includes(prior)?prior:'';
  const rows=(g?.rows||[]).filter(r=>!$('detaildate').value||localParts(r.t).date===$('detaildate').value);
  const good=rows.filter(r=>r.n!==null),daily=groups(rows).get(`${weekday}-${hour}`);
  $('detailstats').textContent=good.length?`Priemer: ${Math.round(daily.average)} osôb · Minimum: ${Math.min(...good.map(r=>r.n))} · Maximum: ${Math.max(...good.map(r=>r.n))} · Úspešné merania: ${good.length} · Počet dní: ${daily.days.size}`:'V tomto pásme zatiaľ nie sú úspešné merania.';
  const slots=daily?[...daily.daily.values()].reduce((s,d)=>s+Math.min(6,d.slots.size),0):0;
  const total=dates.filter(d=>!$('detaildate').value||d===$('detaildate').value).length*6;
  $('detailcoverage').textContent=total?`Pokrytie zaznamenaných dní: ${slots} zo ${total} desaťminútových úsekov. ${slots<total?'Neúplné dáta: priemer môže byť skreslený; pri prebiehajúcej hodine ďalšie merania ešte pribudnú.':'V každom desaťminútovom úseku máme aspoň jedno úspešné meranie.'} Dni úplne bez záznamu tu nie sú započítané.`:'Zatiaľ nemáme podklady na vyhodnotenie pokrytia.';
  $('detailrows').innerHTML=rows.slice().reverse().map(r=>`<tr><td>${full(r.t)}</td><td>${r.n===null?'—':r.n}</td><td>${r.n===null?'Neúspešný pokus':'Úspešné'}</td></tr>`).join('')||'<tr><td colspan="3">Žiadne merania.</td></tr>';
  if(!good.length){$('detailchart').innerHTML='';return}
  const w=700,h=180,left=40,right=680,top=15,bottom=145,max=Math.max(160,...good.map(r=>r.n));
  const minute=t=>Number(fmt(t,{minute:'2-digit',second:'2-digit'}).replace(/^(\d+).*$/,'$1'));
  const x=t=>left+minute(t)/60*(right-left),y=n=>bottom-n/max*(bottom-top);
  let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Jednotlivé merania v zvolenej hodine"><title>Každý bod je jedno úspešné meranie; presné hodnoty sú v tabuľke.</title>`;
  for(const n of [0,Math.round(max/2),max])svg+=`<line x1="${left}" x2="${right}" y1="${y(n)}" y2="${y(n)}" stroke="#dfe8e3"/><text x="32" y="${y(n)+4}" text-anchor="end" font-size="11" fill="#687b75">${n}</text>`;
  for(const m of [0,10,20,30,40,50,60])svg+=`<text x="${left+m/60*(right-left)}" y="170" text-anchor="middle" font-size="11" fill="#687b75">${m===60?hour+1:hour}:${m===60?'00':String(m).padStart(2,'0')}</text>`;
  for(const r of good)svg+=`<circle cx="${x(r.t)}" cy="${y(r.n)}" r="4" fill="#247762" fill-opacity=".65"><title>${full(r.t)}: ${r.n} osôb</title></circle>`;
  $('detailchart').innerHTML=svg+'</svg>';
}

function occupancyColor(n){
 const stops=[[0,[22,130,75]],[40,[120,189,85]],[80,[243,206,80]],[110,[237,133,70]],[160,[201,54,54]]];
 const value=Math.max(0,Math.min(160,n));
 for(let i=1;i<stops.length;i++){if(value<=stops[i][0]){const [a,ca]=stops[i-1],[b,cb]=stops[i],t=(value-a)/(b-a);return `rgb(${ca.map((c,j)=>Math.round(c+(cb[j]-c)*t)).join(',')})`}}
}
