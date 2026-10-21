/* Browser AI Chatbot - intent engine, context, teaching mode. 100% on-device. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const ctx={name:null,lastIntent:null};

function norm(s){return s.toLowerCase().replace(/[^a-z0-9' ]/g,' ').replace(/\s+/g,' ').trim();}
function kwScore(text,words){const n=' '+norm(text)+' ';let sc=0;for(const w of words){if(n.includes(' '+w+' ')||n.includes(' '+w))sc+=w.split(' ').length*2;}return sc;}

const INTENTS=[
 {id:'greeting',words:['hello','hi','hey','good morning','good evening','namaste'],
  reply:()=>ctx.name?`Hello ${ctx.name}! What can I do for you?`:'Hello! What can I do for you? (Tell me "my name is ..." and I will remember it this session.)'},
 {id:'howareyou',words:['how are you','how do you feel','are you ok'],
  reply:()=>"Running at full speed - which is easy when everything happens on your device. How are you?"},
 {id:'name-set',words:[],match:t=>/my name is ([a-z]{2,20})/i.test(t),
  reply:t=>{ctx.name=t.match(/my name is ([a-z]{2,20})/i)[1];ctx.name=ctx.name[0].toUpperCase()+ctx.name.slice(1);return `Nice to meet you, ${ctx.name}. I will remember your name while this page is open.`;}},
 {id:'name-get',words:['what is my name','who am i','remember my name','do you know my name'],
  reply:()=>ctx.name?`You are ${ctx.name}.`:"You have not told me yet. Say 'my name is ...' and I will remember it."},
 {id:'capabilities',words:['what can you do','help','abilities','features','what do you do'],
  reply:()=>"I can chat about everyday things, do math ('what is 128 * 46'), tell the time and date, remember your name this session, flip a coin, roll a die, and learn new answers when you teach me. Everything runs in your browser."},
 {id:'math',words:[],match:t=>/^[\d\s+\-*/().^%x]+[=]?$/.test(t.replace(/what is|calculate|compute|equals|\?/gi,'').trim())&&/\d/.test(t)&&/[+\-*/^%x]/.test(t),
  reply:t=>{const expr=t.replace(/what is|calculate|compute|equals|\?/gi,'').replace(/x/gi,'*').replace(/\^/g,'**').trim();
    try{const v=Function('"use strict";return ('+expr+')')();
      if(typeof v!=='number'||!isFinite(v))return 'That does not compute to a number.';
      return `${expr} = ${Math.round(v*1e6)/1e6}`;}catch(e){return 'I could not parse that math - try something like 12 * (3 + 4).';}}},
 {id:'time',words:['what time','current time','time now','tell me the time'],
  reply:()=>`It is ${new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} on your device clock.`},
 {id:'date',words:['what date','today date','what day is it','day today','what is today'],
  reply:()=>`Today is ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}.`},
 {id:'coin',words:['flip a coin','coin flip','heads or tails'],
  reply:()=>`I flipped a coin: ${Math.random()<0.5?'heads':'tails'}.`},
 {id:'dice',words:['roll a die','roll a dice','dice roll','roll d6'],
  reply:()=>`The die shows ${1+Math.floor(Math.random()*6)}.`},
 {id:'joke',words:['tell me a joke','joke','make me laugh','something funny'],
  reply:()=>{const j=["I would tell you a UDP joke, but you might not get it.","There are only 10 kinds of people: those who understand binary and those who do not.","A SQL query walks into a bar and asks two tables: can I join you?","Why do programmers prefer dark mode? Because light attracts bugs."];return j[Math.floor(Math.random()*j.length)];}},
 {id:'weather',words:['weather','raining','sunny outside','temperature outside'],
  reply:()=>"I run fully offline, so I cannot see live weather. For a forecast, check your weather app - I am honest about my limits."},
 {id:'who-made',words:['who made you','who built you','who created you','your creator'],
  reply:()=>"I was built by Akash Vishwakarma as a demo of how much a plain web page can do without a server."},
 {id:'thanks',words:['thank you','thanks','thankyou','thx'],
  reply:()=>"You're welcome!"},
 {id:'bye',words:['goodbye','bye','see you','good night'],
  reply:()=>ctx.name?`Goodbye, ${ctx.name}! I will be here when you come back.`:"Goodbye! I will be here when you come back."},
 {id:'about',words:['what are you','are you ai','are you a robot','are you human','are you an llm'],
  reply:()=>"I am a pattern-matching chatbot written in plain JavaScript, running entirely in your browser. Not a large language model - I answer what I was taught, and I say so when I do not know something."}
];

const FALLBACKS=["I do not know that one yet. Teach me: use the 'Teach me' panel below, or type teach: when I say \"...\" you say \"...\".",
 "That is outside my current brain. You can teach me the answer below.",
 "I am a pattern matcher, not a mind reader - but you can teach me this one."];

let taught=[];
function loadTaught(){try{taught=JSON.parse(localStorage.getItem('bac-taught')||'[]');}catch(e){taught=[];}}
function saveTaught(){localStorage.setItem('bac-taught',JSON.stringify(taught));}

function reply(text){
  const t=text.trim();
  // teach inline
  const tm=t.match(/^teach[:\s]+when i say ["“]?(.+?)["”]? you say ["“]?(.+?)["”]?$/i);
  if(tm){taught.push({q:tm[1].trim().toLowerCase(),a:tm[2].trim()});saveTaught();renderBrain();return `Learned. When you say "${tm[1].trim()}", I will reply "${tm[2].trim()}".`;}
  // taught pairs: exact-ish match (contains)
  const n=norm(t);
  for(const p of taught){if(n.includes(norm(p.q)))return p.a;}
  // intent scoring
  let best=null,bestSc=0;
  for(const it of INTENTS){
    if(it.match&&it.match(t)){best=it;bestSc=99;break;}
    const sc=kwScore(t,it.words);
    if(sc>bestSc){bestSc=sc;best=it;}
  }
  if(best&&bestSc>=2){ctx.lastIntent=best.id;return best.reply(t);}
  return FALLBACKS[n.length%FALLBACKS.length];
}

const SUGGESTIONS=['what can you do','my name is Akash','what is 128 * 46','tell me a joke','flip a coin','what time is it'];
function addMsg(who,text){
  const log=$('#chatLog');
  const el=document.createElement('div');
  el.className='card card-pad-sm '+(who==='me'?'':'');
  el.style.cssText=who==='me'?'background:var(--accent);color:var(--accent-ink);margin-left:48px':'margin-right:48px';
  el.innerHTML=`<div class="small" style="opacity:.7">${who==='me'?'You':'Bot'}</div><div>${esc(text)}</div>`;
  log.appendChild(el);log.scrollTop=log.scrollHeight;
}
function send(text){
  if(!text.trim())return;
  addMsg('me',text);
  const typing=document.createElement('div');typing.className='small muted';typing.id='typing';typing.textContent='typing...';
  $('#chatLog').appendChild(typing);
  setTimeout(()=>{typing.remove();addMsg('bot',reply(text));},280+Math.random()*300);
}
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();const v=$('#chatInput').value;$('#chatInput').value='';send(v);});
function renderSug(){$('#suggestions').innerHTML=SUGGESTIONS.map(s=>`<button class="chip sug" style="cursor:pointer;border:1px solid var(--border)">${s}</button>`).join('');}
document.addEventListener('click',e=>{const b=e.target.closest('.sug');if(b)send(b.textContent);});

function renderBrain(){
  const items=INTENTS.filter(i=>i.words.length).map(i=>({label:i.id,taught:false}))
    .concat(taught.map(t=>({label:`"${t.q}"`,taught:true,a:t.a})));
  $('#intentList').innerHTML=items.map(x=>`<div class="row spread"><span class="chip ${x.taught?'chip-ok':'chip-accent'}">${esc(x.label)}</span>${x.taught?'<span class="small muted">taught</span>':''}</div>`).join('');
}
$('#btnTeach').addEventListener('click',()=>{
  const q=$('#teachQ').value.trim(),a=$('#teachA').value.trim();
  if(!q||!a){toast('Fill both sides of the pair.');return;}
  taught.push({q:q.toLowerCase(),a});saveTaught();$('#teachQ').value='';$('#teachA').value='';renderBrain();toast('Added to my brain');
});
$('#btnForget').addEventListener('click',()=>{taught=[];saveTaught();renderBrain();toast('Taught pairs forgotten');});
$('#btnClearChat').addEventListener('click',()=>{$('#chatLog').innerHTML='';addMsg('bot','Fresh chat. What can I do for you?');});

loadTaught();renderBrain();renderSug();
addMsg('bot',"Hi! I run entirely in your browser - no server, no API key. Try one of the suggestions, or teach me something new.");

window._test={send:t=>reply(t),teach:(q,a)=>{taught.push({q:q.toLowerCase(),a});saveTaught();},taught:()=>taught.length,ctx:()=>({...ctx}),clearTaught:()=>{taught=[];saveTaught();}};
})();
