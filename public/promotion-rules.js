export const PROMOTION_WINS={E:1,D:1,C:2,B:4,A:8,S:16};
// Unlisted tiers keep their existing rules.
export const promotionWins=tier=>PROMOTION_WINS[tier]??1;
export function promotionProgress(tier,growth){
 const required=promotionWins(tier),wins=growth?.progress?.tier===tier?Math.max(0,Number(growth.progress.wins)||0):0;
 return {tier,wins,required};
}
