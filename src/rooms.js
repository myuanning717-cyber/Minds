import * as THREE from 'three';
import gardenView from '../public/brand/cover-1200x630.jpg?inline';
import { dailyThought } from './experiences.js';

// Furniture and architectural details are native geometry; no remote assets needed.
export function createRooms(garden){
 const rooms={};
 const landscape=new THREE.TextureLoader().load(gardenView);landscape.colorSpace=THREE.SRGBColorSpace;
 const viewMaterial=new THREE.MeshBasicMaterial({map:landscape,color:'#f5f4e8'});
 // The music window looks out from the music building towards the kapok.
 const windowTarget=new THREE.WebGLRenderTarget(384,384);
 const windowCamera=new THREE.PerspectiveCamera(46,1,.1,180);
 windowCamera.position.set(-11.3,2.2,-3.5);
 windowCamera.lookAt(-5.2,3.1,.15);
 const liveGlass=new THREE.MeshBasicMaterial({map:windowTarget.texture});
 let lastWindowRender=-Infinity;
 const glasshouseView=new THREE.PerspectiveCamera(67,1,.1,200);
 glasshouseView.position.set(16.6,1.9,-4.4);
 glasshouseView.lookAt(-5.2,2.6,.15);
 function refreshWindow(renderer){
   const now=performance.now();
   if(now-lastWindowRender<120)return;
   const previous=renderer.getRenderTarget();
   renderer.setRenderTarget(windowTarget);
   try{renderer.render(garden,windowCamera);}finally{renderer.setRenderTarget(previous);}
   lastWindowRender=now;
 }
 function gardenWindow(geometry){geometry.computeBoundingBox();const bounds=geometry.boundingBox,uv=geometry.attributes.uv,pos=geometry.attributes.position;for(let i=0;i<pos.count;i++)uv.setXY(i,.48+.49*(pos.getX(i)-bounds.min.x)/(bounds.max.x-bounds.min.x),.06+.86*(pos.getY(i)-bounds.min.y)/(bounds.max.y-bounds.min.y));return geometry;}

 for(const kind of ['sound','philosophy']){
  const music=kind==='sound',scene=new THREE.Scene();scene.background=new THREE.Color('#b6c1ba');
  scene.add(new THREE.HemisphereLight('#fff5df','#776b59',2));
  const sun=new THREE.DirectionalLight('#fff1d6',2.6);sun.position.set(-3,8,6);scene.add(sun);
  const mat=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const ivory=mat('#e9dfc7'),trim=mat('#f6ecd9'),wood=mat('#604334'),dark=mat('#242d2a',.28),gold=mat('#b29558',.35,.55),sage=mat(music?'#89998f':'#687f71'),velvet=mat(music?'#526f68':'#82604b'),glass=mat('#b6cdd0');
  const mesh=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);scene.add(o);return o;};
  const box=(w,h,d,m,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);
  const cyl=(r1,r2,h,m,x,y,z)=>mesh(new THREE.CylinderGeometry(r1,r2,h,20),m,x,y,z);
  const ball=(r,m,x,y,z,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,16,12),m,x,y,z);o.scale.set(sx,sy,sz);return o;};
  const frame=(x,y,z,w,h,m=trim)=>{box(w,.045,.07,m,x,y-h/2,z);box(w,.045,.07,m,x,y+h/2,z);for(const dx of [-w/2,w/2])box(.045,h,.07,m,x+dx,y,z);};
  const leg=(x,z,h=1.25)=>{cyl(.065,.10,h,wood,x,h/2+.2,z);for(const y of [.27,h*.65,h+.12])ball(.105,wood,x,y,z,1,.65,1);};
  box(10,.28,8,wood,0,0,0);
  const floorCanvas=document.createElement('canvas');floorCanvas.width=512;floorCanvas.height=512;const fc=floorCanvas.getContext('2d');fc.fillStyle='#997758';fc.fillRect(0,0,512,512);
  for(let row=0;row<16;row++)for(let col=0;col<4;col++){const x=col*160-(row%2)*80,y=row*32;fc.fillStyle=['#997858','#a68462','#927153','#ad8b67'][(col+row)%4];fc.fillRect(x+1,y+1,158,30);fc.strokeStyle='#70533c33';for(let j=0;j<3;j++){fc.beginPath();fc.moveTo(x+10,y+7+j*7);fc.lineTo(x+145,y+9+j*7);fc.stroke();}}
  const floorTex=new THREE.CanvasTexture(floorCanvas);floorTex.colorSpace=THREE.SRGBColorSpace;floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(2,2);box(9.9,.02,7.9,new THREE.MeshStandardMaterial({map:floorTex,roughness:.85}),0,.15,0);
  box(10,5.5,.18,ivory,0,2.9,-4);box(.18,5.5,8,ivory,-5,2.9,0);
  box(9.95,1.35,.10,sage,0,.85,-3.85);box(.10,1.35,7.95,sage,-4.85,.85,0);
  for(const y of [.28,1.48,1.57,5.35,5.5]){box(10,.09,.21,trim,0,y,-3.77);box(.21,.09,8,trim,-4.77,y,0);}
  for(let x=-4.4;x<5;x+=1.15)frame(x,.88,-3.75,.92,.92);
  for(let z=-3.4;z<4;z+=1.15){for(const y of [.42,1.33])box(.07,.045,.92,trim,-4.75,y,z);for(const dz of [-.46,.46])box(.07,.91,.045,trim,-4.75,.875,z+dz);}
  // Tall arched window, inset glazing, brass mullions and gathered curtains.
  const arch=(radius,bottom,center)=>{const s=new THREE.Shape();s.moveTo(-radius,bottom);s.lineTo(radius,bottom);s.lineTo(radius,center);s.absarc(0,center,radius,0,Math.PI,false);s.lineTo(-radius,bottom);return new THREE.ShapeGeometry(s);};
  mesh(arch(1.42,1.8,3.65),trim,-2.35,0,-3.73);const pane=gardenWindow(arch(1.25,1.94,3.65));
  if(music){const uv=pane.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)-.48)/.49,(uv.getY(i)-.06)/.86);}
  mesh(pane,music?liveGlass:viewMaterial,-2.35,0,-3.68);
  box(.055,2.98,.07,trim,-2.35,3.39,-3.62);box(2.5,.06,.07,trim,-2.35,3.5,-3.61);box(3,.15,.4,trim,-2.35,1.84,-3.5);
  const curtain=mat(music?'#c2ad85':'#b4ac93');for(const side of [-1,1])for(let i=0;i<6;i++){const x=-2.35+side*(1.4+i*.08);cyl(.095,.13,3.3,curtain,x,3.35,-3.45+Math.sin(i)*.045);}box(3.8,.1,.13,gold,-2.35,5.06,-3.4);
  const rug=mat(music?'#718b82':'#ac9877');box(5.6,.025,4.4,rug,.05,.18,.7);for(const scale of [1,.94]){const w=5.4*scale,d=4.2*scale;for(const z of [.7-d/2,.7+d/2])box(w,.009,.035,ivory,.05,.2,z);for(const x of [.05-w/2,.05+w/2])box(.035,.009,d,ivory,x,.2,.7);}
  for(let i=0;i<7;i++){const o=box(.19,.012,.19,ivory,-1.8+i*.6,.21,.7);o.rotation.y=Math.PI/4;}
  // Built-in library, cornice, individually spaced volumes.
  const bindings=['#7e8d75','#a97b5e','#b9aa86','#566f6c','#84685b'].map(c=>mat(c));
  if(!music){box(2.1,3.3,.65,wood,3.55,1.85,-3.43);box(2.28,.15,.8,trim,3.55,3.55,-3.42);
  for(let row=0;row<4;row++){box(2.05,.075,.7,wood,3.55,.55+row*.73,-3.4);for(let i=0;i<9;i++){const h=.4+(i%3)*.065,x=2.67+i*.215,y=.6+row*.73+h/2;const book=box(.15,h,.38,bindings[(i+row)%5],x,y,-3.18);book.rotation.z=i===7?.11:0;box(.12,.018,.015,gold,x,y+h*.27,-2.98);}}
  for(const x of [2.48,4.62])box(.1,3.35,.1,trim,x,1.85,-3.04);
  }
  if(music){
  // Gilt oval artwork.
  const oval=mesh(new THREE.TorusGeometry(.66,.045,10,48),gold,.7,3.9,-3.73);oval.scale.y=1.3;
  ball(.62,mat('#7b9187'),.7,3.9,-3.77,1,1.3,.035);ball(.3,mat('#c5ba96'),.65,3.9,-3.71,.8,1.1,.04);
  }else{
   const c=document.createElement('canvas');c.width=1536;c.height=640;const t=c.getContext('2d');t.fillStyle='#f2e7c9';t.fillRect(0,0,c.width,c.height);t.strokeStyle='#a88a4e';t.lineWidth=10;t.strokeRect(22,22,c.width-44,c.height-44);t.textAlign='center';t.fillStyle='#52664d';t.font='25px sans-serif';t.fillText('A THOUGHT FOR TODAY',768,105);t.fillStyle='#293d32';t.font='bold 82px Georgia';const words=dailyThought().split(' ');let line='',lines=[];for(const w of words){if(t.measureText(line+w).width>1300){lines.push(line.trim());line='';}line+=w+' ';}lines.push(line.trim());lines.forEach((line,i)=>t.fillText(line,768,212+i*92));t.font='24px Georgia';t.fillText('Original reflections · Minds',768,550);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;box(2.75,1.55,.10,gold,1.12,3.6,-3.76);mesh(new THREE.PlaneGeometry(2.65,1.46),new THREE.MeshBasicMaterial({map:texture}),1.12,3.6,-3.69);
  }
  // Turned brass reading lamp.
  cyl(.38,.42,.08,gold,-3.8,.24,-.6);cyl(.035,.045,2.8,gold,-3.8,1.65,-.6);cyl(.25,.55,.55,ivory,-3.8,3.15,-.6);ball(.1,gold,-3.8,3.5,-.6);
  if(music){
   // Suspended brass chandelier and paired stage sconces.
   cyl(.035,.035,.9,gold,0,5.1,-1.4);ball(.18,gold,0,4.64,-1.4);const lampGlass=mat('#ffecc2');lampGlass.emissive=new THREE.Color('#e9b970');lampGlass.emissiveIntensity=.4;
   for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*.9,z=Math.sin(a)*.9;const arm=box(.92,.035,.045,gold,x/2,4.6,-1.4+z/2);arm.rotation.y=-a;cyl(.055,.065,.24,gold,x,4.72,-1.4+z);ball(.13,lampGlass,x,4.91,-1.4+z,.8,1.35,.8);}
   for(const x of [-3.2,3.2]){box(.22,.54,.1,gold,x,3.1,-3.58);ball(.18,lampGlass,x,3.4,-3.45,.85,1.5,.85);}
   // Raised concert platform, velvet curtains and a curved grand piano.
   box(8.8,.16,4.7,wood,0,.25,-1.5);box(8.9,.035,.12,gold,0,.35,.84);
   const curtain=mat('#6b4d43');for(const side of [-1,1])for(let i=0;i<10;i++)cyl(.15,.19,4.9,curtain,side*(3.25+i*.16),2.9,-3.5+Math.sin(i)*.05);
   for(const x of [-4.5,4.5]){cyl(.17,.22,5,trim,x,2.9,-2.6);cyl(.3,.3,.15,gold,x,5.25,-2.6);}
   const shape=new THREE.Shape();shape.moveTo(-1.8,-.95);shape.lineTo(1.65,-.95);shape.lineTo(1.65,.25);shape.bezierCurveTo(1.7,1.8,.2,2.7,-.9,2.6);shape.bezierCurveTo(-1.9,2.5,-1.8,.6,-1.8,-.95);
   const body=mesh(new THREE.ExtrudeGeometry(shape,{depth:.26,bevelEnabled:true,bevelSize:.035,bevelThickness:.03,bevelSegments:2,steps:1,curveSegments:28}),dark,0,1.52,-1.55);body.rotation.x=-Math.PI/2;
   const lid=mesh(new THREE.ShapeGeometry(shape,28),dark,0,2.2,-1.55);lid.rotation.order='ZXY';lid.rotation.x=-Math.PI/2;lid.rotation.z=-.24;lid.material=new THREE.MeshStandardMaterial({color:'#24332f',side:THREE.DoubleSide,roughness:.36});
   cyl(.025,.025,.9,gold,.85,1.95,-2.7);
   box(3.5,.2,.87,dark,-.05,1.4,-.65);box(3.4,.045,.7,ivory,-.05,1.53,-.65);
   for(let i=0;i<29;i++){const x=-1.73+i*.117;box(.005,.012,.66,wood,x,1.56,-.65);if(![2,6].includes(i%7)&&i<28)box(.068,.09,.39,dark,x+.058,1.6,-.8);}
   for(const [x,z] of [[-1.5,-.85],[1.45,-.85],[-.6,-3.5]]){leg(x,z);ball(.09,gold,x,.27,z);}
   for(const x of [-.29,-.05,.19])box(.09,.06,.3,gold,x,.44,-.85);
   box(1.7,.17,.75,wood,-.05,.87,1);box(1.65,.12,.72,velvet,-.05,1.01,1);for(const x of [-.68,.58])for(const z of [.78,1.22])leg(x,z,.65);
   box(1.08,.7,.06,wood,-.05,1.95,-1.08).rotation.x=-.18;box(.97,.6,.02,ivory,-.05,1.96,-1.03).rotation.x=-.18;
   for(let row=0;row<8;row++)box(.83,.008,.012,wood,-.05,1.75+row*.05,-.96);
   cyl(.04,.04,1.7,gold,2.9,1.1,-2.7);box(1.2,.9,.08,wood,2.9,2,-2.7).rotation.x=-.15;box(1.03,.72,.03,ivory,2.9,2.02,-2.62).rotation.x=-.15;
  }else{
   box(3.7,.16,1.65,wood,-.15,1.55,-.5);box(3.76,.045,1.7,gold,-.15,1.64,-.5);box(2.65,.018,1.25,velvet,-.15,1.67,-.5);
   for(const x of [-1.7,1.4])for(const z of [-1.1,.1])leg(x,z,1.27);
   for(const x of [-1.24,.94]){box(.85,.28,.1,wood,x,1.33,.29);ball(.045,gold,x,1.33,.36);}
   for(const x of [-.44,.1]){box(.52,.035,.8,ivory,x,1.71,-.4);for(let i=0;i<7;i++)box(.36,.005,.009,sage,x,1.731,-.68+i*.075);}
   cyl(.09,.12,.15,dark,.75,1.76,-.8);const pen=cyl(.014,.014,.57,gold,.75,2.03,-.8);pen.rotation.z=-.35;
   for(let i=0;i<3;i++)box(.65,.1,.48,bindings[i],-1.45,1.73+i*.1,-.8).rotation.y=(i-1)*.1;
   const chairStart=scene.children.length;
   // Upholstered reading chair with rounded arms and buttoned back.
   box(1.6,.24,1.25,wood,.2,.75,1.6);ball(.8,velvet,.2,.94,1.6,1,.25,.8);ball(.8,velvet,.2,1.6,2.06,1,1,.2);
   for(const x of [-.48,.88]){ball(.2,velvet,x,1.22,1.55,1,1,2.8);for(const z of [1.15,2])leg(x,z,.5);}
   for(const x of [-.18,.2,.58])for(const y of [1.4,1.75])ball(.032,gold,x,y,1.89);
   const chair=new THREE.Group();chair.position.set(-2.65,0,-.48);scene.children.slice(chairStart).forEach(o=>{o.position.x-=.2;o.position.z-=1.6;chair.add(o);});chair.rotation.y=1.85;scene.add(chair);
  }
  // Porcelain vase and fine-stemmed foliage.
  cyl(.19,.28,.55,ivory,-4,.48,2.3);for(let i=0;i<9;i++){const a=i*2.4,x=-4+Math.sin(a)*.25,z=2.3+Math.cos(a)*.25;cyl(.012,.02,.9,sage,x,1.05,z);ball(.17,sage,x,1.25+(i%3)*.16,z,.65,1.5,.5);}
  box(.18,5.5,8,ivory,5,2.9,0);box(10,.15,8,ivory,0,5.65,0);
  for(const y of [1.5,5.35])box(.18,.10,8,trim,4.85,y,0);
  const camera=new THREE.PerspectiveCamera(67,1,.1,100);camera.position.set(0,2.85,3.75);camera.lookAt(0,2.15,-2);rooms[kind]={scene,camera};
 }
 // A walk-in glass conservatory with nine living memories per shelf.
 const greenhouse=new THREE.Scene();greenhouse.background=null;greenhouse.add(new THREE.HemisphereLight('#fff5da','#7d9275',2.5));const light=new THREE.DirectionalLight('#fff2cb',2.3);light.position.set(-5,9,4);greenhouse.add(light);
 const gmat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.8});const frame=gmat('#315d4d'),stone=gmat('#d4c9ad'),pot=gmat('#b67d60'),leaf=gmat('#5a8553');
 const gm=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);greenhouse.add(o);return o;};const gb=(w,h,d,m,x,y,z)=>gm(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 gb(12,.2,12,stone,0,0,0);for(let x=-6;x<=6;x++)gb(.02,.01,12,frame,x,.11,0);for(let z=-6;z<=6;z++)gb(12,.01,.02,frame,0,.11,z);
 const glazing=new THREE.MeshStandardMaterial({color:'#d6e5dc',transparent:true,opacity:.22,roughness:.7,side:THREE.DoubleSide,depthWrite:false});
 gb(12,5,.04,glazing,0,2.6,-5);for(const x of [-6,6])gb(.04,5,12,glazing,x,2.6,0);

 for(const side of [-1,1])for(let k=0;k<5;k++){const x=side*(4.3+.3*Math.sin(k)),z=-4+k*1.5;gm(new THREE.CylinderGeometry(.38,.26,.68,18),pot,x,.45,z);for(let j=0;j<9;j++){const a=j*2.4,l=gm(new THREE.SphereGeometry(.38,12,8),leaf,x+Math.cos(a)*.26,1.12+j*.035,z+Math.sin(a)*.25);l.scale.set(.44,1.55,.29);l.rotation.z=Math.cos(a)*.6;l.rotation.x=Math.sin(a)*.6;}}
 for(let x=-6;x<=6;x+=2)gb(.085,5,.085,frame,x,2.6,-5);
 for(let z=-5;z<=5;z+=2){for(const x of [-6,6])gb(.085,5,.085,frame,x,2.6,z);for(const side of [-1,1]){const beam=gb(6.8,.08,.08,frame,side*3,5.7,z);beam.rotation.z=-side*.32;}}
 for(const y of [1.2,3.2,5.1])gb(12,.08,.08,frame,0,y,-5);gb(.1,.1,12,frame,0,6.7,0);
 for(const z of [-3.8,-2,0]){gb(8.8,.12,.85,gmat('#9e8460'),0,.85,z);for(const x of [-4,4])gb(.12,.8,.12,frame,x,.45,z);}
 const flowerGroup=new THREE.Group();greenhouse.add(flowerGroup);const flowerPosition=i=>new THREE.Vector3(-2.8+(i%3)*2.8,1.9,-3.8+Math.floor(i/3)*1.8);
 const gcam=new THREE.PerspectiveCamera(66,1,.1,100);gcam.position.set(0,3.2,5.2);gcam.lookAt(0,1.85,-2);rooms.greenhouse={scene:greenhouse,camera:gcam};let born=0;
 function flowers(entries){while(flowerGroup.children.length){const o=flowerGroup.children[0];flowerGroup.remove(o);o.traverse(n=>{n.geometry?.dispose();if(n.material?.userData.flowerUnique)n.material.dispose();});}born=performance.now();entries.forEach((entry,i)=>{const p=flowerPosition(i),group=new THREE.Group();group.userData.flowerIndex=i;group.position.set(p.x,.94,p.z);flowerGroup.add(group);const add=(geo,mat,x,y,z)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);group.add(o);return o;};add(new THREE.CylinderGeometry(.32,.22,.48,20),pot,0,.24,0);add(new THREE.CylinderGeometry(.025,.035,.8,8),leaf,0,.9,0);for(const side of [-1,1]){const l=add(new THREE.SphereGeometry(.19,12,8),leaf,side*.14,.8,0);l.scale.set(1.1,.35,.55);l.rotation.z=side*.5;}const color=['#e3a290','#d5bb6f','#b9a6d3','#a5bfd4','#d8a4b6'][Math.abs([...String(entry.id)].reduce((a,c)=>a+c.charCodeAt(0),0))%5];const petal=gmat(color);petal.userData.flowerUnique=true;for(let n=0;n<7;n++){const a=n*Math.PI*2/7;const f=add(new THREE.SphereGeometry(.18,16,10),petal,Math.cos(a)*.19,1.22+Math.sin(a)*.19,.02);f.scale.set(.9,1.1,.45);}add(new THREE.SphereGeometry(.105,12,8),stone,0,1.22,.08);});}
 const ray=new THREE.Raycaster();
 function pick(kind,mouse){const room=rooms[kind];ray.setFromCamera(mouse,room.camera);if(kind==='greenhouse'){const hit=ray.intersectObjects(flowerGroup.children,true)[0];return hit?hit.object.parent.userData.flowerIndex:null;}
  const targets=kind==='sound'?[[0,1.7,-1.5,3.85,1.9,3.6],[2.9,1.9,-2.7,1.4,1.4,.7]]:[[.75,1.98,-.8,.85,1,.8],[1.12,3.6,-3.7,2.75,1.55,.25],[3.55,1.85,-3.4,2.1,3.3,.7]];
  for(let i=0;i<targets.length;i++){const [x,y,z,w,h,d]=targets[i],bounds=new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2));if(ray.ray.intersectsBox(bounds))return i;}return null;
 }
 return {flowers,flowerPosition,pick,camera:kind=>rooms[kind].camera,render(renderer,kind,w,h){const room=rooms[kind];room.camera.aspect=w/h;room.camera.fov=w<h?83:67;room.camera.position.z=kind==='greenhouse'?(w<h?9:5.2):(w<h?6.5:3.75);room.camera.lookAt(0,kind==='greenhouse'?1.65:2.15,-2);room.camera.clearViewOffset();room.camera.updateProjectionMatrix();if(kind==='greenhouse'){const t=Math.min(1,(performance.now()-born)/1100);flowerGroup.children.forEach((g,i)=>{g.scale.setScalar(Math.max(.05,Math.min(1,t*1.3-i*.035)));});}
   if(kind==='sound')refreshWindow(renderer);
   if(kind==='greenhouse'){
     glasshouseView.aspect=w/h;glasshouseView.fov=room.camera.fov;glasshouseView.updateProjectionMatrix();
     renderer.render(garden,glasshouseView);
     const previous=renderer.autoClear;
     renderer.autoClear=false;renderer.clearDepth();
     try{renderer.render(room.scene,room.camera);}finally{renderer.autoClear=previous;}
   }else renderer.render(room.scene,room.camera);
 }};
}
