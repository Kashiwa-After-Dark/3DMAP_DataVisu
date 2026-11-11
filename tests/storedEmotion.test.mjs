/**
 * ファイル概要: 保存済み感情分類の優先規則を自動確認する。
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storedEmotionId} from '../backend/storedEmotion.js';
import {getPerspectiveImpressionType} from '../space-time-cube/js/impression-visualization/emotion-perspective.js';
import {classifyImpression} from '../backend/impressionClassifier.js';
test('DB review overrides text inference and never leaks into the other perspective',()=>{
 const memo={impression:'楽しそう',emotionAnalysis:{experiencer:'observed',polarity:'negative',outcome:'emotion'}};
 assert.equal(getPerspectiveImpressionType(memo,'subject').id,'negative');
 assert.equal(getPerspectiveImpressionType(memo,'observer').id,'unknown');
 assert.equal(classifyImpression(memo),'negative');
});
test('stored normal maps to neutral; explicit unknown stays unknown rather than guessing',()=>{
 assert.equal(storedEmotionId({emotionAnalysis:{experiencer:'observer',polarity:'normal',outcome:'emotion'}},'observer'),'neutral');
 assert.equal(getPerspectiveImpressionType({impression:'楽しそう',emotionAnalysis:{experiencer:'unknown',polarity:'positive',outcome:'uncertain'}},'subject').id,'unknown');
 assert.equal(storedEmotionId({emotionAnalysis:{needsReview:true,polarity:'positive'}}),'unknown');
 assert.equal(storedEmotionId({}),null);
 assert.equal(getPerspectiveImpressionType({impression:'楽しそう'},'subject').id,'positive');
});
