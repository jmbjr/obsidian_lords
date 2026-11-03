# Character reconstruction milestone 6 — Amazon ranged attacks

## Scope and evidence

M6 adds a **testable, source-traced partial Multiple Shot projection** for an imported Build A or B. It does **not** claim final in-game character-screen damage, in-game AR or exact frame parity. Source data and missing contributions are kept separate.

- PD2 Season 14 Multiple Shot source: pinned `coleestrin/pd2-tools@7952f34719aa3a5cb41334a91fe36dbcbdd8be9c`, `api/src/game-data/pd2/season-14/Skills.txt`: base +50% damage, +4% per effective skill level after 1, and +8% AR, +6% per effective level after 1.
- Ranged Dexterity and off-weapon damage composition: [Blizzard Arreat Summit character calculation reference](https://classic.battle.net/diablo2exp/basics/characters.shtml). **D2-family formula and rounding are hypotheses for PD2 Season 14** until verified against controlled observations; missing aura, charm, and special-skill modifiers are not silently assumed zero in claims of parity.
- PD2-specific Amazon A1 animation, WSM and EIAS: [RoofooEvazan/pd2-ias-calc](https://github.com/RoofooEvazan/pd2-ias-calc) pinned at `56025f2cae702074fdb226c5aabaaf2b88aa164b`; recovered `DATA.anim.AMA1BOW=[14,256,6]`, `AMA1XBW=[20,294,9]`, frame starts from `DATA.start`, `DATA.weapons` bow/crossbow speed modifiers and `Multiple Shot (id=12)` A1 mode. The 42 applicable bow/crossbow base records are frozen in `src/pd2-ranged-animations.js`. This is independently reverse-engineered **client** code, not a PD2 server guarantee.
- M2–M5 source graph, skill and stat projections: the original imported Armory JSON is never edited, and gear selections re-run all supported calculations.

## Calculation layers

`projectAmazonRangedAttack(payload,skills,build,bonus,{weaponSet,includeEquipment,excludedItemIds,baseAttackRatingOverride,skillSpeed})` returns:

1. Selected **right-hand ranged weapon** (main slot 4 or alternate 11), its resolved `item.damage.two_handed` and raw base code, effective Multiple Shot level and S14 skill damage/AR percentages.
2. Flat `min_damage`/`max_damage` and `maxdamage_percent` from **non-weapon** selected equipment (quivers, armor and jewelry). The weapon's own ED and flat damage modifiers are **not applied again**: its `damage.two_handed` is already resolved by the Armory API. Socketed child mods also never double-count.
3. Ranged Dexterity source contribution from M5, plus skill ED and off-weapon ED. Partial physical estimate: `floor((resolved weapon damage + flat off-weapon modifier) × (100 + selected Dexterity + skill ED + off-weapon ED) / 100)`. **This ignores non-weapon damage from charms, auras, missing active stats and special skill multipliers.** Not labeled final.
4. Flat equipment `tohit` and equipment `item_tohit_percent` contributions. **Base AR is not derivable with sufficient confidence from the raw snapshot.** Leave final/selected AR unknown unless the user supplies an *independently measured base AR before equipment*; then show an explicitly partial conditional estimate with selected skill AR%. Do not misrepresent that as screenshot parity.
5. Total selected `item_fasterattackrate` IAS and `EIAS = trunc(120 × IAS / (120 + IAS))`. For a supported bow/crossbow base and the selected skill's native A1 animation, `speed = clamp(100 + skillSpeed − weapon WSM + EIAS, 15,175)`; `rate = floor(animation speed × speed / 100)`; `frames = ceil((animation frames − animation start) × 256 / rate) − 1`. M6 defaults `skillSpeed=0`; it does not invent Fanaticism, slow, active mercenary auras or other buffs. The UI labels the frame result **sourced A1 model, not verified actual breakpoint UI**.

The browser's imported-build attack panel recomputes on every render from the currently selected snapshot, **each Build's independently selected hand set and item exclusions, manual +skills and hard points**. The optional observed base AR input is maintained separately per Build **for the session only**. Existing manual target combat scenario inputs remain manual; M6 does not feed partial source estimates into the independent hit/monster simulation automatically.

## First regression observations and known discrepancy

Magizon at the pinned published snapshot:
- Multiple Shot effective skill 21, +130% ED, +128% AR.
- Main Harmony Bow (Edge Bow base `8sb`): resolved weapon 39–104; Dexterity 60 from M5 equipped-only projection; non-weapon +4 minimum (amulet) / +10 maximum (quiver) and +42% ED (gloves/quiver) from currently selected gear.
- Under the **partial formula**, this yields **142–378 physical damage**, **not** the screenshot's **347–890**. The delta is tracked intentionally, not 'fixed' by fabricated buffs, item changes or a guessed multiplier. Screenshot state and exported data may not be the same moment. Both charm eligibility and additional damage/buff effects need verification.
- Base AR remains unavailable; flat gear AR from main gear is +43. An optional measured base 270 gives a conditional preview, not the screenshot's true total AR.
- Main gear IAS is 26%; animation timing uses WSM +5 for Edge Bow with PD2's Amazon A1 bow record. Alternate Hellcast (Heavy Crossbow `hxb`, WSM +10) has different IAS and animation, while the other gear remains shared.
- User screenshot depicts IAS **46** and **10 frames** in an in-game state; M6 uses only supported selected equipment and may differ. Missing inventory charm IAS, live states and screenshot timing must be investigated before parity claims.

## Exclusions, acceptance and follow-up

- All equipment defaults enabled; only main slots 4/5 or alternate slots 11/12 are active. Shared non-hand items stay active through weapon set changes. Individual exclusions and master-off recompute all M6 contributions and preserve raw source.
- Other ranged skills' physical conversions and skill-specific AR/animations are **not modeled** (e.g. Magic Arrow). Unsupported or absent ranged weapons return unavailable results, not invented zero damage.
- The model is limited to Amazon attacks with a verified **A1 bow/crossbow weapon base**. Other classes, 1h/2h melee, thrown javelins, Strafe sequence timing and attack-speed skills require their own verified model.
- Remaining unverified components: item requirements, inventory charm activation and benefits, +% Enhanced Damage from buffs/passives, conditional demon/undead ED, equipment AR base formula, PD2 exact damage order/rounding, active Fanaticism/slow, in-game skill binding, and explicit snapshot/screenshot synchronization.
- M7 covers the separate extended stats (8) catalog; M8 compares all three user-supplied screens field-by-field and creates targeted discrepancies for any remaining gaps.
