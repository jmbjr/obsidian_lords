import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeArmoryEquipment, selectEquipmentSources, pd2CharmCells, PD2_CHARM_GRID } from "../../src/armory-equipment.js";
import { projectArmoryCharacterSheet } from "../../src/armory-character-sheet.js";
import { projectAmazonRangedAttack } from "../../src/amazon-ranged-attack.js";
import { importArmoryAmazon } from "../../src/pd2-armory.js";
import { projectAmazonExtendedInfo } from "../../src/amazon-extended-info.js";
import { buildAmazonParityObservations } from "../../src/amazon-parity.js";
import { defaultEquipmentSettings } from "../../src/amazon-equipment-controls.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const load=name=>JSON.parse(readFileSync(`public/armory/${name}.json`,"utf8"));
const magizon=load("magizon");
const selection=(payload,options)=>selectEquipmentSources(normalizeArmoryEquipment(payload),options);
const attack=(payload,options={})=>{
  const imported=importArmoryAmazon(payload,skills,options);
  return projectAmazonRangedAttack(payload,skills,imported.build,imported.bonus,options);
};
const info=(payload,options={})=>{
  const imported=importArmoryAmazon(payload,skills,options);
  return projectAmazonExtendedInfo(payload,skills,imported.build,imported.bonus,options).byId;
};

test("PD2 charm inventory geometry: lower 10x4 rows, complete item containment",()=>{
  assert.equal(PD2_CHARM_GRID.firstActiveRow,4);
  assert.equal(PD2_CHARM_GRID.rows,8);
  assert.equal(PD2_CHARM_GRID.columns,10);
  const make=(baseType,column,row)=>({scope:"inventory-charm-candidate",baseType,position:{column,row}});
  assert.equal(pd2CharmCells(make("scha",0,4)).status,"active-position");
  assert.equal(pd2CharmCells(make("mcha",9,6)).cells.length,2);
  assert.equal(pd2CharmCells(make("lcha",0,5)).cells.length,3);
  for(const [type,x,y] of [["scha",2,3],["mcha",2,3],["lcha",2,6],["scha",10,4],["scha",-1,4]])
    assert.equal(pd2CharmCells(make(type,x,y)).status,"inactive-position");
  assert.equal(pd2CharmCells({scope:"inventory-charm-candidate",baseType:"scha"}).status,"unverified-position");
});

test("both published characters have fully positioned active inventory charms, separate from gear and mercenary",()=>{
  for(const name of ["magizon","magiknaab"]){
    const payload=load(name),selected=selection(payload);
    assert.equal(selected.activeItems.length,10);
    assert.equal(selected.activeCharms.length,23);
    assert.equal(selected.activeSources.length,33);
    assert.ok(selected.activeCharms.every(x=>x.scope==="inventory-charm-candidate"));
    assert.ok(selected.activeCharms.every(x=>x.position.row>=4));
    assert.ok(selected.activeCharms.every(x=>x.owner==="character"));
    assert.ok(!selected.candidateModifiers.some(x=>x.sourcePath.startsWith("mercenary")));
    assert.equal(selected.inactiveCharms.length,0);
  }
});

test("four M8 source gaps reconcile exactly with active charms in default M9",()=>{
  const sheet=projectArmoryCharacterSheet(magizon);
  const m7=info(magizon);
  const m6=attack(magizon);
  assert.equal(sheet.attributes.strength.value,65);
  assert.equal(sheet.attributes.dexterity.value,60);
  assert.equal(m7.ias.equipmentValue,46);
  assert.equal(m7.attackRatingFlat.equipmentValue,53);
  assert.equal(sheet.defense.knownEquipmentContribution.value,386);
  assert.equal(m6.speed.frames,10);
  const parity=buildAmazonParityObservations(magizon,skills);
  assert.equal(parity.pinned,true);
  for(const key of ["character.strength","extended.ias","extended.baseArGear","extended.defenseGear"]){
    const row=parity.rows.find(x=>x.key===key);
    assert.equal(row.numericGap,0,key);
    assert.equal(row.verdict,"partial",key);
    assert.equal(row.candidateReconciles,true,key);
  }
});

test("charm toggles independently remove sources, preserve hand swapping and leave original source unchanged",()=>{
  const snapshot=JSON.stringify(magizon);
  const base=selection(magizon);
  const quick=base.activeCharms.find(x=>x.name==="Quick Large Charm of Blight");
  const str=base.activeCharms.find(x=>x.name==="Grand Charm of Strength");
  const off={...defaultEquipmentSettings(),includeCharms:false};
  assert.equal(selection(magizon,off).activeCharms.length,0);
  assert.equal(selection(magizon,off).activeItems.length,10);
  assert.equal(info(magizon,off).ias.equipmentValue,40);
  assert.equal(projectArmoryCharacterSheet(magizon,off).attributes.strength.value,59);
  assert.equal(attack(magizon,off).speed.frames,11);
  const minusQuick={...defaultEquipmentSettings(),excludedCharmIds:[quick.id]};
  assert.equal(info(magizon,minusQuick).ias.equipmentValue,40);
  assert.equal(projectArmoryCharacterSheet(magizon,minusQuick).attributes.strength.value,65);
  const minusStr={...defaultEquipmentSettings(),excludedCharmIds:[str.id]};
  assert.equal(projectArmoryCharacterSheet(magizon,minusStr).attributes.strength.value,59);
  const switchSet=selection(magizon,{weaponSet:"switch"});
  assert.deepEqual(switchSet.activeCharms.map(x=>x.id),base.activeCharms.map(x=>x.id));
  const gearOff={...defaultEquipmentSettings(),includeEquipment:false};
  assert.equal(selection(magizon,gearOff).activeItems.length,0);
  assert.equal(selection(magizon,gearOff).activeCharms.length,23);
  assert.equal(JSON.stringify(magizon),snapshot);
});

test("malformed charm positions and collisions never create active stats",()=>{
  const payload=structuredClone(magizon);
  const targets=payload.items.filter(x=>x.base?.type_code==="scha");
  targets[0].position={column:0,row:3};
  targets[1].position={column:0,row:3};
  const chosen=selection(payload);
  assert.ok(chosen.unresolvedItems.some(x=>x.reason==="inactive-position"));
  const overlap=structuredClone(magizon);
  const little=overlap.items.filter(x=>x.location.storage==="Inventory" && x.base?.type_code==="scha");
  little[0].position={column:0,row:4};
  little[1].position={column:0,row:4};
  const conflict=selection(overlap);
  assert.ok(conflict.unresolvedItems.some(x=>x.reason.startsWith("inventory overlap")));
  assert.ok(conflict.activeCharms.length<23);
  assert.throws(()=>selection(magizon,{excludedCharmIds:["fake"]}),/Unknown charm/);
});

test("UI exposes independent per-Build active charm controls",()=>{
  const ui=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(ui,/data-charms-all/);
  assert.match(ui,/data-charm-item/);
  assert.match(ui,/equipmentSettings\[state\.active\]\.includeCharms/);
  assert.match(ui,/settings\.excludedCharmIds/);
  assert.match(ui,/bottom four inventory rows/);
});
