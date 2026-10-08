const SERVICES=[
{id:'corte',name:'Corte Masculino',price:40,icon:'✂️',desc:'Corte moderno ou clássico com acabamento na navalha.'},
{id:'combo',name:'Corte + Barba',price:65,icon:'💈',desc:'O pacote completo: corte, barba e toalha quente.'},
{id:'barba',name:'Barba',price:30,icon:'🧔',desc:'Modelagem e hidratação com toalha quente.'},
{id:'sobr',name:'Corte + Sobrancelha',price:50,icon:'✨',desc:'Corte e design de sobrancelha na navalha.'},
{id:'plat',name:'Platinado',price:120,icon:'👑',desc:'Descoloração profissional com tonalização.'}];
const BARBERS=[
{id:'joao',name:'João Silva',spec:'Especialista em cortes clássicos',rate:4.9,hue:38},
{id:'lucas',name:'Lucas Santos',spec:'Especialista em degradê',rate:4.8,hue:10},
{id:'rafael',name:'Rafael Oliveira',spec:'Especialista em barba e acabamento',rate:5.0,hue:200}];
const HOURS=['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'];
const KEY='elite_agendamentos',PIN='123456';
const $=s=>document.querySelector(s);
const brl=v=>'R$ '+Number(v).toFixed(2).replace('.',',');
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fmtDate=s=>{const[y,m,d]=s.split('-');return `${d}/${m}/${y}`};
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svc=id=>SERVICES.find(x=>x.id===id),brb=id=>BARBERS.find(x=>x.id===id);
const st={step:0,service:null,barber:null,date:null,time:null};

/* ===== Camada de dados: banco compartilhado (db) com fallback em localStorage ===== */
let DB=null,CACHE=[],canWrite=false;
try{CACHE=JSON.parse(localStorage.getItem(KEY))||[]}catch(e){}
const lsave=()=>{try{localStorage.setItem(KEY,JSON.stringify(CACHE))}catch(e){}};
const load=()=>CACHE;
async function put(a){
  const i=CACHE.findIndex(x=>x.id===a.id);i<0?CACHE.push(a):CACHE[i]=a;
  if(DB&&canWrite){try{await DB.collection('appts').doc(String(a.id)).set(a);return}catch(e){canWrite=false}}
  lsave();
}
async function removeAp(id){
  CACHE=CACHE.filter(x=>x.id!==id);
  if(DB&&canWrite){try{await DB.collection('appts').doc(String(id)).delete();return}catch(e){}}
  lsave();
}
(async()=>{
  try{
    if(!window.claude)return;
    DB=await claude.use('db');const u=await claude.use('user');
    canWrite=!!DB&&!!u&&u.can('data.write')!==false;
    if(DB&&canWrite){
      let first=true;
      DB.collection('appts').onSnapshot(sn=>{
        const remote=sn.docs.map(d=>({...d.data()}));
        if(first){first=false;const ids=new Set(remote.map(x=>x.id));const loc=CACHE.filter(x=>!ids.has(x.id));CACHE=remote.concat(loc);loc.forEach(x=>put(x))} // migra registros locais
        else CACHE=remote;
        renderAdmin();if(st.step===3&&st.barber&&st.date)renderTime();
      },()=>{});
    }
  }catch(e){}
  renderAdmin();
})();

/* ===== Menu ===== */
const burger=$('#burger'),menu=$('#menu');
const toggle=o=>{menu.classList.toggle('open',o);burger.classList.toggle('open',o);burger.setAttribute('aria-expanded',o)};
burger.onclick=()=>toggle(!menu.classList.contains('open'));
menu.querySelectorAll('a').forEach(a=>a.onclick=()=>toggle(false));

/* ===== Serviços e barbeiros ===== */
$('#servGrid').innerHTML=SERVICES.map(s=>`<div class="card"><div class="ico">${s.icon}</div><h3>${s.name}</h3><p>${s.desc}</p><div class="price">${brl(s.price)}</div><button class="btn" data-s="${s.id}">Agendar</button></div>`).join('');
const avatar=b=>`<svg viewBox="0 0 100 100" role="img" aria-label="${b.name}"><rect width="100" height="100" fill="hsl(${b.hue},25%,20%)"/><circle cx="50" cy="40" r="19" fill="hsl(${b.hue},35%,62%)"/><path d="M31 36q0-20 19-20t19 20q-6-9-19-9t-19 9z" fill="#111"/><path d="M33 48q2 22 17 22t17-22q-4 10-17 10t-17-10z" fill="#111"/><path d="M12 100q4-28 38-28t38 28z" fill="#111"/><path d="M42 72l8 10 8-10z" fill="#c9a24b"/></svg>`;
const stars=r=>'★'.repeat(Math.round(r))+'☆'.repeat(5-Math.round(r));
$('#barbGrid').innerHTML=BARBERS.map(b=>`<div class="card barb">${avatar(b)}<h3>${b.name}</h3><p class="sp">${b.spec}</p><div class="stars">${stars(b.rate)} <small>${b.rate.toFixed(1)}</small></div></div>`).join('');

/* ===== Agendamento ===== */
const steps=document.querySelectorAll('.step');
$('#prog').innerHTML=[...steps].map(()=>'<span></span>').join('');
const hash=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
function taken(b,d,ignore){
  const set=new Set(load().filter(a=>a.barber===b&&a.date===d&&a.status!=='cancelado'&&a.id!==ignore).map(a=>a.time));
  HOURS.forEach(h=>{if(hash(b+d+h)%5===0)set.add(h)}); // ocupação simulada
  return set;
}
function renderServ(){$('#oServ').innerHTML=SERVICES.map(s=>`<button class="opt ${st.service===s.id?'sel':''}" data-k="service" data-v="${s.id}"><b>${s.icon} ${s.name}</b><small>${brl(s.price)}</small></button>`).join('')}
function renderBarb(){$('#oBarb').innerHTML=BARBERS.map(b=>`<button class="opt ${st.barber===b.id?'sel':''}" data-k="barber" data-v="${b.id}"><b>${b.name}</b><small>${b.spec.replace('Especialista em ','')}</small></button>`).join('')}
function renderDate(){
  const out=[],now=new Date();
  for(let i=0;out.length<14;i++){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i);if(d.getDay()===0)continue;out.push(d)}
  const wd=['dom','seg','ter','qua','qui','sex','sáb'];
  $('#oDate').innerHTML=out.map(d=>{const v=iso(d);return `<button class="opt ${st.date===v?'sel':''}" data-k="date" data-v="${v}"><small>${wd[d.getDay()]}</small><b>${String(d.getDate()).padStart(2,'0')}</b><small>${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}</small></button>`}).join('');
}
function renderTime(){
  const t=taken(st.barber,st.date),now=new Date(),today=st.date===iso(now);
  if(st.time&&t.has(st.time))st.time=null;
  $('#oTime').innerHTML=HOURS.map(h=>{
    const past=today&&parseInt(h)<=now.getHours();
    return `<button class="opt ${st.time===h?'sel':''}" data-k="time" data-v="${h}" ${t.has(h)||past?'disabled':''}>${h}</button>`}).join('');
}
function renderSum(){
  const s=svc(st.service),b=brb(st.barber);
  $('#sumBody').innerHTML=[['Serviço',s?`${s.name} (${brl(s.price)})`:'—'],['Barbeiro',b?b.name:'—'],['Data',st.date?fmtDate(st.date):'—'],['Horário',st.time||'—'],['Cliente',$('#nome').value||'—'],['Telefone',$('#tel').value||'—']].map(([k,v])=>`<p><span>${k}:</span><strong>${esc(v)}</strong></p>`).join('');
}
function show(n){
  st.step=n;steps.forEach((s,i)=>s.classList.toggle('active',i===n));
  document.querySelectorAll('#prog span').forEach((p,i)=>p.classList.toggle('on',i<=n));
  $('#back').style.visibility=n?'visible':'hidden';
  $('#next').textContent=n===4?'CONFIRMAR AGENDAMENTO':'Continuar';
  $('#err').textContent='';
  if(n===0)renderServ();if(n===1)renderBarb();if(n===2)renderDate();if(n===3)renderTime();if(n===4)renderSum();
}
$('#agendamento').addEventListener('click',e=>{
  const o=e.target.closest('.opt');if(!o||o.disabled)return;
  const k=o.dataset.k;st[k]=o.dataset.v;
  if(k==='barber'||k==='date')st.time=null;
  o.parentElement.querySelectorAll('.opt').forEach(x=>x.classList.toggle('sel',x===o));
  $('#err').textContent='';
});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-s]');if(!b)return;
  st.service=b.dataset.s;show(1);$('#agendamento').scrollIntoView();
});
const need=['Selecione um serviço.','Selecione um barbeiro.','Selecione uma data.','Selecione um horário.'];
const keys=['service','barber','date','time'];
$('#back').onclick=()=>show(st.step-1);
$('#next').onclick=async()=>{
  const n=st.step;
  if(n<4){if(!st[keys[n]]){$('#err').textContent=need[n];return}show(n+1);return}
  const nome=$('#nome').value.trim(),tel=$('#tel').value.trim(),mail=$('#mail').value.trim();
  if(nome.split(/\s+/).length<2||nome.length<5){$('#err').textContent='Informe seu nome completo.';return}
  if(tel.replace(/\D/g,'').length<10){$('#err').textContent='Informe um telefone válido com DDD.';return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){$('#err').textContent='Informe um e-mail válido.';return}
  if(taken(st.barber,st.date).has(st.time)){$('#err').textContent='Este horário acabou de ser ocupado. Escolha outro.';st.time=null;show(3);return}
  const ap={id:Date.now(),service:st.service,barber:st.barber,date:st.date,time:st.time,nome,tel,mail,valor:svc(st.service).price,status:'agendado',pago:false};
  $('#next').disabled=true;await put(ap);$('#next').disabled=false;
  saveClient(ap);toast('Agendamento realizado com sucesso!');confirmModal(ap);renderAdmin();
};
$('#tel').addEventListener('input',e=>{
  let d=e.target.value.replace(/\D/g,'').slice(0,11),r=d;
  if(d.length>6)r=`(${d.slice(0,2)}) ${d.slice(2,d.length>10?7:6)}-${d.slice(d.length>10?7:6)}`;
  else if(d.length>2)r=`(${d.slice(0,2)}) ${d.slice(2)}`;
  e.target.value=r;renderSum();
});
['nome','mail'].forEach(i=>$('#'+i).addEventListener('input',renderSum));

/* ===== WhatsApp ===== */
function waLink(a,alterado){
  const s=svc(a.service),b=brb(a.barber);
  const num='55'+String(a.tel).replace(/\D/g,'');
  const msg=`Olá, ${String(a.nome).split(' ')[0]}! ${alterado?'🔄 Seu agendamento foi *alterado*':'✅ Seu agendamento está *confirmado*'} na *Barbearia Elite*.\n\n✂️ Serviço: ${s.name}\n💈 Barbeiro: ${b.name}\n📅 Data: ${fmtDate(a.date)}\n🕒 Horário: ${a.time}\n💰 Valor: ${brl(a.valor??s.price)}\n\nAguardamos você! Para remarcar, é só responder esta mensagem.`;
  return 'https://wa.me/'+num+'?text='+encodeURIComponent(msg);
}

/* ===== Modal de confirmação ===== */
function confirmModal(a){
  const s=svc(a.service),b=brb(a.barber);
  $('#mBody').innerHTML=[['Nome',a.nome],['Serviço',s.name],['Barbeiro',b.name],['Data',fmtDate(a.date)],['Horário',a.time],['Valor',brl(a.valor)]].map(([k,v])=>`<p><span>${k}:</span><strong>${esc(v)}</strong></p>`).join('');
  const f=(d,t,add)=>{const[y,m,dd]=d.split('-');return `${y}${m}${dd}T${String(parseInt(t)+add).padStart(2,'0')}0000`};
  $('#cal').href='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent('Barbearia Elite — '+s.name)+'&dates='+f(a.date,a.time,0)+'/'+f(a.date,a.time,1)+'&details='+encodeURIComponent('Barbeiro: '+b.name);
  $('#wa').href=waLink(a,false);
  $('#modal').classList.add('show');
}
$('#again').onclick=()=>{
  $('#modal').classList.remove('show');
  Object.assign(st,{service:null,barber:null,date:null,time:null});
  ['nome','tel','mail'].forEach(i=>$('#'+i).value='');
  show(0);$('#agendamento').scrollIntoView();
};
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').classList.remove('show')});

/* ===== Área do Barbeiro ===== */
let editing=null;
const fill=(el,items)=>el.innerHTML=items.map(i=>`<option value="${i.id}">${i.name}</option>`).join('');
$('#fB').innerHTML+=BARBERS.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
fill($('#eServ'),SERVICES);fill($('#eBarb'),BARBERS);
const V=a=>Number(a.valor??svc(a.service).price);
function renderAdmin(){
  const fb=$('#fB').value,fd=$('#fD').value,fs=$('#fS').value;
  const all=load().slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const l=all.filter(a=>(!fb||a.barber===fb)&&(!fd||a.date===fd)&&(!fs||(a.status||'agendado')===fs));
  $('#rows').innerHTML=l.length?l.map(a=>`<tr><td>${fmtDate(a.date)}</td><td>${a.time}</td><td>${esc(a.nome)}<br><small style="color:var(--mut)">${esc(a.tel)}</small></td><td>${svc(a.service).name}</td><td>${brb(a.barber).name}</td><td>${brl(V(a))}<br><small style="color:${a.pago?'#5ec27e':'var(--mut)'}">${a.pago?'pago':'em aberto'}</small></td><td><span class="badge b-${a.status||'agendado'}">${a.status||'agendado'}</span></td><td><button class="mini" data-e="${a.id}">Editar</button><a class="mini" href="${waLink(a,false)}" target="_blank" rel="noopener">WhatsApp</a><button class="mini" data-d="${a.id}">Excluir</button></td></tr>`).join(''):'<tr><td colspan="8" style="color:var(--mut)">Nenhum agendamento encontrado.</td></tr>';
  const act=all.filter(a=>a.status!=='cancelado'),sum=x=>x.reduce((t,a)=>t+V(a),0),rec=act.filter(a=>a.pago);
  $('#stT').textContent=act.length;$('#stH').textContent=act.filter(a=>a.date===iso(new Date())).length;
  $('#stP').textContent=brl(sum(act));$('#stR').textContent=brl(sum(rec));$('#stA').textContent=brl(sum(act)-sum(rec));
  $('#byB').innerHTML=BARBERS.map(b=>{const x=act.filter(a=>a.barber===b.id),r=x.filter(a=>a.pago);return `<tr><td>${b.name}</td><td>${x.length}</td><td>${brl(sum(r))}</td><td>${brl(sum(x)-sum(r))}</td></tr>`}).join('');
  $('#syncInfo').textContent=DB&&canWrite?'🟢 Sincronizado com o banco de dados compartilhado.':'🟡 Modo local: os dados ficam salvos apenas neste navegador.';
}
['fB','fD','fS'].forEach(i=>$('#'+i).onchange=renderAdmin);
const eData=()=>({service:$('#eServ').value,barber:$('#eBarb').value,date:$('#eDate').value,time:($('#eTime').value||'').slice(0,5),nome:$('#eNome').value.trim(),tel:$('#eTel').value.trim(),valor:parseFloat($('#eVal').value)||0,status:$('#eSt').value,pago:$('#ePago').checked});
function eTimes(keep){
  const t=taken($('#eBarb').value,$('#eDate').value,editing&&editing.id);
  $('#eTime').innerHTML=HOURS.map(h=>`<option value="${h}" ${t.has(h)?'disabled':''}>${h}${t.has(h)?' (ocupado)':''}</option>`).join('');
  const want=keep&&!t.has(keep)?keep:HOURS.find(h=>!t.has(h));
  if(want)$('#eTime').value=want;
}
function eWa(){const d=eData();if(d.tel&&d.date&&d.nome&&d.time)$('#eWa').href=waLink(d,!!editing)}
function openEdit(a){
  editing=a;$('#eErr').textContent='';$('#eTitle').textContent=a?'Editar agendamento':'Novo agendamento';
  const d=a||{service:SERVICES[0].id,barber:BARBERS[0].id,date:iso(new Date()),time:'',nome:'',tel:'',valor:SERVICES[0].price,status:'agendado',pago:false};
  $('#eNome').value=d.nome;$('#eTel').value=d.tel;$('#eServ').value=d.service;$('#eBarb').value=d.barber;$('#eDate').value=d.date;
  $('#eVal').value=V(d);$('#eSt').value=d.status||'agendado';$('#ePago').checked=!!d.pago;
  eTimes(d.time);eWa();$('#eModal').classList.add('show');
}
$('#eServ').onchange=()=>{$('#eVal').value=svc($('#eServ').value).price;eWa()};
['eBarb','eDate'].forEach(i=>$('#'+i).onchange=()=>{eTimes();eWa()});
['eNome','eTel'].forEach(i=>$('#'+i).addEventListener('input',eWa));
$('#eTime').onchange=eWa;
$('#eCancel').onclick=()=>$('#eModal').classList.remove('show');
$('#eSave').onclick=async()=>{
  const d=eData();
  if(d.nome.length<2||d.tel.replace(/\D/g,'').length<10||!d.date||!d.time){$('#eErr').textContent='Preencha nome, telefone, data e horário.';return}
  if(d.status!=='cancelado'&&taken(d.barber,d.date,editing&&editing.id).has(d.time)){$('#eErr').textContent='Esse horário está ocupado para o barbeiro escolhido.';return}
  const ap=editing?{...editing,...d}:{...d,id:Date.now(),mail:''};
  await put(ap);$('#eModal').classList.remove('show');renderAdmin();toast('Agendamento salvo.');
};
$('#novo').onclick=()=>openEdit(null);
$('#rows').addEventListener('click',async e=>{
  const ed=e.target.dataset.e,dl=e.target.dataset.d;
  if(ed)openEdit(load().find(a=>String(a.id)===ed));
  if(dl){
    if(e.target.dataset.c!=='1'){const b=e.target;b.dataset.c='1';b.textContent='Confirmar?';setTimeout(()=>{b.dataset.c='';b.textContent='Excluir'},3000);return}
    await removeAp(Number(dl));renderAdmin();toast('Agendamento excluído.');
  }
});
$('#openAdmin').onclick=()=>{$('#admin').classList.add('show');$('#admin').scrollIntoView()};
$('#enter').onclick=()=>{
  if($('#pin').value===PIN){$('#login').style.display='none';$('#panel').style.display='block';$('#pinErr').textContent='';renderAdmin()}
  else $('#pinErr').textContent='Senha incorreta.';
};
$('#pin').addEventListener('keydown',e=>{if(e.key==='Enter')$('#enter').click()});
$('#exit').onclick=()=>{$('#panel').style.display='none';$('#login').style.display='block';$('#pin').value='';$('#admin').classList.remove('show');window.scrollTo({top:0})};
show(0);

/* ============================================================
   MELHORIAS EM JAVASCRIPT
   ============================================================ */

/* 1. Notificações (toast) */
function toast(msg){
  const t=document.createElement('div');t.className='toast';t.textContent=msg;
  $('#toasts').appendChild(t);
  setTimeout(()=>t.classList.add('out'),2600);setTimeout(()=>t.remove(),3100);
}

/* 2. Cabeçalho com sombra, botão "voltar ao topo" e link ativo no menu */
const hdr=document.querySelector('header'),topBtn=$('#toTop');
addEventListener('scroll',()=>{
  hdr.classList.toggle('scrolled',scrollY>20);
  topBtn.classList.toggle('show',scrollY>600);
},{passive:true});
topBtn.onclick=()=>scrollTo({top:0});
const navLinks=[...document.querySelectorAll('nav a')];
const spy=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting)navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));
}),{rootMargin:'-45% 0px -50% 0px'});
document.querySelectorAll('main > section').forEach(s=>spy.observe(s));

/* 3. Animação de entrada ao rolar a página */
const reveal=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){e.target.classList.add('in');reveal.unobserve(e.target)}
}),{threshold:.12});
document.querySelectorAll('.card,.book,h2').forEach(el=>{el.classList.add('reveal');reveal.observe(el)});

/* 4. Contadores animados no topo */
const counter=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting)return;counter.unobserve(e.target);
  const el=e.target,end=parseFloat(el.dataset.count),dec=+el.dataset.dec||0,plus=el.dataset.plus?'+':'';
  const t0=performance.now(),dur=1400;
  (function tick(t){
    const p=Math.min((t-t0)/dur,1),v=end*(1-Math.pow(1-p,3));
    el.textContent=(dec?v.toFixed(dec).replace('.',','):Math.round(v).toLocaleString('pt-BR'))+(p===1?plus:'');
    if(p<1)requestAnimationFrame(tick);
  })(t0);
}),{threshold:.6});
document.querySelectorAll('[data-count]').forEach(el=>counter.observe(el));

/* 5. Lembrar os dados do cliente neste dispositivo */
const CKEY='elite_cliente';
function saveClient(a){try{localStorage.setItem(CKEY,JSON.stringify({nome:a.nome,tel:a.tel,mail:a.mail}))}catch(e){}}
try{
  const c=JSON.parse(localStorage.getItem(CKEY)||'null');
  if(c){$('#nome').value=c.nome||'';$('#tel').value=c.tel||'';$('#mail').value=c.mail||'';$('#myTel').value=c.tel||''}
}catch(e){}

/* 6. "Meus agendamentos": o cliente consulta e cancela pelo telefone */
const digits=s=>String(s).replace(/\D/g,'');
function myList(){
  const tel=digits($('#myTel').value);
  if(tel.length<10){$('#myList').innerHTML='<p class="err">Informe um telefone válido com DDD.</p>';return}
  const hoje=iso(new Date());
  const l=load().filter(a=>digits(a.tel)===tel&&a.status!=='cancelado'&&a.date>=hoje).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $('#myList').innerHTML=l.length?l.map(a=>`<div class="my"><span><b>${svc(a.service).name}</b><br>${fmtDate(a.date)} às ${a.time} — ${brb(a.barber).name}</span><button class="mini" data-c="${a.id}">Cancelar</button></div>`).join(''):'<p class="legend">Nenhum agendamento futuro encontrado para este telefone.</p>';
}
$('#myOpen').onclick=()=>{$('#myModal').classList.add('show');if(digits($('#myTel').value).length>=10)myList()};
$('#myClose').onclick=()=>$('#myModal').classList.remove('show');
$('#myGo').onclick=myList;
$('#myTel').addEventListener('input',e=>{
  let d=digits(e.target.value).slice(0,11),r=d;
  if(d.length>6)r=`(${d.slice(0,2)}) ${d.slice(2,d.length>10?7:6)}-${d.slice(d.length>10?7:6)}`;
  else if(d.length>2)r=`(${d.slice(0,2)}) ${d.slice(2)}`;
  e.target.value=r;
});
$('#myList').addEventListener('click',async e=>{
  const id=e.target.dataset.c;if(!id)return;
  const b=e.target;
  if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent='Confirmar?';setTimeout(()=>{b.dataset.ok='';b.textContent='Cancelar'},3000);return}
  const a=load().find(x=>String(x.id)===id);
  if(a){await put({...a,status:'cancelado'});toast('Agendamento cancelado. O horário foi liberado.');myList();renderAdmin()}
});

/* 7. Exportar relatório em CSV (área do barbeiro) */
$('#csv').onclick=async()=>{
  const rows=[['Data','Hora','Cliente','Telefone','Serviço','Barbeiro','Valor','Status','Pago']];
  load().slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).forEach(a=>rows.push([fmtDate(a.date),a.time,a.nome,a.tel,svc(a.service).name,brb(a.barber).name,V(a).toFixed(2).replace('.',','),a.status||'agendado',a.pago?'sim':'não']));
  const data='\ufeff'+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n');
  const name='agendamentos-'+iso(new Date())+'.csv';
  try{
    const dl=window.claude&&await claude.use('downloads');
    if(dl){await dl.save({filename:name,data});return}
  }catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));a.download=name;
  document.body.appendChild(a);a.click();a.remove();toast('Relatório exportado.');
};

/* 8. Atalhos: ESC fecha qualquer janela aberta */
addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'))});
['myModal','eModal'].forEach(id=>$('#'+id).addEventListener('click',e=>{if(e.target.id===id)e.target.classList.remove('show')}));
