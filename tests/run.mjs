import puppeteer from 'puppeteer-core';
import fs from 'fs';
const out='/tmp/shots64';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars']});
let fails=[];
const check=(name,ok,extra='')=>{console.log((ok?'PASS':'FAIL')+' '+name+(extra?' — '+extra:''));if(!ok)fails.push(name);};
for(const v of [{name:'desktop',w:1440,h:900},{name:'mobile',w:390,h:844}]){
 for(const theme of ['light','dark']){
  const page=await browser.newPage();
  await page.setViewport({width:v.w,height:v.h,deviceScaleFactor:1});
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.evaluateOnNewDocument(t=>{localStorage.setItem('theme',t);if(!sessionStorage.getItem('keep'))localStorage.removeItem('bac-taught');},theme);
  await page.goto('http://localhost:8064',{waitUntil:'networkidle2'});
  const S=async t=>page.evaluate(x=>window._test.send(x),t);
  check(`${v.name}/${theme} greeting`,/hello/i.test(await S('hello there')));
  check(`${v.name}/${theme} name set`,/Nice to meet you, Akash/.test(await S('my name is akash')));
  check(`${v.name}/${theme} name recalled`,/You are Akash/.test(await S('what is my name')));
  check(`${v.name}/${theme} math`,/128 \* 46 = 5888/.test(await S('what is 128 * 46')));
  check(`${v.name}/${theme} math precedence`,/= 84/.test(await S('12 * (3 + 4)')));
  check(`${v.name}/${theme} capabilities`,/do math/i.test(await S('what can you do')));
  check(`${v.name}/${theme} joke`,(await S('tell me a joke')).length>20);
  check(`${v.name}/${theme} coin`,/heads|tails/.test(await S('flip a coin')));
  check(`${v.name}/${theme} dice`,/die shows [1-6]/.test(await S('roll a die')));
  check(`${v.name}/${theme} time`,/device clock/.test(await S('what time is it')));
  check(`${v.name}/${theme} honest weather limit`,/cannot see live weather/.test(await S('what is the weather')));
  check(`${v.name}/${theme} unknown falls back to teach hint`,/teach me/i.test(await S('what is the airspeed of a swallow')));
  // teaching via panel logic + persistence
  await page.evaluate(()=>window._test.teach('what is the wifi password','On the fridge magnet.'));
  check(`${v.name}/${theme} taught reply works`,/fridge magnet/.test(await S('hey, what is the wifi password?')));
  await page.evaluate(()=>sessionStorage.setItem('keep','1'));
  await page.reload({waitUntil:'networkidle2'});
  const r2=await page.evaluate(x=>window._test.send(x),'what is the wifi password');
  check(`${v.name}/${theme} taught pair persists`,/fridge magnet/.test(r2));
  // inline teach syntax
  check(`${v.name}/${theme} inline teach`,/Learned/.test(await S('teach: when i say "ping" you say "pong"')));
  check(`${v.name}/${theme} inline taught reply`,/^pong$/.test(await S('ping')));
  // UI: send via form renders bubbles
  await page.type('#chatInput','hello');
  await page.keyboard.press('Enter');
  await new Promise(s=>setTimeout(s,900));
  const logTxt=await page.$eval('#chatLog',e=>e.textContent);
  check(`${v.name}/${theme} chat bubbles render`,/You/.test(logTxt)&&/Bot/.test(logTxt));
  // suggestions present
  const sugCount=await page.$$eval('#suggestions .sug',e=>e.length);
  check(`${v.name}/${theme} suggestions shown`,sugCount>=5,sugCount+' suggestions');
  await page.evaluate(()=>document.getElementById('chat').scrollIntoView({block:'start'}));
  await new Promise(s=>setTimeout(s,250));
  await page.screenshot({path:`${out}/chat-${v.name}-${theme}.png`});
  await page.evaluate(()=>document.getElementById('brain').scrollIntoView({block:'start'}));
  await new Promise(s=>setTimeout(s,250));
  await page.screenshot({path:`${out}/brain-${v.name}-${theme}.png`});
  check(`${v.name}/${theme} no console errors`,errs.length===0,errs.slice(0,3).join('|'));
  await page.close();
 }
}
await browser.close();
if(fails.length){console.log('\nFAILURES: '+fails.join(', '));process.exit(1);}
console.log('\nALL PASS');
