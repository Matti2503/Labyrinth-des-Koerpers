/* Leitungsbahnen — Prototyp */
const BUILD='20';
const D=window.GAMEDATA;
const A={},R={};
for(const e of D.edges){
  if(e.g) continue;
  (A[e.f]??=[]).push({...e});
  (R[e.t]??=[]).push({...e});
  if(e.b){(A[e.t]??=[]).push({...e,f:e.t,t:e.f});(R[e.f]??=[]).push({...e,f:e.t,t:e.f});}
}
/* Abgaenge werden proximal -> distal bzw. kranial -> kaudal sortiert.
   Rangfolge: kuratierte Tabelle, dann Wirbelhoehe aus der Ursprungsangabe,
   dann Kantentyp (Ast vor Fortsetzung vor Anastomose), Kapillarbett zuletzt. */
const ORD=D.order||{};
function wirbel(txt){
  if(!txt)return null;
  const m=/(HWK|BWK|LWK|SWK)\s*(\d+)/.exec(txt);
  if(m)return {HWK:0,BWK:7,LWK:19,SWK:24}[m[1]]+ (+m[2]);
  const i=/ICR\s*(\d+)/.exec(txt);
  if(i)return 7 + (+i[1]);
  return null;
}
function sortiere(quelle,liste){
  const tab=ORD[quelle];
  const key=(e,i)=>{
    const kap=D.nodes[e.t]?.t==='kapillarbett'?1:0;
    const kl=kap?3:(e.r==='branch_of'?0:e.r==='continues_as'?1:2);
    let zweit;
    if(tab){const k=tab.indexOf(e.t);zweit=k>=0?k:900+i;}
    else {const w=wirbel(e.o);zweit=w!=null?w:900+i;}
    return kl*10000+zweit*10+ (i%10);
  };
  return liste.map((e,i)=>[key(e,i),i,e]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(x=>x[2]);
}
const nm=id=>D.nodes[id]?.n||id;
const de=id=>D.nodes[id]?.d||'';
const typ=id=>D.nodes[id]?.t||'arteriell';
const tk=id=>'t-'+typ(id);                       // CSS-Klasse nach Gefaesstyp
const TYPNAME={arteriell:'Arterie',venoes:'Vene',portal:'Pfortadersystem',
               kapillarbett:'Kapillarbett',kammer:'Herzhöhle'};
for(const k in A) A[k]=sortiere(k,A[k]);

/* ---------- Rough-Rahmen, deterministisch geseedet ---------- */
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
function rnd(seed){let s=seed||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%10000)/10000;};}
function roughPath(w,h,seed){
  const r=rnd(hash(seed)),o=()=>(r()-.5)*2.8,i=3;
  const seg=(x1,y1,x2,y2)=>`M${(x1+o()).toFixed(1)},${(y1+o()).toFixed(1)} Q${((x1+x2)/2+o()).toFixed(1)},${((y1+y2)/2+o()).toFixed(1)} ${(x2+o()).toFixed(1)},${(y2+o()).toFixed(1)}`;
  return[seg(i,i,w-i,i),seg(w-i,i,w-i,h-i),seg(w-i,h-i,i,h-i),seg(i,h-i,i,i),
        seg(i+1,i+2,w-i-1,i+1),seg(w-i-2,i+1,w-i-1,h-i-1),seg(w-i,h-i-1,i+1,h-i-2),seg(i+2,h-i,i+1,i+1)].join(' ');
}
function roughLine(x1,y1,x2,y2,seed,dop=true){
  const r=rnd(hash(seed)),o=()=>(r()-.5)*2.2;
  const z=(a,b,c,d)=>`M${(a+o()).toFixed(1)},${(b+o()).toFixed(1)} Q${((a+c)/2+o()).toFixed(1)},${((b+d)/2+o()).toFixed(1)} ${(c+o()).toFixed(1)},${(d+o()).toFixed(1)}`;
  return dop? z(x1,y1,x2,y2)+' '+z(x1,y1,x2,y2) : z(x1,y1,x2,y2);
}
function frames(){
  document.querySelectorAll('[data-rough]').forEach(el=>{
    const w=el.offsetWidth,h=el.offsetHeight;if(!w||!h)return;
    let s=el.querySelector(':scope>svg.rf');
    if(!s){s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','rf');el.prepend(s);}
    s.setAttribute('viewBox',`0 0 ${w} ${h}`);
    s.innerHTML=`<path d="${roughPath(w,h,el.dataset.rough+'|'+w+'x'+h)}"/>`;
  });
}
let t0;const repaint=()=>{cancelAnimationFrame(t0);t0=requestAnimationFrame(frames);};
addEventListener('resize',repaint);

/* ---------- Speicher ---------- */
const KEY='leitungsbahnen.v1';
async function loadMeta(){
  try{ if(window.storage){const r=await window.storage.get(KEY);if(r)return JSON.parse(r.value);} }catch(e){}
  try{ const v=localStorage.getItem(KEY); if(v) return JSON.parse(v); }catch(e){}
  return null;
}
async function saveMeta(){
  const s=JSON.stringify(meta);
  try{ if(window.storage){await window.storage.set(KEY,s);return;} }catch(e){}
  try{ localStorage.setItem(KEY,s);}catch(e){}
}
const RUNKEY='leitungsbahnen.run';
const LAUFEND=['nav','fight','loot','drop','inv'];

function speichereRun(){
  if(!G||!LAUFEND.includes(S))return false;
  const paket=JSON.stringify({v:BUILD,S,G,zeit:Date.now()});
  let ok=false;
  try{ localStorage.setItem(RUNKEY,paket); ok=true; }catch(e){}   // synchron, ueberlebt das Beenden
  try{ if(window.storage) window.storage.set(RUNKEY,paket); ok=true; }catch(e){}
  return ok;
}
async function ladeRun(){
  let roh=null;
  try{ roh=localStorage.getItem(RUNKEY); }catch(e){}
  if(!roh){ try{ if(window.storage){const r=await window.storage.get(RUNKEY); if(r)roh=r.value;} }catch(e){} }
  if(!roh)return null;
  try{
    const p=JSON.parse(roh);
    if(p.v!==BUILD)return null;                    // Fassungswechsel: Daten koennten unpassend sein
    if(!p.G||p.G.dead||!LAUFEND.includes(p.S))return null;
    return p;
  }catch(e){ return null; }
}
function loescheRun(){
  try{ localStorage.removeItem(RUNKEY); }catch(e){}
  try{ if(window.storage) window.storage.delete(RUNKEY); }catch(e){}
}
function codeAus(m){
  const kern={c:m.coins|0,p:m.perks||{},r:m.runs|0,b:m.best|0,e:m.enc|0,s:m.srs||{}};
  return 'LB1-'+btoa(unescape(encodeURIComponent(JSON.stringify(kern)))).replace(/=+$/,'');
}
function codeEin(txt){
  const t=(txt||'').trim().replace(/\s+/g,'');
  if(!t.startsWith('LB1-'))throw new Error('Der Code beginnt nicht mit LB1-.');
  let roh=t.slice(4).replace(/-/g,'+').replace(/_/g,'/');
  while(roh.length%4)roh+='=';
  let k;
  try{ k=JSON.parse(decodeURIComponent(escape(atob(roh)))); }
  catch(e){ throw new Error('Der Code ist unvollständig oder beschädigt.'); }
  if(typeof k!=='object'||k===null||typeof k.c!=='number')throw new Error('Der Code enthält keinen gültigen Fortschritt.');
  const perks={};
  for(const p of PERKS){const v=Math.max(0,Math.min(p.max,(k.p&&k.p[p.id])|0)); if(v)perks[p.id]=v;}
  const srs={};
  const gueltig=new Set(D.questions.map(q=>q.id));
  for(const id in (k.s||{})) if(gueltig.has(id)){
    const e=k.s[id]; srs[id]={n:Math.max(0,Math.min(4,e.n|0)),due:e.due|0,w:e.w|0};
  }
  return {coins:Math.max(0,k.c|0),perks,runs:Math.max(0,k.r|0),best:Math.max(0,Math.min(10,k.b|0)),
          enc:Math.max(0,k.e|0),srs};
}
let startMonster='zweifel';
let optVorher='start';
let gespeichert=null;
let entwurf=null;      // eingelesener, noch nicht uebernommener Fortschritt
let hinweis='';        // Rueckmeldung an den Nutzer                                // Vorschau fuer das Hauptmenue

const PERKS=[
 {id:'hp',n:'Dickeres Fell',x:'+10 maximale HP',c:15,max:3},
 {id:'dmg',n:'Schärfere Klinge',x:'+2 Grundschaden',c:18,max:3},
 {id:'rr',n:'Zweiter Kaffee',x:'+1 Reroll pro Run',c:26,max:2},
 {id:'crit',n:'Ruhige Hand',x:'+5 % Krit-Chance',c:32,max:2},
 {id:'srs',n:'Wiederholungsdrill',x:'Fehlerfragen kommen öfter',c:45,max:1},
 {id:'opt',n:'Semesterferien',x:'5 Item-Optionen statt 4',c:60,max:1}];
const STUFEN={
 laie:   {n:'Laie',    schaden:12, hpVerlust:6,  wahl:5, rerolls:1, krit:1.0, coins:0.8,
          fragen:'leicht', x:'Mehr Schaden, weniger HP-Verlust, fünf Items zur Wahl. Leichtere Fragen. 20 % weniger Coins.'},
 experte:{n:'Experte', schaden:10, hpVerlust:8,  wahl:4, rerolls:0, krit:1.0, coins:1.0,
          fragen:'gemischt', x:'Die ausgewogene Einstellung. Vier Items zur Wahl, Coins unverändert.'},
 prof:   {n:'Prof',    schaden:9,  hpVerlust:11, wahl:3, rerolls:0, krit:1.4, coins:1.5,
          fragen:'schwer', x:'Harte Fehler, nur drei Items zur Wahl, schwerere Fragen — dafür 40 % mehr Krit-Bonus und die Hälfte mehr Coins.'}
};
const stufeVon=id=>STUFEN[id]||STUFEN.experte;
const runStufe=()=>stufeVon(G&&G.stufe ? G.stufe : opt().stufe);
const OPT_STD={schrift:'hand',groesse:'normal',eink:false,stufe:'experte'};
let meta={coins:0,perks:{},srs:{},enc:0,runs:0,best:0,opt:{...OPT_STD}};
function opt(){ meta.opt={...OPT_STD,...(meta.opt||{})}; return meta.opt; }
function setzeOptionen(){
  const o=opt(), b=document.body; if(!b)return;
  b.classList.toggle('klar', o.schrift==='klar');
  b.classList.toggle('fs-gross', o.groesse==='gross');
  b.classList.toggle('fs-sehrgross', o.groesse==='sehrgross');
  b.classList.toggle('eink', !!o.eink);
}
const eink=()=>!!opt().eink;
const perk=id=>meta.perks[id]||0;

/* ---------- Run ---------- */
let G=null,S='start',UI={};
function newRun(){
  const b=D.base;
  const st=stufeVon(opt().stufe);          // gilt fuer den ganzen Run, spaeteres Umstellen wirkt erst beim naechsten
  G={level:1,stufe:opt().stufe,hpMax:b.player_hp_max+perk('hp')*10,dmgBase:st.schaden+perk('dmg')*2,
     crit:b.base_crit_chance+perk('crit')*.05,critMult:b.base_crit_multiplier,
     rerolls:b.rerolls_per_run+perk('rr')+st.rerolls,items:[],branches:0,kills:0,corrects:0,
     nextFight:2+Math.floor(Math.random()*3),seen:[],luck:0,revive:0,coinMult:1,coinAdd:0,
     wrongFight:false,lastWrong:false,streak:0,qi:0};
  G.hp=G.hpMax; quest(); S='nav';
}
function quest(){
  const ids=Object.keys(D.nodes);
  const minH=G.endlos?8:3, maxH=G.endlos?16:6;
  for(let t=0;t<1500;t++){
    const ziel=ids[(Math.random()*ids.length)|0];
    if(!R[ziel])continue;
    const dist={[ziel]:0},q=[ziel];
    while(q.length){const c=q.shift();for(const e of(R[c]||[]))if(!(e.f in dist)){dist[e.f]=dist[c]+1;q.push(e.f);}}
    const cand=Object.keys(dist).filter(k=>dist[k]>=minH&&dist[k]<=maxH&&(A[k]||[]).length>1);
    if(!cand.length)continue;
    G.ziel=ziel;G.dist=dist;G.node=cand[(Math.random()*cand.length)|0];G.start=G.node;G.hops=dist[G.node];
    return;
  }
  // Notfallrueckfall, falls im gewuenschten Fenster nichts gefunden wurde
  for(let t=0;t<600;t++){
    const ziel=ids[(Math.random()*ids.length)|0];
    if(!R[ziel])continue;
    const dist={[ziel]:0},q=[ziel];
    while(q.length){const c=q.shift();for(const e of(R[c]||[]))if(!(e.f in dist)){dist[e.f]=dist[c]+1;q.push(e.f);}}
    const cand=Object.keys(dist).filter(k=>dist[k]>=Math.max(3,minH-3)&&(A[k]||[]).length>1);
    if(!cand.length)continue;
    G.ziel=ziel;G.dist=dist;G.node=cand[(Math.random()*cand.length)|0];G.start=G.node;G.hops=dist[G.node];
    return;
  }
  G.ziel=ids[0];G.node=ids[0];G.dist={};G.hops=0;
}
/* Items */
const tagN=t=>G.items.filter(i=>i.g.includes(t)).length;
/* Beschreibung und Wirkung stehen bewusst nebeneinander. Die Boni wurden
   zuvor nur in den Itemdaten gefuehrt und teilweise nie ausgewertet. */
const SETS={
 chirurgie:{name:'Chirurgie',
   3:'+10 % Schaden.',
   5:'+15 % Krit-Chance und Krit-Multiplikator +0,5.'},
 notaufnahme:{name:'Notaufnahme',
   3:'+15 maximale HP, sofort gutgeschrieben.',
   5:'Erlittener Schaden −15 % und +10 HP bei jedem Quest-Abschluss.'},
 groessenwahn:{name:'Größenwahn',
   3:'+15 % Schaden, dafür −10 maximale HP.',
   5:'Zusätzlich +1 Schaden für je 5 maximale HP, die dir unter 100 fehlen.'},
 unialltag:{name:'Unialltag',
   3:'+1 Reroll pro Run.',
   5:'10 % Chance auf eine entfernte Falschantwort und +15 % Coins am Run-Ende.'},
 medimeister:{name:'Medimeister',
   3:'+15 Prozentpunkte auf alle Zufallseffekte im Run.',
   5:'Nach jedem gewonnenen Kampf 25 % Chance auf ein Gratis-Item.'}
};
const SETTAGS=Object.keys(SETS);
/* Schwere Fragen sind riskanter und werden deshalb staerker belohnt:
   je Schwierigkeitsstufe oberhalb 2 gibt es 7 Prozentpunkte Kritchance dazu. */
const KRIT_JE_STUFE=0.07;
const kritBonus=d=>Math.max(0,((d??3)-2))*KRIT_JE_STUFE*runStufe().krit;
const luck=c=>Math.random()<(c+G.luck);
function equip(it){
  it={...it,e:it.e.map(e=>({...e}))};
  const lad=it.e.find(e=>e.op==='reveal_path');
  if(lad)it._ch=lad.charges;
  G.items.push(it);
  for(const e of it.e){
    if(e.hook!=='onRunStart')continue;
    if(e.op==='hp_max_add'){G.hpMax+=e.value;G.hp=Math.min(G.hp+Math.max(0,e.value),G.hpMax);}
    if(e.op==='hp_max_set'){G.hpMax=e.value;G.hp=Math.min(G.hp,G.hpMax);}
    if(e.op==='crit_chance_add')G.crit+=e.value;
    if(e.op==='crit_mult_add')G.critMult+=e.value;
    if(e.op==='reroll_add')G.rerolls+=e.value;
    if(e.op==='global_chance_add')G.luck+=e.value;
  }
  const c=tagN(it.g[0]);
  if(it.g.includes('notaufnahme')&&tagN('notaufnahme')===3){G.hpMax+=15;G.hp+=15;}
  if(it.g.includes('groessenwahn')&&tagN('groessenwahn')===3){G.hpMax-=10;G.hp=Math.min(G.hp,G.hpMax);}
  if(it.g.includes('unialltag')&&tagN('unialltag')===3)G.rerolls+=1;
  if(it.g.includes('medimeister')&&tagN('medimeister')===3)G.luck+=0.15;
}
function schaden(){
  let flat=G.dmgBase,mult=1;
  for(const it of G.items)for(const e of it.e){
    if(e.hook!=='onCorrect')continue;
    const c=e.condition||{};
    if(c.chance!=null&&!luck(c.chance))continue;
    if(c.question_index!=null&&c.question_index!==G.qi)continue;
    if(c.streak_min!=null&&G.streak<c.streak_min)continue;
    if(c.hp_percent_min!=null&&G.hp/G.hpMax<c.hp_percent_min)continue;
    if(c.hp_percent_below!=null&&G.hp/G.hpMax>=c.hp_percent_below)continue;
    if(c.target_hp_min!=null&&(G.mon?.max||0)<c.target_hp_min)continue;
    if(c.subject&&G.q?.f!==c.subject)continue;
    if(c.every_nth_correct!=null&&(G.corrects+1)%c.every_nth_correct!==0)continue;
    if(c.difficulty_min!=null&&(G.q?.d??3)<c.difficulty_min)continue;
    if(e.op==='damage_add')flat+=e.value;
    else if(e.op==='damage_mult')mult*=e.value;
    else if(e.op==='damage_mult_stacking'){
      mult*=Math.min(Math.pow(e.value,G.stack||0), e.cap??99);
    }
    else if(e.op==='damage_add_scaling'){
      const m={monsters_defeated:G.kills,level:G.level,missing_max_hp_per_10:Math.max(0,((100-G.hpMax)/10)|0)}[e.scales_with]||0;
      flat+=Math.min(e.value*m,e.cap??999);
    }
  }
  if(tagN('chirurgie')>=3)mult*=1.10;
  if(tagN('groessenwahn')>=3)mult*=1.15;
  if(tagN('groessenwahn')>=5)flat+=Math.max(0,Math.floor((100-G.hpMax)/5));
  if(G.wette)mult*=2;
  let d=Math.max(1,Math.round(flat*mult));
  const cc=G.crit+(tagN('chirurgie')>=5?.15:0)+kritBonus(G.q?.d);
  let krit=luck(cc);
  // garantierter Krit in festem Rhythmus
  for(const it of G.items)for(const e of it.e){
    if(e.op!=='force_crit')continue;
    const n=e.condition?.every_nth_question;
    if(n&&((G.fragenGesamt||0)+1)%n===0)krit=true;
  }
  if(krit){
    d=Math.round(d*(G.critMult+(tagN('chirurgie')>=5?.5:0)));
    for(const it of G.items)for(const e of it.e)
      if(e.hook==='onCrit'&&e.op==='damage_add')d+=e.value;
  }
  return{d,krit};
}
function verlust(){
  let l=runStufe().hpVerlust,mult=1;
  for(const it of G.items)for(const e of it.e){
    if(e.hook!=='onWrong')continue;
    const c=e.condition||{};
    if(c.first_wrong_in_fight&&G.wrongFight)continue;
    if(c.question_index!=null&&c.question_index!==G.qi)continue;
    if(e.op==='hp_loss_set')l=e.value;
    else if(e.op==='damage_taken_mult')mult*=e.value;
  }
  if(tagN('notaufnahme')>=5)mult*=.85;
  if(G.wette)mult*=2;
  return Math.max(0,Math.round(l*mult));
}
function versteckt(q){
  if(G.items.some(i=>i.e.some(e=>e.op==='disable_op')))return 0;
  let n=0;
  for(const it of G.items)for(const e of it.e){
    if(e.hook!=='onQuestionStart'||e.op!=='remove_distractors')continue;
    const c=e.condition||{};
    if(c.subject&&q.f!==c.subject)continue;
    if(c.after_wrong&&!G.lastWrong)continue;
    if(c.chance!=null&&!luck(c.chance))continue;
    n=Math.max(n,e.value);
  }
  if(tagN('unialltag')>=5&&luck(.10))n=Math.max(n,1);
  return n;
}
/* Fragen + Wiederholung */
const STEPS=[3,8,20,45,100];
const MEISTERN=4;          // so oft in Folge richtig, dann pausiert die Frage
const MIN_AKTIV=20;        // so viele Fragen bleiben mindestens im Umlauf
/* Sind fast alle Fragen gemeistert, kehren die am laengsten pausierenden zurueck.
   Ohne diesen Rueckholmechanismus liefe der Fragenpool irgendwann leer. */
function aktivePool(){
  let aktiv=D.questions.filter(q=>!(meta.srs[q.id]||{}).ruhe);
  if(aktiv.length>=MIN_AKTIV)return aktiv;
  const ruhend=D.questions.filter(q=>(meta.srs[q.id]||{}).ruhe)
    .sort((a,b)=>(meta.srs[a.id].ruhe)-(meta.srs[b.id].ruhe));
  for(const q of ruhend){
    if(aktiv.length>=MIN_AKTIV+10)break;
    const st=meta.srs[q.id]; st.ruhe=null; st.r=0; st.n=Math.max(0,(st.n||0)-1);
    st.due=meta.enc; aktiv.push(q);
  }
  return aktiv;
}
const gemeistertAnzahl=()=>D.questions.filter(q=>(meta.srs[q.id]||{}).ruhe).length;
function frage(){
  const pool0=aktivePool();
  const frei=q=>!G.seen.includes(q.id);
  const faellig=pool0.filter(q=>frei(q)&&meta.srs[q.id]&&meta.srs[q.id].due<=meta.enc);
  const neu=pool0.filter(q=>frei(q)&&!meta.srs[q.id]);
  // Ortsbezogene Fragen nur, wenn sie zur gewaehlten Schwierigkeit passen —
  // sonst wuerden die wenigen Fragen am aktuellen Gefaess die Steuerung aushebeln.
  const artL=runStufe().fragen;
  let lokal=pool0.filter(q=>frei(q)&&q.v.includes(G.node));
  if(artL!=='gemischt'){
    const passend=lokal.filter(q=> artL==='leicht' ? (q.d??3)<=3 : (q.d??3)>=3);
    lokal = passend.length?passend:[];
  }
  const rest=pool0.filter(frei);
  const r=Math.random(),pD=perk('srs')?.75:.60;
  let pool = (lokal.length&&r<.25)?lokal : (faellig.length&&r<pD)?faellig
           : (neu.length&&r<pD+.25)?neu : (rest.length?rest:D.questions);
  if(!pool.length)pool=pool0.length?pool0:D.questions;
  // Gewichtung nach Schwierigkeit je nach Spielstufe
  const art=runStufe().fragen;
  if(art==='gemischt')return pool[(Math.random()*pool.length)|0];
  const gew=q=>{const d=q.d??3;
    return art==='leicht' ? (d<=2?4:d===3?2:1) : (d>=4?4:d===3?2:1);};
  let summe=0; for(const q of pool)summe+=gew(q);
  let x=Math.random()*summe;
  for(const q of pool){x-=gew(q); if(x<=0)return q;}
  return pool[pool.length-1];
}
function bewerte(id,ok){
  meta.enc++;
  const s=meta.srs[id]||{n:0,w:0,r:0};
  s.n=ok?Math.min(s.n+1,STEPS.length-1):0;
  s.due=meta.enc+STEPS[s.n];
  if(ok){
    s.r=(s.r||0)+1;
    if(s.r>=MEISTERN&&!s.ruhe){ s.ruhe=meta.enc; G.neuGemeistert=(G.neuGemeistert||0)+1; G.meisterJetzt=true; }
  }else{
    s.w=(s.w||0)+1; s.r=0;
    if(s.ruhe)s.ruhe=null;                       // Fehler holt die Frage zurueck
  }
  meta.srs[id]=s;
}
const MONSTER=[
 // Stufe 1 — Level 1 bis 3
 {id:'zweifel',n:'Der Zweifel',t:1,p:`
  <path d="M22 96 C10 60 16 20 60 14 C104 20 110 60 98 96 C84 88 76 100 60 92 C44 100 36 88 22 96Z"/>
  <ellipse cx="60" cy="46" rx="20" ry="14"/><circle cx="60" cy="46" r="6" fill="var(--tinte)"/>
  <path d="M44 74 q16 8 32 0"/>`},
 {id:'kreuzfrage',n:'Die Kreuzfrage',t:1,p:`
  <path d="M38 26 L58 50 L80 26 M38 88 L58 62 L80 88"/>
  <circle cx="59" cy="56" r="19"/>
  <circle cx="52" cy="51" r="3" fill="var(--tinte)"/><circle cx="67" cy="51" r="3" fill="var(--tinte)"/>
  <path d="M51 66 q8 7 17 0"/>
  <path d="M36 24 l-11 -8 M82 24 l11 -8 M36 90 l-11 9 M82 90 l11 9"/>`},
 {id:'schwarm',n:'Erythrozytenschwarm',t:1,p:`
  <ellipse cx="38" cy="44" rx="17" ry="12"/><ellipse cx="38" cy="44" rx="6" ry="4"/>
  <ellipse cx="80" cy="35" rx="14" ry="10"/><ellipse cx="80" cy="35" rx="5" ry="3.5"/>
  <ellipse cx="60" cy="76" rx="19" ry="13"/><ellipse cx="60" cy="76" rx="7" ry="4.5"/>
  <path d="M31 39 l4 3 M45 39 l-4 3 M53 71 l5 3 M67 71 l-5 3"/>`},
 // Stufe 2 — Level 4 bis 6
 {id:'altklausur',n:'Der Altklausurgeist',t:2,p:`
  <path d="M28 98 V46 C28 24 43 12 60 12 C77 12 92 24 92 46 V98 l-8 -9 -8 9 -8 -9 -8 9 -8 -9 -8 9Z"/>
  <circle cx="50" cy="44" r="4" fill="var(--tinte)"/><circle cx="72" cy="44" r="4" fill="var(--tinte)"/>
  <path d="M51 63 q9 8 19 0"/>
  <path d="M74 74 h18 v16 h-18Z M78 79 h10 M78 84 h10"/>`},
 {id:'nachtschicht',n:'Die Nachtschicht',t:2,p:`
  <circle cx="54" cy="28" r="15"/>
  <path d="M46 25 q5 -4 10 0 M60 25 q5 -4 9 0"/>
  <path d="M48 33 q6 4 12 0"/>
  <path d="M54 43 V78 M54 52 L36 62 M54 52 L74 60 M54 78 L44 100 M54 78 L66 100"/>
  <path d="M76 58 h14 v12 h-14Z M90 61 h5 v5 h-5"/>
  <path d="M80 52 q2 -6 0 -9 M86 52 q2 -6 0 -9"/>`},
 {id:'blackout',n:'Der Blackout',t:2,p:`
  <path d="M22 76 q-8 -24 12 -29 q1 -21 25 -19 q19 -7 28 11 q21 1 18 21 q7 19 -14 23 H34 q-13 -2 -12 -7Z"/>
  <path d="M34 46 q10 8 20 0 M62 44 q10 8 20 0 M40 60 q12 7 24 0"/>
  <circle cx="48" cy="70" r="3.5" fill="var(--tinte)"/><circle cx="72" cy="68" r="3.5" fill="var(--tinte)"/>`},
 // Stufe 3 — Level 7 bis 9
 {id:'pruefer',n:'Der Prüfer',t:3,p:`
  <circle cx="58" cy="24" r="14"/>
  <path d="M46 22 h10 M60 22 h10 M56 22 q2 3 4 0"/>
  <circle cx="51" cy="22" r="5"/><circle cx="65" cy="22" r="5"/>
  <path d="M52 32 h12"/>
  <path d="M58 38 V82 M58 48 L38 58 M58 48 L80 54 M58 82 L48 102 M58 82 L70 102"/>
  <path d="M30 54 h20 v22 h-20Z M34 60 h12 M34 66 h12 M34 72 h8"/>`},
 {id:'skript',n:'Das Skript',t:3,p:`
  <path d="M24 40 h72 v50 h-72Z"/><path d="M28 34 h72 v50 M32 28 h72 v50"/>
  <circle cx="48" cy="60" r="4" fill="var(--tinte)"/><circle cx="72" cy="60" r="4" fill="var(--tinte)"/>
  <path d="M46 74 q14 9 28 0"/>
  <path d="M40 90 V102 M80 90 V102"/>`},
 {id:'thrombus',n:'Der Thrombus',t:3,p:`
  <path d="M30 62 q-8 -18 8 -24 q4 -16 22 -14 q18 -6 26 8 q16 4 12 22 q10 14 -6 24 q-6 16 -24 12 q-16 8 -28 -6 q-14 -6 -10 -22Z"/>
  <circle cx="50" cy="56" r="3.5" fill="var(--tinte)"/><circle cx="72" cy="54" r="3.5" fill="var(--tinte)"/>
  <path d="M50 72 q12 6 22 -2"/>
  <path d="M30 38 l-10 -8 M92 44 l11 -7 M88 84 l10 8 M34 86 l-9 9"/>`},
 {id:'vagus',n:'Die Vagusschlange',t:3,p:`
  <path d="M18 94 q22 -6 20 -24 q-2 -20 18 -24 q20 -4 22 -18 q2 -12 -8 -16"/>
  <circle cx="66" cy="14" r="12"/>
  <circle cx="62" cy="12" r="2.6" fill="var(--tinte)"/><circle cx="72" cy="12" r="2.6" fill="var(--tinte)"/>
  <path d="M64 20 q5 4 9 0 M68 24 v8 M68 32 l-4 5 M68 32 l4 5"/>`},
 // Stufe 4 — Level 10
 {id:'physikum',n:'Das Physikum',t:4,p:`
  <path d="M14 100 L60 10 L106 100Z"/>
  <path d="M28 78 h64 M38 60 h44 M48 42 h24"/>
  <circle cx="48" cy="86" r="5"/><circle cx="48" cy="86" r="2" fill="var(--tinte)"/>
  <circle cx="72" cy="86" r="5"/><circle cx="72" cy="86" r="2" fill="var(--tinte)"/>
  <circle cx="60" cy="68" r="4.5"/><circle cx="60" cy="68" r="2" fill="var(--tinte)"/>
  <path d="M50 96 q10 6 20 0"/>`,hpMult:1.6},
 {id:'kolloquium',n:'Das Kolloquium',t:5,serie:3,p:`
  <path d="M16 98 h88 v-8 H16Z"/>
  <path d="M26 90 V58 q0 -16 16 -16 h36 q16 0 16 16 v32"/>
  <circle cx="42" cy="30" r="11"/><circle cx="60" cy="24" r="12"/><circle cx="78" cy="30" r="11"/>
  <circle cx="38" cy="29" r="2.4" fill="var(--tinte)"/><circle cx="46" cy="29" r="2.4" fill="var(--tinte)"/>
  <circle cx="55" cy="23" r="2.6" fill="var(--tinte)"/><circle cx="65" cy="23" r="2.6" fill="var(--tinte)"/>
  <circle cx="74" cy="29" r="2.4" fill="var(--tinte)"/><circle cx="82" cy="29" r="2.4" fill="var(--tinte)"/>
  <path d="M37 36 q5 4 10 0 M55 31 q5 4 10 0 M73 36 q5 4 10 0"/>
  <path d="M34 62 h52 M34 72 h40"/>`},
 {id:'ausschuss',n:'Der Prüfungsausschuss',t:4,p:`
  <circle cx="30" cy="40" r="13"/><circle cx="60" cy="32" r="14"/><circle cx="90" cy="40" r="13"/>
  <circle cx="26" cy="38" r="2.6" fill="var(--tinte)"/><circle cx="35" cy="38" r="2.6" fill="var(--tinte)"/>
  <circle cx="55" cy="30" r="2.8" fill="var(--tinte)"/><circle cx="65" cy="30" r="2.8" fill="var(--tinte)"/>
  <circle cx="85" cy="38" r="2.6" fill="var(--tinte)"/><circle cx="95" cy="38" r="2.6" fill="var(--tinte)"/>
  <path d="M25 46 q5 4 10 0 M54 39 q6 5 12 0 M85 46 q5 4 10 0"/>
  <path d="M18 96 h84 v-26 h-84Z M18 82 h84"/>`,hpMult:1.5}
];
const SELTEN={common:'gewöhnlich',uncommon:'ungewöhnlich',rare:'selten'};
const rk=i=>'r-'+(i.r||'common');                 // CSS-Klasse nach Seltenheit
/* Tags, die du schon sammelst, werden im Angebot markiert — so ist erkennbar,
   welches Item die naechste Set-Schwelle naeher bringt. */
function tagChips(i){
  return i.g.map(t=>{const n=G.items.filter(x=>x.g.includes(t)).length;
    const naechste = n>=5?null : (n>=3?5:3);
    const titel = n ? `${n} im Besitz${naechste?`, ${naechste-n} bis zum ${naechste}er`:''}` : '';
    return `<span class="chip${n?' chip-meins':''}">${esc(t)}${n?` ·&nbsp;${n}`:''}</span>`
      + (n&&naechste&&naechste-n===1?`<span class="chip chip-nah">nächstes bringt ${naechste}er</span>`:'');
  }).join('');
}
const rlabel=i=>SELTEN[i.r]||i.r;
const monById=id=>MONSTER.find(m=>m.id===id)||MONSTER[0];
const monStufe=L=>L<=3?1:L<=6?2:L<=9?3:4;
const monHP=()=>{const L=G.level;
  return L<=2?15:L<=4?25:L<=6?35:L<=8?45:L<=10?55:55+(L-10)*7;};
function finale(){
  const w=MONSTER.find(m=>m.id==='kolloquium');
  G.mon={id:w.id,n:w.n,hp:w.serie,max:w.serie,serie:w.serie};
  G.wrongFight=false;G.qi=0;G.stack=0;G.finale=true;naechsteFrage();S='fight';
}
function kampf(){
  const stufe=monStufe(G.level);
  // Im Endlos-Modus mischen sich ab Level 11 die schweren Gegner
  let pool=G.level>10 ? MONSTER.filter(m=>m.t===3||m.t===4)
                      : MONSTER.filter(m=>m.t===stufe);
  if(!pool.length)pool=MONSTER.filter(m=>m.t<=stufe);
  if(!pool.length)pool=MONSTER;
  const w=pool[(Math.random()*pool.length)|0];
  const m=w.serie?w.serie:Math.round(monHP()*(w.hpMult||1));
  G.mon={id:w.id,n:w.n,hp:m,max:m,serie:w.serie||0};
  G.wrongFight=false;G.qi=0;G.stack=0;naechsteFrage();S='fight';
}
function naechsteFrage(){
  const q=frage();G.q=q;G.seen.push(q.id);
  // Die Optionen werden bei jeder Anzeige neu gemischt, damit nicht die
  // Position der richtigen Antwort gelernt wird statt des Inhalts.
  const texte=['A','B','C','D','E'].filter(k=>q.o[k]).map(k=>[k,q.o[k]]);
  for(let i=texte.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[texte[i],texte[j]]=[texte[j],texte[i]];}
  G.anz={}; G.korrekt=null;
  texte.forEach(([alt,txt],i)=>{const neu=['A','B','C','D','E'][i];
    G.anz[neu]=txt; if(alt===q.c)G.korrekt=neu;});
  const falsch=Object.keys(G.anz).filter(k=>k!==G.korrekt);
  const n=versteckt(q),weg=[];
  const pool=[...falsch];
  for(let i=0;i<n&&pool.length>1;i++)weg.push(pool.splice((Math.random()*pool.length)|0,1)[0]);
  G.weg=weg;G.antwort=null;G.wette=false;G.meisterJetzt=false;
  G.fragenGesamt=(G.fragenGesamt||0)+1;
  // Themenhinweis
  G.tipp=null;
  for(const it of G.items)for(const e of it.e){
    if(e.hook!=='onQuestionStart'||e.op!=='hint')continue;
    const c=e.condition||{};
    if(c.chance!=null&&!luck(c.chance))continue;
    G.tipp=(q.t&&q.t.length)?q.t.join(', '):q.f;
  }
  // Frage loest sich von selbst
  G.auto=false;
  for(const it of G.items)for(const e of it.e){
    if(e.hook!=='onQuestionStart'||e.op!=='auto_resolve_correct')continue;
    if(luck(e.condition?.chance??0))G.auto=it.n;
  }
}
function loot(){
  const n=runStufe().wahl+(perk('opt')?1:0)+(G.items.some(i=>i.e.some(e=>e.op==='item_choices_add'))?1:0);
  const hab=G.items.map(i=>i.id),aus=G.items.flatMap(i=>i.ex||[]);
  const pool=D.items.filter(i=>!hab.includes(i.id)&&!aus.includes(i.id));
  const w={common:60,uncommon:30,rare:10},out=[];
  /* Sammlungsaffinitaet: Items der Tags, die du schon sammelst, erscheinen
     etwas haeufiger. Bewusst schwach gehalten — es soll lenken, nicht garantieren.
     Gezaehlt wird nur der staerkste passende Tag, sonst wuerden Items mit
     zwei Tags uebermaessig bevorzugt. */
  const AFFIN=0.12, AFFIN_MAX=5;
  const meine={};
  for(const i of G.items) for(const t of i.g) meine[t]=(meine[t]||0)+1;
  const gewicht=i=>{
    const beste=Math.min(AFFIN_MAX, Math.max(0,...i.g.map(t=>meine[t]||0)));
    return w[i.r]*(1+AFFIN*beste);
  };
  // Seltenheitsaufwertung durch Items
  let auf=0;
  for(const it of G.items)for(const e of it.e)
    if(e.op==='rarity_upgrade')auf=Math.max(auf,e.condition?.chance??0);
  const hoeher={common:'uncommon',uncommon:'rare',rare:'rare'};
  while(out.length<n&&pool.length){
    let x=Math.random()*pool.reduce((a,i)=>a+gewicht(i),0), k0=-1;
    for(let k=0;k<pool.length;k++){x-=gewicht(pool[k]);if(x<=0){k0=k;break;}}
    if(k0<0)k0=0;
    let gew=pool[k0];
    if(auf&&Math.random()<auf){
      const ziel=hoeher[gew.r];
      const bess=pool.filter(i=>i.r===ziel&&i!==gew);
      if(bess.length)gew=bess[(Math.random()*bess.length)|0];
    }
    out.push(gew); pool.splice(pool.indexOf(gew),1);
  }
  return out;
}

/* ================= Oberfläche ================= */
const app=document.getElementById('app');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const box=(inner,seed,cls='')=>`<div class="box ${cls}" data-rough="${seed}">${inner}</div>`;
const btn=(label,act,arg='',dis='')=>
  `<div class="box duenn" data-rough="b${act}${arg}"><button ${dis} data-act="${act}" data-arg="${esc(arg)}">${label}</button></div>`;

function kopf(){
  const p=Math.max(0,G.hp)/G.hpMax*100;
  return box(`<div style="display:flex;gap:12px;align-items:flex-start">
    <div style="flex:1 1 auto;min-width:0">
    <div class="zeile"><span>Level ${G.endlos?G.level+' · Endlos':G.level+'/10'}<span class="klein"> · ${esc(stufeVon(G.stufe).n)}</span></span><span class="mono">${Math.max(0,G.hp)} / ${G.hpMax} HP</span></div>
    <div class="balken"><i style="width:${p}%"></i></div>
    <div class="klein">Bringe den Erythrozyten von <span class="lat">${esc(nm(G.start))}</span> nach <span class="lat">${esc(nm(G.ziel))}</span></div>
    ${G.items.length?`<div class="chips">${G.items.slice(0,4).map(i=>`<span class="chip">${esc(i.n)}</span>`).join('')}${G.items.length>4?`<span class="chip">+${G.items.length-4}</span>`:''}</div>`:''}
    </div>${S==='nav'?'':heldSVG()}</div>`,'kopf'+G.level+'-'+G.items.length+'-'+S);
}
const FIG_VB=62, FIG_VBH=76;      // Koordinatensystem der Figur
function figurPfade(breite,mitteX){
  const t=n=>G.items.filter(i=>i.g.includes(n)).length;
  const L=G.level, p=[];
  p.push('<circle cx="30" cy="16" r="8"/><path d="M30 24 V50 M30 32 L18 40 M30 32 L42 40 M30 50 L21 66 M30 50 L39 66"/>');
  if(t('chirurgie')>0) p.push('<path d="M42 40 L54 26 M50 26 h8"/>');           // Skalpell
  if(t('notaufnahme')>0) p.push('<path d="M18 40 l-9 4 v10 l9 4 9-4 V44Z"/>');  // Schild
  if(t('groessenwahn')>0) p.push('<path d="M22 30 q-12 -6 -14 4 q8 -1 14 3 M38 30 q12 -6 14 4 q-8 -1 -14 3"/>'); // Fluegel
  if(t('unialltag')>0) p.push('<path d="M22 8 h16 M24 8 v-4 h12 v4"/>');        // Kaeppi
  if(t('medimeister')>0) p.push('<path d="M44 60 h9 v9 h-9Z M53 62 h4 v4 h-4"/>'); // Krug
  if(L>=5) p.push('<path d="M22 9 q8 -7 16 0"/>');                              // Helmbuegel
  if(L>=8) p.push('<path d="M14 70 q16 5 32 0"/>');                             // Standlinie
  const sk=breite/FIG_VB;
  // Die Figur ist im eigenen Koordinatensystem um x=31 symmetrisch.
  const dx=(mitteX==null? 3 : mitteX - (FIG_VB/2)*sk);
  return `<g transform="translate(${dx.toFixed(2)},0) scale(${sk.toFixed(3)})" fill="none" stroke="var(--tinte)"
    stroke-width="${(1.9/sk).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${p.join('')}</g>`;
}
function heldSVG(){
  return `<svg viewBox="0 0 ${FIG_VB} ${FIG_VBH}" width="50" height="62" aria-label="Deine Figur, Level ${G.level}"
    style="display:block;flex:0 0 auto">${figurPfade(56,FIG_VB/2)}</svg>`;
}
function monsterSVG(id){
  const m=monById(id);
  return `<svg viewBox="0 0 120 110" width="112" height="102" aria-label="${esc(m.n)}"
    style="display:block;margin:0 auto"><g fill="none" stroke="var(--tinte)" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round">${m.p}</g></svg>`;
}
function monsterSVGalt(){
  return `<svg viewBox="0 0 120 110" width="112" height="102" aria-hidden="true" style="display:block;margin:0 auto">
    <g fill="none" stroke="var(--tinte)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 96 C10 60 16 20 60 14 C104 20 110 60 98 96 C84 88 76 100 60 92 C44 100 36 88 22 96Z"/>
    <ellipse cx="60" cy="46" rx="20" ry="14"/><circle cx="60" cy="46" r="6" fill="var(--tinte)"/>
    <path d="M44 72 q16 8 32 0"/></g></svg>`;
}
function render(){
  let h='';
  if(G){                                   // Zustaende gegen Inkonsistenz absichern
    if(S==='fight'&&!G.mon)S='nav';
    if(S==='drop'&&!G.drop)S='nav';
    if(S==='loot'&&!G.loot)S='nav';
  } else if(!['start','shop','export','importform','importpruef','reset','opt'].includes(S)) S='start';
  if(S==='start'){
    h=`<h1>Das Labyrinth<br>des Körpers</h1>
       <p class="klein">Ein Roguelite über Leitungsbahnen · Stufe ${esc(stufeVon(opt().stufe).n)}</p>
       ${box(monsterSVG(startMonster),'mon')}
       ${gespeichert?btn(`Run fortsetzen <span class="klein">· Level ${gespeichert.G.level}, ${Math.max(0,gespeichert.G.hp)} HP, ${gespeichert.G.items.length} Items</span>`,'weiterrun'):''}
       ${btn(gespeichert?'Neuen Run starten <span class="klein">· verwirft den gespeicherten</span>':'Neuen Run starten','start')}
       ${btn(`Laden &amp; Perks &nbsp;·&nbsp; ${meta.coins} Coins`,'shop')}
       ${meta.runs?box(`<div class="zeile"><span class="klein">Runs</span><span class="mono">${meta.runs}</span></div>
         <div class="zeile"><span class="klein">Bestes Level</span><span class="mono">${meta.best}</span></div>
         <div class="zeile"><span class="klein">Gemeistert</span><span class="mono">${gemeistertAnzahl()}/${D.questions.length}</span></div>
         <div class="zeile"><span class="klein">Fragen begegnet</span><span class="mono">${Object.keys(meta.srs).length}/${D.questions.length}</span></div>
         ${meta.bestEndlos?`<div class="zeile"><span class="klein">Bestes Endlos-Level</span><span class="mono">${meta.bestEndlos}</span></div>`:''}`,'stat','duenn'):''}
       <p class="hinweis">Fassung ${BUILD} · ${Object.keys(D.nodes).length} Gefäße · ${D.questions.length} Fragen · ${D.items.length} Items. Eigene Fragen, keine IMPP-Originale. Nicht von einer Fachperson gegengelesen — zum Üben, nicht als Beleg.</p>
       ${navigator.standalone===false?`<p class="hinweis">Zum Installieren: Teilen-Symbol antippen, dann „Zum Home-Bildschirm".</p>`:''}`;
  }
  else if(S==='nav'){
    const aus=(A[G.node]||[]);
    const d=G.dist[G.node];
    h=kopf()+box(`<h2 class="lat">${esc(nm(G.node))}</h2>
      <p class="klein">${esc(TYPNAME[typ(G.node)]||'')}${D.nodes[G.node].r?' · '+esc(D.nodes[G.node].r):''}${
        de(G.node)?' · '+esc(de(G.node)):''}</p>
      ${d!=null?`<p class="klein">Noch ${d} ${d===1?'Abzweigung':'Abzweigungen'} bis zum Ziel</p>`:`<p class="klein falsch">Von hier führt kein Weg zum Ziel.</p>`}`,'ort'+G.node,tk(G.node))
      +(G.msg?box(`<p>${G.msg}</p>`,'msg','duenn'):'')
      +`<p class="klein abstand">Wohin fließt das Blut?</p>`
      +`<div id="gang" class="gang ${tk(G.node)}"><svg id="gangsvg" class="gangsvg" width="${GANG.w}" aria-hidden="true"></svg>`
      +aus.map((e,i)=>`<div class="box duenn opt ${tk(e.t)}" data-rough="go${i}"><button data-act="go" data-arg="${i}">`
          +`<span class="lat">${esc(nm(e.t))}</span><span class="klein"> — ${esc(rel(e))}</span>`
          +(G.zeige===i?` <span class="klein richtig">· hierhin</span>`:'')+`</button></div>`).join('')
      +`</div>`
      +G.items.map((it,k)=>it._ch>0&&G.zeige==null&&d>0
          ? btn(`${esc(it.n)} benutzen <span class="klein">· ${it._ch} ${it._ch===1?'Ladung':'Ladungen'}</span>`,'use',String(k)) : '').join('')
      +`<div class="legende">
          <span><i style="background:var(--arteriell)"></i>Arterie</span>
          <span><i style="background:var(--venoes)"></i>Vene</span>
          <span><i style="background:var(--portal)"></i>Pfortader</span>
          <span><i style="background:var(--kapillar)"></i>Kapillarbett</span>
        </div>`
      +btn(`Inventar <span class="klein">· ${G.items.length} ${G.items.length===1?'Item':'Items'}</span>`,'inv')
      +btn(G.gesichert?'Gespeichert <span class="klein">· Stand gesichert</span>':'Speichern und pausieren','sichern');
  }
  else if(S==='fight'){
    const q=G.q,mp=G.mon.hp/G.mon.max*100;
    const opts=Object.keys(G.anz||{}).filter(k=>!G.weg.includes(k));
    const sicht=G.items.some(i=>i.e.some(e=>e.op==='reveal_target_hp'));
    const serie=G.mon.serie;
    h=kopf()+box(`${monsterSVG(G.mon.id)}<div class="zeile"><span>${esc(G.mon.n)}</span><span class="mono">${
      serie?'●'.repeat(G.mon.max-G.mon.hp)+'○'.repeat(Math.max(0,G.mon.hp))
           :(sicht?`${Math.max(0,G.mon.hp)} / ${G.mon.max} HP`:'? HP')}</span></div>
      ${serie?`<p class="klein">Nur drei richtige Antworten in Folge bestehen das Kolloquium. Ein Fehler setzt die Serie zurück.</p>`:''}
      <div class="balken rot"><i style="width:${Math.max(0,mp)}%"></i></div>`,'m'+G.mon.id)
      +box(`<div class="zeile"><span class="klein">${esc(q.f)}</span>
        <span class="klein">${'●'.repeat(q.d||3)}${'○'.repeat(Math.max(0,5-(q.d||3)))}${
          kritBonus(q.d)>0?` · +${Math.round(kritBonus(q.d)*100)} % Krit`:''}</span></div>
        <p>${esc(q.s)}</p>`,'q'+q.id);
    if(G.tipp) h+=box(`<p class="klein">Hinweis: ${esc(G.tipp)}</p>`,'tipp','duenn');
    if(G.auto&&G.antwort===null){
      h+=box(`<p class="richtig">${esc(G.auto)}: Die Frage löst sich von selbst — voller Schaden ohne Antwort.</p>`,'auto','duenn')
        +btn('Durchziehen','autoloesen');
    }
    else if(G.antwort===null){
      h+=opts.map(k=>btn(`${k}) ${esc(G.anz[k])}`,'ans',k)).join('');
      if(hatWette()) h+= G.wette
        ? box(`<p class="richtig">Wette läuft: doppelter Schaden, doppelter HP-Verlust.</p>`,'wette1','duenn')
        : btn(`Wetten <span class="klein">· doppelter Schaden bei richtig, doppelter HP-Verlust bei falsch</span>`,'wette');
      if(G.weg.length)h+=`<p class="hinweis">${G.weg.length} Falschantwort${G.weg.length>1?'en':''} durch ein Item entfernt.</p>`;
    }else{
      const ok=G.antwort===G.korrekt;
      h+=(G.meisterJetzt?box(`<p class="richtig">Diese Frage sitzt — ${MEISTERN} mal in Folge richtig. Sie pausiert jetzt, damit neue nachrücken.</p>`,'meist','duenn'):'')
        +btn(`Inventar <span class="klein">· ${G.items.length}</span>`,'inv')
        +box(`<p class="${ok?'richtig':'falsch'}">${ok?'Richtig':'Falsch'} — ${G.korrekt}) ${esc(G.anz[G.korrekt])}</p>
        <p class="klein">${esc(q.e)}</p>${G.feedback?`<p class="klein">${G.feedback}</p>`:''}`,'fb'+q.id)
        +btn(G.mon.hp<=0?'Weiter':'Nächste Frage','weiter');
    }
  }
  else if(S==='loot'){
    h=kopf()+box(`<h2>Level ${G.level}</h2><p class="klein">Quest abgeschlossen. Wähle ein Item.</p>`,'lvl'+G.level)
     +G.loot.map((i,k)=>`<div class="box duenn ${rk(i)}" data-rough="take${k}"><button data-act="take" data-arg="${k}">
        ${esc(i.n)} <span class="selten">· ${esc(rlabel(i))}</span><br><span class="klein">${esc(i.x)}</span>
        <div class="chips">${tagChips(i)}</div></button></div>`).join('')
     +btn(`Neu würfeln (${G.rerolls})`,'reroll','',G.rerolls>0?'':'disabled');
  }
  else if(S==='inv'){
    h=kopf()+`<h2>Inventar</h2>`
     +(G.items.length?G.items.map(i=>box(
        `<div class="zeile"><span>${esc(i.n)}</span><span class="selten">${esc(rlabel(i))}</span></div>
         <p class="klein">${esc(i.x)}</p>
         ${i._ch!=null?`<p class="klein">${i._ch>0?`${i._ch} ${i._ch===1?'Ladung':'Ladungen'} übrig`:'aufgebraucht'}</p>`:''}
         <div class="chips">${i.g.map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>`,'i'+i.id,'duenn '+rk(i))).join('')
        : box(`<p class="klein">Noch keine Items. Das erste gibt es nach der ersten Quest.</p>`,'leer','duenn'))
     +setUebersicht()
     +btn('Zurück','back');
  }
  else if(S==='drop'){
    h=kopf()+box(`<h2>Beute</h2><p class="klein">${esc(G.mon0||'Das Monster')} lässt etwas fallen.</p>`,'drop')
     +G.drop.map((i,k)=>`<div class="box duenn ${rk(i)}" data-rough="drop${k}"><button data-act="takedrop" data-arg="${k}">
        ${esc(i.n)} <span class="selten">· ${esc(rlabel(i))}</span><br><span class="klein">${esc(i.x)}</span>
        <div class="chips">${tagChips(i)}</div></button></div>`).join('')
     +btn('Liegen lassen','takedrop','-1');
  }
  else if(S==='export'){
    const code=codeAus(meta);
    h=`<h1>Fortschritt sichern</h1>
      ${box(`<p class="klein">Kopiere diesen Code in deine Notizen. Damit stellst du Coins, Perks und
        deinen Lernstand auf jedem Gerät wieder her.</p>
        <textarea id="code" class="code" readonly rows="5">${esc(code)}</textarea>
        <div class="zeile klein"><span>${meta.coins} Coins · ${meta.runs} Runs</span>
        <span>${Object.keys(meta.srs).length} Fragen im Lernstand</span></div>`,'exp')}
      ${hinweis?box(`<p class="richtig">${esc(hinweis)}</p>`,'hw','duenn'):''}
      ${btn('In die Zwischenablage kopieren','kopieren')}
      ${btn('Zurück','shop')}`;
  }
  else if(S==='importform'){
    h=`<h1>Fortschritt einspielen</h1>
      ${box(`<p class="klein">Füge hier den gesicherten Code ein. Er beginnt mit LB1-.</p>
        <textarea id="code" class="code" rows="5" placeholder="LB1-..."></textarea>`,'imp')}
      ${hinweis?box(`<p class="falsch">${esc(hinweis)}</p>`,'hwi','duenn'):''}
      ${btn('Code prüfen','pruefen')}
      ${btn('Zurück','shop')}`;
  }
  else if(S==='importpruef'){
    const e=entwurf;
    h=`<h1>Code geprüft</h1>
      ${box(`<p class="klein">Der Code enthält:</p>
        <div class="zeile"><span>Coins</span><span class="mono">${e.coins}</span></div>
        <div class="zeile"><span>Runs</span><span class="mono">${e.runs}</span></div>
        <div class="zeile"><span>Bestes Level</span><span class="mono">${e.best}</span></div>
        <div class="zeile"><span>Gekaufte Perks</span><span class="mono">${Object.values(e.perks).reduce((a,b)=>a+b,0)}</span></div>
        <div class="zeile"><span>Fragen im Lernstand</span><span class="mono">${Object.keys(e.srs).length}</span></div>`,'ip')}
      ${box(`<p class="falsch">Das Einspielen ersetzt deinen jetzigen Fortschritt
        (${meta.coins} Coins, ${meta.runs} Runs, ${Object.keys(meta.srs).length} Fragen) vollständig.</p>`,'ipw','duenn')}
      ${btn('Ja, ersetzen','importuebernehmen')}
      ${btn('Abbrechen','shop')}`;
  }
  else if(S==='reset'){
    h=`<h1>Fortschritt löschen</h1>
      ${box(`<p class="falsch">Das löscht endgültig und lässt sich nicht rückgängig machen:</p>
        <div class="zeile"><span>Coins</span><span class="mono">${meta.coins}</span></div>
        <div class="zeile"><span>Gekaufte Perks</span><span class="mono">${Object.values(meta.perks).reduce((a,b)=>a+b,0)}</span></div>
        <div class="zeile"><span>Runs</span><span class="mono">${meta.runs}</span></div>
        <div class="zeile"><span>Fragen im Lernstand</span><span class="mono">${Object.keys(meta.srs).length}</span></div>`,'rs')}
      ${box(`<p class="klein">Sichere vorher lieber deinen Code — dann kannst du jederzeit zurück.</p>`,'rs2','duenn')}
      ${btn('Erst sichern','export')}
      ${btn('Ja, alles löschen','resetja')}
      ${btn('Abbrechen','shop')}`;
  }
  else if(S==='wahl'){
    h=`<h1>Kolloquium bestanden</h1>
      ${box(`${monsterSVG('kolloquium')}<p class="richtig zentriert">Drei Fragen in Folge — Level 10 ist geschafft.</p>`,'wahl1')}
      ${box(`<div class="zeile"><span>Coins bei Abbruch</span><span class="mono">+${(G.level-1)*2}</span></div>
        <div class="zeile"><span>Verbliebene HP</span><span class="mono">${Math.max(0,G.hp)} / ${G.hpMax}</span></div>`,'wahl2','duenn')}
      ${btn('Run beenden <span class="klein">· Coins sichern</span>','beenden')}
      ${box(`<p class="klein">Im Endlos-Modus geht es bei Level 11 weiter. Jedes Level bringt weitere 2 Coins.
        Dafür sind die Quests mindestens 8 Abzweigungen lang, es warten nur noch schwere Gegner —
        und <span class="falsch">jeder Schritt, der dich dem Ziel nicht näher bringt, beendet den Run sofort</span>.
        Es gibt an jeder Abzweigung mindestens einen richtigen Weg.</p>`,'wahl3','duenn')}
      ${btn('In den Endlos-Modus <span class="klein">· kein Zurück</span>','endlos')}`;
  }
  else if(S==='opt'){
    const o=opt();
    const wahl=(feld,werte)=>`<div class="schalter">`+werte.map(([v,t])=>
      `<button data-act="setopt" data-arg="${feld}:${v}" aria-pressed="${o[feld]===v?'true':'false'}">${t}</button>`).join('')+`</div>`;
    const laeuft = G && !G.gain && ['nav','fight','loot','drop','inv','wahl'].includes(optVorher);
    h=`<h1>Einstellungen</h1>
      ${box(`<p>Schwierigkeit</p>
        <div class="schalter">${Object.entries(STUFEN).map(([k,v])=>
          `<button data-act="setopt" data-arg="stufe:${k}" aria-pressed="${o.stufe===k?'true':'false'}">${v.n}</button>`).join('')}</div>
        <p class="klein">${esc(stufeVon(o.stufe).x)}</p>
        <div class="zeile klein"><span>Grundschaden</span><span class="mono">${stufeVon(o.stufe).schaden}</span></div>
        <div class="zeile klein"><span>HP-Verlust pro Fehler</span><span class="mono">${stufeVon(o.stufe).hpVerlust}</span></div>
        <div class="zeile klein"><span>Items zur Auswahl</span><span class="mono">${stufeVon(o.stufe).wahl}</span></div>
        <div class="zeile klein"><span>Krit-Bonus schwerer Fragen</span><span class="mono">×${stufeVon(o.stufe).krit.toFixed(1)}</span></div>
        <div class="zeile klein"><span>Coins</span><span class="mono">×${stufeVon(o.stufe).coins.toFixed(1)}</span></div>
        ${laeuft?`<p class="klein falsch">Der laufende Run behält die Stufe ${esc(stufeVon(G.stufe).n)}. Die Änderung greift ab dem nächsten Run.</p>`:''}`,'o0')}
      ${box(`<p>Schriftart</p>
        <p class="klein">Die Handschrift passt zum Zeichenblock, die klare Schrift liest sich bei langen Texten leichter.</p>
        ${wahl('schrift',[['hand','Handschrift'],['klar','Klar lesbar']])}`,'o1')}
      ${box(`<p>Schriftgröße</p>
        <p class="klein">Skaliert die gesamte Oberfläche mit, nicht nur den Fließtext.</p>
        ${wahl('groesse',[['normal','Normal'],['gross','Groß'],['sehrgross','Sehr groß']])}`,'o2')}
      ${box(`<p>E-Ink-Modus</p>
        <p class="klein">Schaltet alle Animationen ab, entfernt die Papierstruktur und zeichnet die Linien
        kräftiger. Gedacht für E-Ink-Displays, hilft aber auch bei Bewegungsempfindlichkeit.</p>
        ${wahl('eink',[[false,'Aus'],[true,'An']])}`,'o3')}
      ${btn('Zurück','optzu')}`;
  }
  else if(S==='end'){
    const quote=G.beantwortet?Math.round(G.corrects/G.beantwortet*100):0;
    const titel=G.dead?'Run beendet'
      :(G.endlos?`Endlos-Modus · Level ${G.level}`
      :(G.finaleBestanden?'Kolloquium bestanden':'Geschafft'));
    h=`<h1>${titel}</h1>
      ${G.abbruch?box(`<p class="falsch">${esc(G.abbruch)}</p>`,'abbr','duenn'):''}
      ${G.finaleBestanden&&!G.endlos?box(`${monsterSVG('kolloquium')}<p class="richtig zentriert">Drei Fragen in Folge — der Run ist vollständig abgeschlossen.</p>`,'fin'):''}
      ${box(`<div class="zeile"><span>Erreichtes Level</span><span class="mono">${G.level}</span></div>
        <div class="zeile"><span>Besiegte Monster</span><span class="mono">${G.kills}</span></div>
        <div class="zeile"><span>Beantwortete Fragen</span><span class="mono">${G.beantwortet||0}</span></div>
        <div class="zeile"><span>Trefferquote</span><span class="mono">${quote} %</span></div>
        ${G.neuGemeistert?`<div class="zeile"><span>Neu gemeistert</span><span class="mono">${G.neuGemeistert}</span></div>`:''}
        <div class="zeile"><span>Verbliebene HP</span><span class="mono">${Math.max(0,G.hp)} / ${G.hpMax}</span></div>
        <div class="zeile"><span>Schwierigkeit</span><span class="mono">${esc(stufeVon(G.stufe).n)}</span></div>`,'stat')}
      ${box(`<div class="zeile klein"><span>Grundbetrag${G.dead?' (halbiert)':''}</span><span class="mono">${G.gainBasis}</span></div>
        ${G.gainMult!==1?`<div class="zeile klein"><span>Item-Bonus</span><span class="mono">×${G.gainMult.toFixed(2)}</span></div>`:''}
        ${G.gainStufe!==1?`<div class="zeile klein"><span>Stufe ${esc(stufeVon(G.stufe).n)}</span><span class="mono">×${G.gainStufe.toFixed(1)}</span></div>`:''}
        ${G.gainExtra?`<div class="zeile klein"><span>Zusatz aus Items</span><span class="mono">+${G.gainExtra}</span></div>`:''}
        <hr><div class="zeile"><span>Coins aus diesem Run</span><span class="mono">+${G.gain}</span></div>
        <div class="zeile klein"><span>Gesamtbestand</span><span class="mono">${meta.coins}</span></div>`,'coins')}
      <h2 class="abstand">Deine Ausrüstung</h2>
      ${G.items.length?G.items.map(i=>box(
         `<div class="zeile"><span>${esc(i.n)}</span><span class="selten">${esc(rlabel(i))}</span></div>
          <p class="klein">${esc(i.x)}</p>
          ${i._ch!=null?`<p class="klein">${i._ch>0?`${i._ch} ${i._ch===1?'Ladung':'Ladungen'} übrig`:'aufgebraucht'}</p>`:''}
          <div class="chips">${i.g.map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>`,'e'+i.id,'duenn '+rk(i))).join('')
        : box(`<p class="klein">Dieser Run endete ohne Items.</p>`,'keine','duenn')}
      ${setUebersicht()}
      ${btn('Neuer Run','start')}${btn('Perks kaufen','shop')}`;
  }
  else if(S==='shop'){
    h=`<h1>Perks</h1>${box(`<div class="zeile"><span>Verfügbar</span><span class="mono">${meta.coins} Coins</span></div>`,'coins','duenn')}
      ${PERKS.map(p=>{const s=perk(p.id),voll=s>=p.max,teuer=meta.coins<p.c;
        return btn(`${esc(p.n)} <span class="klein">${s}/${p.max}</span><br><span class="klein">${esc(p.x)} · ${p.c} Coins</span>`,
          'buy',p.id,(voll||teuer)?'disabled':'');}).join('')}
      ${G&&G.items&&G.items.length?btn(`Inventar <span class="klein">· ${G.items.length} ${G.items.length===1?'Item':'Items'} im laufenden Run</span>`,'inv'):''}
      ${btn('Zurück','home')}
      <hr>
      ${btn('Fortschritt sichern <span class="klein">· Code zum Kopieren</span>','export')}
      ${btn('Fortschritt einspielen <span class="klein">· Code von einem anderen Gerät</span>','importform')}
      ${btn('Fortschritt löschen','reset')}`;
  }
  app.innerHTML=`<div class="${eink()?'':'fade'}">${h}</div>`;
  frames();
  if(S==='nav')zeichneGang();
  window.scrollTo(0,0);
}
function setUebersicht(){
  const zeilen=SETTAGS.map(t=>{
    const n=tagN(t); if(!n)return '';
    const s3=n>=3, s5=n>=5;
    const stand = s5?'3er und 5er aktiv' : s3?`3er aktiv · noch ${5-n} bis zum 5er` : `noch ${3-n} bis zum 3er`;
    const offen = G.setOffen===t;
    return `<div class="box duenn setzeile" data-rough="set${t}">
      <button data-act="setinfo" data-arg="${t}" aria-expanded="${offen}">
        <div class="zeile"><span>${esc(SETS[t].name)}</span><span class="mono klein">${n} ${n===1?'Item':'Items'}</span></div>
        <div class="zeile klein"><span>${stand}</span><span>${offen?'▾':'▸'}</span></div>
        ${offen?`<div class="klein" style="margin-top:6px">
            <p class="${s3?'richtig':''}">Ab 3 Items: ${esc(SETS[t][3])}${s3?'':' — noch nicht aktiv'}</p>
            <p class="${s5?'richtig':''}">Ab 5 Items: ${esc(SETS[t][5])}${s5?'':' — noch nicht aktiv'}</p>
            <div class="chips">${G.items.filter(i=>i.g.includes(t)).map(i=>`<span class="chip">${esc(i.n)}</span>`).join('')}</div>
          </div>`:''}
      </button></div>`;}).join('');
  return zeilen?`<h2 class="abstand">Sammlungen</h2><p class="klein">Antippen zeigt, was der Bonus bewirkt.</p>${zeilen}`:'';
}
function hatWette(){return G.items.some(i=>i.e.some(e=>e.op==='offer_gamble'));}
const GANG={w:66,wand:8,rechts:52,halb:15,fig:22};
const gangMitteX=()=>(GANG.wand+GANG.rechts)/2;
const gangFigH=()=>GANG.fig*FIG_VBH/FIG_VB;
function zeichneGang(){
  const g=document.getElementById('gang'); if(!g)return;
  const opts=[...g.querySelectorAll('.opt')];
  if(!opts.length)return;
  const H=g.offsetHeight, {w,wand,rechts,halb}=GANG;
  const ys=opts.map(o=>{
    const c=o.offsetTop+o.offsetHeight/2;
    return Math.max(halb+4, Math.min(H-halb-4, c));
  });
  let d='', y=4;
  d+=roughLine(wand,4,wand,H-4,'wandl');                       // linke Wand, durchgehend
  ys.forEach((cy,i)=>{                                          // rechte Wand mit Oeffnungen
    if(cy-halb>y) d+=' '+roughLine(rechts,y,rechts,cy-halb,'wr'+i);
    d+=' '+roughLine(rechts,cy-halb,w,cy-halb,'ao'+i);          // Abzweig oben
    d+=' '+roughLine(rechts,cy+halb,w,cy+halb,'au'+i);          // Abzweig unten
    y=cy+halb;
  });
  if(y<H-4) d+=' '+roughLine(rechts,y,rechts,H-4,'wrend');
  d+=' '+roughLine(wand,H-4,rechts,H-4,'boden');                // Gangende
  const svg=document.getElementById('gangsvg');
  svg.setAttribute('viewBox',`0 0 ${w} ${H}`);
  svg.setAttribute('height',H);
  svg.innerHTML=`<path class="wand" d="${d}"/>`
    +`<g id="held" style="transform:translate(0px,${(ys[0]-gangFigH()/2).toFixed(1)}px)">${
        figurPfade(GANG.fig,gangMitteX())}</g>`;
  g.dataset.ys=JSON.stringify(ys);
}
function laufe(i){
  const g=document.getElementById('gang'), h=document.getElementById('held');
  if(!g||!h||!g.dataset.ys) return Promise.resolve();
  if(eink()||matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  const ys=JSON.parse(g.dataset.ys), ziel=ys[i];
  if(ziel==null) return Promise.resolve();
  const oben=ziel-gangFigH()/2;
  const jetzt=parseFloat((h.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)||[0,0,0])[2])||0;
  const strecke=Math.abs(oben-jetzt);
  const t1=Math.min(520,Math.max(180,strecke*3.2));
  return new Promise(fertig=>{
    h.style.transition=`transform ${t1}ms cubic-bezier(.4,0,.5,1)`;
    h.style.transform=`translate(0px,${oben.toFixed(1)}px)`;
    setTimeout(()=>{
      h.style.transition='transform 300ms ease-in, opacity 300ms ease-in';
      h.style.transform=`translate(${GANG.rechts}px,${oben.toFixed(1)}px)`;
      h.style.opacity='0';
      setTimeout(fertig,300);
    },t1+40);
  });
}
function rel(e){
  const m={branch_of:'Ast',continues_as:'Fortsetzung',drains_into:'mündet in',
           anastomosis:'Anastomose',portal:'Pfortaderstrecke',portokaval:'portokaval'};
  return (m[e.r]||e.r)+(e.o?' · '+e.o:'');
}

/* ---------- Aktionen ---------- */
app.addEventListener('click',async ev=>{
  const b=ev.target.closest('button[data-act]');if(!b||b.disabled)return;
  const a=b.dataset.act,arg=b.dataset.arg;
  if(a==='start'){loescheRun();gespeichert=null;newRun();}
  else if(a==='weiterrun'){
    if(gespeichert){G=gespeichert.G;S=gespeichert.S;gespeichert=null;
      if(S==='inv')S='nav'; G.msg='Run fortgesetzt.'; G.zeige=null;}
  }
  else if(a==='sichern'){
    G.gesichert=speichereRun();
    G.msg=G.gesichert?'Stand gesichert. Du kannst die App jetzt gefahrlos schließen.'
                     :'Speichern nicht möglich — der Browser lässt keinen Speicher zu.';
    gespeichert=await ladeRun();
  }
  else if(a==='home'){S=(G&&G.gain!=null)?'end':'start';}
  else if(a==='shop'){S='shop';}
  else if(a==='reset'){hinweis='';S='reset';}
  else if(a==='resetja'){
    meta={coins:0,perks:{},srs:{},enc:0,runs:0,best:0};
    loescheRun(); gespeichert=null; G=null;
    await saveMeta(); S='start';
  }
  else if(a==='export'){hinweis='';S='export';}
  else if(a==='importform'){hinweis='';entwurf=null;S='importform';}
  else if(a==='kopieren'){
    const code=codeAus(meta);
    let ok=false;
    try{ await navigator.clipboard.writeText(code); ok=true; }catch(e){}
    if(!ok){ const f=document.getElementById('code');
      if(f){ f.focus(); f.setSelectionRange(0,f.value.length);
             try{ ok=document.execCommand('copy'); }catch(e){} } }
    hinweis = ok ? 'Code kopiert. Sichere ihn jetzt in deinen Notizen.'
                 : 'Kopieren nicht möglich — markiere den Code oben und kopiere ihn von Hand.';
  }
  else if(a==='pruefen'){
    const f=document.getElementById('code');
    try{ entwurf=codeEin(f?f.value:''); hinweis=''; S='importpruef'; }
    catch(err){ hinweis=err.message; entwurf=null; }
  }
  else if(a==='importuebernehmen'){
    if(entwurf){ meta={...meta,...entwurf}; entwurf=null;
      loescheRun(); gespeichert=null; G=null;
      await saveMeta(); hinweis=''; S='start'; }
  }
  else if(a==='buy'){const p=PERKS.find(x=>x.id===arg);
    if(p&&meta.coins>=p.c&&perk(p.id)<p.max){meta.coins-=p.c;meta.perks[p.id]=perk(p.id)+1;await saveMeta();}}
  else if(a==='go'){ await laufe(+arg); gehe(+arg); }
  else if(a==='ans'){antworte(arg);}
  else if(a==='autoloesen'){G.auto=false;antworte(G.korrekt);}
  else if(a==='weiter'){weiter();}
  else if(a==='take'){equip(G.loot[+arg]);naechstesLevel();}
  else if(a==='beenden'){ende(false);}
  else if(a==='endlos'){
    G.endlos=true;G.level++;quest();G.msg='Endlos-Modus. Ab hier beendet jeder Umweg den Run.';
    G.zeige=null;S='nav';
  }
  else if(a==='optauf'){optVorher=S;S='opt';}
  else if(a==='optzu'){S=optVorher||'start'; if(!G&&!['start','shop'].includes(S))S='start';}
  else if(a==='setopt'){
    const [feld,wert]=arg.split(':');
    opt()[feld]= wert==='true'?true : wert==='false'?false : wert;
    setzeOptionen(); await saveMeta();
  }
  else if(a==='setinfo'){G.setOffen = G.setOffen===arg ? null : arg;}
  else if(a==='inv'){G.zurueck=S;S='inv';}
  else if(a==='back'){S=G.zurueck||'nav';}
  else if(a==='wette'){G.wette=true;}
  else if(a==='use'){benutze(+arg);}
  else if(a==='takedrop'){
    if(+arg>=0)equip(G.drop[+arg]);
    G.drop=null;S='nav';
    if(G.node===G.ziel)levelGeschafft();
  }
  else if(a==='reroll'){if(G.rerolls>0){G.rerolls--;G.loot=loot();}}
  if(G&&LAUFEND.includes(S)){ if(a!=='sichern')G.gesichert=false; speichereRun(); }
  if(S==='end'||S==='start'){ if(a!=='weiterrun')loescheRun(); }
  render();
});
function benutze(k){
  const it=G.items[k];
  if(!it||!it._ch)return;
  const aus=A[G.node]||[];
  let best=-1,bd=Infinity;
  aus.forEach((e,i)=>{const dd=G.dist[e.t];if(dd!=null&&dd<bd){bd=dd;best=i;}});
  if(best<0){G.msg='Von hier führt ohnehin kein Weg zum Ziel — die Ladung bleibt erhalten.';return;}
  it._ch--;
  G.zeige=best;
  G.msg=`${esc(it.n)}: der Weg führt über <span class="lat">${esc(nm(aus[best].t))}</span>.`
      + (it._ch?` ${it._ch} ${it._ch===1?'Ladung':'Ladungen'} übrig.`:' Damit ist er aufgebraucht.');
}
function gehe(i){
  const e=(A[G.node]||[])[i];
  if(!e){ if(S==='drop'){G.drop=null;S='nav';if(G.node===G.ziel)levelGeschafft();} return; }
  const alt=G.dist[G.node],neu=G.dist[e.t];
  G.msg='';
  if(G.endlos&&(neu==null||(alt!=null&&neu>=alt))){
    G.abbruch = neu==null
      ? `Sackgasse an ${nm(e.t)} — im Endlos-Modus endet der Run damit.`
      : (neu===alt
         ? `${nm(e.t)} liegt genauso weit vom Ziel entfernt — im Endlos-Modus zählt das als Umweg.`
         : `Umweg über ${nm(e.t)} — im Endlos-Modus endet der Run damit.`);
    ende(false); render(); return;
  }
  if(neu==null){
    G.hp-=3;G.msg=`Sackgasse. Von <span class="lat">${esc(nm(e.t))}</span> führt kein Weg zum Ziel — du kehrst um. −3 HP.`;
    if(G.hp<=0){ende(true);return;}
    render();return;
  }
  G.node=e.t;G.branches++;G.zeige=null;
  if(alt!=null&&neu>alt)G.msg='Umweg — das Ziel liegt jetzt weiter entfernt.';
  else if(alt!=null&&neu===alt)G.msg='Seitwärts — die Entfernung zum Ziel bleibt gleich.';
  if(G.node===G.ziel){levelGeschafft();return;}
  if(G.branches>=G.nextFight){G.nextFight=G.branches+3+((Math.random()*4)|0);kampf();}
}
function levelGeschafft(){
  G.hp=Math.min(G.hpMax,G.hp+8);
  for(const it of G.items)for(const e of it.e){
    if(e.hook!=='onLevelUp')continue;
    if(e.op==='heal')G.hp=Math.min(G.hpMax,G.hp+e.value);
    if(e.op==='hp_max_add'){G.hpMax+=e.value;G.hp+=e.value;}
    if(e.op==='coins_add')G.coinAdd=Math.min((G.coinAdd||0)+e.value,e.cap??999);
  }
  if(tagN('notaufnahme')>=5)G.hp=Math.min(G.hpMax,G.hp+10);
  if(G.level>=10&&!G.finaleBestanden){G.msg='';return finale();}
  if(G.level>=10&&!G.endlos)return ende(false);
  G.loot=loot();S='loot';
}
function naechstesLevel(){G.level++;quest();G.msg='';G.zeige=null;S='nav';}
function antworte(k){
  G.qi++;const q=G.q,ok=k===G.korrekt;G.antwort=k;bewerte(q.id,ok);G.beantwortet=(G.beantwortet||0)+1;
  if(ok){
    G.corrects++;G.streak++;G.lastWrong=false;
    if(G.mon.serie){
      G.stack=(G.stack||0)+1;G.mon.hp-=1;
      if(G.mon.hp<=0)G.kills++;
      G.feedback=G.mon.hp>0
        ? `Richtig. Noch ${G.mon.hp} ${G.mon.hp===1?'Frage':'Fragen'} in Folge.`
        : 'Drei in Folge — das Kolloquium ist bestanden.';
    } else {
      const {d,krit}=schaden();G.stack=(G.stack||0)+1;G.mon.hp-=d;G.kills+= (G.mon.hp<=0?1:0);
      G.feedback=`${G.wette?'Wette gewonnen. ':''}${krit?'Kritischer Treffer! ':''}${d} Schaden.`;
    }
    for(const it of G.items)for(const e of it.e)
      if(e.hook==='onCorrect'&&e.op==='heal'&&(G.corrects%(e.condition?.every_nth_correct||1)===0))
        G.hp=Math.min(G.hpMax,G.hp+e.value);
  }else{
    G.streak=0;G.lastWrong=true;G.stack=0;
    // Erster Fehler pro Kampf kann in einen Teiltreffer umgewandelt werden
    let teil=null;
    if(!G.wrongFight)for(const it of G.items)for(const e of it.e)
      if(e.hook==='onWrong'&&e.op==='convert_to_partial_hit'&&e.condition?.first_wrong_in_fight)teil=[e.value,it.n];
    if(teil){
      G.wrongFight=true;
      const {d}=schaden();const halb=Math.max(1,Math.round(d*teil[0]));
      G.mon.hp-=halb;G.kills+=(G.mon.hp<=0?1:0);
      G.feedback=`${teil[1]} rettet dich: kein HP-Verlust, ${halb} Schaden.`;
      saveMeta();return;
    }
    const l=verlust();G.wrongFight=true;G.hp-=l;
    let serieHinweis='';
    if(G.mon.serie&&G.mon.hp<G.mon.max){G.mon.hp=G.mon.max;serieHinweis=' Die Serie beginnt von vorn.';}
    else if(G.mon.serie)G.mon.hp=G.mon.max;
    G.feedback=`${G.wette?'Wette verloren. ':''}−${l} HP.${serieHinweis}`;
    if(G.hp<=0){
      const rev=G.items.find(i=>i.e.some(e=>e.hook==='onDeath'&&e.op==='revive'&&!i._used));
      if(rev){rev._used=true;const e=rev.e.find(e=>e.op==='revive');G.hp=e.value;
        G.feedback+=` ${rev.n} greift ein — du machst mit ${e.value} HP weiter.`;}
    }
  }
  saveMeta();
}
function weiter(){
  if(G.hp<=0){ende(true);return;}
  if(G.mon.hp<=0){
    if(G.finale){G.finale=false;G.finaleBestanden=true;G.mon=null;S='wahl';return;}
    const name=G.mon.n; G.mon=null; G.msg=name+' besiegt.';
    if(tagN('medimeister')>=5&&Math.random()<0.25){
      const frei=loot().slice(0,1);
      if(frei.length){ equip(frei[0]); G.msg+=' Die Medimeister-Sammlung wirft '+frei[0].n+' ab.'; }
    }
    for(const it of G.items)for(const e of it.e)
      if(e.hook==='onFightEnd'&&e.op==='reroll_add'&&luck(e.condition?.chance??1)){
        G.rerolls+=e.value; G.msg+=' '+it.n+' schenkt dir einen Reroll.';
      }
    let p=0.30;
    for(const it of G.items)for(const e of it.e)
      if(e.hook==='onLoot'&&e.op==='extra_drop')p+=e.condition?.chance??0.2;
    if(Math.random()<Math.min(p,0.75)){
      const auswahl=loot().slice(0,2);
      if(auswahl.length){G.drop=auswahl;G.mon0=name;S='drop';return;}
    }
    S='nav';
    if(G.node===G.ziel)return levelGeschafft();
    return;}
  naechsteFrage();G.antwort=null;
}
function ende(tot){
  if(S==='end')return;                       // doppelte Auswertung verhindern
  G.dead=tot;
  const basis=(G.level-1)*2;                 // Maximum 18 bei Level 10
  let c=tot?basis*0.5:basis;                 // halbe Ausbeute bei Lebensverlust
  let mult=1;
  for(const it of G.items)for(const e of it.e)
    if(e.hook==='onRunEnd'&&e.op==='coins_mult')mult*=e.value;
  if(tagN('unialltag')>=5)mult*=1.15;
  c*=mult;                                   // gilt auch, wenn der Run verloren geht
  const stufenFaktor=runStufe().coins;
  c*=stufenFaktor;
  c=Math.max(0,Math.round(c)+(G.coinAdd||0));
  if(G.endlos)meta.bestEndlos=Math.max(meta.bestEndlos||0,G.level);
  G.gain=c; G.gainBasis=Math.round(tot?basis*0.5:basis); G.gainMult=mult;
  G.gainExtra=G.coinAdd||0; G.gainStufe=stufenFaktor;meta.coins+=c;meta.runs++;meta.best=Math.max(meta.best,G.level);
  S='end';                                   // sofort, nicht erst nach dem Speichern
  loescheRun(); gespeichert=null;
  saveMeta();
}

/* Sichert, sobald die App in den Hintergrund geht oder geschlossen wird. */
for(const ev of ['visibilitychange','pagehide','freeze']){
  addEventListener(ev,()=>{ if(document.visibilityState!=='visible'||ev!=='visibilitychange') speichereRun(); });
}

/* ---------- Start ---------- */
document.getElementById('opt')?.addEventListener('click',()=>{
  if(S!=='opt'){optVorher=S;S='opt';render();}
  else{S=optVorher||'start'; if(!G&&!['start','shop'].includes(S))S='start'; render();}
});
(async()=>{
  const m=await loadMeta(); if(m)meta={...meta,...m};
  setzeOptionen();
  startMonster=MONSTER[(Math.random()*MONSTER.length)|0].id;
  gespeichert=await ladeRun();
  render();
})();
