import worker from './local-api.js';
import migrations from './local-schema.js';
import {createStorage} from './sqlite-store.js';

let loaded;
function sqlite(){return loaded??=new Promise((resolve,reject)=>{
 const script=document.createElement('script');script.src=new URL('./vendor/sql-wasm.js',import.meta.url).href;
 script.onload=()=>globalThis.initSqlJs({locateFile:file=>new URL('./vendor/'+file,import.meta.url).href}).then(resolve,reject);
 script.onerror=()=>reject(Error('Could not load browser storage. Check your connection and retry.'));
 document.head.append(script);
}).catch(error=>{loaded=undefined;throw error;});}
let storage;
export async function getStorage(){
 if(storage)return storage;
 if(!globalThis.indexedDB)throw Error('Your browser does not provide persistent storage.');
 const SQL=await sqlite();
 return storage??=createStorage({SQL,migrations,worker,indexedDB:globalThis.indexedDB,locks:navigator.locks,databaseName:'fateforge:'+new URL('.',import.meta.url).pathname});
}
