(()=>{'use strict';
const body=document.body,root=body.dataset.root||'./',lang=document.documentElement.lang==='en'?'en':'ru',en=lang==='en',base=root+(en?'en/':'');
const say=(ru,eng)=>en?eng:ru,status=document.getElementById('status');
const host=location.hostname,local=host==='network.zonebook.local'||location.protocol==='file:';
const badge=document.getElementById('connection');if(badge){const version=badge.dataset.version;badge.textContent=(local?say('Локальная копия','Offline copy'):say('Сеть Зоны','Zone network'))+' · '+version;}
document.querySelectorAll('[data-native-route]').forEach(button=>button.addEventListener('click',()=>{
 const route=button.dataset.nativeRoute;
 if(window.chrome&&window.chrome.webview){window.chrome.webview.postMessage({action:'open-native',route});if(status)status.textContent=say('Открываем раздел ноутбука…','Opening the laptop section…');}
 else{if(status){status.textContent=say('Этот сервис доступен с ноутбука ZONEbook внутри игры. Справочники и статьи можно читать здесь.','This service is available from the in-game ZONEbook laptop. Guides and articles can be read here.');status.scrollIntoView({block:'nearest',behavior:'smooth'});}}
}));
if(window.chrome&&window.chrome.webview){
 window.chrome.webview.addEventListener('message',event=>{
  const data=event.data;if(!data||data.type!=='orders-state'||!Array.isArray(data.items))return;
  const phases={available:say('Доступен','Available'),active:say('Принят','Accepted'),proof:say('Получено подтверждение','Proof obtained'),confirmed:say('Можно сдавать','Ready to turn in'),documents:say('Документы получены','Documents received'),paid:say('Выполнен','Completed'),lost:say('Закрыт','Closed')};
  for(const row of data.items){
   const button=[...document.querySelectorAll('[data-native-route]')].find(item=>item.dataset.nativeRoute===row.route);
   const card=button&&button.closest('.order-card');if(!card)continue;
   card.querySelector('h3').textContent=row.title;
   const description=card.querySelector('h3 + p');if(description)description.textContent=row.description;
   const goods=card.querySelector('ul');if(goods)goods.remove();
   const payment=card.querySelector('.order-payment');if(payment)payment.textContent=say('Награда ','Payment ')+row.pay+say(' руб.',' RU');
   let state=card.querySelector('.order-current');if(!state){state=document.createElement('p');state.className='order-current';state.setAttribute('role','status');card.insertBefore(state,button);}
   state.textContent=(phases[row.phase]||row.phase)+(row.detail?' · '+row.detail:'');
  }
  const note=document.querySelector('.orders-note');if(note)note.textContent=say('Условия и статус из текущего сохранения. Откройте карточку в ноутбуке для принятия или сдачи.','Terms and status from your current save. Open the laptop card to accept or turn in the order.');
 });
 window.chrome.webview.postMessage({action:'orders-state'});
}
const normal=s=>String(s||'').toLocaleLowerCase(lang).replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function terms(q){const out=[];String(q||'').replace(/"([^"]+)"|(\S+)/g,(_,phrase,word)=>{const v=normal(phrase||word);if(v)out.push(v);return '';});return out.slice(0,12);}
function search(q,kind='all'){
 const words=terms(q);if(!words.length)return [];
 return (window.FB_INDEX||[]).filter(r=>kind==='all'||r.kind===kind).map(r=>{const d=r[lang],title=normal(d.title),text=normal(d.title+' '+d.body+' '+(d.search||'')+' '+(d.tags||''));return {r,score:words.every(w=>text.includes(w))?words.reduce((n,w)=>n+(title.includes(w)?5:1),0):0};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.path.localeCompare(b.r.path));
}
const form=document.getElementById('network-search'),results=document.getElementById('search-results');
function showResults(query){
 if(!results)return;results.replaceChildren();if(!query.trim()){results.hidden=true;return;}results.hidden=false;
 const heading=document.createElement('h2');heading.textContent=say('Результаты поиска','Search results');results.append(heading);
 const found=search(query),count=document.createElement('p');count.className='count';count.textContent=say('Найдено: ','Found: ')+found.length;results.append(count);
 if(!found.length){const p=document.createElement('p');p.textContent=say('Попробуйте название мутанта, место или тему: кровосос, выброс, пропавшие.','Try a creature, location or topic: bloodsucker, emission, missing people.');results.append(p);}
 for(const {r}of found){const d=r[lang],article=document.createElement('article');article.className='result';const a=document.createElement('a');a.href=base+r.path;a.textContent=d.title;const p=document.createElement('p');p.textContent=d.body.slice(0,220)+(d.body.length>220?'…':'');const source=document.createElement('p');source.className='meta';source.textContent=({creature:say('Бестиарий','Bestiary'),article:say('Блог о выживании','Survival journal'),diary:say('Дневники и поиск','Diaries and missing people')})[r.kind]||'';article.append(source,a,p);results.append(article);}
}
if(form){
 const q=form.elements.q,params=new URLSearchParams(location.search);q.value=params.get('q')||'';showResults(q.value);
 form.addEventListener('submit',event=>{event.preventDefault();const query=q.value.trim().slice(0,120),provider=form.elements.engine?form.elements.engine.value:'zone';if(provider==='google'||provider==='duckduckgo'){location.href=(provider==='google'?'https://www.google.com/search?q=':'https://duckduckgo.com/?q=')+encodeURIComponent(query);return;}showResults(query);try{const u=new URL(location.href);if(query)u.searchParams.set('q',query);else u.searchParams.delete('q');history.pushState({},'',u);}catch{}if(query)results.scrollIntoView({block:'start',behavior:'smooth'});});
 addEventListener('popstate',()=>{q.value=new URLSearchParams(location.search).get('q')||'';showResults(q.value);});
}
const filter=document.getElementById('species-filter'),species=document.getElementById('species-search');
function filterCards(){const query=normal(species?species.value:''),group=filter?filter.value:'all';let count=0;document.querySelectorAll('[data-species]').forEach(card=>{const match=(group==='all'||card.dataset.group===group)&&normal(card.textContent).includes(query);card.hidden=!match;if(match)count++;});const output=document.getElementById('species-count');if(output)output.textContent=say('Показано записей: ','Records shown: ')+count;}
if(filter)filter.addEventListener('change',filterCards);if(species)species.addEventListener('input',filterCards);if(filter||species)filterCards();
window.FB_SEARCH={search,normal};
})();
