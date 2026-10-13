// Engines from team-2.9 / team-4.0 on use portable sin, cos and atan2 (portable-math.js), so a seeded game plays out the
// same in every browser, in node and in the Rust core. The inherited layers call Math.sin/cos/atan2; while the engine
// builds a battle or runs a step they see the portable versions. JavaScript is single-threaded and a step never yields,
// so nothing else (the renderer, the UI) sees the swap.
import {sin,cos,atan2} from './portable-math.js';
const swap=()=>{const saved=[Math.sin,Math.cos,Math.atan2];Math.sin=sin;Math.cos=cos;Math.atan2=atan2;return saved;};
const restore=saved=>{[Math.sin,Math.cos,Math.atan2]=saved;};
export function withPortableMath(Base,version){
 return class PortableMathBattle extends Base{
  constructor(...args){const saved=swap();try{super(...args);}finally{restore(saved);}}
  step(dt){const saved=swap();try{return super.step(dt);}finally{restore(saved);}}
  result(){return {...super.result(),combatVersion:version};}
 };
}
