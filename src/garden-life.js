import * as THREE from 'three';

export function createPlanting(world, bloomGeometry, leafGeometry) {
  const root=new THREE.Group();root.name='Thought garden';world.add(root);
  const animations=[];
  const stemGeo=new THREE.CylinderGeometry(.035,.05,1,6);
  const stemMat=new THREE.MeshStandardMaterial({color:'#6d8950'});
  const leafMat=new THREE.MeshStandardMaterial({color:'#658556',side:THREE.DoubleSide});
  const flowers=['#eeb1b8','#9c9ed9','#edcb7e'].map(color=>new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.7}));
  const crownGeo=new THREE.IcosahedronGeometry(.55,1);
  function rebuild(entries,animateId){
    root.clear();animations.length=0;
    entries.forEach((entry,i)=>{
      const g=new THREE.Group();g.userData.noteId=entry.id;
      // A compact spiral on a dedicated lawn, clear of the pond and paths.
      const a=i*2.399,rad=.65+Math.sqrt(i)*.39;
      g.position.set(-6.5+Math.cos(a)*rad,0,9.4+Math.sin(a)*rad*.65);root.add(g);
      const tree=entry.plant==='tree',h=tree?1.4:.65+(i%3)*.17;
      const stem=new THREE.Mesh(stemGeo,stemMat);stem.scale.y=h;stem.position.y=h/2;g.add(stem);
      if(tree){
        for(let j=0;j<3;j++){const c=new THREE.Mesh(crownGeo,leafMat);c.position.set(Math.sin(j*2)*.24,h+j*.24,Math.cos(j*2)*.2);c.scale.set(.85,1.1,.85);g.add(c);}
      }else {
        const bloom=new THREE.Mesh(bloomGeometry,flowers[i%3]);bloom.position.y=h;bloom.scale.setScalar(.36);g.add(bloom);
        for(let j=0;j<2;j++){const l=new THREE.Mesh(leafGeometry,leafMat);l.position.set(j?-.12:.12,h*.5,0);l.scale.setScalar(.30);l.rotation.set(.6,j*3,1.1);g.add(l);}
      }
      if(entry.id===animateId){g.scale.set(.01,.01,.01);animations.push({g,start:performance.now()});}
    });
    document.getElementById('plant-count').textContent=String(entries.length);
  }
  function tick(now){for(let i=animations.length-1;i>=0;i--){const {g,start}=animations[i],t=Math.min(1,(now-start)/2200),s=1-Math.pow(1-t,3);g.scale.set(s,s,s);g.rotation.z=Math.sin(t*Math.PI*4)*(1-t)*.11;if(t===1)animations.splice(i,1);}}
  return {rebuild,tick};
}

const dailyNotes=[
  '不必急着成为一棵树。今天，先好好发芽。',
  '生活的意义，有时藏在认真喝完的一杯茶里。',
  '允许自己慢一点，花园也有自己的时间。',
  '不是每一种生长，都需要被别人看见。',
  '把今天的小小欢喜，留给未来的自己。',
  '风经过时，树没有答案，却有自己的方向。',
  '给暂时想不明白的事，留一小片空地。',
  '倾听一段旋律，也是在倾听此刻的自己。',
  '温柔并不微小。它让平凡的一天有了重量。',
  '能被照顾的，不只有花，也有你的心情。',
  '每一次重新开始，都算数。',
  '把注意力放回眼前，这里也有值得停留的风景。'
];
const prompts=['自由写下此刻的想法','今天，哪个小瞬间让你感到安定？','舒适是被找到的，还是被创造的？','一段旋律，让你想起了谁？','有什么想留给未来的自己？'];
export function renderThoughtJournal(target,api){
  const {getEntries,setEntries,persist,planting,toast,viewGarden,openHeart}=api;
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  const now=new Date(),day=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);
  const daily=node('aside','daily-note');daily.append(node('small','','DAILY NOTE · '+now.toLocaleDateString('zh-CN')));
  daily.append(node('blockquote','',dailyNotes[day%dailyNotes.length]),node('span','note-credit','Minds 花园手记 · 原创'));
  target.append(daily);
  target.append(node('div','journal-label','WRITE A LITTLE. GROW A LITTLE.'));
  const select=node('select','journal-select');select.setAttribute('aria-label','选择书写主题');
  prompts.forEach(t=>{const o=node('option','',t);o.value=t;select.append(o);});target.append(select);
  const textarea=node('textarea','journal-textarea');textarea.rows=4;textarea.maxLength=900;textarea.placeholder='此刻，想把什么种进花园里？';textarea.setAttribute('aria-label','我的想法');target.append(textarea);
  const picker=node('div','seed-picker');picker.setAttribute('role','group');picker.setAttribute('aria-label','选择种下的植物');
  let plant='flower';
  for(const [id,title] of [['flower','✿ 种一朵花'],['tree','♧ 种一棵树']]){
    const b=node('button','seed-choice',title);b.type='button';b.setAttribute('aria-pressed',String(id===plant));
    b.onclick=()=>{plant=id;picker.querySelectorAll('button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));};picker.append(b);
  }target.append(picker);
  const actions=node('div','journal-actions'),save=node('button','soft-button primary-action','保存并种下'),count=node('span','journal-counter','0 / 900');
  textarea.oninput=()=>count.textContent=textarea.value.length+' / 900';actions.append(save,count);target.append(actions);
  target.append(node('p','journal-privacy','笔记与植物仅保存在当前浏览器。可导出备份；最多保留 80 条，达到上限后请先导出或整理。'));
  const summary=node('div','journal-summary'),list=node('div','journal-list');target.append(summary,list);
  function redraw(){
    const entries=getEntries();summary.textContent='MY LITTLE GARDEN · '+entries.length+' 株心事';list.replaceChildren();
    if(!entries.length)list.append(node('p','journal-empty','第一粒种子，在等你。'));
    for(const entry of [...entries].reverse()){
      const card=node('article','journal-entry');card.append(node('small','',(entry.plant==='tree'?'♧':'✿')+' '+entry.date+' · '+entry.prompt),node('p','',entry.text));
      const remove=node('button','journal-remove','移除笔记与植物');remove.onclick=()=>{setEntries(getEntries().filter(e=>e.id!==entry.id));persist();planting.rebuild(getEntries());redraw();toast('已移除这条笔记和对应植物。');};card.append(remove);list.append(card);
    }
  }
  save.onclick=()=>{
    const text=textarea.value.trim();if(!text){toast('先写下一点想法，再种下它。');textarea.focus();return;}
    if(getEntries().length>=80){toast('花园已有 80 株心事，请先导出或整理笔记。');return;}
    const entry={id:Date.now()+'-'+Math.random().toString(36).slice(2,8),text,prompt:select.value,plant,date:new Date().toLocaleDateString('zh-CN')};
    setEntries([...getEntries(),entry]);const stored=persist();planting.rebuild(getEntries(),entry.id);
    textarea.value='';count.textContent='0 / 900';redraw();
    viewGarden();toast(stored===false?'植物已长出；浏览器未能保存，请导出笔记备份。':plant==='tree'?'你的想法，正在长成一棵树。':'写下的一句话，开成了一朵花。');
  };
  const footer=node('div','journal-actions'),view=node('button','soft-button','看看我的花园'),exp=node('button','soft-button','导出笔记'),heart=node('button','soft-button','进入树之心');
  view.onclick=viewGarden;heart.onclick=openHeart;
  exp.onclick=()=>{if(!getEntries().length){toast('写下第一条笔记后就可以导出。');return;}
    const contents=getEntries().map(e=>`${e.date} · ${e.prompt}\n${e.text}\n种下：${e.plant==='tree'?'树':'花'}`).join('\n\n────────\n\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+contents],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Minds-花园手记.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  footer.append(view,exp,heart);target.append(footer);redraw();
}

let pianoContext=null;
const voices=new Set();
const keymap=['a','w','s','e','d','f','t','g','y','h','u','j','k'];
export function stopPiano(){voices.forEach(v=>v.release());document.querySelectorAll('.piano-key').forEach(k=>k.classList.remove('pressed'));}
function strike(midi){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;
  if(!pianoContext)pianoContext=new Audio();pianoContext.resume().catch(()=>{});
  const now=pianoContext.currentTime,env=pianoContext.createGain();env.connect(pianoContext.destination);
  env.gain.setValueAtTime(.0001,now);env.gain.exponentialRampToValueAtTime(.19,now+.012);env.gain.exponentialRampToValueAtTime(.065,now+.35);env.gain.exponentialRampToValueAtTime(.0001,now+3.5);
  const oscillators=[];
  for(const [multiple,level] of [[1,1],[2,.28],[3,.08],[4,.035]]){
    const osc=pianoContext.createOscillator(),gain=pianoContext.createGain();osc.type='sine';osc.frequency.value=440*Math.pow(2,(midi-69)/12)*multiple;gain.gain.value=level;osc.connect(gain);gain.connect(env);osc.start(now);osc.stop(now+4);osc.onended=()=>{osc.disconnect();gain.disconnect();};oscillators.push(osc);
  }
  let released=false;
  const voice={release(){if(released)return;released=true;const t=pianoContext.currentTime;env.gain.cancelAndHoldAtTime(t);env.gain.setTargetAtTime(.0001,t,.13);setTimeout(()=>{oscillators.forEach(o=>{try{o.stop();}catch{}});env.disconnect();voices.delete(voice);},650);}};
  voices.add(voice);setTimeout(()=>voice.release(),3600);return voice;
}
export function renderPiano(target,toast){
  const wrap=document.createElement('section');wrap.className='piano-section';
  wrap.innerHTML='<div class="piano-heading"><span>THE LITTLE PIANO</span><span>01 OCTAVE</span></div><h3>让心情，有自己的旋律。</h3><p class="piano-hint">点击琴键，或用键盘 A–K 弹奏 · 支持和弦</p><div class="piano" role="group" aria-label="互动钢琴"></div><div class="piano-readout" aria-live="polite">C major · 从一个音符开始</div>';
  const piano=wrap.querySelector('.piano'),readout=wrap.querySelector('.piano-readout');
  const labels=['C4','C♯4','D4','D♯4','E4','F4','F♯4','G4','G♯4','A4','A♯4','B4','C5'];
  const black=new Set([1,3,6,8,10]),held=new Map();let whiteIndex=0;
  const down=(i)=>{if(held.has(i))return;const voice=strike(60+i);if(!voice){toast('当前浏览器不支持音频。');return;}held.set(i,voice);piano.querySelector(`[data-note="${i}"]`).classList.add('pressed');readout.textContent=labels[i]+' · '+Math.round(440*Math.pow(2,(60+i-69)/12))+' Hz';};
  const up=(i)=>{held.get(i)?.release();held.delete(i);piano.querySelector(`[data-note="${i}"]`)?.classList.remove('pressed');};
  labels.forEach((label,i)=>{
    const b=document.createElement('button');b.type='button';b.className='piano-key '+(black.has(i)?'black-key':'white-key');b.dataset.note=i;b.setAttribute('aria-label','弹奏 '+label);
    if(black.has(i))b.style.left=`calc(${whiteIndex*12.5}% - 3.8%)`;else whiteIndex++;
    b.innerHTML=`<span>${label.replace('4','').replace('5','')}</span><kbd>${keymap[i].toUpperCase()}</kbd>`;
    b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);down(i);};b.onpointerup=()=>up(i);b.onpointercancel=()=>up(i);b.onlostpointercapture=()=>up(i);
    b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();down(i);}};b.onkeyup=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();up(i);}};piano.append(b);
  });
  const abort=new AbortController();
  const onKey=(e,pressed)=>{if(e.target.closest('textarea,input,select')||e.ctrlKey||e.metaKey||e.altKey)return;const i=keymap.indexOf(e.key.toLowerCase());if(i<0)return;e.preventDefault();pressed?down(i):up(i);};
  window.addEventListener('keydown',e=>onKey(e,true),{signal:abort.signal});window.addEventListener('keyup',e=>onKey(e,false),{signal:abort.signal});window.addEventListener('blur',()=>[...held.keys()].forEach(up),{signal:abort.signal});
  target.append(wrap);
  return ()=>{abort.abort();[...held.keys()].forEach(up);stopPiano();};
}
