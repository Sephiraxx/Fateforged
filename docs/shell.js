// App shell: keeps the rail, screen title, URL hash and help drawer in step with the page.
(function(){
 const body=document.body,$=id=>document.getElementById(id);
 const TITLES={forge:'Forge',roster:'Roster',fight:'Fight',cups:'Cups',leagues:'Leagues',champions:'Champions'};
 const TABS={fight:'duel-tab',cups:'tourney-tab',leagues:'league-tab',champions:'history-tab'};
 const setTitle=mode=>{const t=$('screen-title');if(t&&TITLES[mode])t.textContent=TITLES[mode];};
 const rosters=['collection','arena-collection'].map($).filter(Boolean),rosterOpen=()=>rosters.some(d=>d.open);
 const pageMode=body.dataset.mode;
 const apply=mode=>{body.dataset.mode=rosterOpen()?'roster':mode;setTitle(body.dataset.mode);};

 // Arena: the rail items are the mode tabs; mirror the selected tab onto <body data-mode>.
 const tabs=Object.entries(TABS).map(([mode,id])=>[mode,$(id)]).filter(([,el])=>el);
 if(tabs.length){
  let ready=false;
  const sync=()=>{const active=tabs.find(([,el])=>el.getAttribute('aria-selected')==='true');const mode=active?active[0]:'fight';apply(mode);if(ready&&location.hash.slice(1)!==mode)history.replaceState(null,'','#'+mode);};
  const observer=new MutationObserver(sync);tabs.forEach(([,el])=>observer.observe(el,{attributes:true,attributeFilter:['aria-selected']}));
  // Open the screen named in the hash once arena.js has wired its tab handlers.
  const open=(attempt=0)=>{const mode=location.hash.slice(1),tab=$(TABS[mode]);if(!tab||tab.getAttribute('aria-selected')==='true'||typeof tab.onclick==='function'){ready=true;if(tab&&tab.getAttribute('aria-selected')!=='true')tab.click();sync();return;}else if(attempt<60)setTimeout(()=>open(attempt+1),50);};
  window.addEventListener('load',()=>open());
  window.addEventListener('hashchange',()=>open());
 }
 const current=()=>{const active=tabs.find(([,el])=>el.getAttribute('aria-selected')==='true');return active?active[0]:tabs.length?'fight':pageMode;};
 apply(current());

 // Roster dialogs tint the shell teal while open.
 for(const d of rosters)new MutationObserver(()=>apply(current())).observe(d,{attributes:true,attributeFilter:['open']});

 // Forge progress bar follows the "n / 14" counter.
 const progress=$('progress'),bar=document.querySelector('.progress-bar');
 if(progress&&bar){const update=()=>{const [done,total]=progress.textContent.split('/').map(n=>parseInt(n,10));bar.style.setProperty('--p',total?String(Math.min(1,done/total)):'0');};new MutationObserver(update).observe(progress,{childList:true,characterData:true,subtree:true});update();}

 // Help drawer: any [data-help-open="topic"] opens it at that section.
 const drawer=$('help-drawer');
 if(drawer){
  const scrollTo=topic=>{const section=drawer.querySelector(`[data-help="${topic}"]`);if(!section)return;section.scrollIntoView({block:'start'});section.classList.remove('flash');void section.offsetWidth;section.classList.add('flash');
   drawer.querySelectorAll('.help-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+section.id));};
  document.addEventListener('click',event=>{
   const opener=event.target.closest('[data-help-open]');
   if(opener){event.preventDefault();if(!drawer.open)drawer.showModal();scrollTo(opener.dataset.helpOpen);return;}
   if(event.target.closest('[data-help-close]'))drawer.close();
   const link=event.target.closest('.help-nav a');
   if(link){event.preventDefault();const section=drawer.querySelector(link.getAttribute('href'));if(section)scrollTo(section.dataset.help);}
  });
  drawer.addEventListener('click',event=>{if(event.target===drawer){const r=drawer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)drawer.close();}});
 }
})();
