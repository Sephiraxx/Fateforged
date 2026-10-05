// Loaded first on both pages; SQLite itself loads only when storage is used.
(()=>{
 const source=new URL('./local-storage.js',document.currentScript.src);let module;
 const get=async()=>{try{return await (module??=import(source.href)).then(m=>m.getStorage());}catch(error){module=undefined;throw error;}};
 globalThis.FATEFORGE_STORAGE={async fetch(path,options){try{return await (await get()).fetch(path,options);}catch(error){return Response.json({error:error.message},{status:503});}}};
 document.addEventListener('DOMContentLoaded',()=>{
  const dialog=document.getElementById('storage-dialog'),result=document.getElementById('storage-result'),input=document.getElementById('storage-import');
  document.getElementById('storage-backups').onclick=()=>dialog.showModal();
  document.getElementById('storage-close').onclick=()=>dialog.close();
  document.getElementById('storage-export').onclick=async event=>{
   const button=event.currentTarget;button.disabled=true;result.textContent='Preparing backup…';
   try{const bytes=await(await get()).exportBackup(),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.sqlite3'})),link=document.createElement('a');link.href=url;link.download='fateforge-backup-'+new Date().toISOString().slice(0,10)+'.sqlite';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);result.textContent='Backup exported. It includes your fighters, tournaments, titles and records.';}catch(error){result.textContent=error.message;}finally{button.disabled=false;}
  };
  input.onchange=async()=>{
   const file=input.files[0];input.value='';if(!file)return;
   if(file.size>100*1024*1024){result.textContent='Backup is too large (maximum 100 MB).';return;}
   if(!confirm('Import '+file.name+'? This replaces all fighters, tournaments and records saved in this browser. Export a backup first if you want to keep them.'))return;
   result.textContent='Checking and importing backup…';
   try{await(await get()).importBackup(new Uint8Array(await file.arrayBuffer()));location.reload();}catch(error){result.textContent='Import failed. Your existing saves were kept. '+error.message;}
  };
  if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
 });
})();
