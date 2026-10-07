import {mapTerrain} from './team-maps.js';
export const OBJECTIVE_FIELD=Object.freeze({width:1280,height:600});
export function objectiveTerrain(id,seed){const pieces=[];for(const o of mapTerrain(id,seed)){if(o.x===480){for(const x of [520,760])pieces.push({...o,x,y:o.y<300?150:450});}else pieces.push({...o,x:o.x<480?o.x+100:o.x+220});}return pieces.filter(o=>Math.hypot(o.x-640,o.y-300)>o.radius+115);}
