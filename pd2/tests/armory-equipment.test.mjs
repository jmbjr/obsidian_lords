import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyArmoryItem, normalizeArmoryEquipment, selectEquipmentSources, equipmentSourceSummary, WEAPON_HAND_SETS } from "../../src/armory-equipment.js";

const load=name=>JSON.parse(readFileSync(`public/armory/${name}.json`,"utf8"));
const graph=normalizeArmoryEquipment(load("magizon"));
const slot=(selection,n)=>selection.activeItems.find(x=>x.slot===n);
const ids=selection=>selection.activeItems.map(x=>x.slot).sort((a,b)=>a-b);

test("both D2 loadouts share all non-hand gear and switch ONLY hand slots",()=>{
  assert.deepEqual(WEAPON_HAND_SETS,{main:[4,5],switch:[11,12]});
  const main=selectEquipmentSources(graph,{weaponSet:"main"});
  const alternate=selectEquipmentSources(graph,{weaponSet:"switch"});
  assert.deepEqual(ids(main),[1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(ids(alternate),[1,2,3,6,7,8,9,10,11,12]);
  const sharedMain=main.activeItems.filter(x=>![4,5,11,12].includes(x.slot)).map(x=>x.id);
  const sharedSwitch=alternate.activeItems.filter(x=>![4,5,11,12].includes(x.slot)).map(x=>x.id);
  assert.deepEqual(sharedMain,sharedSwitch);
  assert.equal(slot(main,4).name,"Harmony");
  assert.equal(slot(alternate,11).name,"Hellcast");
  assert.equal(slot(main,11),undefined);
  assert.equal(slot(alternate,4),undefined);
  assert.ok(main.inactiveItems.some(x=>x.item.slot===11 && x.reason==="other weapon set"));
});

test("source graph preserves equipment/socket provenance without doubling socket modifiers",()=>{
  const main=selectEquipmentSources(graph);
  const bow=slot(main,4);
  assert.equal(bow.sockets.length,4);
  assert.equal(bow.raw,graph.source.raw.items[Number(bow.sourcePath.match(/\d+/)[0])]);
  assert.ok(bow.sockets.every(x=>x.modifiers.every(m=>m.aggregation==="provenance-only")));
  assert.ok(bow.modifiers.every(m=>m.aggregation==="resolved-parent-only"));
  assert.equal(main.candidateModifiers.filter(x=>x.itemId===bow.id).length,bow.modifiers.length);
  assert.ok(!main.candidateModifiers.some(x=>x.sourcePath.includes(".socketed[")));
  assert.ok(main.candidateModifiers.some(x=>x.name==="item_singleskill"&&x.values[0]===32&&x.values[1]===6));
});

test("all equipment defaults included; individual exclusions and master toggle do not mutate graph",()=>{
  const original=selectEquipmentSources(graph);
  const bow=slot(original,4);
  const removed=selectEquipmentSources(graph,{excludedItemIds:[bow.id]});
  assert.equal(slot(removed,4),undefined);
  assert.equal(slot(removed,5).name,"Sharp Arrows");
  assert.equal(removed.activeItems.length,original.activeItems.length-1);
  assert.equal(selectEquipmentSources(graph,{includeEquipment:false}).activeItems.length,0);
  assert.ok(selectEquipmentSources(graph).activeItems.some(x=>x.id===bow.id));
  assert.throws(()=>selectEquipmentSources(graph,{excludedItemIds:["fake"]}),/Unknown item/);
  assert.throws(()=>selectEquipmentSources(graph,{weaponSet:"both"}),/Weapon set/);
});

test("inventory charms activate only in their verified scope; mercenary remains isolated",()=>{
  const chosen=selectEquipmentSources(graph);
  assert.equal(chosen.activeCharms.length,23);
  assert.ok(chosen.unresolvedItems.some(x=>x.item.owner==="mercenary"));
  assert.ok(!chosen.candidateModifiers.some(x=>x.sourcePath.startsWith("mercenary.")));
  assert.ok(!chosen.candidateModifiers.some(x=>chosen.unresolvedItems.some(y=>y.item.scope==="inventory-charm-candidate" && x.itemId===y.item.id)));
  assert.equal(classifyArmoryItem({location:{zone:"Stored",storage:"Inventory"},base:{type_code:"scha"}},"character"),"inventory-charm-candidate");
  assert.equal(classifyArmoryItem({location:{zone:"Stored",storage:"Stash"},base:{type_code:"scha"}},"character"),"stored-or-other");
  assert.equal(classifyArmoryItem({location:{zone:"Equipped",equipment_id:4}},"mercenary"),"mercenary");
});

test("both real snapshots maintain separated gear sets",()=>{
  for(const name of ["magizon","magiknaab"]){
    const payload=load(name);
    const d=normalizeArmoryEquipment(payload);
    for(const set of ["main","switch"]){
      const selection=selectEquipmentSources(d,{weaponSet:set});
      assert.ok(selection.activeItems.every(x=>x.scope==="shared-equipped" || x.scope===`hand-${set}`));
      assert.ok(selection.activeItems.every(x=>x.owner==="character"));
    }
    assert.equal(d.source.characterName.toLowerCase(),name);
    assert.equal(d.source.raw,payload);
    assert.equal(equipmentSourceSummary(d).duplicateSlotWarnings.length,0);
  }
});

test("duplicate slots are warned, but all original records remain accessible",()=>{
  const sample={character:{name:"Test"},items:[
    {location:{zone:"Equipped",equipment_id:4},modifiers:[]},
    {location:{zone:"Equipped",equipment_id:4},modifiers:[]},
  ]};
  const d=normalizeArmoryEquipment(sample);
  assert.equal(d.warnings.length,1);
  assert.equal(d.characterItems.length,2);
  assert.equal(selectEquipmentSources(d).activeItems.length,2);
});
