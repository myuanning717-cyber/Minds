import * as THREE from 'three';
export function softClouds(world){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');
 let seed=517;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let n=0;n<110;n++){const x=60+r()*390,y=140-r()*65,rx=20+r()*55;const g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,'rgba(255,255,255,.10)');g.addColorStop(.5,'rgba(250,251,251,.055)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.ellipse(x,y,rx,rx*.73,0,0,7);c.fill();}
 const texture=new THREE.CanvasTexture(canvas),clouds=[];
 for(let i=0;i<8;i++){const g=new THREE.Group();g.position.set(-65+i*18,20+i%3*3,-35-i%3*7);g.userData.speed=.15+i%3*.09;for(let j=0;j<2;j++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:j?'#ffffff':'#c7d3d7',transparent:true,opacity:.8,depthWrite:false}));s.scale.set(20+i%3*4,9,1);s.position.set(j*2,j*.8,0);g.add(s);}world.add(g);clouds.push(g);}return clouds;
}
export function createWeather(world,clouds,sun,ambience,sky,register){
 let mode='clear',night=false;try{mode=localStorage.getItem('minds-weather')||'clear';}catch{}
 const modes=['clear','overcast','rain','mist','snow'],icons=['☀','☁','☂','≋','❄'],names=['Clear skies','Cloudy','Rain','Mist','Snow'];
 if(!modes.includes(mode))mode='clear';
 const tray=document.createElement('div');tray.className='weather-icons';tray.setAttribute('role','group');tray.setAttribute('aria-label','Choose weather');
 const pin=new THREE.Group();pin.position.set(-.6,0,9.4);world.add(pin);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.075,.11,4.2,10),new THREE.MeshStandardMaterial({color:'#936b44'}));pole.position.y=2.1;pin.add(pole);
 const rotor=new THREE.Group();rotor.position.y=4.2;pin.add(rotor);
 const colors=['#d86f65','#e4af4b','#89a768','#69a5ac','#8d81b4','#d18eab'];
 for(let i=0;i<6;i++){const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1.35,.15,.06,.7,.87,.18,.28,.43,-.09],3));blade.setIndex([0,1,2,0,2,3]);blade.computeVertexNormals();const mesh=new THREE.Mesh(blade,new THREE.MeshStandardMaterial({color:colors[i],side:THREE.DoubleSide,roughness:.55}));mesh.rotation.z=i*Math.PI/3;rotor.add(mesh);register(mesh,'weather');}
 const hub=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),new THREE.MeshStandardMaterial({color:'#f7e5a8',metalness:.4}));hub.position.z=.18;rotor.add(hub);register(hub,'weather');
 document.getElementById('app').append(tray);
 const status=document.createElement('span');status.className='sr-only';status.setAttribute('aria-live','polite');tray.append(status);
 function choose(value){mode=value;try{localStorage.setItem('minds-weather',mode);}catch{}apply();sync();}
 function sync(){const index=modes.indexOf(mode);status.textContent=names[index];tray.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(modes[i]===mode)));}
 function cycle(){tray.classList.toggle('visible');}
 document.addEventListener('keydown',e=>{if(e.key==='Escape')tray.classList.remove('visible');});
 modes.forEach((value,i)=>{const b=document.createElement('button');b.textContent=icons[i];b.title=names[i];b.setAttribute('aria-label',names[i]);b.onclick=()=>{choose(value);tray.classList.remove('visible');};tray.append(b);});sync();
 const positions=new Float32Array(1400*3);for(let i=0;i<1400;i++){positions[i*3]=(Math.random()-.5)*70;positions[i*3+1]=Math.random()*30;positions[i*3+2]=(Math.random()-.5)*50;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));const material=new THREE.PointsMaterial({color:'#e4eff4',size:.09,transparent:true,opacity:.65,depthWrite:false});const particles=new THREE.Points(geo,material);world.add(particles);
 function apply(isNight=night){night=isNight;particles.visible=mode==='rain'||mode==='snow';material.size=mode==='snow'?.12:.045;world.background=night?new THREE.Color('#17253b'):mode==='clear'?sky:new THREE.Color({overcast:'#a4b5bb',rain:'#7b929b',mist:'#d1dbd1',snow:'#becdd5'}[mode]);world.fog.density=mode==='mist'?.032:mode==='rain'?.014:.008;world.fog.color.set(night?'#26364c':mode==='clear'?'#c7d4c5':'#acbdbe');sun.intensity=night?.55:mode==='clear'?2.5:1.0;ambience.intensity=night?.78:1.8;clouds.forEach(g=>g.children.forEach(s=>{s.material.opacity=night?.16:mode==='overcast'||mode==='rain'?.98:.65;s.material.color.set(mode==='rain'?'#8c9fa8':'#ffffff');}));}
 return {apply,cycle,project(camera,hidden){if(hidden){tray.classList.remove('visible');return;}const v=new THREE.Vector3(-.6,5.8,9.4).project(camera);if(v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1)tray.classList.remove('visible');tray.style.left=Math.min(innerWidth-230,Math.max(10,(v.x*.5+.5)*innerWidth-110))+'px';tray.style.top=Math.min(innerHeight-70,(-v.y*.5+.5)*innerHeight+22)+'px';},tick(dt,t){rotor.rotation.z-=dt*(mode==='rain'?1.8:.65);if(!particles.visible)return;for(let i=0;i<positions.length;i+=3){positions[i+1]-=dt*(mode==='snow'?.8:12);if(mode==='snow')positions[i]+=Math.sin(t+i)*dt*.15;if(positions[i+1]<0)positions[i+1]=30;}geo.attributes.position.needsUpdate=true;}};
}
