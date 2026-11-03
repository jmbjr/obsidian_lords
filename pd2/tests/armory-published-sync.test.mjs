import test from "node:test";
import assert from "node:assert/strict";
import { validCharacterName, publicArmoryPath, syncArmoryCharacter } from "../scripts/sync-armory-character.mjs";
import { validArmoryName, publishedArmoryUrl, loadPublishedArmoryCharacter } from "../../src/pd2-armory.js";

const sample={character:{name:"Magizon",class:{id:0},level:67,skills:[]},items:[]};
const published={...sample,_obsidianLordsSync:{character:"Magizon",syncedAt:"2026-11-02T12:00:00.000Z",source:"https://api.projectdiablo2.com/game/character/Magizon"}};

test("name validation keeps cache paths in approved directory",()=>{
  assert.ok(validCharacterName("Magizon")&&validArmoryName("Magizon"));
  assert.equal(publicArmoryPath("MAGIZON"),"public/armory/magizon.json");
  assert.equal(publishedArmoryUrl("Magizon","/obsidian_lords/"),"/obsidian_lords/armory/magizon.json");
  for(const name of ["../secret","a/b","x","-bad","a%2Fb","hello space"]){
    assert.equal(validCharacterName(name),false);
    assert.throws(()=>publicArmoryPath(name));
    assert.throws(()=>publishedArmoryUrl(name,"/obsidian_lords/"));
  }
});

test("server-side sync fetches official JSON and saves public snapshot with timestamp",async()=>{
  let saved=null,request=null;
  const r=await syncArmoryCharacter("Magizon",{
    fetchImpl:async(url,opts)=>{
      request={url,opts};
      return {ok:true,headers:{get:()=>"application/json; charset=utf-8"},text:async()=>JSON.stringify(sample)};
    },
    now:()=> "2026-11-02T12:00:00.000Z",
    makeDirectory:async()=>{},
    save:async(path,data)=>{saved={path,payload:JSON.parse(data)};},
  });
  assert.equal(request.url,"https://api.projectdiablo2.com/game/character/Magizon");
  assert.equal(request.opts.method,"GET");
  assert.equal(r.path,"public/armory/magizon.json");
  assert.equal(saved.path,r.path);
  assert.equal(saved.payload._obsidianLordsSync.syncedAt,"2026-11-02T12:00:00.000Z");
  assert.equal(saved.payload.character.name,"Magizon");
});

test("rejects mismatched and failed upstream responses without writing",async()=>{
  let wrote=false;
  const opts={
    makeDirectory:async()=>{},
    save:async()=>{wrote=true;},
    fetchImpl:async()=>({ok:true,headers:{get:()=>"application/json"},text:async()=>JSON.stringify({...sample,character:{name:"Other"}})}),
  };
  await assert.rejects(()=>syncArmoryCharacter("Magizon",opts),/different character/);
  assert.equal(wrote,false);
  await assert.rejects(()=>syncArmoryCharacter("Magizon",{...opts,fetchImpl:async()=>({ok:false,status:403})}),/403/);
});

test("browser loads from same-origin published cache, not official PD2 origin",async()=>{
  let received;
  const result=await loadPublishedArmoryCharacter("Magizon","/obsidian_lords/",async(url,options)=>{
    received={url,options};return {ok:true,json:async()=>published};
  });
  assert.equal(result.character.name,"Magizon");
  assert.match(received.url,/^\/obsidian_lords\/armory\/magizon\.json\?v=\d+$/);
  assert.equal(received.options.cache,"no-store");
  await assert.rejects(()=>loadPublishedArmoryCharacter("Magizon","/obsidian_lords/",async()=>({ok:false,status:404})),/Run the GitHub sync workflow/);
  await assert.rejects(()=>loadPublishedArmoryCharacter("Magizon","/obsidian_lords/",async()=>({ok:true,json:async()=>({...published,_obsidianLordsSync:{...published._obsidianLordsSync,character:"Other"}})})),/invalid identity/);
});
