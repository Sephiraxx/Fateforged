// Wraps ES modules into one function scope for the single-file worker builds: imports are dropped (their
// dependencies are bundled alongside) and exports become a frozen namespace object, so helper names cannot
// collide with the rest of the worker. Re-exports (export {…} from) are dropped too: their sources are bundled.
export function moduleBundle(name,sources){
 const exported=[];
 const code=sources.map(source=>source.replace(/^(import|export \{[^}]*\} from)[^;]*;[ \t]*$/gm,'').replace(/\bexport (const|function|class|async function) ([A-Za-z_$][\w$]*)/g,(_,kind,id)=>{exported.push(id);return `${kind} ${id}`;})).join('\n');
 return `const ${name}=(()=>{${code}\nreturn Object.freeze({${exported.join(',')}});})();`;
}
