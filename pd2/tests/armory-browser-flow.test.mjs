import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const ui=readFileSync("src/amazon-sandbox.js","utf8");
test("static Pages Armory UI never attempts cross-origin fetch",()=>{
  assert.doesNotMatch(ui,/fetchArmoryCharacter\s*\(/);
  assert.match(ui,/window\.open\(armoryCharacterUrl\(name\)/);
  assert.match(ui,/data-armory-open/);
  assert.match(ui,/data-armory-json/);
  assert.match(ui,/data-armory-apply/);
  assert.match(ui,/data-armory-file/);
});
test("both pasted and local JSON routes use the existing validated importer",()=>{
  assert.match(ui,/applyArmoryPayload\(JSON\.parse\(armoryDraft\)\)/);
  assert.match(ui,/applyArmoryPayload\(JSON\.parse\(await file\.text\(\)\)\)/);
  assert.match(ui,/const imported = importArmoryAmazon\(payload,skills\)/);
});
