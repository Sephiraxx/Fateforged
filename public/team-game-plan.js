// Core siege game plan: three coach dials that steer the team brain (team-3.6). Shared by the engine, the league
// rules, the worker and the UI. AI coaches take their dials from their personality and adjust one after a loss.
export const GAME_PLAN_OPTIONS=Object.freeze({
 titan:Object.freeze([['always','Always contest'],['ahead','Contest when ahead'],['never','Never (play around it)']]),
 style:Object.freeze([['group','Group up'],['flank','Flank']]),
 siege:Object.freeze([['forgefire','With Forgefire'],['numbers','On a numbers lead'],['late','Not before 3:00']]),
 // Ember Wisps (level-combat.js, team-4.0): when a few fighters may take a wisp for XP. Optional; plans without it
 // take wisps when the team is not ahead in levels.
 camp:Object.freeze([['behind','When not ahead in levels'],['always','Always'],['never','Never']])
});
export const GAME_PLAN_LABELS=Object.freeze({titan:'Titan priority',style:'Style',siege:'Siege timing',camp:'Ember Wisps'});
const DIALS=Object.keys(GAME_PLAN_OPTIONS),REQUIRED=Object.freeze(['titan','style','siege']);
export function validGamePlan(plan){return !!plan&&typeof plan==='object'&&!Array.isArray(plan)&&Object.keys(plan).every(k=>DIALS.includes(k))&&REQUIRED.every(k=>k in plan)&&Object.keys(plan).every(k=>GAME_PLAN_OPTIONS[k].some(([v])=>v===plan[k]));}
const plan=(titan,style,siege)=>Object.freeze({titan,style,siege});
// Coach personalities (team-league.js PERSONALITIES) and the tactics they map to.
export const PERSONALITY_PLANS=Object.freeze({
 balanced:plan('always','group','numbers'),
 fortress:plan('ahead','group','numbers'),
 glass:plan('always','group','numbers'),
 tactician:plan('ahead','flank','numbers'),
 star:plan('always','group','numbers'),
 bargain:plan('never','flank','numbers')
});
const TACTIC_PERSONALITY=Object.freeze({balanced:'balanced',defensive:'fortress',aggressive:'glass','focus-healer':'tactician','protect-carry':'star'});
export function defaultGamePlan(tactic){return {...PERSONALITY_PLANS[TACTIC_PERSONALITY[tactic]??'balanced']};}
// League coaches' Ember Wisp dial by personality.
export const PERSONALITY_CAMP=Object.freeze({balanced:'behind',fortress:'behind',glass:'never',tactician:'always',star:'behind',bargain:'always'});
export function personalityGamePlan(personality){return {...(PERSONALITY_PLANS[personality]??PERSONALITY_PLANS.balanced),camp:PERSONALITY_CAMP[personality]??'behind'};}
// After a loss an AI coach changes one dial, chosen by personality; winners keep their plan. Deterministic.
const ADAPT=Object.freeze({balanced:'titan',fortress:'siege',glass:'style',tactician:'style',star:'siege',bargain:'titan'});
const NEXT=Object.freeze({titan:{always:'ahead',ahead:'always',never:'ahead'},style:{group:'flank',flank:'group'},siege:{forgefire:'numbers',numbers:'forgefire',late:'numbers'}});
export function adaptGamePlan(current,personality,lost){if(!lost)return {...current};const dial=ADAPT[personality]??'titan';return {...current,[dial]:NEXT[dial][current[dial]]};}
export function gamePlanSummary(p){return DIALS.filter(k=>p[k]!=null).map(k=>GAME_PLAN_OPTIONS[k].find(([v])=>v===p[k])?.[1]).join(' · ');}
