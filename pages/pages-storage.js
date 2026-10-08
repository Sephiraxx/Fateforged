// Loaded first on both pages; SQLite itself loads only when storage is used.
(()=>{
 const source=new URL('./local-storage.js',document.currentScript.src);let module;
 const get=async()=>{try{return await (module??=import(source.href)).then(m=>m.getStorage());}catch(error){module=undefined;throw error;}};
 globalThis.FATEFORGE_STORAGE={async fetch(path,options){try{return await (await get()).fetch(path,options);}catch(error){return Response.json({error:error.message},{status:503});}}};
 document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.getElementById('storage-dialog'),result=document.getElementById('storage-result'),input=document.getElementById('storage-import');
  const mb=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
  // Show how big the save is and what takes the space.
  async function showUsage(){const box=document.getElementById('storage-usage');if(!box)return;box.textContent='Measuring your save…';try{const {bytes,tables}=await(await get()).usage();box.replaceChildren();const head=document.createElement('strong');head.textContent='Your save: '+mb(bytes);const list=document.createElement('ul');for(const t of tables.slice(0,6)){const li=document.createElement('li');li.textContent=t.label+' · '+mb(t.bytes)+' · '+t.rows+' rows';list.append(li);}box.append(head,list);}catch(error){box.textContent=error.message;}}
  document.getElementById('storage-backups').onclick=()=>{dialog.showModal();showUsage();};
  document.getElementById('storage-close').onclick=()=>dialog.close();
  document.getElementById('storage-export').onclick=async event=>{
   const button=event.currentTarget;button.disabled=true;result.textContent='Preparing backup…';
   try{const bytes=await(await get()).exportBackup(),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.sqlite3'})),link=document.createElement('a');link.href=url;link.download='fateforge-backup-'+new Date().toISOString().slice(0,10)+'.sqlite';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);result.textContent='Backup exported ('+mb(bytes.length)+'). It includes your fighters, tournaments, leagues, season archives, titles and records.';showUsage();}catch(error){result.textContent=error.message;}finally{button.disabled=false;}
  };
  input.onchange=async()=>{
   const file=input.files[0];input.value='';if(!file)return;
   if(file.size>600*1024*1024){result.textContent='Backup is too large (maximum 600 MB).';return;}
   if(!confirm('Import '+file.name+'? This replaces all fighters, tournaments and records saved in this browser. Export a backup first if you want to keep them.'))return;
   result.textContent='Checking and importing backup…';
   try{const {before,after}=await(await get()).importBackup(new Uint8Array(await file.arrayBuffer()));result.textContent=`Backup imported and compacted: ${mb(before)} → ${mb(after)}. Reloading…`;setTimeout(()=>location.reload(),1800);}catch(error){result.textContent='Import failed. Your existing saves were kept. '+error.message;}
  };
  if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
  // In the desktop/Android app the save lives on this device, with a file copy in the app's data folder.
  if(globalThis.__TAURI__){const label=document.querySelector('.storage-bar span');if(label)label.textContent='Saved on this device';
   import(source.href).then(m=>m.appMirror?.location()).then(path=>{if(!path)return;const note=document.createElement('p');note.className='muted storage-location';note.textContent='The app also keeps your save at '+path+'.';(document.getElementById('storage-usage')??result).before(note);}).catch(()=>{});}
 });
})();
