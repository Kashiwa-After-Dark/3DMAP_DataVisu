/**
 * ファイル概要: データベースで確認済みの感情分類を安全に読み取る。
 */
// null means no DB result: use legacy inference. Unknown is an explicit result.
export function storedEmotionId(memo,perspective=null){
 const analysis=memo?.emotionAnalysis;
 if(!analysis)return null;
 if(analysis.needsReview||analysis.outcome==='uncertain')return 'unknown';
 const owner=analysis.experiencer==='observed'?'subject':analysis.experiencer==='observer'?'observer':'unknown';
 if(perspective&&owner!==perspective)return 'unknown';
 if(analysis.outcome==='no-emotion')return 'neutral';
 return {positive:'positive',normal:'neutral',negative:'negative',unknown:'unknown'}[analysis.polarity]??'unknown';
}
