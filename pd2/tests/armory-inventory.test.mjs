import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inventoryArmorySnapshot, compareArmoryInventories } from "../scripts/armory-inventory.mjs";

const fixtures=JSON.parse(readFileSync("pd2/fixtures/armory/character-schema-v1.json","utf8"));
const [a,b]=fixtures.snapshots;

test("redacted fixture never contains actual character identity or raw account/item hashes",()=>{
  assert.equal(fixtures.provenance.kind,"synthetic-redacted");
  const raw=JSON.stringify(fixtures.snapshots);
  assert.doesNotMatch(raw,/\bMagizon\b|\bMagiknaab\b|"guild":|"account":|"hash":/);
});

test("inventories retain typed paths, nested arrays and source-aware modifier families",()=>{
  const first=inventoryArmorySnapshot(a,"fixture-a");
  const second=inventoryArmorySnapshot(b,"fixture-b");
  const all=compareArmoryInventories([first,second]);
  assert.ok(Object.hasOwn(first.paths,"items[].modifiers[].values[]"));
  assert.ok(Object.hasOwn(first.paths,"character.skills[].level"));
  assert.deepEqual(first.equippedSlotIds,[4]);
  assert.deepEqual(second.equippedSlotIds,[1,3,11]);
  const valk=all.modifierFamilies.find(x=>x.name==="item_singleskill");
  assert.deepEqual(valk.argumentLengths,[2]);
  assert.deepEqual(valk.presentIn,["fixture-a","fixture-b"]);
  assert.ok(all.modifierFamilies.some(x=>x.name==="item_nonclassskill"&&x.presentIn.includes("fixture-b")));
  assert.ok(first.zones["character/Stored"]===1);
  assert.ok(first.zones["mercenary/Equipped"]===1);
  assert.equal(all.snapshots.length,2);
  assert.ok(!JSON.stringify(all).includes("FixtureAmazonA"));
});

test("invalid snapshots fail closed, without inferring or applying stats",()=>{
  assert.throws(()=>inventoryArmorySnapshot({}),/Expected Armory/);
  assert.throws(()=>inventoryArmorySnapshot({character:{skills:[]},items:{}}),/Expected Armory/);
});

test("real source snapshots can be inventoried without copying private payload fields",()=>{
  for(const name of ["magizon","magiknaab"]){
    const doc=JSON.parse(readFileSync(`public/armory/${name}.json`,"utf8"));
    const audit=inventoryArmorySnapshot(doc,name+".json");
    assert.equal(audit.counts.characterItems,doc.items.length);
    assert.ok(audit.counts.fieldPaths>150);
    assert.ok(audit.modifiers.item_singleskill || audit.modifiers.item_nonclassskill);
    assert.ok(!JSON.stringify(audit).includes(doc.character.name));
    assert.ok(!Object.hasOwn(audit,"guild"));
    assert.ok(Object.hasOwn(audit.paths,"items[].socketed[]") || Object.hasOwn(audit.paths,"items[].socketed"));
  }
});
