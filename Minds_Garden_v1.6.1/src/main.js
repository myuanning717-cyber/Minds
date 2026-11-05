import { createImmersion } from './immersion.js';
import { createRooms } from './rooms.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createGardenArt, addClouds } from './garden-art.js';
import { renderReflection, renderComposer, stopPiano, stopComposition, compositionPlaying, createBooks, worldDishes } from './experiences.js';
import { softClouds, createWeather } from './weather.js';
import './style.css';

// MINDS / An interactive 3D garden. Everything in the world is actual 3D geometry.
// All the art assets below are procedural. No image is used as a flat scene backdrop.
const el = (id) => document.getElementById(id);
const canvas = el('world');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (error) {
  el('loading').innerHTML = '<p>3D graphics could not start. Please enable WebGL in your browser.</p>';
  throw error;
}
// Cap retina resolution to keep integrated GPUs responsive.
const renderPixelRatio = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 840 ? 1.05 : 1.3);
renderer.setPixelRatio(renderPixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const world = new THREE.Scene();
world.background = new THREE.Color('#e3c7a3');
world.fog = new THREE.FogExp2('#e3c7a3', .008);
const camera = new THREE.PerspectiveCamera(39, window.innerWidth / window.innerHeight, .1, 250);
camera.position.set(32, 25, 48);
const gardenCenter = new THREE.Vector3(0, 5.1, 0);
const orbit = new OrbitControls(camera, canvas);
orbit.target.copy(gardenCenter);
orbit.enableDamping = true;
orbit.dampingFactor = .055;
orbit.minDistance = 17;
orbit.maxDistance = 130;
orbit.minPolarAngle = .25;
orbit.maxPolarAngle = 1.47;
orbit.enablePan = false;
orbit.update();

const ambience = new THREE.HemisphereLight('#fff4d6', '#52704e', 2.0);
world.add(ambience);
const sun = new THREE.DirectionalLight('#ffdfad', 3.25);
sun.position.set(-17, 28, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -43;
sun.shadow.camera.right = 43;
sun.shadow.camera.top = 38;
sun.shadow.camera.bottom = -38;
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 90;
sun.shadow.bias = -.00028;
world.add(sun);
const fill = new THREE.DirectionalLight('#adc9d2', .7);
fill.position.set(20, 10, -19);
world.add(fill);

const mat = (hex, roughness=.84, metalness=0) => new THREE.MeshStandardMaterial({ color:hex, roughness, metalness });
const materials = {
  grass:mat('#6d8451'), soil:mat('#705b3d'), bark:mat('#574133'), barkLight:mat('#73533b'),
  redBrick:mat('#ae634b'), paleStone:mat('#d6c3a3'), tile:mat('#376860',.65),
  roofTrim:mat('#214943'), darkWood:mat('#63452f'), wood:mat('#9b6b47'),
  warmGlass:new THREE.MeshStandardMaterial({color:'#fcd58a',roughness:.18,emissive:'#ca812e',emissiveIntensity:.56,transparent:true,opacity:.91}),
  darkGlass:new THREE.MeshStandardMaterial({color:'#47615e',roughness:.22,metalness:.15}),
  lily:mat('#487848'), stone:mat('#ac9f88'), lantern:new THREE.MeshStandardMaterial({color:'#ffda82',emissive:'#f6ab42',emissiveIntensity:1.8}),
  flower:new THREE.MeshStandardMaterial({color:'#cf382d',roughness:.75,side:THREE.DoubleSide}),
};

const hovered = {object:null};
const clockHands = { hour:null, minute:null };
const interactive = [];
const register = (mesh, kind) => { mesh.userData.action=kind; interactive.push(mesh); return mesh; };
const addMesh = (parent, geometry, material, pos=[0,0,0], cast=true, receive=true) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
};
const box = (parent,w,h,d,material,x,y,z) => addMesh(parent,new THREE.BoxGeometry(w,h,d),material,[x,y,z]);
const cyl = (parent,rt,rb,h,material,x,y,z,segments=10) => addMesh(parent,new THREE.CylinderGeometry(rt,rb,h,segments),material,[x,y,z]);
const sphere = (parent,r,material,x,y,z,detail=8) => addMesh(parent,new THREE.SphereGeometry(r,detail,Math.max(6,Math.floor(detail*.65))),material,[x,y,z]);
const torus = (parent,r,t,material,x,y,z,rx=Math.PI/2) => { const m=addMesh(parent,new THREE.TorusGeometry(r,t,7,40),material,[x,y,z]);m.rotation.x=rx;return m; };
function lineTube(parent, pts, radius, material, tubular=12) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  return addMesh(parent,new THREE.TubeGeometry(curve,tubular,radius,7,false),material);
}
function makeBrickTexture() {
  const c=document.createElement('canvas');c.width=512;c.height=512;
  const ctx=c.getContext('2d');ctx.fillStyle='#b5a48c';ctx.fillRect(0,0,512,512);
  const rng=seeded(120);
  for(let row=0;row<20;row++)for(let col=-1;col<9;col++){
    let bx=col*65+((row%2)*32),by=row*26;
    let t= Math.floor(rng()*34);
    ctx.fillStyle=`rgb(${166+t},${83+t*.65},${61+t*.55})`;
    ctx.fillRect(bx+2,by+2,61,22);
    ctx.fillStyle='rgba(40,35,26,.07)';
    for(let i=0;i<3;i++)ctx.fillRect(bx+4+rng()*52,by+4+rng()*14,rng()*5+1,1);
  }
  const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.repeat.set(4,3);return tex;
}
const brickTex=makeBrickTexture();
const brickMat=new THREE.MeshStandardMaterial({map:brickTex,roughness:.93,color:'#ffffff'});
function barkTexture(){
  const c=document.createElement('canvas');c.width=256;c.height=512;
  const ctx=c.getContext('2d');ctx.fillStyle='#66503a';ctx.fillRect(0,0,c.width,c.height);
  const sr=seeded(8819);
  for(let i=0;i<1600;i++){
    const xx=sr()*256,yy=sr()*512;
    const len=5+sr()*105;
    ctx.strokeStyle=sr()>.5?'rgba(30,20,13,.26)':'rgba(213,182,125,.18)';
    ctx.lineWidth=sr()*2.4+.45;ctx.beginPath();ctx.moveTo(xx,yy);
    ctx.bezierCurveTo(xx+sr()*8-4,yy+len*.3,xx+sr()*9-4,yy+len*.8,xx+sr()*7-4,yy+len);ctx.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,3);return t;
}
const barkMap=barkTexture();materials.bark.map=barkMap;materials.bark.color.set('#c8af9a');materials.bark.needsUpdate=true;
materials.barkLight.map=barkMap;materials.barkLight.color.set('#dfc4a4');materials.barkLight.needsUpdate=true;
// Soft golden-hour gradient; the garden remains fully renderable 3D.
const skyCanvas=document.createElement('canvas');skyCanvas.width=16;skyCanvas.height=512;
const skyCtx=skyCanvas.getContext('2d');const skyGrad=skyCtx.createLinearGradient(0,0,0,512);
skyGrad.addColorStop(0,'#8dbac9');skyGrad.addColorStop(.43,'#bbd4d7');skyGrad.addColorStop(.75,'#e8d9bd');skyGrad.addColorStop(1,'#d8ccaa');
skyCtx.fillStyle=skyGrad;skyCtx.fillRect(0,0,16,512);
const duskSky=new THREE.CanvasTexture(skyCanvas);duskSky.colorSpace=THREE.SRGBColorSpace;
const cloudField=new THREE.Group();
const clouds=softClouds(world);
const weather=createWeather(world,clouds,sun,ambience,duskSky,register);
const rooms=createRooms(world);
world.background=duskSky;

function seeded(seed) { return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;} }
const rng=seeded(8831);
const r=(a,b)=>a+rng()*(b-a);
function lawn() {
  const base=addMesh(world,new THREE.PlaneGeometry(600,600),materials.grass,[0,-.18,0],false,true);
  base.rotation.x=-Math.PI/2;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const c=canvas.getContext('2d');c.fillStyle='#71865a';c.fillRect(0,0,512,512);
  const sr=seeded(442);
  for(let i=0;i<19000;i++){
    const x=sr()*512,y=sr()*512,size=sr()*2.6+.3;
    c.fillStyle=sr()>.56?'rgba(211,206,137,.08)':'rgba(35,77,43,.10)';c.fillRect(x,y,size,size*1.8);
  }
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(22,22);t.colorSpace=THREE.SRGBColorSpace;
  base.material=new THREE.MeshStandardMaterial({map:t,roughness:1,color:'#d4d3b2'});
  // Small raised lawn and a gentle green hill line behind the architecture.
  for(let i=0;i<22;i++){
    const a=i/22*Math.PI*2;
    const x=Math.cos(a)*58,z=Math.sin(a)*43;
    const hill=sphere(world,r(7,13),mat(i%2?'#718761':'#7f946b'),x,-8+r(-.2,.2),z,10);
    hill.scale.y=.65;
  }
}
lawn();

// v0.2 foliage: individual sculpted leaf planes instead of spherical cotton-candy canopies.
const leafGeometry = (()=>{
  const vertices=[],normals=[],indices=[];
  // A pointed leaf with a shallow central fold. Built in local XY plane, z adds a true 3D midrib.
  const pts=[ [0,-.55,0],[-.24,-.20,.05],[-.34,.12,.025],[-.14,.43,.015], [0,.65,.08], [.15,.42,.016],[.34,.1,.025],[.23,-.22,.04],[0,.05,.13] ];
  const triangles=[[0,1,8],[1,2,8],[2,3,8],[3,4,8],[4,5,8],[5,6,8],[6,7,8],[7,0,8]];
  for(const t of triangles)for(const i of t)vertices.push(...pts[i]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
})();
const leafMaterial = new THREE.MeshStandardMaterial({color:'#ffffff',side:THREE.DoubleSide,roughness:.88,metalness:0});
const branchBrown=mat('#5b4836');
function kapokFlowerGeometry(){
  // Each blossom consists of 5 individually curved three-dimensional petals.
  const verts=[],indexes=[],uv=[];
  for(let petal=0;petal<5;petal++){
    const a=petal*2*Math.PI/5;
    const localStart=verts.length/3;
    const rows=5,cols=6;
    for(let j=0;j<=rows;j++){
      const t=j/rows,rad=.12+t*.85;
      const width=Math.sin(Math.PI*t)**.68*.35 + .018;
      for(let k=0;k<=cols;k++){
        const w=(k/cols-.5)*2;
        const sideways=w*width;
        const theta=a;
        const px=Math.cos(theta)*rad-Math.sin(theta)*sideways;
        const pz=Math.sin(theta)*rad+Math.cos(theta)*sideways;
        const py=.14+ .24*t - .23*t*t + (1-w*w)*.12*Math.sin(Math.PI*t);
        verts.push(px,py,pz);uv.push(k/cols,t);
      }
    }
    for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
      const a0=localStart+j*(cols+1)+k,b=a0+(cols+1);
      indexes.push(a0,b,a0+1,a0+1,b,b+1);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indexes);g.computeVertexNormals();return g;
}
const bloomGeometry=kapokFlowerGeometry();
const kapokPetalMat = new THREE.MeshStandardMaterial({color:'#ff5630',emissive:'#7b160a',emissiveIntensity:.12,side:THREE.DoubleSide,roughness:.56,metalness:0,flatShading:false});
const stamensGeometry=new THREE.ConeGeometry(.07,.45,5);
const stamensMat=new THREE.MeshStandardMaterial({color:'#f7ba4a',roughness:.72});
function addRealFoliage(group, anchorPoints, count, spread, bright=false){
  const leaves=new THREE.InstancedMesh(leafGeometry,leafMaterial,count);
  leaves.castShadow=false;leaves.receiveShadow=false;leaves.frustumCulled=false;
  const obj=new THREE.Object3D(),c=new THREE.Color();
  for(let j=0;j<count;j++){
    const anchor=anchorPoints[Math.floor(rng()*anchorPoints.length)];
    const a=r(0,Math.PI*2),e=Math.acos(r(-1,1)),dist=Math.cbrt(rng());
    obj.position.set(anchor.x+Math.sin(e)*Math.cos(a)*spread[0]*dist,
       anchor.y+Math.cos(e)*spread[1]*dist, anchor.z+Math.sin(e)*Math.sin(a)*spread[2]*dist);
    obj.rotation.set(r(-1.1,1.1),r(0,Math.PI*2),r(-1.3,1.3));
    const size=r(.28,.61);obj.scale.set(size*r(.65,1.3),size*r(.85,1.4),1);
    obj.updateMatrix();leaves.setMatrixAt(j,obj.matrix);
    c.setHSL(bright?r(.245,.35):r(.255,.38),r(.25,.50),r(.22,.46));leaves.setColorAt(j,c);
  }
  leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;
  group.add(leaves);
  return leaves;
}
function makeTree(parent,x,z,size=1,blossom=false) {
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(size);parent.add(g);
  // Bark texture is shared by all tree geometry, while branch silhouettes remain irregular.
  const mainHeight=blossom?7.2:r(5.2,7.8);
  const thick=blossom?.66:r(.21,.32);
  const trunk=cyl(g,thick*.66,thick,mainHeight,materials.bark,0,mainHeight/2,0,12);
  trunk.rotation.z=r(-.10,.10);trunk.rotation.x=r(-.05,.05);
  const anchorPoints=[];
  const mainBranches=blossom?[
    [-7.5,9.3,-1.4],[-5.2,10.5,3.9],[7.6,9.4,-1.0],[5.0,10.7,3.8],
    [-2.0,12.4,-4.4],[1.7,12.5,3.2],[.7,13.1,-2.5],[-5.4,8.5,-4.8]
  ]:Array.from({length:7},(_,i)=>{let a=i*Math.PI*2/7+r(-.3,.3);return [Math.cos(a)*r(2.0,4.2),mainHeight+r(-.8,2.4),Math.sin(a)*r(1.8,3.6)];});
  mainBranches.forEach((tip,i)=>{
    const a=new THREE.Vector3(r(-.2,.2),mainHeight*r(.72,.96),r(-.2,.2));
    const end=new THREE.Vector3(...tip);const bend=a.clone().lerp(end,.51);bend.y+=.7;
    branchCylinder(g,a,bend,thick*.42,materials.bark);
    branchCylinder(g,bend,end,thick*.19,materials.bark);
    for(let j=0;j<(blossom?8:8);j++){
      const t=r(.38,1),s=bend.clone().lerp(end,t);
      const small=new THREE.Vector3(s.x+r(-1.55,1.55),s.y+r(.05,1.1),s.z+r(-1.5,1.5));
      branchCylinder(g,s,small,r(.023,.071),materials.bark);
      anchorPoints.push(small);
    }
    anchorPoints.push(end);
  });
  if(blossom){
    // A sparse crown of real 3D five-petalled kapok blooms, not oversized red blobs.
    const count=1180,flowerMesh=new THREE.InstancedMesh(bloomGeometry,kapokPetalMat,count);
    const stamens=new THREE.InstancedMesh(stamensGeometry,stamensMat,count);
    const dummy=new THREE.Object3D(),pollen=new THREE.Object3D(),color=new THREE.Color();
    for(let i=0;i<count;i++){
      const anchor=anchorPoints[Math.floor(rng()*anchorPoints.length)];
      const dist=r(.02,1.5),a=r(0,Math.PI*2);
      const xx=anchor.x+Math.cos(a)*dist,yy=anchor.y+r(-.7,.7),zz=anchor.z+Math.sin(a)*dist;
      dummy.position.set(xx,yy,zz);dummy.rotation.set(r(-1.1,1.1),r(0,6.28),r(-.7,.7));dummy.scale.setScalar(r(.16,.29));dummy.updateMatrix();flowerMesh.setMatrixAt(i,dummy.matrix);
      pollen.position.set(xx,yy+.09,zz);pollen.rotation.copy(dummy.rotation);pollen.scale.setScalar(r(.11,.19));pollen.updateMatrix();stamens.setMatrixAt(i,pollen.matrix);
      color.setHSL(r(.01,.03),r(.86,.99),r(.52,.66));flowerMesh.setColorAt(i,color);
    }
    flowerMesh.instanceMatrix.needsUpdate=true;flowerMesh.instanceColor.needsUpdate=true;
    stamens.instanceMatrix.needsUpdate=true;
    g.add(flowerMesh,stamens);
    // Fewer leaves during spring bloom, following real kapok flowering characteristics.
    if(anchorPoints.length)addRealFoliage(g,anchorPoints,115,[.45,.36,.45]);
  }else{
    // Thousands of small independent leaves with irregular tips and visible gaps.
    addRealFoliage(g,anchorPoints,390,[1.05,.88,1.05],true);
  }
  return g;
}
function branchCylinder(parent,a,b,rad,material){
  const delta=b.clone().sub(a);const m=addMesh(parent,new THREE.CylinderGeometry(rad*.52,rad,delta.length(),7),material,a.clone().add(b).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
}
function flowerGeometry(){
  const sh=new THREE.Shape();sh.moveTo(0,-.6);sh.bezierCurveTo(-.40,-.4,-.37,.3,0,.65);sh.bezierCurveTo(.37,.3,.40,-.4,0,-.6);
  return new THREE.ShapeGeometry(sh,9);
}

const kapokPos = new THREE.Vector3(-5.2, 0, .15);
// MINDS v0.5 — a much broader, denser true kapok canopy with instanced 3D blooms.
// The bark and branches are real GLB meshes. 1100+ blooms share a small, sculpted
// five-petal mesh: no flat sprites, no giant download for repeated geometry.
const kapok = new THREE.Group();
kapok.position.copy(kapokPos);
world.add(kapok);
// v1.2: an original, locally generated sculptural kapok, with no model download.
const blossomMat=new THREE.MeshBasicMaterial({color:'#ea5844',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false});
// Wind-blown petals: animated instancing replaces hundreds of Mesh draw calls.
const petalShape=flowerGeometry();
const fallCount=96;
const falling=[];
const fallingMesh=new THREE.InstancedMesh(petalShape,blossomMat,fallCount);
const fallenMesh=new THREE.InstancedMesh(petalShape,blossomMat,210);
fallingMesh.frustumCulled=false;fallenMesh.frustumCulled=false;
fallingMesh.castShadow=false;fallenMesh.castShadow=false;
world.add(fallingMesh,fallenMesh);
const petalDummy=new THREE.Object3D();
for(let i=0;i<fallCount;i++){
  falling.push({x:kapokPos.x+r(-9,9),y:r(.1,13.6),z:kapokPos.z+r(-6,6),phase:r(0,6.3),speed:r(.18,.5),scale:r(.09,.19),spin:r(0,6.28)});
}
for(let i=0;i<210;i++){
  const x=kapokPos.x+r(-9.5,9.5),z=kapokPos.z+r(-6,6);
  petalDummy.position.set(x,.047,z);petalDummy.rotation.set(-Math.PI/2,0,r(0,6.28));
  petalDummy.scale.setScalar(r(.095,.22));petalDummy.updateMatrix();fallenMesh.setMatrixAt(i,petalDummy.matrix);
}
fallenMesh.instanceMatrix.needsUpdate=true;

// Low-cost landscaping: flower beds, paving stones, and shaded seating.
// One draw call per path instead of 100 separate paving meshes.
const pathGeometry=new THREE.BoxGeometry(1,.07,1);
const pathMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.94});
function path(points,width=1.5){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],.009,p[1])));
  const tileCount=Math.max(4,Math.round(curve.getLength()/.55));
  const tiles=new THREE.InstancedMesh(pathGeometry,pathMaterial,tileCount);
  const dummy=new THREE.Object3D(),c=new THREE.Color();
  tiles.castShadow=false;tiles.receiveShadow=true;
  for(let i=0;i<tileCount;i++){
    const p=curve.getPointAt(i/(tileCount-1)),t=curve.getTangentAt(i/(tileCount-1));
    dummy.position.set(p.x,.013,p.z);
    dummy.rotation.set(0,Math.atan2(-t.z,t.x),0);
    dummy.scale.set(.43,1,width*r(.94,1.03));
    dummy.updateMatrix();tiles.setMatrixAt(i,dummy.matrix);
    c.set(i%3?'#c6af8e':'#e0c4a3');tiles.setColorAt(i,c);
  }
  tiles.instanceMatrix.needsUpdate=true;tiles.instanceColor.needsUpdate=true;
  world.add(tiles);
  return tiles;
}
path([[-18,8],[-13,5],[-9,3.2],[-3.4,3.4],[0,4.0],[1.1,6.0]],1.5);
path([[-3,3.3],[-1.2,1],[.8,-1.4],[4,-3.4],[5.6,-5.22]],1.1);
path([[1,3],[4,1.3],[9,.5],[13,.25],[14.3,.45]],1.1);
function bench(x,y,z,rot=0) {
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;world.add(g);
  for(let i=0;i<4;i++)box(g,1.9,.08,.17,materials.wood,0,.7,i*.18-.23);
  for(let i=0;i<3;i++)box(g,1.9,.10,.16,materials.wood,0,1.0+i*.22,-.39);
  for(let x1 of [-.8,.8]){
    box(g,.09,.71,.09,materials.darkWood,x1,.35,-.15);
    box(g,.10,.77,.10,materials.darkWood,x1,.48,.28);
  }
}
bench(-10.1,.03,5.2,.35);
function shrub(x,z,s=.7,flower=false){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.add(g);
  for(let i=0;i<5;i++){
    const xx=r(-.5,.5),zz=r(-.5,.5);
    const leaf=sphere(g,r(.26,.48),mat(i%2?'#577e50':'#6f8750'),xx,r(.32,.53),zz,7);leaf.scale.y=.7;
    if(flower&&i<3)sphere(g,.11,mat('#e28585'),xx,r(.68,.92),zz,6);
  }
}
// Detailed green glazed tile roof: every visible ceramic tile is actual triangulated 3D relief.
function gabledRoof(parent,w,d,x,y,z,pitch=1.0) {
  const grp=new THREE.Group();grp.position.set(x,y,z);parent.add(grp);
  const roofW=w+.55,roofD=d+.55;
  const underside=new THREE.MeshStandardMaterial({color:'#253c35',side:THREE.DoubleSide,roughness:.75});
  for(const side of [-1,1]){
    const z0=side*roofD/2;
    const va=[-roofW/2,-.12,z0,roofW/2,-.12,z0,roofW/2,pitch,0,-roofW/2,pitch,0];
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(va,3));gg.setIndex([0,1,2,0,2,3]);gg.computeVertexNormals();
    addMesh(grp,gg,underside,[0,0,0]);
    // Curving ceramic tile surfaces, each with a separate lip and subtle color variation.
    const cols=Math.max(8,Math.round(roofW/.23)),rows=Math.max(5,Math.round(roofD/.33));
    const pos=[],colors=[],indexes=[];
    const shade=new THREE.Color();let v=0;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const xc=-roofW/2+(col+.5)*roofW/cols;
      const t0=row/rows,t1=(row+1)/rows;
      const zA=side*(roofD/2)*(1-t0),zB=side*(roofD/2)*(1-t1);
      const yA=pitch*t0+.013,yB=pitch*t1+.013;
      const width=roofW/cols;
      shade.setHSL(r(.44,.48),r(.20,.36),r(.21,.34));
      const tiles=[[-.5,0,0],[-.23,.06,0],[.23,.06,0],[.5,0,0]];
      // three ribs across each ceramic tile create real highlights and volume.
      for(const [ux,raised] of tiles){
        const xx=xc+ux*width;
        pos.push(xx,yA+raised,zA,xx,yB+raised,zB);
        for(let t=0;t<2;t++)colors.push(shade.r,shade.g,shade.b);
      }
      const b=v;
      for(let k=0;k<3;k++)indexes.push(b+k*2,b+k*2+1,b+k*2+2,b+k*2+2,b+k*2+1,b+k*2+3);
      v+=8;
    }
    const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));roofGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));roofGeo.setIndex(indexes);roofGeo.computeVertexNormals();
    addMesh(grp,roofGeo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,metalness:.12,roughness:.42}),[0,0,0],false,true);
    // Delicate glazed edge and upturned eaves on each end.
    lineTube(grp,[[-roofW/2-.16,-.06,z0],[0,-.08,z0],[roofW/2+.18,-.06,z0]],.092,materials.roofTrim,18);
    for(const edge of [-1,1]){
      const xx=edge*(roofW/2+.06);
      lineTube(grp,[[xx,-.10,z0],[xx+.13*edge,.07,side*(roofD/2+.14)]],.05,materials.roofTrim,6);
    }
  }
  lineTube(grp,[[-roofW/2-.08,pitch+.035,0],[0,pitch+.07,0],[roofW/2+.08,pitch+.035,0]],.13,materials.roofTrim,32);
  // Sculpted decorative finials.
  for(const sign of [-1,1]){
    const horn=addMesh(grp,new THREE.ConeGeometry(.11,.34,8),materials.roofTrim,[sign*(roofW/2+.03),pitch+.24,0]);
    horn.rotation.z=sign*.32;
  }
  return grp;
}

function windowArch(parent,x,y,z,w=.7,h=1.4) {
  const grp=new THREE.Group();grp.position.set(x,y,z);parent.add(grp);
  const dark=materials.darkWood;
  box(grp,w+ .19,h*.82,.20,materials.paleStone,0,-h*.08,-.014);
  box(grp,w+.07,h*.72,.23,dark,0,-h*.12,.092);
  box(grp,w*.78,h*.64,.23,materials.warmGlass,0,-h*.13,.13);
  // Arched masonry surround, a dark inner arch, glazing mullions and a stone sill.
  const archOuter=addMesh(grp,new THREE.TorusGeometry(w*.52,.105,8,24,Math.PI),materials.paleStone,[0,h*.29,.04]);
  const archInner=addMesh(grp,new THREE.TorusGeometry(w*.43,.05,7,24,Math.PI),dark,[0,h*.27,.15]);
  box(grp,.075,h*.64,.25,dark,0,-h*.13,.24);
  box(grp,w*.85,.072,.25,dark,0,-h*.19,.24);
  box(grp,w+ .26,.11,.36,materials.paleStone,0,-h*.49,.15);
  return grp;
}
function rectangularWindow(parent,x,y,z,w=.75,h=1.15) {
  box(parent,w+.24,h+.22,.24,materials.paleStone,x,y,z);
  box(parent,w+.09,h+.06,.25,materials.darkWood,x,y,z+.065);
  box(parent,w*.88,h*.89,.27,materials.warmGlass,x,y,z+.10);
  box(parent,.06,h*.94,.28,materials.darkWood,x,y,z+.26);
  box(parent,w*.91,.05,.28,materials.darkWood,x,y,z+.26);
  box(parent,w+.3,.11,.42,materials.paleStone,x,y-h*.55,z+.09);
  // Red-brick projecting lintel creates a stronger architectural silhouette.
  box(parent,w+.26,.13,.27,brickMat,x,y+h*.60,z+.03);
}

function buildingWall(parent,w,h,d,x,y,z,material=brickMat) {
  box(parent,w,h,d,material,x,y,z);
  box(parent,w+.18,.25,d+.16,materials.paleStone,x,y-h/2+.15,z);
  box(parent,w+.08,.15,d+.08,materials.paleStone,x,y+h/2-.15,z);
}

// Historic brick building and working clock: backdrop, intentionally not a third gameplay room.
function clockCampus(){
  const g=new THREE.Group();g.position.set(5.6,0,-8.9);world.add(g);
  buildingWall(g,11.5,5.3,3.6,0,2.65,0);
  gabledRoof(g,11.9,4.15,0,5.23,0,1.2);
  for(let ix of [-4.1,-2.35,-.6,1.15,2.9,4.65]){
    rectangularWindow(g,ix,1.62,1.84,.76,1.25);
    windowArch(g,ix,3.75,1.83,.8,1.33);
  }
  // Engaged brick pilasters and cut-stone pilaster caps along the frontage.
  for(let xx=-5.45;xx<=5.5;xx+=1.55){
    box(g,.14,4.75,.25,materials.paleStone,xx,2.85,1.89);
    box(g,.27,.19,.36,materials.paleStone,xx,5.05,1.91);
  }
  for(let xx of [-3.4,-1.9,1.9,3.4]){
    box(g,1.12,.12,.29,materials.paleStone,xx,2.75,1.9);
  }
  // Slightly advanced central entrance and arcade.
  box(g,3.35,4.9,.82,brickMat,0,2.45,2.16);
  box(g,3.7,.2,1.05,materials.paleStone,0,4.84,2.2);
  for(let x of [-1.35,0,1.35]){
    cyl(g,.17,.18,3.48,materials.paleStone,x,2.67,2.71,10);
    cyl(g,.26,.22,.21,materials.paleStone,x,4.46,2.7,10);
  }
  box(g,1.3,2.36,.16,materials.darkWood,0,1.25,2.7);
  box(g,1.03,1.89,.17,mat('#263a32'),0,1.27,2.81);
  for(let s=0;s<5;s++)box(g,4.0, .13,.5,materials.stone,0,.05+s*.16,3.6-s*.38);
  // Two subtly protruding red-brick wings, recalling the referenced university architecture.
  for(const sx of [-1,1]){
    buildingWall(g,2.2,6.35,4.6,sx*5.38,3.2,1.15);
    gabledRoof(g,2.6,5.2,sx*5.38,6.45,1.15,1.12);
    rectangularWindow(g,sx*5.38,1.8,3.53,.75,1.1);
    rectangularWindow(g,sx*5.38,4.5,3.53,.75,1.15);
    box(g,1.55,.08,.15,materials.paleStone,sx*5.38,5.8,3.52);
  }
  // Clock tower is part of the architecture and has no signage whatsoever.
  const tx=2.75,tz=-.65;
  buildingWall(g,2.25,9.5,2.3,tx,4.75,tz);
  box(g,2.5,.22,2.55,materials.paleStone,tx,9.48,tz);
  for(let y of [2.5,4.5,6.45])rectangularWindow(g,tx,y,tz+1.20,.75,1.2);
  const dial=new THREE.Group();dial.position.set(tx,8.24,tz+1.23);g.add(dial);
  const clockFace=addMesh(dial,new THREE.CircleGeometry(.87,40),new THREE.MeshStandardMaterial({color:'#f4ebd7',roughness:.82}),[0,0,.02]);
  torus(dial,.88,.05,materials.darkWood,0,0,.08,0);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;const m=box(dial,.035,i%3===0?.17:.10,.03,materials.darkWood,Math.sin(a)*.72,Math.cos(a)*.72,.12);
    m.rotation.z=-a;
  }
  const minute=new THREE.Group();minute.position.z=.14;dial.add(minute);box(minute,.038,.62,.04,materials.darkWood,0,.27,0);
  const hour=new THREE.Group();hour.position.z=.18;dial.add(hour);box(hour,.06,.44,.04,materials.darkWood,0,.18,0);sphere(dial,.065,materials.darkWood,0,0,.23,10);
  clockHands.minute = minute;
  clockHands.hour = hour;
  gabledRoof(g,2.9,3.0,tx,9.59,tz,1.05);
  // Quiet warm window lights, color responds to day/night.
  for(let x of [-4.1,-.6,1.15,4.65]){
    const lamp=new THREE.PointLight('#ffc178',.68,5,2);lamp.position.set(x,3.7,2.15);g.add(lamp);
  }
  return g;
}
clockCampus();
function updateClockHands(){
  if(!clockHands.hour || !clockHands.minute) return;
  const now = new Date(Date.now()+8*3600000);
  const minutes = now.getUTCMinutes() + now.getUTCSeconds()/60;
  const hours = (now.getUTCHours()%12) + minutes/60;
  clockHands.minute.rotation.z = -minutes/60 * Math.PI*2;
  clockHands.hour.rotation.z = -hours/12 * Math.PI*2;
}

// Small brick music building to the left of the kapok tree.
const soundPlace=new THREE.Vector3(-13.0,0,-6.0);
function createResonanceRoom(){
  const g=new THREE.Group();g.position.copy(soundPlace);world.add(g);
  buildingWall(g,5.1,3.45,3.7,0,1.75,0);
  gabledRoof(g,5.8,4.6,0,3.5,0,1.38);
  for(let x of [-1.52,1.52])windowArch(g,x,2.0,1.87,.94,1.62);
  box(g,1.13,2.17,.13,materials.darkWood,0,1.13,1.94);
  box(g,.68,1.30,.13,materials.darkGlass,0,1.57,2.05);
  for(let i=0;i<3;i++)box(g,2.4,.14,.43,materials.paleStone,0,.06+i*.14,2.52-i*.29);
  // Gramophone inside: a small visible gold accent.
  box(g,1.1,.34,.8,materials.wood,-1.4,.55,1.22);
  cyl(g,.11,.11,.8,materials.darkWood,-1.4,1.1,1.2);
  const horn=addMesh(g,new THREE.ConeGeometry(.46,.67,14,1,true),mat('#b99452',.37,.52),[-1.3,1.64,1.2]);horn.rotation.z=-Math.PI/2.8;
  const lamp=new THREE.PointLight('#ffbc72',2.2,10,2);lamp.position.set(0,2.8,2.5);g.add(lamp);
  const hit=box(g,5.6,4.2,5.0,new THREE.MeshBasicMaterial({visible:false}),0,2,0);
  register(hit,'sound');
  return g;
}
createResonanceRoom();
path([[-8.9,2.1],[-10.5,0.9],[-11.8,-1.2],[-12.8,-2.5],[-13.0,-3.36]],1.15);

createGardenArt({world,materials,mat,box,cyl,sphere,branchCylinder,gabledRoof,windowArch,path,kapok,bloomGeometry,leafGeometry,register});
window.minds3dReady=true;

// Pond deliberately adjacent to the Tea Pavilion (not at the other end of the garden).
const pondPos=new THREE.Vector3(8.8,0,5.45);
const waterGeo=new THREE.CircleGeometry(1,90);
const waterMat=new THREE.MeshPhysicalMaterial({color:'#719b98',roughness:.82,metalness:0,transmission:.08,transparent:true,opacity:.82,thickness:1.4,ior:1.22,clearcoat:.06,clearcoatRoughness:.85,side:THREE.DoubleSide});
const pond=addMesh(world,waterGeo,waterMat,[pondPos.x,.012,pondPos.z],false,false);
pond.rotation.x=-Math.PI/2;pond.scale.set(7.6,4.0,1);
const ripples=[];
for(let i=0;i<5;i++){
  const ripple=torus(world,1,.009,new THREE.MeshBasicMaterial({color:'#d2e7ce',transparent:true,opacity:.25,depthWrite:false}),pondPos.x+r(-2.2,2.2),.075,pondPos.z+r(-1.4,1.4));
  ripple.scale.set(1.2,.55,1.0);
  ripple.userData.rippleOffset=i/5;
  ripples.push(ripple);
}
const shore=addMesh(world,new THREE.RingGeometry(1.02,1.11,90),mat('#b7a68d'),[pondPos.x,-.015,pondPos.z],false,false);
shore.rotation.x=-Math.PI/2;shore.scale.set(7.6,4,1);
const pondBed=addMesh(world,new THREE.CircleGeometry(1,90),new THREE.MeshStandardMaterial({color:'#b0b59a',roughness:.96}),[pondPos.x,-.18,pondPos.z],false,true);
pondBed.rotation.x=-Math.PI/2;pondBed.scale.set(7.15,3.72,1);
// Lily pads and floating lotus flowers are static scenery; they don't trigger popups.
for(let i=0;i<30;i++){
  const a=r(0,Math.PI*2),rad=Math.sqrt(rng())*.79;
  const x=pondPos.x+Math.cos(a)*7.0*rad,z=pondPos.z+Math.sin(a)*3.65*rad;
  const leaf=addMesh(world,new THREE.CircleGeometry(r(.22,.5),13),materials.lily,[x,.055,z],false,false);
  leaf.rotation.x=-Math.PI/2;
  if(i%5===0){
    const blossom=sphere(world,.16,mat(i%2?'#f6b1b9':'#ffe4d8'),x,.21,z,8);blossom.scale.set(1,.55,1);
    for(let n=0;n<5;n++){
      const petal=addMesh(world,new THREE.SphereGeometry(.17,7,4),mat('#f4b7a5'),[x+Math.cos(n*1.256)*.13,.17,z+Math.sin(n*1.256)*.13],false,false);
      petal.scale.set(.95,.27,.58);petal.rotation.y=n*1.256;
    }
  }
}
for(let i=0;i<27;i++){
  const a=r(0,Math.PI*2),x=pondPos.x+Math.cos(a)*7.9,z=pondPos.z+Math.sin(a)*4.25;
  const rock=sphere(world,r(.27,.54),materials.stone,x,r(.02,.14),z,7);rock.scale.set(1.4,.5,.85);
}
// Pier, a little bridge-like connection to the tea pavilion.
for(let j=0;j<6;j++)box(world,2.9,.17,.45,materials.wood,11.75,.12,2.85+j*.46);

const teaPos=new THREE.Vector3(14.3,0,3.7);
let pavilionDisplay;
const foodDisplayGroups={};
function createTeaPavilion(){
  const g=new THREE.Group();g.position.copy(teaPos);world.add(g);
  cyl(g,3.05,3.12,.23,materials.paleStone,0,.15,0,8);
  // Open-sided hexagonal pavilion with dark green tiled roof and hanging lanterns.
  const columns=[];
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const x=Math.cos(a)*2.66,z=Math.sin(a)*2.66;columns.push([x,z]);
    cyl(g,.125,.135,3.18,materials.wood,x,1.84,z,9);
    cyl(g,.22,.2,.14,materials.paleStone,x,3.42,z,10);
  }
  for(let i=0;i<6;i++){
    const [x,z]=columns[i],[x2,z2]=columns[(i+1)%6];
    branchCylinder(g,new THREE.Vector3(x,3.43,z),new THREE.Vector3(x2,3.43,z2),.17,materials.darkWood);
    const aa=i*Math.PI/3,bb=(i+1)*Math.PI/3;
    const vertices=[0,4.65,0,Math.cos(aa)*3.25,3.45,Math.sin(aa)*3.25,Math.cos(bb)*3.25,3.45,Math.sin(bb)*3.25];
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
    addMesh(g,geo,new THREE.MeshStandardMaterial({color:'#37685c',side:THREE.DoubleSide,roughness:.65}),[0,0,0]);
    branchCylinder(g,new THREE.Vector3(0,4.65,0),new THREE.Vector3(Math.cos(aa)*3.26,3.45,Math.sin(aa)*3.26),.07,materials.roofTrim);
  }
  cyl(g,.35,.36,.4,materials.roofTrim,0,4.79,0);
  // Central display table: the selected Cantonese dish appears here.
  cyl(g,1.18,1.18,.22,materials.wood,0,1.06,0,25);
  cyl(g,.11,.11,.88,materials.darkWood,0,.59,0);
  pavilionDisplay=new THREE.Group();
  pavilionDisplay.position.set(0,1.17,0);
  g.add(pavilionDisplay);
  for(let a=0;a<3;a++){
    const angle=a*2.1+1;
    const lightPos=[Math.cos(angle)*2.1,3.01,Math.sin(angle)*2.1];
    cyl(g,.18,.18,.36,materials.lantern,...lightPos,8);
    const point=new THREE.PointLight('#ffbc63',1.7,6.5,2);point.position.set(...lightPos);g.add(point);
  }
  const hit=cyl(g,3.45,3.45,4.6,new THREE.MeshBasicMaterial({visible:false}),0,2.3,0,10);
  register(hit,'food');
  return g;
}
createTeaPavilion();

function clearGroup(group){ while(group.children.length) group.remove(group.children[0]); }
function addPlate(parent,color='#f4efe4',r=.88,y=0){
  const plate=cyl(parent,r,r,.11,mat(color,.94),0,y,0,28);
  cyl(parent,r*.72,r*.72,.06,mat('#efe2cf',.96),0,y+.07,0,26);
  return plate;
}
function makeFoodModel(id){
  const g=new THREE.Group();
  addPlate(g,'#f4eee3',.9,0);
  const warm=mat('#f1dec1',.92), wood=materials.wood, dark=materials.darkWood;
  const clay=mat('#906c47',.42);
  const ivory=mat('#f5ead7',.92), green=mat('#94b082',.88), gold=mat('#edc26e',.9), red=mat('#d86e5f',.9);
  const stick=(x,z,rad=.12,h=.16,col=warm)=>cyl(g,rad,rad,h,col,x,.12,z,14);
  switch(id){
    case 'mapotofu':
      for(let i=0;i<9;i++)box(g,.16,.13,.16,ivory,(i%3-1)*.21,.18,(Math.floor(i/3)-1)*.21);
      cyl(g,.45,.45,.04,red,0,.10,0,24);break;
    case 'risotto': case 'curry':
      cyl(g,.45,.34,.18,ivory,0,.13,0,24);
      for(let i=0;i<22;i++)sphere(g,.055,id==='curry'?gold:warm,Math.sin(i*2.4)*.3,.24,Math.cos(i*2.4)*.3,6);break;
    case 'sushi':
      for(let i=0;i<5;i++){let x=(i%3-1)*.28,z=Math.floor(i/3)*.3-.1;cyl(g,.13,.13,.2,materials.lily,x,.18,z);cyl(g,.105,.105,.01,ivory,x,.285,z);sphere(g,.05,green,x,.30,z);}break;
    case 'tacos':
      for(let i=0;i<3;i++){const taco=sphere(g,.22,gold,(i-1)*.35,.22,0,12);taco.scale.set(.55,1,1);sphere(g,.1,green,(i-1)*.35,.35,0);sphere(g,.06,red,(i-1)*.35,.39,.09);}break;
    case 'tea':
      sphere(g,.26,clay,-.12,.28,0,15).scale.set(1,.72,1);
      cyl(g,.13,.17,.1,clay,-.12,.45,0,16);
      torus(g,.2,.035,clay,-.35,.30,0,0);
      cyl(g,.04,.08,.22,clay,.08,.34,0,10).rotation.z=-Math.PI/3.2;
      cyl(g,.18,.18,.12,ivory,.38,.12,.06,16);
      break;
    case 'herbaltea':
      cyl(g,.24,.24,.3,mat('#775235'),0,.18,0,18);
      cyl(g,.26,.22,.12,mat('#a67b4c'),0,.38,0,16);
      torus(g,.12,.025,mat('#6f4a30'),-.28,.2,0,0);
      for(const p of [[.42,.06],[.22,.18],[-.38,-.08]]) sphere(g,.06,green,p[0],.16,p[1],8);
      break;
    case 'hargow':
      for(const p of [[-.24,0],[.02,.12],[.28,-.08]]){ const dum=sphere(g,.16,ivory,p[0],.16,p[1],12); dum.scale.set(1.05,.62,1); }
      break;
    case 'siumai':
      for(const p of [[-.24,0],[.02,.12],[.28,-.08]]){ cyl(g,.16,.15,.14,gold,p[0],.15,p[1],14); sphere(g,.045,mat('#f29f56'),p[0],.26,p[1],8); }
      break;
    case 'charsiu':
      for(const p of [[-.24,0],[.02,.12],[.28,-.08]]){ const bun=sphere(g,.18,ivory,p[0],.18,p[1],12); bun.scale.set(1,.72,1); }
      break;
    case 'cheungfun':
      for(let i=0;i<3;i++){ const roll=cyl(g,.14,.14,.56,ivory,-.24+i*.24,.16,0,16); roll.rotation.z=Math.PI/2.1; }
      sphere(g,.05,mat('#b66f42'),.34,.2,-.16,8);
      break;
    case 'claypot':
      cyl(g,.3,.34,.22,clay,0,.19,0,20);
      cyl(g,.34,.3,.06,mat('#5f4634'),0,.31,0,20);
      sphere(g,.05,mat('#221814'),0,.39,0,8);
      sphere(g,.07,red,.1,.38,.12,8); sphere(g,.06,green,-.12,.38,-.08,8);
      break;
    case 'wonton':
      const bowl=cyl(g,.38,.3,.22,ivory,0,.13,0,22);
      const soup=sphere(g,.27,mat('#e8c57a'),0,.2,0,14); soup.scale.set(1,.38,1);
      for(let i=0;i<4;i++){ const n=torus(g,.13+i*.02,.018,mat('#f0d984'),0,.28,0,0); n.rotation.x=Math.PI/2; }
      break;
    case 'roastgoose':
      const body=sphere(g,.28,mat('#8a4d2a'),0,.24,0,14); body.scale.set(1.35,.72,.9);
      sphere(g,.08,mat('#d7c16f'),-.16,.38,-.1,8); sphere(g,.08,mat('#d7c16f'),.17,.36,.08,8);
      break;
    case 'doubleskin':
      cyl(g,.28,.28,.22,ivory,0,.12,0,20);
      sphere(g,.2,mat('#fff7ef'),0,.28,0,14).scale.set(1,.35,1);
      sphere(g,.05,mat('#f7cf63'),.08,.34,.02,8);
      break;
    case 'egg_tart':
      cyl(g,.28,.24,.14,mat('#c59a56'),0,.1,0,18);
      sphere(g,.2,mat('#f7d76b'),0,.18,0,12).scale.set(1,.35,1);
      break;
    case 'gingermilk':
      cyl(g,.31,.22,.22,mat('#e1d8be'),0,.15,0,22);
      cyl(g,.28,.28,.025,mat('#fff1cb'),0,.275,0,22);
      for(let i=0;i<3;i++)sphere(g,.035,mat('#c99851'),-.10+i*.08,.3,.08,6);
      break;
    case 'mango':
      cyl(g,.32,.28,.2,ivory,0,.1,0,18);
      sphere(g,.16,mat('#ffb044'),-.1,.29,.02,10); sphere(g,.14,mat('#ffc356'),.1,.26,-.06,10);
      break;
    case 'lotus':
      for(const p of [[-.18,.02],[.12,.12],[.25,-.12]]){ sphere(g,.11,mat('#ffd4db'),p[0],.16,p[1],10).scale.set(1.1,.85,1); }
      break;
    default:
      for(const p of [[-.24,0],[.02,.12],[.28,-.08]]) stick(p[0],p[1]);
  }
  return g;
}
function setFoodDisplay(id){
  if(!pavilionDisplay)return;
  for(const child of pavilionDisplay.children)child.visible=false;
  if(!foodDisplayGroups[id])foodDisplayGroups[id]=makeFoodModel(id||'tea');
  const model=foodDisplayGroups[id];model.visible=true;
  model.scale.setScalar(1.25);pavilionDisplay.add(model);
  pavilionDisplay.userData.food=id;
  canvas.dataset.food=id;
  const label=el('table-label');if(label)label.textContent='ON THE TABLE · '+id.replaceAll('_',' ');
}
setFoodDisplay('tea');

function lampPost(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
  cyl(g,.06,.095,2.9,materials.darkWood,0,1.45,0);
  box(g,.44,.47,.44,materials.lantern,0,3.0,0);
  cyl(g,.29,.18,.19,materials.darkWood,0,3.36,0);
  const light=new THREE.PointLight('#ffbd77',1.05,6.3,2);light.position.set(0,2.94,0);g.add(light);return light;
}
const lanternLights=[];
for(let [x,z] of [[-9,2],[-1.3,-1.3],[1,5.4],[7.0,1.5],[16.7,6]])lanternLights.push(lampPost(x,z));

// Initially almost invisible hollow at base of the kapok, only glows after two visits.
const secret = new THREE.Group();secret.position.set(kapokPos.x-.22,0,kapokPos.z+.48);secret.scale.set(.65,.74,.55);secret.rotation.y=-0.08;world.add(secret);
const hollow=addMesh(secret,new THREE.CircleGeometry(.66,20),mat('#261811'),[0,1.05,.18]);
hollow.scale.y=1.48;
const arch=torus(secret,.78,.18,materials.barkLight,0,1.05,.27,0);arch.scale.y=1.5;
const seal=addMesh(secret,new THREE.RingGeometry(.44,.57,40),new THREE.MeshBasicMaterial({color:'#efb65d',side:THREE.DoubleSide,transparent:true,opacity:.5}),[0,1.06,.42],false,false);
seal.scale.y=1.45;
const secretLight=new THREE.PointLight('#ffae59',3.2,8,2);secretLight.position.set(0,1.5,1.0);secret.add(secretLight);
const heartHit=addMesh(secret,new THREE.PlaneGeometry(2.3,3.4),new THREE.MeshBasicMaterial({visible:false}),[0,1.5,.8],false,false);
register(heartHit,'heart');
secret.visible=false;

// Secondary 3D environment: a magically expanded tree hollow, not a flat modal.
const heartScene=new THREE.Scene();heartScene.background=new THREE.Color('#21150f');heartScene.fog=new THREE.FogExp2('#21150f',.025);
heartScene.add(new THREE.HemisphereLight('#ffdcb8','#2c1e1b',1.1));
const heartLight=new THREE.PointLight('#ffc98c',80,24,1.8);heartLight.position.set(0,9,0);heartScene.add(heartLight);
const interiorCamera=new THREE.PerspectiveCamera(48,window.innerWidth/window.innerHeight,.1,120);
interiorCamera.position.set(8,5.1,10);
const interiorControls=new OrbitControls(interiorCamera,canvas);
interiorControls.target.set(0,3.8,0);interiorControls.enableDamping=true;
interiorControls.minDistance=2;interiorControls.maxDistance=22;
interiorControls.minPolarAngle=.2;interiorControls.maxPolarAngle=1.58;
interiorControls.enablePan=false;interiorControls.enabled=false;
interiorControls.update();
const inners=new THREE.Group();heartScene.add(inners);
const woodWall=new THREE.MeshStandardMaterial({color:'#6b4128',roughness:.9,side:THREE.BackSide});
const wall=addMesh(inners,new THREE.CylinderGeometry(7,6.25,15,40,1,true),woodWall,[0,7.5,0],false,true);
// Vertical ribbing suggests the growth of the hollow interior.
for(let i=0;i<34;i++){
  const angle=i*2*Math.PI/34;
  const rr=6.52;
  const rib=cyl(inners,.085,.13,13.7,mat(i%2?'#765035':'#53321f'),Math.cos(angle)*rr,7.1,Math.sin(angle)*rr,6);
  rib.rotation.z=.05*Math.sin(angle*3);
}
const floor=cyl(inners,6.5,6.5,.25,mat('#78563a'),0,.08,0,44);
for(let i=0;i<7;i++){
  const radius=1.15+i*.68;
  torus(inners,radius,.018,mat('#a27b53'),0,.23,0);
}
// Spiral stairs / circular bookcases: inspired by the reference tree-hollow library.
for(let i=0;i<36;i++){
  const angle=i*.25;
  const x=Math.cos(angle)*4.85,z=Math.sin(angle)*4.85,y=.45+i*.23;
  const step=box(inners,1.65,.16,.8,materials.wood,x,y,z);
  step.rotation.y=-angle;
  if(i%2===0){
    cyl(inners,.055,.055,1.04,mat('#ae8759'),Math.cos(angle)*5.47,y+.57,Math.sin(angle)*5.47,6);
  }
}
for(let level=0;level<3;level++){
  const y=1.35+level*2.7;
  for(let b=0;b<18;b++){
    const a=b*Math.PI*2/18,rad=5.9;
    const book=new THREE.Group();book.position.set(Math.cos(a)*rad,y,Math.sin(a)*rad);
    book.rotation.y=-a+Math.PI/2;inners.add(book);
    box(book,1.3,.10,.40,materials.wood,0,0,0);
    const cols=['#9e593f','#d09b62','#8b996c','#b36d58','#e1ba7a'];
    for(let n=0;n<8;n++){
      box(book,r(.10,.15),r(.3,.68),.3,mat(cols[(n+b)%cols.length]),-.55+n*.15,.3,0);
    }
  }
}
const books=createBooks(heartScene,box,mat,register,showToast);
const floatingDust=[];
for(let i=0;i<55;i++){
  const angle=r(0,Math.PI*2),rr=r(.5,5.3),y=r(.4,12);
  const orb=sphere(inners,r(.025,.09),new THREE.MeshBasicMaterial({color:i%2?'#f9bd69':'#ffedcc',transparent:true,opacity:.68}),Math.cos(angle)*rr,y,Math.sin(angle)*rr,6);
  orb.userData.float=r(0,10);floatingDust.push(orb);
}
// A floating 'thought sculpture' reacts to the selected food and music.
const sculpture=new THREE.Group();sculpture.position.set(0,2.7,0);inners.add(sculpture);
for(let i=0;i<9;i++){
  const a=i/9*Math.PI*2;
  const leaf=addMesh(sculpture,new THREE.OctahedronGeometry(.67,0),new THREE.MeshPhysicalMaterial({color:'#eeb36c',roughness:.16,metalness:.5,transmission:.15,emissive:'#7c3b1b',emissiveIntensity:.5}),[Math.cos(a)*1.45,Math.sin(a)*.38,Math.sin(a)*1.45],false,false);
  leaf.rotation.set(a,.3,a*2);leaf.scale.set(.65,1.38,.65);
}
sphere(sculpture,.49,new THREE.MeshStandardMaterial({color:'#ffe1a0',emissive:'#fdba68',emissiveIntensity:2.5}),0,0,0,16);
const innerGlow=new THREE.PointLight('#f7a45e',17,9,2);innerGlow.position.set(0,3.4,0);inners.add(innerGlow);

// ---------- Garden interaction model ----------
const defaultState = {food:null,sound:null,night:false,muted:true,visitedHeart:false};
let save={...defaultState};
try{save={...defaultState,...JSON.parse(localStorage.getItem('minds-garden-v1')||'{}')}}catch{}
if(!Array.isArray(save.journal))save.journal=[];
// Ignore malformed previously stored entries; notes never arrive from a server.
save.journal=save.journal.filter(e=>e&&typeof e.text==='string'&&typeof e.prompt==='string');
let inHeart=false;
let panelOpen=false;
let activePanel='';
let disposePiano=null;
const planting={tick(){}};
let heartOverlayOpen=false;
let elapsed=0;
let cameraTween=null;
setFoodDisplay(save.food||'tea');
// Food selections gently colour the environment and the tree-heart sculpture.
const choiceColors={};
function persist(){try{localStorage.setItem('minds-garden-v1',JSON.stringify(save));return true;}catch{return false;}}
const unlocked=()=>true;
function refreshUnlock(){
  const isOpen=unlocked();
  secret.visible=isOpen;
  const heartLink=el('nav-heart');
  heartLink.classList.remove('locked');
  heartLink.classList.toggle('unlocked',isOpen);
  heartLink.title='Philosophy — your own reflection journal';
  heartLink.setAttribute('aria-label','Philosophy — write and revisit your thoughts');
  // Unlocking enables this interaction, but the label stays hidden until hovered.
}
function showToast(message){
  const t=el('toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timeout);
  showToast.timeout=setTimeout(()=>t.classList.remove('show'),2900);
}
function focusOn(target, distance=19,angleBias=0){
  const at=target.clone();at.y=Math.max(at.y,2);
  const to=at.clone().add(new THREE.Vector3(distance*.35, distance*.39,distance*.8));
  if(angleBias)to.x+=angleBias;
  cameraTween={start:performance.now(),fromP:camera.position.clone(),fromT:orbit.target.clone(),toP:to,toT:at,dur:950};
}
function focusGarden(){focusOn(gardenCenter,window.innerWidth<720?92:58,0);}
function refreshMood(){
  const selected=foodOptions.find(item=>item.id===save.food);
  const color=selected?.color||'#ffddaf';
  sun.color.set(save.night?'#88a9d4':'#fff0d8');
  if(save.food){sculpture.children.filter(ch=>ch.isMesh).forEach(m=>{if(m.material?.color)m.material.color.set(color);});}
  const isNight=save.night;
  world.background = isNight?new THREE.Color('#17253b'):duskSky;
  world.fog.color.set(isNight?'#26364c':'#c7d4c5');
  ambience.intensity=isNight?.78:1.8;
  sun.intensity=isNight?.55:2.5;
  fill.intensity=isNight?1.0:.7;
  renderer.toneMappingExposure=isNight?.98:1.12;
  lanternLights.forEach(light=>light.intensity=isNight?3.3:1.05);
  waterMat.color.set(isNight?'#405b66':'#719b98');
  clouds.forEach(c=>c.traverse(o=>{ if(o.isMesh) o.material.opacity = isNight ? 0.12 : (o.userData.baseOpacity||0.4); }));
  document.body.classList.toggle('night',isNight);weather.apply(isNight);
}

// Three original miniature instrumental loops: melody + arpeggios + bass + soft rhythm.
// No commercial music or external mp3 files. Explicit Play / Stop controls.
let audioCtx=null, audioMaster=null, audioTimer=null, audioNodes=[], musicStep=0,nextNoteAt=0;
let activeTrack=null;
const midiToFreq=(note)=>440*Math.pow(2,(note-69)/12);
const trackDefinitions={
  stillness:{bpm:70,roots:[48,45,41,43],notes:[72,76,79,76,74,72,69,null,72,76,81,79,76,74,72,null],wave:'sine',name:'Stillness'},
  golden:{bpm:96,roots:[50,45,47,43],notes:[74,78,81,83,81,78,76,74,78,81,85,83,81,78,74,71],wave:'triangle',name:'Golden Hour'},
  rain:{bpm:80,roots:[45,41,48,43],notes:[72,76,79,null,76,72,69,null,71,74,79,76,74,71,69,null],wave:'sine',name:'After Rain'},
  lantern:{bpm:84,roots:[48,43,45,41],notes:[76,79,81,79,76,74,72,74,76,79,84,81,79,76,74,72],wave:'triangle',name:'Lantern Walk'},
  twilight:{bpm:64,roots:[43,39,41,45],notes:[67,70,74,77,74,70,67,null,69,72,77,79,77,72,70,null],wave:'sine',name:'Twilight Letters'}
};
let echoDelay=null,echoFeedback=null,echoFilter=null;

function stopAudio(){
  if(audioTimer!==null){clearInterval(audioTimer);audioTimer=null;}
  if(audioMaster&&audioCtx){
    try{audioMaster.gain.cancelScheduledValues(audioCtx.currentTime);audioMaster.gain.setTargetAtTime(0,audioCtx.currentTime,.08);}catch{}
  }
  const oldMaster=audioMaster;audioMaster=null;
  activeTrack=null;musicStep=0;
  // Release the old gain after the brief fade-out, including on repeated play/stop.
  if(oldMaster)setTimeout(()=>{try{oldMaster.disconnect();}catch{}},900);
  updateSoundIcon();
  const status=document.getElementById('music-status');if(status)status.textContent='Paused';
  const playButton=document.getElementById('music-play-toggle');if(playButton)playButton.textContent='▶ Play composition';
}
function scheduleTone(midi,time,duration,volume,wave='sine',release=.28){
  if(!audioCtx||!audioMaster||midi==null)return;
  const oscillator=audioCtx.createOscillator();oscillator.type=wave;
  oscillator.frequency.setValueAtTime(midiToFreq(midi),time);
  const gain=audioCtx.createGain();gain.gain.setValueAtTime(.00001,time);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.03);
  gain.gain.exponentialRampToValueAtTime(Math.max(.00001,volume*.35),time+Math.max(.10,duration*.68));
  gain.gain.exponentialRampToValueAtTime(.00001,time+duration+release);
  const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=wave==='triangle'?1900:2400;
  oscillator.connect(filter);filter.connect(gain);gain.connect(audioMaster);
  // A quiet octave overtone adds a warmer, bell-like character without external recordings.
  let overtone=null,overGain=null;
  if(volume>=.025){
    overtone=audioCtx.createOscillator();overtone.type='sine';
    overtone.frequency.value=midiToFreq(midi+12);overtone.detune.value=3;
    overGain=audioCtx.createGain();overGain.gain.value=.12;
    overtone.connect(overGain);overGain.connect(gain);overtone.start(time);overtone.stop(time+duration+release+.03);
  }
  oscillator.start(time);oscillator.stop(time+duration+release+.03);
  oscillator.onended=()=>{try{oscillator.disconnect();filter.disconnect();gain.disconnect();overtone?.disconnect();overGain?.disconnect();}catch{}};
}
function advanceMusic(){
  if(!audioCtx||!activeTrack||!audioMaster)return;
  const cfg=trackDefinitions[activeTrack],beat=60/cfg.bpm,stepLength=beat/2;
  while(nextNoteAt<audioCtx.currentTime+.19){
    const i=musicStep%32,bar=Math.floor(i/8),root=cfg.roots[bar];
    // Four-chord cycle with third, fifth and ninth for richer harmonic movement.
    if(i%8===0){
      [root+12,root+16,root+19,root+26].forEach((n,k)=>
        scheduleTone(n,nextNoteAt,stepLength*7.3,[.019,.018,.015,.009][k],'sine',.7));
      scheduleTone(root-12,nextNoteAt,stepLength*5,.033,'triangle',.35);
    }
    if(i%4===0)scheduleTone(root,nextNoteAt,stepLength*2.4,.028,'sine',.24);
    if(i%2===0){
      const note=cfg.notes[(i/2)%cfg.notes.length];
      if(note!=null)scheduleTone(note,nextNoteAt,stepLength*(activeTrack==='golden'?1.4:2),.043,cfg.wave,.22);
    }
    // Two intertwining arpeggios at different registers, gentle and never piercing.
    if(i%2===1 && (activeTrack==='golden'||activeTrack==='lantern')){
      const arp=[root+24,root+28,root+31,root+28][(i>>1)%4];
      scheduleTone(arp,nextNoteAt,stepLength*.9,.013,'sine',.18);
    }
    if((activeTrack==='rain'||activeTrack==='twilight')&&i%8===6)
      scheduleTone(root+31,nextNoteAt,stepLength*2.8,.013,'sine',.52);
    nextNoteAt+=stepLength;musicStep++;
  }
}
function playSound(preset){
  stopAudio();stopComposition();
  if(save.muted||!preset||!trackDefinitions[preset])return;
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  if(!audioCtx)audioCtx=new Audio();
  audioCtx.resume().catch(()=>{});
  audioMaster=audioCtx.createGain();audioMaster.gain.value=.01;
  audioMaster.connect(audioCtx.destination);
  // Short, filtered echo enriches the original compositions.
  if(!echoDelay){
    echoDelay=audioCtx.createDelay(.8);echoDelay.delayTime.value=.27;
    echoFeedback=audioCtx.createGain();echoFeedback.gain.value=.19;
    echoFilter=audioCtx.createBiquadFilter();echoFilter.type='lowpass';echoFilter.frequency.value=1200;
    echoDelay.connect(echoFilter);echoFilter.connect(echoFeedback);echoFeedback.connect(echoDelay);
    echoFilter.connect(audioCtx.destination);
  }
  audioMaster.connect(echoDelay);
  audioMaster.gain.setTargetAtTime(.62,audioCtx.currentTime,.12);
  activeTrack=preset;musicStep=0;nextNoteAt=audioCtx.currentTime+.08;
  advanceMusic();audioTimer=setInterval(advanceMusic,35);
  updateSoundIcon();
  const status=document.getElementById('music-status');if(status)status.textContent='Playing · '+trackDefinitions[preset].name;
  const playButton=document.getElementById('music-play-toggle');if(playButton)playButton.textContent='❚❚ Pause composition';
}
function updateSoundIcon(){
  const button=el('sound-toggle');
  button.style.opacity=activeTrack?'.95':'.56';
  button.title=activeTrack?'Stop music':'Play selected music';
  button.setAttribute('aria-label',activeTrack?'Stop music':'Play selected music');
}

const foodOptions=[
 ...worldDishes,
 {id:'tea',category:'Tea',icon:'🍵',title:'Jasmine Tea',desc:'A fragrant, calming cup.',fact:'Tea is part of the rhythm of a traditional Cantonese dim sum gathering.',color:'#ffd5a0'},
 {id:'herbaltea',category:'Tea',icon:'🌿',title:'Cantonese Herbal Tea',desc:'A bittersweet local tradition.',fact:'Herbal teas have a long history in southern China, with many different local recipes.',color:'#c3dca4'},
 {id:'hargow',category:'Dim Sum',icon:'🥟',title:'Har Gow',desc:'Crystal shrimp dumplings.',fact:'The translucent, pleated wrapper is a familiar sight at yum cha.',color:'#ffc5b1'},
 {id:'siumai',category:'Dim Sum',icon:'🥟',title:'Siu Mai',desc:'Steamed pork and shrimp bites.',fact:'A classic item served in bamboo steamers, often enjoyed with tea.',color:'#f9c68a'},
 {id:'charsiu',category:'Dim Sum',icon:'🥮',title:'Char Siu Bao',desc:'Fluffy BBQ pork buns.',fact:'The soft bun contrasts with its sweet-savory roast pork filling.',color:'#f4cfaa'},
 {id:'cheungfun',category:'Dim Sum',icon:'🥢',title:'Cheung Fun',desc:'Silky steamed rice rolls.',fact:'Rice noodle sheets are usually served with a light, savory sauce.',color:'#f3ddb5'},
 {id:'egg_tart',category:'Desserts',icon:'🥧',title:'Egg Tart',desc:'Flaky pastry with silky custard.',fact:'The Cantonese-style egg tart is a much-loved bakery treat.',color:'#f8d18b'},
 {id:'doubleskin',category:'Desserts',icon:'🥛',title:'Double-Skin Milk',desc:'A delicate Shunde milk pudding.',fact:'This smooth milk dessert is associated with Shunde in Guangdong.',color:'#d6e8da'},
 {id:'gingermilk',category:'Desserts',icon:'🍮',title:'Ginger Milk Curd',desc:'Warm milk meets aromatic ginger.',fact:'A soft-set dessert known for its gentle texture and ginger warmth.',color:'#f6dfb6'},
 {id:'claypot',category:'Meals',icon:'🍚',title:'Claypot Rice',desc:'Fragrant rice with a crisp base.',fact:'Rice cooked in a clay pot can form a cherished golden crust.',color:'#edb987'},
 {id:'wonton',category:'Meals',icon:'🍜',title:'Wonton Noodles',desc:'Springy noodles in a clear broth.',fact:'Shrimp wontons and fine noodles are a beloved Cantonese comfort dish.',color:'#f1d29d'},
 {id:'roastgoose',category:'Meals',icon:'🍗',title:'Roast Goose',desc:'Crisp skin, rich savory flavor.',fact:'A Cantonese roast-meat classic, usually shared as part of a meal.',color:'#e7ac91'}
];
const kitchenNotes={"tea": "Warm a pot, add jasmine tea leaves and pour in hot water. Steep briefly, then taste before pouring. Re-steep the leaves with slightly longer infusions; tea strength is a personal preference.", "herbaltea": "For a simple home infusion, rinse dried chrysanthemum flowers and steep them in hot water. Add a little rock sugar if desired. This is one approachable drink, not a substitute for the many traditional Cantonese herbal blends.", "hargow": "Combine wheat starch and tapioca starch with boiling water to form a supple wrapper. Fill small discs with chopped shrimp, bamboo shoots and seasoning, pleat carefully, and steam until the shrimp filling is fully cooked.", "siumai": "Mix minced pork, chopped shrimp, mushrooms and seasoning. Set portions into wonton wrappers, leaving the tops open. Steam until the filling is fully cooked; serve hot in a bamboo basket.", "charsiu": "Dice cooked char siu and fold it into a thick savory-sweet sauce. Enclose spoonfuls in small rounds of risen yeast dough, seal, rest, then steam until the buns are fluffy and cooked through.", "cheungfun": "Whisk rice flour with a little tapioca starch and water into a thin batter. Steam a shallow layer on an oiled tray, loosen the delicate sheet and roll it up. Finish with light soy sauce and sesame oil.", "egg_tart": "Line small tins with pastry. Whisk eggs with milk and cooled sugar syrup, strain and pour into the shells. Bake until the pastry is golden and the custard is set with a gentle wobble.", "doubleskin": "Heat whole milk and allow a skin to form as it cools. Carefully combine the milk underneath with egg white and sugar, return it beneath the skin, then gently steam until set. Chill or serve warm.", "gingermilk": "Grate fresh ginger and squeeze out the juice. Warm sweetened whole milk, then pour it briskly over a little ginger juice. Leave undisturbed to set; ginger freshness and milk temperature affect the result.", "claypot": "Soak rice, then cook with measured water in a clay pot. Add sliced cooked sausage or vegetables as the rice begins to set. Finish gently to develop a crisp base, and serve with a savory soy dressing.", "wonton": "Wrap a small spoonful of seasoned pork and shrimp in wonton skins. Simmer until fully cooked. Cook fine egg noodles separately, then combine with hot clear broth and greens.", "roastgoose": "A traditional roast involves seasoning, drying the skin and carefully controlled roasting. For a home version, season a prepared goose, roast on a rack until fully cooked and rest before carving. Serve with a tart plum sauce."};
for(const item of foodOptions){choiceColors[item.id]=item.color;item.recipe=item.recipe||kitchenNotes[item.id];}
const soundOptions=[
 {id:'stillness',icon:'☾',title:'Stillness',desc:'Slow piano-like notes, soft suspended chords.'},
 {id:'golden',icon:'☀',title:'Golden Hour',desc:'Warm, playful melody and dancing arpeggios.'},
 {id:'rain',icon:'☂',title:'After Rain',desc:'A gentle drifting motif with light echoes.'},
 {id:'lantern',icon:'✧',title:'Lantern Walk',desc:'A bright, intimate evening melody.'},
 {id:'twilight',icon:'✉',title:'Twilight Letters',desc:'A thoughtful, slower nocturne.'}
];
const immersion=createImmersion({rooms,entries:()=>save.journal,leave:()=>{closePanel();focusGarden();},navigate:which=>openPanel(which),viewTable:()=>{closePanel();document.body.classList.add('view-food');},openTool:tool=>{
 document.body.classList.remove('room-idle');document.body.classList.add('room-tool-open');document.body.dataset.tool=tool;
 const panel=el('panel');panel.inert=false;panel.setAttribute('aria-hidden','false');panel.scrollTop=0;
 requestAnimationFrame(()=>{if(tool==='write')panel.querySelector('textarea')?.focus({preventScroll:true});else panel.querySelector('button')?.focus({preventScroll:true});});
}});
function returnToRoom(){document.body.classList.add('room-idle');document.body.classList.remove('room-tool-open');el('panel').inert=true;el('panel').setAttribute('aria-hidden','true');document.querySelector('.room-object:not([hidden])')?.focus({preventScroll:true});}
function renderJournal(target){
  renderReflection(target,{
    getEntries:()=>save.journal,setEntries:entries=>{save.journal=entries;},persist,toast:showToast,
    viewGarden:()=>{closePanel();focusOn(new THREE.Vector3(-6.5,1.2,9.4),16);},
    openHeart:()=>openPanel('heart'),openGreenhouse:()=>openPanel('greenhouse')
  });
}

function setActiveNavigation(id){
  const activeId = id === 'info' ? 'about' : id === 'philosophy' ? 'heart' : id;
  document.querySelectorAll('.site-navigation .nav-link').forEach(button=>{
    const selected = button.id === 'nav-' + activeId;
    button.classList.toggle('active',selected);
    if(selected) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
}
function openPanel(which, arrived=false){
  if(inHeart&&which!=='info')return;
  if(!arrived&&['sound','philosophy','food','greenhouse'].includes(which)&&activePanel!==which){changeScene(()=>openPanel(which,true));return;}
  if(which==='weather'){weather.cycle();return;}
  document.body.classList.toggle('room-view',['sound','philosophy','greenhouse'].includes(which));
  immersion.leave();document.body.dataset.room=which;
  disposePiano?.();disposePiano=null;
  document.body.classList.toggle('view-food',which==='food');
  if(inHeart&&which!=='info')return;
  if(activePanel==='sound'&&which!=='sound'&&activeTrack){save.muted=true;stopAudio();persist();}
  if(which==='heart'){
    if(!unlocked()) {showToast('Explore Food and Music first to reveal the Hidden Heart.');return;}
    setActiveNavigation('heart');enterHeart();return;
  }
  panelOpen=true;activePanel=which;setActiveNavigation(which);
  const p=el('panel'),content=el('panel-inner');
  let options=[],title='',intro='',kicker='',tip='';
  if(which==='food'){
    kicker='01 / THE FLAVOR GARDEN';title='A Taste of Home';
    intro='Travel through flavors, their stories, and the kitchens they come from.';
    tip='Select a dish to open its story and kitchen notes.';
    options=foodOptions;focusOn(new THREE.Vector3(teaPos.x,1.5,teaPos.z),9,-2.6);
  }else if(which==='sound'){
    kicker='02 / THE RESONANCE ROOM';title='The listening room.';
    intro='Play, record and compose your own soundtrack.';
    tip='Original looping compositions generated in real time by Web Audio. Choose a track, then press Pause anytime.';
    options=soundOptions;focusOn(new THREE.Vector3(soundPlace.x,2.3,soundPlace.z),12);
  }else if(which==='philosophy'){
    kicker='03 / THE WRITER’S COTTAGE';title='Make yourself at home.';
    intro='Take the chair by the window. Keep a thought on the desk, or return to an earlier page.';focusOn(new THREE.Vector3(-18.2,1.5,5.6),14);
  }else if(which==='greenhouse'){kicker='THE GLASSHOUSE';title='Your thoughts, in bloom.';intro='Every flower holds a thought.';
  }else{
    kicker='A NOTE FROM MINDS';title='How to Explore';
    intro='Drag to orbit, scroll to zoom, then hover over a building to reveal its name. Click a place to interact. On touchscreens, tap a place or use the top menu. Explore the kapok tree after visiting both places.';
  }
  content.replaceChildren();
  const small=document.createElement('div');small.className='smallcaps';small.textContent=kicker;content.append(small);
  const h2=document.createElement('h2');h2.id='panel-title';h2.textContent=title;content.append(h2);
  const desc=document.createElement('p');desc.textContent=intro;content.append(desc);
  if(which==='philosophy'){
    const journalContainer=document.createElement('div');journalContainer.className='journal';content.append(journalContainer);renderJournal(journalContainer);
  }else if(options.length){
    if(which==='sound')disposePiano=renderComposer(content,showToast);
    const choices=document.createElement('div');choices.className='choice-grid';
    if(which==='food'){
      const tabs=document.createElement('div');tabs.className='food-tabs';
      for(const category of ['All','World Kitchen','Dim Sum','Meals','Desserts','Tea']){
        const tab=document.createElement('button');tab.className='food-tab';tab.textContent=category;
        tab.classList.toggle('active',category==='All');
        tab.addEventListener('click',()=>{
          tabs.querySelectorAll('.food-tab').forEach(t=>t.classList.toggle('active',t===tab));
          choices.querySelectorAll('.choice').forEach(btn=>btn.hidden=category!=='All'&&btn.dataset.category!==category);
        });
        tabs.append(tab);
      }
      content.append(tabs);
    }
    const foodFact=document.createElement('div');foodFact.className='food-fact';
    if(which==='food'){
      const chosen=foodOptions.find(o=>o.id===save.food);
      foodFact.textContent=chosen?`${chosen.title} — ${chosen.fact}`:'Choose a dish to discover its cultural story and a short home-kitchen introduction.';if(chosen){const recipe=document.createElement('p');recipe.textContent='IN THE KITCHEN · '+chosen.recipe;foodFact.append(recipe);}
    }
    options.forEach(option=>{
      const button=document.createElement('button');button.className='choice';
      if(save[which]===option.id)button.classList.add('selected');
      if(which==='food')button.dataset.category=option.category;
      button.innerHTML=`<span class="choice-emoji">${option.icon}</span><span><strong>${option.title}</strong><small>${option.desc}</small></span>`;
      button.addEventListener('click',()=>{
        const previously=unlocked();save[which]=option.id;
        if(which==='sound'){save.muted=false;playSound(option.id);updateSoundIcon();}
        persist();refreshUnlock();refreshMood();
        choices.querySelectorAll('.choice').forEach(b=>b.classList.remove('selected'));
        button.classList.add('selected');
        if(which==='food'){setFoodDisplay(option.id);immersion.showFood(option);foodFact.textContent=option.title+' — '+option.fact;const article=document.createElement('p');article.textContent='IN THE KITCHEN · '+(option.recipe||'A home-kitchen introduction: '+option.desc+' Explore the balance of texture, aroma and temperature. Serve freshly prepared, and adapt the seasoning to your taste.');foodFact.append(article);}
        if(!previously&&unlocked())showToast('Something glimmers beneath the kapok tree...');
        else showToast(which==='food'?'The garden remembers your flavor.':'A new atmosphere fills the garden.');
      });
      choices.append(button);
    });
    content.append(choices);
    if(which==='food'){
      content.append(foodFact);
      const seeTable=document.createElement('button');seeTable.className='soft-button see-table';seeTable.textContent='See your dish on the table ↗';
      seeTable.onclick=()=>{closePanel();document.body.classList.add('view-food');};content.append(seeTable);
    }
    if(which==='sound'){
      const controls=document.createElement('div');controls.className='music-controls';
      const playback=document.createElement('button');playback.id='music-play-toggle';playback.className='soft-button';
      playback.textContent=activeTrack?'❚❚ Pause composition':'▶ Play composition';
      playback.onclick=()=>{
        if(activeTrack){save.muted=true;stopAudio();}
        else if(save.sound){save.muted=false;playSound(save.sound);}
        else{showToast('Select one of the three compositions first.');}
        persist();updateSoundIcon();
      };
      const status=document.createElement('span');status.id='music-status';status.className='music-status';
      status.textContent=activeTrack?'Playing · '+trackDefinitions[activeTrack].name:'Paused';
      controls.append(playback,status);content.append(controls);
    }
    const help=document.createElement('p');help.className='panel-tip';help.textContent=tip;content.append(help);
  }else if(which!=='greenhouse'){
    const btn=document.createElement('button');btn.className='soft-button';btn.textContent='Restart your discovery';
    btn.onclick=()=>{save={...defaultState,night:save.night,journal:save.journal};stopAudio();setFoodDisplay('tea');persist();refreshUnlock();refreshMood();closePanel();focusGarden();showToast('Your garden is ready for a new story.');};
    const coverButton=document.createElement('button');coverButton.className='soft-button';coverButton.textContent='View the garden cover';coverButton.onclick=()=>el('garden-cover').showModal();content.append(coverButton,btn);
  }
  p.inert=false;p.scrollTop=0;p.classList.add('open');p.setAttribute('aria-hidden','false');
  if(['sound','philosophy','greenhouse'].includes(which)){immersion.enter(which);p.inert=true;p.setAttribute('aria-hidden','true');orbit.enabled=false;}else orbit.enabled=true;
}
function closePanel(){immersion.leave();orbit.enabled=true;document.body.classList.remove('room-view');disposePiano?.();disposePiano=null;stopPiano();document.body.classList.remove('view-food');if(activePanel==='sound'&&activeTrack){save.muted=true;stopAudio();persist();}panelOpen=false;activePanel='';const p=el('panel');if(p.contains(document.activeElement))el('nav-garden').focus({preventScroll:true});p.inert=true;p.classList.remove('open');p.setAttribute('aria-hidden','true');setActiveNavigation(inHeart?'heart':'garden');}
el('panel-close').addEventListener('click',()=>document.body.classList.contains('immersive-room')?returnToRoom():closePanel());
el('info-toggle').addEventListener('click',()=>panelOpen?closePanel():openPanel('info'));
el('brand-home').addEventListener('click',(e)=>{e.preventDefault();if(inHeart){returnGarden();return;}closePanel();focusGarden();setActiveNavigation('garden');});
el('day-toggle').addEventListener('click',()=>{save.night=!save.night;persist();refreshMood();showToast(save.night?'The garden after sunset.':'The golden hour returns.');});
el('sound-toggle').addEventListener('click',()=>{if(compositionPlaying()){stopComposition();showToast('Your composition is stopped.');return;}
  save.muted=Boolean(activeTrack);persist();playSound(save.sound);updateSoundIcon();
  showToast(save.muted?'Music stopped.':save.sound?'Music playing.':'Choose a composition in the Resonance Room.');
});
document.querySelectorAll('[data-nav]').forEach(button=>button.addEventListener('click',()=>{
  const destination=button.dataset.nav;
  if(destination==='garden'){
    if(inHeart)returnGarden();
    closePanel();focusGarden();setActiveNavigation('garden');
    return;
  }
  openPanel(destination==='heart'?'philosophy':destination);
}));
el('hotspot-food').addEventListener('click',()=>openPanel('food'));
el('hotspot-philosophy').addEventListener('click',()=>openPanel('philosophy'));
el('hotspot-sound').addEventListener('click',()=>openPanel('sound'));
el('hotspot-heart').addEventListener('click',()=>openPanel('heart'));

function changeScene(callback){
  const fade=el('scene-transition');fade.classList.add('cover');
  setTimeout(()=>{callback();fade.classList.remove('cover');},490);
}
function setHeartOverlay(open){
  heartOverlayOpen=open;
  const label=el('interior-label');
  label.classList.toggle('visible',open);
  label.setAttribute('aria-hidden',open?'false':'true');
}
function refreshHeartMemory(){
  const last=save.journal[save.journal.length-1];
  const mem=el('heart-memory');
  mem.textContent=last?'Your latest thought: “'+last.text.slice(0,145)+(last.text.length>145?'…':'')+'”':'';
  mem.hidden=!last;
}
function enterHeart(){
  save.muted=true;stopAudio();persist();closePanel();changeScene(()=>{
    inHeart=true;save.visitedHeart=true;persist();document.body.classList.add('in-heart');
    orbit.enabled=false;interiorControls.enabled=true;
    interiorCamera.position.set(8,5.1,10);
    interiorControls.target.set(0,3.8,0);
    interiorControls.update();
    setActiveNavigation('heart');
    setHeartOverlay(false);
    refreshHeartMemory();
    showToast('Click one of the three books on the table to begin your journal.');
  });
}
function returnGarden(){
  changeScene(()=>{
    inHeart=false;document.body.classList.remove('in-heart');
    interiorControls.enabled=false;orbit.enabled=true;
    setHeartOverlay(false);
    focusGarden();setActiveNavigation('garden');el('nav-garden').focus({preventScroll:true});
  });
}
el('return-garden').addEventListener('click',returnGarden);
el('return-garden-float')?.addEventListener('click',returnGarden);
window.addEventListener('keydown',(e)=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'){if(document.body.classList.contains('room-tool-open')){returnToRoom();return;}if(inHeart)returnGarden();else closePanel();}});

// ---------- Raycasting, camera & animation ----------
const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();let pointerDown=null; let isDraggingView=false;
function pointerToNDC(event){
  const rect=canvas.getBoundingClientRect();
  mouse.x=((event.clientX-rect.left)/rect.width)*2-1;
  mouse.y=-((event.clientY-rect.top)/rect.height)*2+1;
}
function hoverAction(event){
  if(panelOpen && (activePanel==='greenhouse'||activePanel==='sound')){
    pointerToNDC(event);
    const hit=event.pointerType==='mouse' && document.body.classList.contains('room-idle') ? rooms.pick(activePanel,mouse) : null;
    immersion.highlight(hit);
    canvas.style.cursor=hit==null?'default':'pointer';
    return;
  }
  if(inHeart||panelOpen){hovered.object=null;return;}
  if(pointerDown && Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>7){isDraggingView=true;hovered.object=null;return;}
  if(isDraggingView){hovered.object=null;return;}
  pointerToNDC(event);raycaster.setFromCamera(mouse,camera);
  const hit=raycaster.intersectObjects(interactive,false).find(h=>inHeart?h.object.userData.action.startsWith('book'):!h.object.userData.action.startsWith('book')&&(h.object.userData.action!=='heart'||unlocked()));
  hovered.object=hit?.object||null;canvas.style.cursor=hovered.object?'pointer':'grab';
}
canvas.addEventListener('pointermove',hoverAction);
canvas.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};isDraggingView=false;});
canvas.addEventListener('pointerleave',e=>{
  immersion.highlight(null);canvas.style.cursor='';
  if(!e.relatedTarget?.closest?.('.hotspot')) hovered.object=null;
});
canvas.addEventListener('pointercancel',()=>{pointerDown=null;isDraggingView=false;hovered.object=null;});
window.addEventListener('pointerup',()=>{if(pointerDown){pointerDown=null;isDraggingView=false;hovered.object=null;}});
canvas.addEventListener('pointerup',e=>{
  if(panelOpen&&['sound','philosophy','greenhouse'].includes(activePanel)){if(document.body.classList.contains('room-idle')){pointerToNDC(e);const hit=rooms.pick(activePanel,mouse);if(hit!=null)immersion.activate(hit);}pointerDown=null;isDraggingView=false;return;}
  if(!pointerDown)return;
  const distance=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;isDraggingView=false;
  if(distance>7)return;
  pointerToNDC(e);raycaster.setFromCamera(mouse,inHeart?interiorCamera:camera);
  const hit=raycaster.intersectObjects(interactive,false).find(h=>inHeart?h.object.userData.action.startsWith('book'):!h.object.userData.action.startsWith('book')&&(h.object.userData.action!=='heart'||unlocked()));
  if(hit){const action=hit.object.userData.action;if(inHeart&&action.startsWith('book'))books.open(Number(action.slice(4)));else if(!inHeart&&!action.startsWith('book'))openPanel(action);}
});
function placeHotspot(id,position,visible){
  const node=el(id);if(inHeart||panelOpen||!visible){node.classList.remove('visible');return;}
  const vector=position.clone().project(camera);
  if(vector.z<0||vector.z>1||Math.abs(vector.x)>1||Math.abs(vector.y)>1){node.classList.remove('visible');return;}
  const x=(vector.x*.5+.5)*window.innerWidth,y=(-vector.y*.5+.5)*window.innerHeight;
  // Cards cover the lowest part of the page.
  if(y>window.innerHeight*.75){node.classList.remove('visible');return;}
  node.style.left=x+'px';node.style.top=y+'px';node.classList.add('visible');
}
function onResize(){
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setPixelRatio(renderPixelRatio());renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
  camera.fov=w<h?58:39;camera.updateProjectionMatrix();
  interiorCamera.aspect=w/h;interiorCamera.updateProjectionMatrix();
}
window.addEventListener('resize',onResize);
let prev=performance.now();
let lastPanelRender=0;
function animate(now){
  requestAnimationFrame(animate);
  // Render the garden at ~30fps while a stationary panel is open, saving GPU
  // resources for scrolling and writing. Smooth 60fps is restored on close.
  if(panelOpen&&!inHeart&&!cameraTween&&now-lastPanelRender<32)return;
  lastPanelRender=now;
  const dt=Math.min((now-prev)/1000,.1);prev=now;
  elapsed+=dt;
  weather.tick(dt,elapsed);
  if(cameraTween&&!inHeart){
    const t=Math.min(1,(now-cameraTween.start)/cameraTween.dur);
    const ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    camera.position.lerpVectors(cameraTween.fromP,cameraTween.toP,ease);
    orbit.target.lerpVectors(cameraTween.fromT,cameraTween.toT,ease);
    if(t>=1)cameraTween=null;
  }
  if((Math.floor(elapsed*2) !== Math.floor((elapsed-dt)*2)))updateClockHands();
  if(inHeart){
    interiorControls.update();
    sculpture.rotation.y+=dt*(save.sound==='golden'?.5:save.sound==='rain'?.19:.28);
    sculpture.position.y=2.7+Math.sin(elapsed*.9)*.14;
    floatingDust.forEach((orb,i)=>{orb.position.y+=Math.sin(elapsed*.3+orb.userData.float)*.0009;});
    weather.project(camera,true);
    renderer.render(heartScene,interiorCamera);
  }else{
    orbit.update();
    falling.forEach((f,i)=>{
      f.y-=dt*f.speed;f.x+=Math.sin(elapsed*.8+f.phase)*dt*.08;f.spin+=dt*(.5+i%7*.08);
      if(f.y<.06){f.y=r(10,14);f.x=kapokPos.x+r(-7,7);f.z=kapokPos.z+r(-5,5);}
      petalDummy.position.set(f.x,f.y,f.z);
      petalDummy.rotation.set(.35+f.phase,f.spin,f.spin*.5);
      petalDummy.scale.setScalar(f.scale);petalDummy.updateMatrix();fallingMesh.setMatrixAt(i,petalDummy.matrix);
    });
    fallingMesh.instanceMatrix.needsUpdate=true;
    const waveRate=save.sound==='golden'?1.45:save.sound==='rain'?.65:.92;
    ripples.forEach((mesh,i)=>{
      const phase=(elapsed*waveRate*.23+mesh.userData.rippleOffset)%1;
      mesh.scale.set(.5+phase*1.35,.23+phase*.75,1);
      mesh.material.opacity=Math.sin(phase*Math.PI)*.055;
    });
    waterMat.clearcoatRoughness = .85;
    waterMat.opacity = save.night ? .86 : .80;
    clouds.forEach(cloud=>{ cloud.position.x += dt*cloud.userData.speed; if(cloud.position.x>65) cloud.position.x=-65; });
    seal.rotation.z=elapsed*.35;
    seal.material.opacity=unlocked()?.48+Math.sin(elapsed*2.3)*.15:0;
    if(!panelOpen){
      // Show context labels only while the pointer intersects the matching 3D hotspot.
      const hoveredAction = isDraggingView ? null : hovered.object?.userData.action;
      placeHotspot('hotspot-philosophy',new THREE.Vector3(-18.2,4.3,5.6),hoveredAction==='philosophy');
      placeHotspot('hotspot-sound',soundPlace.clone().add(new THREE.Vector3(0,4.7,0)),hoveredAction==='sound');
      placeHotspot('hotspot-food',teaPos.clone().add(new THREE.Vector3(0,5.0,0)),hoveredAction==='food');
      placeHotspot('hotspot-heart',kapokPos.clone().add(new THREE.Vector3(1.0,2.0,1.7)),unlocked()&&hoveredAction==='heart');
    }else for(const id of ['hotspot-sound','hotspot-food','hotspot-heart','hotspot-philosophy'])el(id).classList.remove('visible');
    weather.project(camera,panelOpen||inHeart);
    if(panelOpen&&['sound','philosophy','greenhouse'].includes(activePanel)){rooms.render(renderer,activePanel,innerWidth,innerHeight);immersion.project(rooms.camera(activePanel));}else renderer.render(world,camera);
  }
}

onResize();
if(window.innerWidth<720)focusGarden();
refreshUnlock();refreshMood();updateSoundIcon();
requestAnimationFrame(animate);
// Avoid an indefinite loading overlay on slow connections.
// Hide the splash whether the model is slow, has an error, or a network fails.
setTimeout(() => el('loading').classList.add('done'), 1300);

import './refinement.css';

import './living.css';

import './spatial.css';

import './immersive.css';

const cover=el('garden-cover');
el('enter-garden').onclick=()=>cover.close();
