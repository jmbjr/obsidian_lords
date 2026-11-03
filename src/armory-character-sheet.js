// M5: provenance-preserving Armory character-sheet primitives.
// Distinguishes raw snapshot readings from equipment contributions and final
// game-display values. No invented D2/PD2 formula, charm activation or caps.
import { normalizeArmoryEquipment, selectEquipmentSources } from "./armory-equipment.js";

const ATTRIBUTE_KEYS = ["strength","dexterity","vitality","energy"];
const RESIST_KEYS = {fireresist:"fire",coldresist:"cold",lightresist:"lightning",poisonresist:"poison"};
const flatValue = mod => Array.isArray(mod.values) && mod.values.length===1 &&
  Number.isFinite(mod.values[0]) ? mod.values[0] : null;
const numberOrNull = x => typeof x==="number" && Number.isFinite(x) ? x : null;
const dataField = (name,value,path) => ({
  name, value:numberOrNull(value), status:numberOrNull(value)===null?"unavailable":"source",
  sources:numberOrNull(value)===null?[]:[{path,amount:value,kind:"raw-snapshot"}],
});
const sumSources = (name,base,basePath,contributions) => {
  const sources=[...(base===null?[]:[{path:basePath,amount:base,kind:"raw-snapshot"}]),...contributions];
  return {name,base,equipment:contributions.reduce((n,c)=>n+c.amount,0),
    value:base===null?null:base+contributions.reduce((n,c)=>n+c.amount,0),
    status:base===null?"partial":"equipment-derived",sources};
};
const fromMods=(items,types,filter=()=>true) => items.flatMap(item=>item.modifiers
  .filter(mod=>types.includes(mod.name)&&filter(mod))
  .flatMap(mod=>{const amount=flatValue(mod);return amount===null?[]:[{
    path:mod.sourcePath,itemId:item.id,slot:item.slot,item:item.name,
    modifier:mod.name,amount,kind:"resolved-equipment-modifier",
  }];}));

export function projectArmoryCharacterSheet(payload,options={}) {
  const graph=normalizeArmoryEquipment(payload);
  const selection=selectEquipmentSources(graph,options);
  const c=payload.character;
  const active=selection.activeItems;
  const baseAttributes={},attributes={};
  for(const key of ATTRIBUTE_KEYS){
    const raw=numberOrNull(c.attributes?.[key]);
    baseAttributes[key]=dataField(key,raw,`character.attributes.${key}`);
    attributes[key]=sumSources(key,raw,`character.attributes.${key}`,
      fromMods(active,[key,"all_attributes"]));
  }
  const baseResistances={},resistances={};
  for(const [mod,key] of Object.entries(RESIST_KEYS)){
    const contributions=fromMods(active,[mod,"all_resist"]);
    baseResistances[key]={name:key,value:null,status:"unavailable",sources:[]};
    // We only know active equipment's nominal resistance; final values depend
    // on difficulty, caps, charms, penalties and buffs not in this projection.
    resistances[key]={name:key,base:null,equipment:contributions.reduce((n,x)=>n+x.amount,0),
      value:null,status:"partial",sources:contributions};
  }
  const arSources=fromMods(active,["tohit"]);
  const percentARSources=fromMods(active,["item_tohit_percent"]);
  const armorPieces=active.flatMap(item=>{
    const val=numberOrNull(item.raw?.defense?.total);
    return val===null?[]:[{path:item.sourcePath+".defense.total",amount:val,
      kind:"resolved-item-defense",item:item.name,slot:item.slot,itemId:item.id}];
  });
  const equippedDefense=armorPieces.reduce((n,x)=>n+x.amount,0);
  // The item's defense.total already includes its own local armorclass
  // modifiers. On a weapon or other non-defense item, a flat armorclass
  // modifier is a separate character contribution; include it once.
  const nonArmorDefense=active.filter(item=>numberOrNull(item.raw?.defense?.total)===null);
  const flatDefenseSources=fromMods(nonArmorDefense,["armorclass"]);
  const flatNonArmorDefense=flatDefenseSources.reduce((n,x)=>n+x.amount,0);
  const weaponSlot=selection.weaponSet==="main"?4:11;
  const weapon=active.find(item=>item.slot===weaponSlot && item.category==="weapon")||null;
  const damage=weapon?.raw?.damage?.two_handed||null;
  const min=numberOrNull(damage?.minimum),max=numberOrNull(damage?.maximum);
  const weaponPhysical=min!==null&&max!==null&&min<=max ?
    {min,max,status:"source",sourcePath:weapon.sourcePath+".damage.two_handed",
      note:"Already-resolved weapon damage from Armory; do not reapply the weapon's own enhanced damage"}
    : {min:null,max:null,status:"unavailable",sourcePath:null};
  const flatAttackRating=arSources.reduce((n,x)=>n+x.amount,0);
  return {
    schemaVersion:1,
    character:{name:c.name??null,level:dataField("level",c.level,"character.level"),
      experience:dataField("experience",c.experience,"character.experience"),
      unspentStatPoints:dataField("unspentStatPoints",c.points?.stat,"character.points.stat"),
      unspentSkillPoints:dataField("unspentSkillPoints",c.points?.skill,"character.points.skill")},
    baseAttributes,attributes,
    resources:{
      life:dataField("life",c.life,"character.life"),
      mana:dataField("mana",c.mana,"character.mana"),
      stamina:dataField("stamina",c.stamina,"character.stamina"),
    },
    resistances,baseResistances,
    defense:{
      equippedItems:{value:equippedDefense,status:"equipment-derived",sources:armorPieces},
      flatNonArmor:{value:flatNonArmorDefense,status:"equipment-derived",sources:flatDefenseSources},
      knownEquipmentContribution:{value:equippedDefense+flatNonArmorDefense,status:"partial",sources:[...armorPieces,...flatDefenseSources]},
      final:{value:null,status:"unsupported",
        reason:"Dexterity contribution, active buffs, and defense formula/rounding are not modeled"}},
    attackRating:{
      flatEquipment:{value:flatAttackRating,status:"equipment-derived",sources:arSources},
      percentEquipment:{value:percentARSources.reduce((n,x)=>n+x.amount,0),
        status:"equipment-derived",sources:percentARSources},
      final:{value:null,status:"unsupported",
        reason:"Base AR, Dexterity, passive/skill modifiers, and calculation order are not modeled"}},
    weapon:{activeSet:selection.weaponSet,slot:weaponSlot,name:weapon?.name||null,
      physical:weaponPhysical},
    limitations:[
      "Inventory charms and mercenary gear are not applied to player stats",
      "Item equipment requirements and active buffs have not been verified",
      "Final resistances need difficulty, caps and other effects",
      "Resources are raw Armory snapshot readings; they do not dynamically recompute when equipment changes",
      "Full damage/AR and attack cadence are deferred to M6",
    ],
    selectedItemIds:active.map(x=>x.id),
    unmodeledItemCount:selection.unresolvedItems.length,
    source:{characterName:graph.source.characterName,syncedAt:graph.source.syncedAt},
  };
}
