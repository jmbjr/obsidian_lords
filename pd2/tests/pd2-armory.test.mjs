import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importArmoryAmazon, fetchArmoryCharacter, armoryCharacterUrl } from "../../src/pd2-armory.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const item=(id,name,modifiers,zone="Equipped")=>({
  name,category:id===4?"weapon":"misc",location:{zone,equipment_id:id},
  modifiers, ...(id===4?{damage:{two_handed:{minimum:39,maximum:104}}}:{})
});
const fixture={
  character:{name:"Magizon",class:{id:0},level:67,points:{skill:46},
    skills:[{id:9,level:1},{id:12,level:20},{id:33,level:1}]},
  items:[
    item(2,"Rare Amulet",[{name:"item_addclassskills",values:[0,1]}]),
    item(4,"Harmony",[{name:"maxdamage_percent",values:[282,15]}]),
    item(9,"Rare Boots",[{name:"item_deadlystrike",values:[15]},{name:"item_openwounds",values:[10]},{name:"deep_wounds",values:[155]}]),
    item(11,"Switched",[{name:"item_deadlystrike",values:[100]}]),
    item(0,"Inventory Charm",[{name:"item_crushingblow",values:[99]}],"Stored")
  ],mercenary:{items:[item(9,"Gore Rider",[{name:"item_crushingblow",values:[15]}])]}
};

test("Magizon-like armory import maps hard points and equipped +Amazon skills",()=>{
  const r=importArmoryAmazon(fixture,skills);
  assert.equal(r.level,67);
  assert.equal(r.build[12],20);
  assert.equal(r.build[9],1);
  assert.equal(r.bonus.all,1);
  assert.deepEqual(r.recognized.weaponDamage,{min:39,max:104});
});
test("exclude mercenary, stored items and weapon switch; preserve original",()=>{
  const r=importArmoryAmazon(fixture,skills);
  assert.equal(r.recognized.deadlyStrike,15);
  assert.equal(r.recognized.crushingBlow,0);
  assert.equal(r.recognized.openWoundsChance,10);
  assert.equal(r.recognized.openWoundsDamagePerSecond,155);
  assert.equal(r.source,fixture);
  assert.ok(r.warnings.some(w=>w.includes("Mercenary")));
});
test("reject incompatible data without touching any build state",()=>{
  assert.throws(()=>importArmoryAmazon({...fixture,character:{...fixture.character,class:{id:1}}},skills));
  assert.throws(()=>importArmoryAmazon({...fixture,character:{...fixture.character,skills:[{id:12,level:999}]}},skills));
});
test("construct safe named URL and validate matching response",async()=>{
  assert.equal(armoryCharacterUrl("Magizon"),"https://api.projectdiablo2.com/game/character/Magizon");
  let called;
  const got=await fetchArmoryCharacter("Magizon",async(url,options)=>{
    called=[url,options];return {ok:true,json:async()=>fixture};
  });
  assert.equal(got,fixture);
  assert.equal(called[1].credentials,"omit");
  await assert.rejects(()=>fetchArmoryCharacter("..",async()=>({ok:true,json:async()=>fixture})));
  await assert.rejects(()=>fetchArmoryCharacter("Magizon",async()=>({ok:false,status:404})),/404/);
});
