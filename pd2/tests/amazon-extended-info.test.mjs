import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectAmazonExtendedInfo, EXTENDED_INFO_CATEGORIES } from "../../src/amazon-extended-info.js";
import { importArmoryAmazon } from "../../src/pd2-armory.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const load=name=>JSON.parse(readFileSync(name==="magizon"?"pd2/fixtures/character-parity/magizon-2026-11-03-pinned.json":`public/armory/${name}.json`,"utf8"));
const project=(payload,options={})=>{
  // M7 equipped-only baseline is retained for comparison to M9 charm-inclusive inputs.
  const gear={includeCharms:false,...options};
  const imported=importArmoryAmazon(payload,skills,gear);
  return projectAmazonExtendedInfo(payload,skills,imported.build,imported.bonus,gear);
};
const slot=(payload,id)=>payload.items.find(x=>x.location?.zone==="Equipped"&&x.location?.equipment_id===id);

test("extended catalog preserves every distinct page-8 group and no duplicate metric IDs",()=>{
  const p=project(load("magizon"));
  assert.ok(EXTENDED_INFO_CATEGORIES.includes("Elemental additions"));
  assert.ok(EXTENDED_INFO_CATEGORIES.includes("Mastery & pierce"));
  assert.ok(EXTENDED_INFO_CATEGORIES.includes("Critical & procs"));
  assert.ok(EXTENDED_INFO_CATEGORIES.includes("Leech & recovery"));
  assert.equal(new Set(p.rows.map(r=>r.id)).size,p.rows.length);
  assert.ok(p.rows.length>=55);
  assert.ok(p.rows.every(r=>["equipment-only","skill-preview","source-derived","unsupported"].includes(r.status)));
  assert.ok(p.rows.every(r=>r.status==="unsupported" ? r.finalValue===null : true));
});

test("Magizon selected gear correctly isolates leech, Pierce, IAS, MF and Gold Find",()=>{
  const p=project(load("magizon")).byId;
  assert.equal(p.lifeLeech.equipmentValue,12);
  assert.equal(p.manaLeech.equipmentValue,3);
  assert.equal(p.projectilePierce.equipmentValue,26);
  assert.equal(p.ias.equipmentValue,40);
  assert.equal(p.fhr.equipmentValue,0);
  assert.equal(p.magicFind.equipmentValue,12);
  assert.equal(p.goldFind.equipmentValue,12);
  assert.equal(p.criticalStrike.finalValue,23);
  assert.equal(p.deadlyStrike.equipmentValue,0);
  assert.equal(p.openWoundsChance.equipmentValue,0);
  assert.equal(p.openWoundsDps.equipmentValue,0);
  assert.equal(p.deadlyCriticalCombined.finalValue,null);
  assert.equal(p.projectilePierceFinal.finalValue,null);
  assert.equal(p.ias.finalValue,null);
  assert.equal(p.amazonRangedFrames.finalValue,11);
  assert.equal(p.fireResist.finalValue,null);
  assert.equal(p.projectilePierce.sources.length,1);
  assert.ok(p.projectilePierce.sources[0].sourcePath.includes(".modifiers["));
});

test("weapon switching affects hand mods only, and preserves independent deadly/OW/DPS fields",()=>{
  const payload=load("magizon");
  const before=JSON.stringify(payload);
  const main=project(payload,{weaponSet:"main"}).byId;
  const other=project(payload,{weaponSet:"switch"}).byId;
  assert.equal(main.lifeLeech.equipmentValue,12);
  assert.equal(other.lifeLeech.equipmentValue,18);
  assert.equal(main.projectilePierce.equipmentValue,26);
  assert.equal(other.projectilePierce.equipmentValue,26);
  assert.equal(main.ias.equipmentValue,40);
  assert.equal(other.ias.equipmentValue,100);
  assert.equal(main.physicalPierce.equipmentValue,0);
  assert.equal(other.physicalPierce.equipmentValue,2);
  assert.equal(main.maxFireResist.equipmentValue,0);
  assert.equal(other.maxFireResist.equipmentValue,15);
  assert.equal(JSON.stringify(payload),before);
});

test("individual and master gear disabling recomputes contributions, no inactive socket/merc/charm leak",()=>{
  const payload=load("magizon");
  const amulet=payload.items.findIndex(x=>x.location?.zone==="Equipped"&&x.location.equipment_id===2);
  const off=project(payload,{includeEquipment:false}).byId;
  assert.equal(off.fireResist.equipmentValue,0);
  assert.equal(off.lifeLeech.equipmentValue,0);
  assert.equal(off.ias.equipmentValue,0);
  assert.equal(off.projectilePierce.equipmentValue,0);
  const minus=project(payload,{excludedItemIds:[`items[${amulet}]`]}).byId;
  assert.equal(minus.fireResist.equipmentValue,mainResist(payload)-14);
  assert.equal(minus.lifeLeech.equipmentValue,7);
  const p=project(payload).byId;
  assert.ok(p.ias.sources.every(x=>x.slot!==11));
  assert.ok(p.ias.sources.every(x=>!x.sourcePath.includes("socketed")));
  assert.ok(p.fhr.equipmentValue===0);
});
function mainResist(payload){return project(payload).byId.fireResist.equipmentValue;}

test("synthetic chance, OW DPS, poison tuples and malformed stats stay distinct and traceable",()=>{
  const payload=structuredClone(load("magizon"));
  const helmet=slot(payload,1);
  helmet.modifiers.push(
    {name:"item_crushingblow",values:[25],label:"25% Crushing Blow"},
    {name:"item_deadlystrike",values:[17],label:"17% Deadly Strike"},
    {name:"item_openwounds",values:[30],label:"30% Open Wounds"},
    {name:"deep_wounds",values:[165],label:"+165 Open Wounds DPS"},
    {name:"poisondam",values:[11,11,3],label:"+11 poison over 3 seconds"},
    {name:"firedam",values:[2,9],label:"Adds 2-9 Fire Damage"},
    {name:"item_crushingblow",values:[3,6],label:"invalid tuple"},
  );
  const result=project(payload).byId;
  assert.equal(result.crushingBlow.equipmentValue,25);
  assert.equal(result.crushingBlow.unresolved.length,1);
  assert.equal(result.deadlyStrike.equipmentValue,17);
  assert.equal(result.openWoundsChance.equipmentValue,30);
  assert.equal(result.openWoundsDps.equipmentValue,165);
  assert.equal(result.openWoundsChance.sources[0].amount,30);
  assert.equal(result.openWoundsDps.sources[0].amount,165);
  assert.equal(result.poisonDamage.equipmentValue,null);
  assert.ok(result.poisonDamage.sources.some(x=>x.duration===3));
  assert.ok(result.fireDamage.equipmentValue.min>=2);
  const noHelmet=payload.items.findIndex(x=>x===helmet);
  const removed=project(payload,{excludedItemIds:[`items[${noHelmet}]`]}).byId;
  assert.equal(removed.openWoundsChance.equipmentValue,0);
  assert.equal(removed.openWoundsDps.equipmentValue,0);
});

test("actual second character has separate FHR, attack speed, absorb and attack rating contributions",()=>{
  const p=project(load("magiknaab")).byId;
  assert.equal(p.fhr.equipmentValue,50);
  assert.equal(p.ias.equipmentValue,45);
  assert.equal(p.lightAbsorbPercent.equipmentValue,6);
  assert.equal(p.attackRatingFlat.equipmentValue,174);
  assert.equal(p.attackRatingPercent.equipmentValue,15);
  assert.equal(p.lifeAfterKill.equipmentValue,0);
  assert.equal(p.physicalDamageReductionFlat.equipmentValue,2);
  assert.equal(p.magicDamageReductionFlat.equipmentValue,2);
  assert.equal(p.projectilePierce.equipmentValue,0);
  assert.equal(project(load("magiknaab"),{weaponSet:"switch"}).byId.projectilePierce.equipmentValue,26);
});

test("M7 display is real per-build derived data and not wired into manual combat guesses",()=>{
  const ui=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(ui,/projectAmazonExtendedInfo\(/);
  assert.match(ui,/M7 Extended Info 8/);
  assert.match(ui,/equipmentSettings\[state\.active\]/);
  assert.match(ui,/data-extended-id/);
  assert.match(ui,/Unsupported final values remain unavailable/);
});
