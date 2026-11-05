import * as THREE from 'three';
import { dailyThought } from './experiences.js';
const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text)n.textContent=text;return n;};

export function createImmersion(api){
 const layer=el('div','room-interactions'),caption=el('div','room-caption'),controls=el('div','room-footer');
 const back=el('button','room-back','← Garden'),help=el('span','room-help'),prev=el('button','room-back','← Previous blooms'),next=el('button','room-back','More blooms →');
 back.onclick=api.leave;prev.onclick=()=>{page--;refreshFlowers();};next.onclick=()=>{page++;refreshFlowers();};controls.append(back,help,prev,next);document.getElementById('app').append(layer,caption,controls);
 let kind='',anchors=[],page=0,entries=[];
 const dialog=el('dialog','story-dialog');document.body.append(dialog);
 function story(title,text,sub='',extra){dialog.replaceChildren();const close=el('button','story-close','×');close.setAttribute('aria-label','Close story');close.onclick=()=>dialog.close();dialog.append(close,el('small','story-kicker',sub),el('h2','',title),el('p','story-copy',text));if(extra)dialog.append(extra);dialog.showModal();}
 function add(label,pos,action,cls=''){const b=el('button','room-object '+cls,label);b.onclick=action;layer.append(b);anchors.push({b,p:new THREE.Vector3(...pos)});return b;}
 function refreshFlowers(){
  entries=api.entries();page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(entries.length/9)-1)));layer.replaceChildren();anchors=[];
  const shown=entries.slice(page*9,page*9+9);api.rooms.flowers(shown);
  shown.forEach((entry,i)=>{const pos=api.rooms.flowerPosition(i);add('Bloom '+(page*9+i+1),[pos.x,pos.y+.35,pos.z],()=>story('A thought in bloom',entry.text,entry.date),'flower-label');});
  help.textContent=entries.length?`${entries.length} thoughts in bloom · select a flower to read`:'Your first flower begins with a thought.';
  prev.hidden=page===0;next.hidden=(page+1)*9>=entries.length;
  const write=el('button','room-back','Plant a thought ↗');write.onclick=()=>api.navigate('philosophy');caption.replaceChildren(el('small','','THE GLASSHOUSE'),el('h1','','A garden of things you felt.'),write);
 }
 function enter(value){kind=value;layer.replaceChildren();anchors=[];caption.replaceChildren();prev.hidden=next.hidden=true;document.body.classList.add('immersive-room','room-idle');document.body.classList.remove('room-tool-open');document.body.dataset.tool='';
  if(kind==='greenhouse'){page=Math.max(0,Math.ceil(api.entries().length/9)-1);refreshFlowers();return;}
  caption.append(el('small','',kind==='sound'?'THE RESONANCE HALL':'THE WRITER’S COTTAGE'),el('h1','',kind==='sound'?'Let the room listen.':'Make space for a thought.'));
  help.textContent=kind==='sound'?'Touch the piano to play · the score to listen':'Touch the pen to write · the frame for today’s thought';
  if(kind==='sound'){
   add('Play & compose',[-.05,1.55,-.65],()=>api.openTool('piano'),'piano-label');
   add('Listen to a melody',[2.9,2.2,-2.7],()=>api.openTool('listen'));
  }else{
   add('Pick up the pen',[.75,2.12,-.8],()=>api.openTool('write'),'pen-label');
   add('Today’s thought',[1.12,2.7,-3.6],()=>story('Today’s thought',dailyThought(),'DAILY THOUGHT · '+new Date().toLocaleDateString('en-GB')),'quote-label');
   add('Your planted thoughts',[3.5,2,-3],()=>api.navigate('greenhouse'));
  }
 }
 function project(camera){for(const {b,p} of anchors){const q=p.clone().project(camera);b.style.left=(q.x*.5+.5)*innerWidth+'px';b.style.top=(-q.y*.5+.5)*innerHeight+'px';b.hidden=q.z>1||Math.abs(q.x)>1||Math.abs(q.y)>1;}}
 function leave(){kind='';layer.replaceChildren();document.body.classList.remove('immersive-room','room-idle','room-tool-open');}
 function showFood(option){const extra=el('div','recipe-note');extra.append(el('h3','','In the kitchen'),el('p','',option.recipe||option.desc));const view=el('button','soft-button primary-action','See this dish on the table');view.onclick=()=>{dialog.close();api.viewTable();};extra.append(view);story(option.title,option.fact,option.category||'THE FLAVOR GARDEN',extra);}
 function highlight(index){anchors.forEach(({b},i)=>b.classList.toggle('object-hover',i===index));}
 return {enter,leave,project,showFood,highlight,activate:index=>anchors[index]?.b.click()};
}
