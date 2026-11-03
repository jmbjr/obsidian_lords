// Source-traced Amazon skill bonuses from resolved top-level Armory item modifiers.
// M3: skill bonuses only. Combat stats, charm eligibility, oskills beyond the
// Amazon class and player-facing weapon set/item toggles remain separate work.
import { emptyBonus } from "./amazon-comparison.js";
import { normalizeArmoryEquipment, selectEquipmentSources } from "./armory-equipment.js";

const validLevel = n => Number.isInteger(n) && n > 0 && n <= 100;
const tabPage = new Map([
  // D2 Amazon skill-tab indexes, matched to imported PD2 Armory labels.
  [0, { page: 1, pattern: /bow\s*(?:and|&)\s*crossbow/i }],
  [1, { page: 2, pattern: /passive\s*(?:and|&)\s*magic/i }],
  [2, { page: 3, pattern: /javelin\s*(?:and|&)\s*spear/i }],
]);
const validValue = x => Number.isInteger(x) && x >= 0 && x <= 100;

export function resolveAmazonEquipmentSkills(payload, skills, options={}) {
  const graph = normalizeArmoryEquipment(payload);
  const selection = selectEquipmentSources(graph,options);
  const index = new Map(skills.map(s=>[s.identity.internalId,s]));
  const bonus = emptyBonus(), sources = [], unresolved = [];
  const pushUnresolved=(mod,item,reason)=>unresolved.push({sourcePath:mod.sourcePath,itemId:item.id,modifier:mod.name,values:mod.values,reason});
  for(const item of selection.activeSources){
    for(const mod of item.modifiers){
      const values=mod.values;
      if(!["item_addclassskills","item_addskill_tab","item_singleskill","item_nonclassskill"].includes(mod.name))continue;
      const invalid= !Array.isArray(values) || values.length!==2 || !validValue(values[0]) || !validLevel(values[1]);
      if(invalid){pushUnresolved(mod,item,"invalid or unsupported skill modifier tuple");continue;}
      const [id,amount]=values;
      let target, key;
      if(mod.name==="item_addclassskills"){
        if(id!==0){pushUnresolved(mod,item,"not an Amazon class-skill modifier");continue;}
        target="all";key="all";bonus.all+=amount;
      }else if(mod.name==="item_addskill_tab"){
        const mapping=tabPage.get(id);
        // The native tuple by itself does not encode which class the tab is for.
        // Require a label establishing Amazon class, not an unrelated class tab.
        const label=String(mod.raw?.label||"");
        if(!mapping || !mapping.pattern.test(label) || !/amazon/i.test(label)){
          pushUnresolved(mod,item,"skill tab/class not verified by Armory label");continue;
        }
        target="tree";key=mapping.page;bonus.trees[mapping.page]+=amount;
      }else{
        const skill=index.get(id);
        // Amazon-only item_singleskill is a class modifier, not a general oskill.
        // In D2, non-class modifiers can be granted spells, with differing caps
        // and rules. Do not apply them until separately source-verified.
        if(mod.name==="item_nonclassskill"){
          pushUnresolved(mod,item,"non-class skill semantics not yet supported");continue;
        }
        if(!skill || !/amazon\s*only/i.test(String(mod.raw?.label||""))){
          pushUnresolved(mod,item,"Amazon-only skill identity not verified");continue;
        }
        target="skill";key=id;bonus.skills[id]=(bonus.skills[id]||0)+amount;
      }
      sources.push({sourcePath:mod.sourcePath,itemId:item.id,slot:item.slot,weaponSet:selection.weaponSet,modifier:mod.name,values:[...values],target,key,amount});
    }
  }
  for(const group of [bonus.all,...Object.values(bonus.trees),...Object.values(bonus.skills)])
    if(!Number.isInteger(group) || group>100) throw new RangeError("Combined equipment skill bonus exceeds supported range");
  return { bonus,sources,unresolved,selection,graph };
}

export function effectiveAmazonSkillLevel(skill, hardPoints, bonus) {
  const id=skill.identity.internalId;
  const hard=hardPoints?.[id] ?? 0;
  const direct=bonus.skills?.[id]||0;
  const all=bonus.all||0;
  const tree=bonus.trees?.[skill.selected.skillPage]||0;
  // Existing sandbox convention: direct +individual skill grants a zero-hard
  // skill, while +all/+tree alone cannot activate it.
  const granted=hard===0&&direct>0;
  const enabled=hard>0||granted;
  return {hard,all:enabled?all:0,tree:enabled?tree:0,direct:enabled?direct:0,
    granted,enabled,effective:enabled?hard+all+tree+direct:0};
}
