import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildArmoryItemInspector} from "../../src/armory-item-inspector.js";
import {renderArmoryItemInspector} from "../../src/armory-item-inspector-view.js";
// Fixed M11 historical fixture: public/armory/magizon.json is intentionally mutable.
const json=JSON.parse(readFileSync("pd2/fixtures/character-parity/magizon-2026-11-03-pinned.json","utf8"));
const inspect=(payload=json,settings={})=>buildArmoryItemInspector(payload,settings);
const groups=x=>new Map([...x.equipment,...x.sections].map(s=>[s.key,s]));
const stat=(s,key,which="rawSummary")=>s[which].additive.find(x=>x.name===key)?.value||0;
const esc=x=>String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");

test("M11: groups every active, inactive, charm and stored item without losing sources",()=>{
  const view=inspect();
  const g=groups(view);
  assert.deepEqual(view.equipment.map(x=>x.key),
    ["mainHands","alternateHands","sharedEquipped","mainCombined","alternateCombined"]);
  assert.deepEqual(view.sections.slice(0,3).map(x=>x.key),["charms","inventory","cube"]);
  assert.equal(g.get("mainHands").items.length,2);
  assert.equal(g.get("alternateHands").items.length,2);
  assert.ok(g.get("sharedEquipped").items.length>=5);
  assert.equal(g.get("mainCombined").items.length,
    g.get("mainHands").items.length+g.get("sharedEquipped").items.length);
  assert.equal(g.get("alternateCombined").items.length,
    g.get("alternateHands").items.length+g.get("sharedEquipped").items.length);
  assert.equal(g.get("cube").items.length,0); // no cube in current fixture
  assert.equal(g.get("inventory").items.length,0); // current inventory only contains charms
  const originals=json.items.map((x,i)=>"items["+i+"]").sort();
  const individual=[...view.equipment.slice(0,3),...view.sections].flatMap(x=>x.items.map(i=>i.sourcePath)).sort();
  assert.deepEqual(individual,originals);
});

test("M11: main and alternate composites are independent and share non-hand stats",()=>{
  const g=groups(inspect());
  for(const key of ["item_fasterattackrate","tohit","item_crushingblow"]){
    assert.equal(stat(g.get("mainCombined"),key),stat(g.get("mainHands"),key)+stat(g.get("sharedEquipped"),key),key);
    assert.equal(stat(g.get("alternateCombined"),key),stat(g.get("alternateHands"),key)+stat(g.get("sharedEquipped"),key),key);
  }
  assert.notEqual(stat(g.get("mainHands"),"item_fasterattackrate"),stat(g.get("alternateHands"),"item_fasterattackrate"));
  assert.equal(stat(g.get("mainHands"),"tohit"),43);
  assert.equal(stat(g.get("alternateHands"),"tohit"),70);
  // Historical fixture has no Crushing Blow; do not invent an item bonus.
  assert.equal(stat(g.get("sharedEquipped"),"item_crushingblow"),0);
});

test("M11: toggles change configured sums but not all-items hypotheses",()=>{
  const all=groups(inspect());
  const disabled=groups(inspect(json,{includeEquipment:false,includeCharms:false}));
  for(const key of ["mainHands","alternateHands","sharedEquipped","mainCombined","alternateCombined","charms"]){
    assert.deepEqual(disabled.get(key).rawSummary,all.get(key).rawSummary,key);
    assert.equal(disabled.get(key).configuredCount,0,key);
  }
  const sharedIAS=json.items.findIndex(x=>x.location?.equipment_id===3 && x.modifiers?.some(m=>m.name==="item_fasterattackrate"));
  assert.ok(sharedIAS>=0,"Fixture must contain a shared equipped IAS item");
  const itsIAS=json.items[sharedIAS].modifiers.find(m=>m.name==="item_fasterattackrate").values[0];
  const withoutSharedIAS=groups(inspect(json,{excludedItemIds:[`items[${sharedIAS}]`]}));
  assert.equal(stat(withoutSharedIAS.get("sharedEquipped"),"item_fasterattackrate","configuredSummary"),
    stat(all.get("sharedEquipped"),"item_fasterattackrate","configuredSummary")-itsIAS);
  const switchSelected=groups(inspect(json,{weaponSet:"switch"}));
  assert.equal(stat(switchSelected.get("mainCombined"),"tohit"),stat(all.get("mainCombined"),"tohit"));
  assert.equal(stat(switchSelected.get("alternateCombined"),"tohit"),stat(all.get("alternateCombined"),"tohit"));
});

test("M11: charms have separately screened active and hypothetical totals",()=>{
  const full=inspect();
  const g=groups(full);
  assert.ok(g.get("charms").items.length>0);
  assert.ok(full.charmEligibility.some(x=>x.active));
  assert.equal(stat(g.get("charms"),"tohit"),10);
  const toggled=groups(inspect(json,{includeCharms:false}));
  assert.equal(stat(toggled.get("charms"),"tohit"),10);
  assert.equal(stat(toggled.get("charms"),"tohit","configuredSummary"),0);
  const arCharm=json.items.findIndex(x=>x.location?.storage==="Inventory" && x.modifiers?.some(m=>m.name==="tohit" && m.values?.[0]===10));
  assert.ok(arCharm>=0,"Fixture must contain the +10 AR charm");
  const excluded=groups(inspect(json,{excludedCharmIds:[`items[${arCharm}]`]}));
  assert.equal(stat(excluded.get("charms"),"tohit","configuredSummary"),0);
});

test("M11: normal inventory and Horadric Cube are hypothetical even with numeric stats",()=>{
  const a=structuredClone(json);
  a.items.push({
    name:"Inventory Test Ring",location:{zone:"Stored",storage:"Inventory",equipment_id:0},
    modifiers:[{name:"tohit",values:[99],label:"+99 AR"},{name:"item_addclassskills",values:[0,2]}],
  },{
    name:"Cube Test Ring",location:{zone:"Stored",storage:"Cube",equipment_id:0},
    modifiers:[{name:"tohit",values:[77],label:"+77 AR"},{name:"item_addclassskills",values:[0,1]}],
  });
  const g=groups(inspect(a));
  assert.equal(stat(g.get("inventory"),"tohit"),99);
  assert.equal(stat(g.get("cube"),"tohit"),77);
  assert.equal(g.get("inventory").configuredSummary.itemCount,0);
  assert.equal(g.get("cube").configuredSummary.itemCount,0);
  assert.ok(g.get("inventory").rawSummary.nonadditive.some(x=>x.name==="item_addclassskills"));
  assert.equal(stat(g.get("mainCombined"),"tohit"),43);
});

test("M11: multi-value selectors and compound stats remain visible but nonadditive",()=>{
  const view=inspect();
  const g=groups(view);
  const main=g.get("mainCombined");
  assert.ok(main.rawSummary.nonadditive.some(x=>x.name==="item_aura"));
  const item=main.items.find(x=>x.name==="Harmony");
  assert.ok(item.modifiers.some(x=>x.name==="item_aura"&&!x.additive));
  assert.ok(item.modifiers.every(m=>m.sourcePath.startsWith(item.sourcePath+".modifiers[")));
  const html=renderArmoryItemInspector(view,esc);
  assert.ok(html.includes("item_aura"));
  assert.ok(html.includes("not counted again")||html.includes("Socket children are not added again"));
});

test("M11: nested mobile-friendly groups and items are folded by default and escaped",()=>{
  const html=renderArmoryItemInspector(inspect(),esc);
  assert.match(html,/data-armory-item-debug/);
  assert.match(html,/data-m11-section="mainHands"/);
  assert.match(html,/data-m11-section="alternateHands"/);
  assert.match(html,/data-m11-section="sharedEquipped"/);
  assert.match(html,/data-m11-section="mainCombined"/);
  assert.match(html,/data-m11-section="alternateCombined"/);
  assert.match(html,/Horadric Cube inventory/);
  assert.match(html,/Configured inclusion/);
  assert.match(html,/All items · hypothetical source totals/);
  assert.doesNotMatch(html,/<details[^>]*\sopen(?:[\s=>])/);
  assert.match(html,/items\[34\]/);
  const a=structuredClone(json);
  a.items[34].name="<img src=x onerror=alert(1)>";
  const injected=renderArmoryItemInspector(inspect(a),esc);
  assert.doesNotMatch(injected,/<img src=x/);
  assert.match(injected,/&lt;img src=x/);
  const app=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(app,/renderArmoryItemInspector\(armoryItems,escape\)/);
});
