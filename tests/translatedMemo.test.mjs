/**
 * ファイル概要: 保存済み英訳と日本語表示の切り替えを自動確認する。
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translatedMemoText} from '../backend/translatedMemo.js';
const fallback=(text,lang)=>lang==='en'?`fallback(${text})`:text;
test('stored English wins only for translated fields; Japanese stays unchanged',()=>{
 const memo={name:'学生',place:'公園',desc:'原文',subject:'学生',activity:'雑談',impression:'楽しそう',translations:{en:{person:'Student',place:'Park',impression:'Looks happy.'}}};
 assert.equal(translatedMemoText(memo,'name','en',fallback),'Student');
 assert.equal(translatedMemoText(memo,'place','ja',fallback),'公園');
 assert.equal(translatedMemoText(memo,'desc','en',(text,lang)=>text?(lang==='en'?`fallback(${text})`:text):''),'Student / Park / fallback(雑談) / Looks happy.');
 assert.equal(translatedMemoText({name:'学生'},'name','en',fallback),'fallback(学生)');
});
