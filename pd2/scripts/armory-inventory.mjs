// Inventory the observable structure of PUBLIC PD2 Armory snapshots.
// Does not print/commit account identifiers, guild data, item hashes or raw gear.
// The original snapshots remain in public/armory and can change on later sync.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const shapeType = value => value===null ? "null" : Array.isArray(value) ? "array" : typeof value;
export function inventoryArmorySnapshot(payload, sourceLabel="snapshot") {
  if (!payload || !Array.isArray(payload.items) || !payload.character || !Array.isArray(payload.character.skills))
    throw new Error("Expected Armory character/items/skills");
  const paths=new Map(), modifiers=new Map(), equipmentSlots=new Set(), zones=new Map();
  const visit=(value,path,depth=0)=>{
    const kind=shapeType(value);
    const entry=paths.get(path)||{types:new Set(),occurrences:0};
    entry.types.add(kind);entry.occurrences++;paths.set(path,entry);
    if(depth>=12)return;
    if(Array.isArray(value)){
      // Item arrays are bounded in actual snapshots. This catalog preserves
      // field shape, not individual list position or value.
      for(const element of value)visit(element,path+"[]",depth+1);
    } else if(value && typeof value==="object"){
      for(const [key,child] of Object.entries(value))visit(child,path?path+"."+key:key,depth+1);
    }
  };
  visit(payload,"");
  const collect=(item,scope)=>{
    const zone=item?.location?.zone||"(unknown)";
    zones.set(scope+"/"+zone,(zones.get(scope+"/"+zone)||0)+1);
    if(scope==="character" && zone==="Equipped" && Number.isInteger(item?.location?.equipment_id))
      equipmentSlots.add(item.location.equipment_id);
    for(const m of item?.modifiers||[]){
      if(typeof m?.name!=="string")continue;
      const entry=modifiers.get(m.name)||{count:0,scopes:new Set(),valueLengths:new Set()};
      entry.count++;entry.scopes.add(scope+"/"+zone);
      entry.valueLengths.add(Array.isArray(m.values)?m.values.length:"missing");
      modifiers.set(m.name,entry);
    }
    // Socketed objects are accounted for in field paths, but don't count
    // them as independent equipped modifiers (avoids implied double counting).
  };
  for(const i of payload.items)collect(i,"character");
  for(const i of payload.mercenary?.items||[])collect(i,"mercenary");
  return {
    schemaVersion:1,
    source:sourceLabel,
    syncedAt:payload._obsidianLordsSync?.syncedAt||null,
    counts:{skills:payload.character.skills.length,characterItems:payload.items.length,mercenaryItems:payload.mercenary?.items?.length||0,fieldPaths:paths.size,modifierKinds:modifiers.size},
    zones:Object.fromEntries([...zones].sort(([a],[b])=>a.localeCompare(b))),
    equippedSlotIds:[...equipmentSlots].sort((a,b)=>a-b),
    paths:Object.fromEntries([...paths].sort(([a],[b])=>a.localeCompare(b)).map(([p,e])=>[p,{types:[...e.types].sort(),occurrences:e.occurrences}])),
    modifiers:Object.fromEntries([...modifiers].sort(([a],[b])=>a.localeCompare(b)).map(([m,e])=>[m,{count:e.count,scopes:[...e.scopes].sort(),valueLengths:[...e.valueLengths].sort((a,b)=>String(a).localeCompare(String(b)))}])),
  };
}

export function compareArmoryInventories(inventories) {
  const allPaths=new Set(inventories.flatMap(x=>Object.keys(x.paths)));
  const allMods=new Set(inventories.flatMap(x=>Object.keys(x.modifiers)));
  return {
    schemaVersion:1,
    snapshots:inventories.map(({source,syncedAt,counts,zones,equippedSlotIds})=>({source,syncedAt,counts,zones,equippedSlotIds})),
    fieldPaths:[...allPaths].sort().map(path=>({path,presentIn:inventories.filter(x=>Object.hasOwn(x.paths,path)).map(x=>x.source),types:[...new Set(inventories.flatMap(x=>x.paths[path]?.types||[]))].sort()})),
    modifierFamilies:[...allMods].sort().map(name=>({name,presentIn:inventories.filter(x=>Object.hasOwn(x.modifiers,name)).map(x=>x.source),scopes:[...new Set(inventories.flatMap(x=>x.modifiers[name]?.scopes||[]))].sort(),argumentLengths:[...new Set(inventories.flatMap(x=>x.modifiers[name]?.valueLengths||[]))].sort((a,b)=>String(a).localeCompare(String(b)))})),
  };
}

if(process.argv[1]?.endsWith("armory-inventory.mjs")){
  const files=process.argv.slice(2);
  if(!files.length){console.error("Usage: node pd2/scripts/armory-inventory.mjs public/armory/*.json");process.exitCode=2;}
  else{
    try {
      const inventories=files.map(path=>inventoryArmorySnapshot(JSON.parse(readFileSync(path,"utf8")),basename(path)));
      process.stdout.write(JSON.stringify(compareArmoryInventories(inventories),null,2)+"\n");
    }catch(e){console.error(e.message);process.exitCode=1;}
  }
}
