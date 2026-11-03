// PD2-specific ranged weapon speeds, pinned from RoofooEvazan/pd2-ias-calc
// @56025f2cae702074fdb226c5aabaaf2b88aa164b, index.html DATA.weapons.
const WEAPON_SPEEDS = {
  "sbw": {
    "wsm": 5,
    "animation": "bow",
    "name": "Short Bow"
  },
  "hbw": {
    "wsm": -10,
    "animation": "bow",
    "name": "Hunter's Bow"
  },
  "lbw": {
    "wsm": 0,
    "animation": "bow",
    "name": "Long Bow"
  },
  "cbw": {
    "wsm": -10,
    "animation": "bow",
    "name": "Composite Bow"
  },
  "sbb": {
    "wsm": 0,
    "animation": "bow",
    "name": "Short Battle Bow"
  },
  "lbb": {
    "wsm": 10,
    "animation": "bow",
    "name": "Long Battle Bow"
  },
  "swb": {
    "wsm": 0,
    "animation": "bow",
    "name": "Short War Bow"
  },
  "lwb": {
    "wsm": 10,
    "animation": "bow",
    "name": "Long War Bow"
  },
  "lxb": {
    "wsm": -10,
    "animation": "xbw",
    "name": "Light Crossbow"
  },
  "mxb": {
    "wsm": 0,
    "animation": "xbw",
    "name": "Crossbow"
  },
  "hxb": {
    "wsm": 10,
    "animation": "xbw",
    "name": "Heavy Crossbow"
  },
  "rxb": {
    "wsm": -40,
    "animation": "xbw",
    "name": "Repeating Crossbow"
  },
  "8sb": {
    "wsm": 5,
    "animation": "bow",
    "name": "Edge Bow"
  },
  "8hb": {
    "wsm": -10,
    "animation": "bow",
    "name": "Razor Bow"
  },
  "8lb": {
    "wsm": 0,
    "animation": "bow",
    "name": "Cedar Bow"
  },
  "8cb": {
    "wsm": -10,
    "animation": "bow",
    "name": "Double Bow"
  },
  "8s8": {
    "wsm": 0,
    "animation": "bow",
    "name": "Short Siege Bow"
  },
  "8l8": {
    "wsm": 10,
    "animation": "bow",
    "name": "Long Siege Bow"
  },
  "8sw": {
    "wsm": 0,
    "animation": "bow",
    "name": "Rune Bow"
  },
  "8lw": {
    "wsm": 10,
    "animation": "bow",
    "name": "Gothic Bow"
  },
  "8lx": {
    "wsm": -10,
    "animation": "xbw",
    "name": "Arbalest"
  },
  "8mx": {
    "wsm": 0,
    "animation": "xbw",
    "name": "Siege Crossbow"
  },
  "8hx": {
    "wsm": 10,
    "animation": "xbw",
    "name": "Balista"
  },
  "8rx": {
    "wsm": -60,
    "animation": "xbw",
    "name": "Chu-Ko-Nu"
  },
  "6sb": {
    "wsm": 5,
    "animation": "bow",
    "name": "Spider Bow"
  },
  "6hb": {
    "wsm": -10,
    "animation": "bow",
    "name": "Blade Bow"
  },
  "6lb": {
    "wsm": 0,
    "animation": "bow",
    "name": "Shadow Bow"
  },
  "6cb": {
    "wsm": -10,
    "animation": "bow",
    "name": "Great Bow"
  },
  "6s7": {
    "wsm": 0,
    "animation": "bow",
    "name": "Diamond Bow"
  },
  "6l7": {
    "wsm": 10,
    "animation": "bow",
    "name": "Crusader Bow"
  },
  "6sw": {
    "wsm": 0,
    "animation": "bow",
    "name": "Ward Bow"
  },
  "6lw": {
    "wsm": 10,
    "animation": "bow",
    "name": "Hydra Bow"
  },
  "6lx": {
    "wsm": -10,
    "animation": "xbw",
    "name": "Pellet Bow"
  },
  "6mx": {
    "wsm": 0,
    "animation": "xbw",
    "name": "Gorgon Crossbow"
  },
  "6hx": {
    "wsm": 10,
    "animation": "xbw",
    "name": "Colossus Crossbow"
  },
  "6rx": {
    "wsm": -60,
    "animation": "xbw",
    "name": "Demon Crossbow"
  },
  "am1": {
    "wsm": 0,
    "animation": "bow",
    "name": "Stag Bow"
  },
  "am2": {
    "wsm": 10,
    "animation": "bow",
    "name": "Reflex Bow"
  },
  "am6": {
    "wsm": 0,
    "animation": "bow",
    "name": "Ashwood Bow"
  },
  "am7": {
    "wsm": 10,
    "animation": "bow",
    "name": "Ceremonial Bow"
  },
  "amb": {
    "wsm": -10,
    "animation": "bow",
    "name": "Matriarchal Bow"
  },
  "amc": {
    "wsm": 10,
    "animation": "bow",
    "name": "Grand Matron Bow"
  }
};
export const pd2RangedWeaponSpeed = code => WEAPON_SPEEDS[code] || null;
export const PD2_AMAZON_RANGED_ANIM = Object.freeze({
  bow: { frames: 14, animSpeed: 256, start: 0 },
  xbw: { frames: 20, animSpeed: 294, start: 0 },
});
// DATA.anim.AMA1BOW/AMA1XBW and DATA.start[DATA.wcRow.bow/xbw][0].
