// Read-only M11 HTML inspector; every section and item is folded by default.
// Uses the caller's HTML escaping helper and never executes raw JSON as HTML.
export function renderArmoryItemInspector(report,escape) {
  if(!report)return "";
  const safe=x=>escape(x??"");
  const display=x=>x===null||x===undefined?"not available":typeof x==="object"?JSON.stringify(x):String(x);
  const summary=(value,title)=>{
    const sums=value.additive.map(stat=>
      '<li><strong>'+safe(stat.name)+'</strong>: '+safe(stat.value)+
      ' <small>('+stat.count+' parent modifier'+(stat.count===1?'':'s')+')</small></li>').join("");
    const unresolved=value.nonadditive.map(stat=>
      '<li><strong>'+safe(stat.name)+'</strong>: '+stat.count+
      ' unsummed tuple'+(stat.count===1?'':'s')+
      ' <small>(selectors, compound values or unsupported semantics)</small></li>').join("");
    return '<details class="armory-item-total"><summary>'+safe(title)+
      ' · '+value.itemCount+' items · '+value.additive.length+' summed stat types · '+
      value.nonadditive.length+' unsummed types</summary>'+
      '<p class="annotation">Compatible scalar modifier values are added by native name only; totals are raw source arithmetic, not final character stats. Socket children are not added again. Resolved weapon/armor values are shown per item, not added to affix totals.</p>'+
      (sums?'<strong>Raw additive subtotals</strong><ul>'+sums+'</ul>':'<p>No additive scalar modifiers.</p>')+
      (unresolved?'<strong>Not safely additive</strong><ul>'+unresolved+'</ul>':'')+'</details>';
  };
  const item=x=>'<details class="armory-item-entry"><summary>'+
    safe(x.name)+' · '+safe(x.slotLabel||x.storage||x.scope)+
    ' · '+x.modifiers.length+' source stats'+(x.configured?' · included':' · not applied')+
    '</summary><p class="annotation">Source <code>'+safe(x.sourcePath)+
    '</code> · Slot '+safe(x.slot??"none")+' · Position '+safe(display(x.position))+
    (x.corrupted?' · Corrupted':'')+(x.runeword?' · Runeword '+safe(x.runeword):'')+
    '</p>'+
    (x.resolvedDefense!==null?'<p>Resolved item defense: <strong>'+safe(x.resolvedDefense)+'</strong> (not an extra modifier)</p>':'')+
    (x.resolvedWeaponDamage?'<p>Resolved weapon damage: <code>'+safe(display(x.resolvedWeaponDamage))+'</code> (not an extra modifier)</p>':'')+
    (x.modifiers.length?'<ul>'+x.modifiers.map(mod=>
      '<li><strong>'+safe(mod.label)+'</strong> · <code>'+safe(mod.name)+'</code>'+
      ' · values <code>'+safe(display(mod.values))+'</code>'+
      ' · '+(mod.additive?'scalar/additive candidate':'unsummed/compound')+
      ' · <code>'+safe(mod.sourcePath)+'</code></li>').join('')+'</ul>':'<p>No parent modifier entries in JSON.</p>')+
    (x.sockets.length?'<details><summary>Socketed item evidence · '+x.sockets.length+
      ' (not counted again)</summary><ul>'+x.sockets.map(child=>
      '<li><code>'+safe(child.sourcePath)+'</code> · '+safe(child.raw?.name||child.raw?.base?.name||"socketed item")+
      ' · '+safe(display(child.raw?.modifiers||[]))+'</li>').join('')+'</ul></details>':'')+
    '</details>';
  const section=x=>{
    const composite=x.key==="mainCombined"||x.key==="alternateCombined";
    return '<details class="armory-item-section" data-m11-section="'+safe(x.key)+'"><summary>'+
      safe(x.title)+' · '+x.rawSummary.itemCount+' items</summary>'+
      '<p class="annotation">'+safe(x.description)+'</p>'+
      summary(x.rawSummary,'All items · hypothetical source totals')+
      summary(x.configuredSummary,'Configured inclusion · '+x.configuredCount+' items')+
      (composite?'<p class="annotation">Composite totals only. Open the hand and shared-gear groups for individual item details.</p>':
        x.items.length?x.items.map(item).join(''):'<p>No items in this section of the current Armory JSON.</p>')+
      '</details>';
  };
  const eligible=new Map(report.charmEligibility.map(x=>[x.id,x]));
  const decorate=x=>({...x,items:x.items.map(it=>({
    ...it,configured:x.configuredIds.includes(it.id),
    charmStatus:x.key==="charms"?eligible.get(it.id):null,
  }))});
  const equipment=report.equipment.map(decorate);
  const others=report.sections.map(decorate);
  return '<details class="armory-item-debug" data-armory-item-debug>'+
    '<summary>Debug · all Armory items, stats and section totals</summary>'+
    '<p class="annotation">Source-only inspection of '+safe(report.character)+
    ' · '+safe(report.syncedAt||"unknown sync")+
    '. All boxes start collapsed. Main and alternate hand sets are compared separately. Inventory/cube subtotals are hypothetical, never applied to your build. The configured subtotal honors gear/charm toggles, and the all-items subtotal ignores them.</p>'+
    '<p class="annotation">Selected live hand set: <strong>'+safe(report.selectedWeaponSet)+'</strong>. Other hand-set totals are comparisons, not simultaneous applied stats.</p>'+
    '<details class="armory-item-category"><summary>Equipped gear · main / alternate / shared</summary>'+
    equipment.map(section).join('')+'</details>'+
    '<details class="armory-item-category"><summary>Charm inventory · eligibility and totals</summary>'+
    others.filter(x=>x.key==="charms").map(section).join('')+'</details>'+
    '<details class="armory-item-category"><summary>Main inventory · non-charm</summary>'+
    others.filter(x=>x.key==="inventory").map(section).join('')+'</details>'+
    '<details class="armory-item-category"><summary>Horadric Cube inventory</summary>'+
    others.filter(x=>x.key==="cube").map(section).join('')+'</details>'+
    (others.some(x=>x.key==="otherStored")?
      '<details class="armory-item-category"><summary>Other / unresolved storage</summary>'+
      others.filter(x=>x.key==="otherStored").map(section).join('')+'</details>':'')+
    '</details>';
}
