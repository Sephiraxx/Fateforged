// Which sin/cos implementation this JavaScript engine uses. V8 builds differ: node uses fdlibm, while Chrome, Edge
// (WebView2) and Android WebView use V8's copy of glibc (v8_use_libm_trig_functions). Results differ by one unit in
// the last place for about 2.5% of inputs, which is enough to change a seeded game. The Rust core (core/src/jsmath)
// implements both and must use the one the JavaScript side replays with; anything else falls back to JavaScript.
const PROBES=[[-2.1820759773254395,0xbfea348bb6a3addcn,0xbfea348bb6a3adddn],[2.616872787475586,0x3fe007f37356c23cn,0x3fe007f37356c23dn],[-1.0597515106201172,0xbfebe9573a1d78ccn,0xbfebe9573a1d78cbn],[-0.9180450439453125,0xbfe96bda937f1c83n,0xbfe96bda937f1c84n]];
const bits=x=>{const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,x);return view.getBigUint64(0);};
// 'fdlibm', 'glibc', or null for an engine with another implementation (for example Safari's system libm).
export function trigFlavor(){
 const sins=PROBES.map(([x])=>bits(Math.sin(x)));
 if(PROBES.every(([,fdlibm],i)=>sins[i]===fdlibm))return 'fdlibm';
 if(PROBES.every(([,,glibc],i)=>sins[i]===glibc))return 'glibc';
 return null;
}
