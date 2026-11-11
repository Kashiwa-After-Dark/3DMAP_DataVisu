/**
 * ファイル概要: 保存済み英訳を優先しながら観察メモの表示言語を切り替える。
 */
export function translatedMemoText(memo,field,language,fallback){
 const value=memo[field]??'';
 if(language!=='en')return fallback(value,language);
 const en=memo.translations?.en??{};
 if(field==='name'&&en.person)return en.person;
 if(field==='place'&&en.place)return en.place;
 if(field==='desc'&&Object.keys(en).length){
  return [['person','subject'],['place','place'],['activity','activity'],['impression','impression'],['other','other']].map(([key,source])=>en[key]||fallback(memo[source]??'','en')).filter(Boolean).concat(memo.recordMemo?[fallback(memo.recordMemo,'en')]:[]).join(' / ');
 }
 return fallback(value,language);
}
