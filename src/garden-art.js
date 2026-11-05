import * as THREE from 'three';

// Shared instance batches keep planted drifts affordable, including on laptops.
export function createGardenArt(api) {
  const {world, materials, mat, box, cyl, sphere, branchCylinder, gabledRoof, windowArch, path, kapok, bloomGeometry, leafGeometry, register} = api;
  let seed=22127;
  const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const r=(a,b)=>a+(b-a)*rand();
  const dummy=new THREE.Object3D();
  const groups=new Map();
  const ball=new THREE.IcosahedronGeometry(1,1), stem=new THREE.CylinderGeometry(1,1,1,5);
  const petal=new THREE.SphereGeometry(1,6,4);
  function stamp(key,geo,color,pos,scale,rot=[0,0,0]) {
    if(!groups.has(key))groups.set(key,{geo,material:mat(color),transforms:[]});
    dummy.position.set(...pos);dummy.scale.set(...scale);dummy.rotation.set(...rot);dummy.updateMatrix();
    groups.get(key).transforms.push(dummy.matrix.clone());
  }
  function flush(parent=world) {
    for(const {geo,material,transforms} of groups.values()){
      material.side=THREE.DoubleSide;
      const mesh=new THREE.InstancedMesh(geo,material,transforms.length);
      transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;
      mesh.castShadow=false;mesh.receiveShadow=true;parent.add(mesh);
    }groups.clear();
  }
  function leaf(x,y,z,s,a) {stamp('leaves',leafGeometry,'#557b48',[x,y,z],[s,s*1.8,s],[.75,a,.7]);}
  function daisy(x,z,h,color,size=.19) {
    stamp('stems',stem,'#58754a',[x,h/2,z],[.018,h,.018]);
    leaf(x+.06,h*.45,z,.15,r(0,6));
    for(let k=0;k<7;k++) {let a=k*Math.PI*2/7;stamp('daisy'+color,petal,color,[x+Math.cos(a)*size*.7,h,z+Math.sin(a)*size*.7],[size*.72,.055,size*.36],[0,-a,0]);}
    stamp('pollen',ball,'#d6a13c',[x,h+.04,z],[size*.36,.07,size*.36]);
  }
  // Contiguous, curved planting islands; each island has a restricted palette.
  const beds=[
    [-20,-11,4.1,5.5,0],[-22,0,3.0,5.8,1],[-20,10.8,5.1,3.5,1],
    [-12,14.0,5.9,3.2,0],[-3,15.2,5.0,3.6,2],[5.8,15.8,5.2,3.2,2],
    [13.2,14.4,4.2,3.0,0],[24,5,2.8,6.4,0],[23,-6,3.0,5.4,1],
    [17,-16.6,4.7,2.3,2],[-8,-18.3,5.7,2.4,1],[-1,-19,3.3,2.2,0],
    [-14,7.6,2.1,1.5,2],[3,10.3,2.8,1.25,0]
  ];
  const palettes=[['#7666ba','#869bd3','#d7c5e2'],['#c67992','#dfacb4','#f2d5c6'],['#dcad50','#e6ce83','#eee4cc']];
  beds.forEach(([cx,cz,rx,rz,palette],bi)=>{
    const shape=new THREE.Shape();
    for(let k=0;k<=64;k++){
      const a=k/64*Math.PI*2, wave=1+.07*Math.sin(a*3+bi);
      const x=Math.cos(a)*rx*wave,z=Math.sin(a)*rz*wave;
      if(!k)shape.moveTo(x,z);else shape.lineTo(x,z);
    }
    const soil=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat('#4e6140'));
    soil.rotation.x=-Math.PI/2;soil.position.set(cx,-.08,cz);world.add(soil);
    // Low stone edging reads as one designed boundary rather than scattered dots.
    const edge=[];
    for(let k=0;k<=80;k++){let a=k/80*Math.PI*2,w=1+.07*Math.sin(a*3+bi);edge.push(new THREE.Vector3(cx+Math.cos(a)*rx*w,.01,cz-Math.sin(a)*rz*w));}
    // Fine dark edging disappears under foliage rather than outlining little islands.
    world.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge),100,.035,5,false),mat('#7d8160')));
    for(let j=0;j<Math.round(rx*rz*6);j++){
      const a=r(0,6.283),rad=Math.sqrt(rand())*.91;
      const x=cx+Math.cos(a)*rx*rad,z=cz+Math.sin(a)*rz*rad;
      const band=(z-cz)/rz;
      const color=palettes[palette][Math.min(2,Math.floor((x-cx+rx)/(2*rx)*3))];
      if(band<-.25 && j%3!==0){
        // Tall delphinium/salvia spires stand behind the low flowering layer.
        const h=r(1.25,2.25);stamp('stems',stem,'#58754a',[x,h/2,z],[.022,h,.022]);
        for(let n=0;n<9;n++){let y=h*.42+n*h*.062,w=.14*(1-n/12);stamp('spire'+color,ball,color,[x+Math.sin(n*2.4)*.07,y,z+Math.cos(n*2.4)*.07],[w,.10,w]);}
        for(let n=0;n<3;n++)leaf(x,.2+n*.2,z,.24,n*2.2);
      }else if(j%4===0){
        // Hydrangeas are visibly rounded clusters of little florets over leaves.
        stamp('bush',ball,'#55724d',[x,.32,z],[.46,.40,.45]);
        for(let n=0;n<26;n++){let a=n*2.399,y=1-2*(n+.5)/26,rr=Math.sqrt(1-y*y);stamp('hydrangea'+color,petal,color,[x+Math.cos(a)*rr*.41,.79+y*.34,z+Math.sin(a)*rr*.41],[.145,.11,.145]);}
      }else {
        for(let n=0;n<5;n++)daisy(x+r(-.33,.33),z+r(-.33,.33),r(.32,.82),j%3===0?'#f5ead3':color,r(.17,.25));
      }
      if(j%5===0){for(let n=0;n<6;n++)leaf(x+r(-.2,.2),.24,z+r(-.2,.2),.32,n);}
    }
  });
  flush();
  // Pencil cypresses give the back border a deliberate vertical rhythm.
  for(const [x,z,h] of [[-23,-16,5.2],[-13,-18,4.6],[12,-19,5.0],[24,-12,4.1]]){
    cyl(world,.13,.22,h,materials.bark,x,h/2,z);
    for(let k=0;k<5;k++)sphere(world,1,mat(k%2?'#3c624f':'#456e52'),x,h*.35+k*h*.11,z,9).scale.set(.85-k*.11,h*.34,.7-k*.09);
  }

  // Sculptural, tapering limbs: the crown grows from a visibly twisting trunk.
  function limb(points,startRadius,endRadius) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const n=18, sides=8,geo=new THREE.TubeGeometry(curve,n,1,sides,false),p=geo.attributes.position;
    for(let i=0;i<=n;i++){
      const center=curve.getPointAt(i/n),radius=startRadius+(endRadius-startRadius)*Math.pow(i/n,.72);
      for(let j=0;j<=sides;j++){const q=i*(sides+1)+j;p.setXYZ(q,center.x+(p.getX(q)-center.x)*radius,center.y+(p.getY(q)-center.y)*radius,center.z+(p.getZ(q)-center.z)*radius);}
    }
    geo.computeVertexNormals();const m=new THREE.Mesh(geo,materials.bark);m.castShadow=true;kapok.add(m);return curve;
  }
  limb([[0,0,0],[-.55,2.5,.2],[.1,5.2,-.3],[-.7,8.1,0],[.1,11,-.5],[.65,12.8,-.2]],.91,.015);
  for(let n=0;n<7;n++){const a=n*6.28/7;limb([[0,.7,0],[Math.cos(a)*.8,.18,Math.sin(a)*.8],[Math.cos(a)*1.8,.02,Math.sin(a)*1.8]],.24,.03);}
  const flowerPoints=[];
  for(let i=0;i<180;i++){const t=i/180*6.28;flowerPoints.push([.65+Math.cos(t)*(.2+(i%7)*.06),12.5+Math.sin(i*2.4)*.45,-.2+Math.sin(t)*.4]);}
  const branchSpecs=[
    [[0,3.6,0],[-3.4,4.8,.7],[-8.4,7.4,1.6],.42],
    [[-.3,4.8,0],[3.2,5.6,.4],[8.7,8.5,2.7],.39],
    [[-.3,5.8,.1],[-2.8,8.2,-1.2],[-7.1,10.4,-3.1],.38],
    [[-.5,6.4,-.1],[1.9,8.1,-2.6],[6.5,10.8,-5.0],.34],
    [[-.6,7.5,0],[-3.5,8.5,2.3],[-6.8,11.3,5.1],.32],
    [[-.5,8.1,0],[2.5,9.3,2.4],[7.9,11.1,3.8],.34],
    [[-.5,8.7,-.2],[-2.4,11.2,-.5],[-5.5,13.9,-1.2],.30],
    [[-.3,9.4,-.2],[2.3,11.1,-.2],[6.4,14.0,.6],.28],
    [[0,10.3,-.4],[.7,12.1,1.1],[2.1,15.0,2.7],.25],
    [[.2,11.5,-.4],[-.7,12.6,-2.3],[-2.2,14.7,-4.1],.21],
    [[0,5.7,0],[.4,6.9,3.1],[1.5,8.9,6.4],.29],
    [[-.5,7.3,0],[-.9,9.5,-3.3],[-3.8,11.9,-6.1],.26]
  ];
  for(const [start,mid,end,radius] of branchSpecs){
    const a=Math.atan2(end[2]-start[2],end[0]-start[0]);
    const branch=limb([start,mid,end],radius,.035);
    for(let k=0;k<11;k++){
      const t=.27+k*.068,s=branch.getPoint(t),side=(k%2?1:-1),aa=a+side*r(.5,1.05);
      const length=r(1.2,2.4),e=s.clone().add(new THREE.Vector3(Math.cos(aa)*length,r(.35,1.0),Math.sin(aa)*length*.75));
      const bend=s.clone().lerp(e,.6);bend.y-=.12;
      const twig=limb([s.toArray(),bend.toArray(),e.toArray()],.075,.012);
      for(let q=0;q<5;q++){
        const p=twig.getPoint(.25+q*.18);
        for(let b=0;b<8;b++)flowerPoints.push([p.x+r(-.29,.29),p.y+r(-.07,.25),p.z+r(-.29,.29)]);
      }
    }
  }
  flowerPoints.forEach((p,i)=>{
    const color=['#e44736','#ed593e','#c6322e'][i%3],s=r(.16,.28);
    stamp('kapok'+color,bloomGeometry,color,p,[s,s,s],[r(-.9,.9),r(0,6.28),r(-.9,.9)]);
    stamp('kapokCore',ball,'#a96932',[p[0],p[1]+.06,p[2]],[.045,.06,.045]);
  });
  flush(kapok);

  function doorway(g,d,x=0){
    box(g,.95,1.9,.15,materials.darkWood,x,.96,d/2+.07);
    box(g,.72,1.65,.16,mat('#40665c'),x,.97,d/2+.16);
    sphere(g,.055,mat('#c9aa64',.3,.5),x+.25,.93,d/2+.27);
    box(g,1.8,.14,.65,materials.paleStone,x,.04,d/2+.42);
    return g.localToWorld(new THREE.Vector3(x,0,d/2+.76));
  }
  function connect(g,d,points,x=0){g.updateMatrixWorld(true);const door=doorway(g,d,x);path([...points,[door.x,door.z]],1.12);}
  function home(x,z,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;world.add(g);return g;}
  // Poetry studio: limewashed walls, a tall brick chimney and a climbing trellis.
  const studio=home(-18.2,5.6,.24);
  register(box(studio,3.8,4.3,3.8,new THREE.MeshBasicMaterial({visible:false}),0,2,0),'philosophy');
  box(studio,3.6,2.7,3,mat('#e1d4b8'),0,1.35,0);gabledRoof(studio,4,3.5,0,2.75,0,1.45);
  box(studio,.55,4,.65,brickMatFallback(),1.25,2,-.7);
  windowArch(studio,-1,1.7,1.52,.72,1.12);
  connect(studio,3,[[-12,4.8],[-14,7.3],[-17,8.3]],.55);
  const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=96;const signPen=signCanvas.getContext('2d');signPen.fillStyle='#f5ecd6';signPen.fillRect(0,0,512,96);signPen.fillStyle='#2d4a38';signPen.font='bold 28px Georgia';signPen.textAlign='center';signPen.fillText("THE WRITER'S COTTAGE",256,58);const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.49),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(signCanvas)}));sign.position.set(0,2.42,1.58);studio.add(sign);

  for(let n=0;n<5;n++)box(studio,.045,2.3,.04,materials.wood,-1.7+n*.2,1.3,1.7);
  for(let n=0;n<5;n++){sphere(studio,.25,mat('#749268'),-1.5+r(-.3,.3),.4+n*.36,1.72,6);sphere(studio,.10,mat('#eab1b2'),-1.5+r(-.3,.3),.55+n*.36,1.88,6);}
  // Glasshouse: transparent framed walls, an airy pitched glass roof and plants inside.
  const glass=home(19,-5,-.23),glassMat=new THREE.MeshPhysicalMaterial({color:'#b0d3c4',transparent:true,opacity:.28,roughness:.15,side:THREE.DoubleSide,depthWrite:false});
  box(glass,4.1,.35,3.8,materials.paleStone,0,.18,0);box(glass,4,2.5,3.6,glassMat,0,1.6,0);
  for(const x of [-2,-1,0,1,2]){for(const z of [-1.8,1.8])box(glass,.06,2.8,.06,materials.roofTrim,x,1.65,z);}
  for(const z of [-1.8,-.9,0,.9,1.8]){
    for(const s of [-1,1])branchCylinder(glass,new THREE.Vector3(s*2,3,z),new THREE.Vector3(0,4.2,z),.045,materials.roofTrim);
  }
  for(const s of [-1,1]){const roof=box(glass,2.38,.03,3.7,glassMat,s,3.6,0);roof.rotation.z=-s*.54;}
  for(let i=0;i<5;i++){cyl(glass,.24,.17,.4,mat('#ae7660'),-1.4+i*.7,.55,-.8);sphere(glass,.4,mat('#6d9161'),-1.4+i*.7,1.05,-.8);}
  register(box(glass,4.1,4,3.8,new THREE.MeshBasicMaterial({visible:false}),0,2,0),'greenhouse');
  connect(glass,3.6,[[14,.2],[17,-.2],[18,-1.4]]);
  // Bakery: an asymmetric terracotta roof and striped fabric awning.
  const bakery=home(-17,-12,.13);
  box(bakery,3.9,3.1,3.3,mat('#ba8064'),0,1.55,0);
  const oldTile=materials.tile,oldTrim=materials.roofTrim;
  materials.tile=mat('#9e624f');materials.roofTrim=mat('#784d40');const bakeryRoof=gabledRoof(bakery,4.3,3.8,0,3.15,0,1.3);materials.tile=oldTile;materials.roofTrim=oldTrim;
  bakeryRoof.traverse(m=>{if(m.isMesh&&m.material.vertexColors)m.material=new THREE.MeshStandardMaterial({color:'#ad7057',roughness:.7,side:THREE.DoubleSide});});
  windowArch(bakery,1,1.75,1.68,.9,1.3);
  for(let i=0;i<8;i++){const m=box(bakery,.42,.08,1.05,mat(i%2?'#e5d9bc':'#78927a'),-.22+i*.42-1.3,2.7,2.05);m.rotation.x=.18;}
  connect(bakery,3.3,[[-11,0],[-16,-3],[-18,-7]],-.8);
  // Reading belvedere: octagonal stone tower under a copper cone.
  const tower=home(3,-17,0);
  cyl(tower,1.6,1.65,4.2,mat('#d5c9b1'),0,2.1,0,8);
  cyl(tower,0,2.1,2,mat('#638a7b'),0,5.2,0,8);
  windowArch(tower,0,3.1,1.52,.75,1.2);
  connect(tower,3,[[14,-.1],[15,-9],[12,-14],[6,-14.7]]);
  // Open garden atelier with pergola; no cloned houses on the front lawn.
  const atelier=home(20,10,-.55);
  box(atelier,3.2,2.4,2.8,mat('#d8c8a5'),0,1.2,0);
  box(atelier,3.7,.2,3.2,materials.roofTrim,0,2.5,0);
  for(const x of [-1.65,1.65])box(atelier,.10,2.4,.10,materials.wood,x,1.2,2.6);
  for(let n=0;n<7;n++)box(atelier,.10,.13,2.9,materials.wood,-1.65+n*.55,2.55,2);
  windowArch(atelier,-.85,1.35,1.42,.65,1);
  connect(atelier,2.8,[[14,8.7],[16,11.8],[19,13]],.6);
  function brickMatFallback(){return mat('#a67a64');}
}

export function addClouds(world){
  const clouds=[],geo=new THREE.SphereGeometry(1,12,8);
  for(let i=0;i<6;i++){
    const g=new THREE.Group();g.position.set(-54+i*22,18+(i%3)*3,-29-(i%3)*8);g.userData.speed=.26+(i%4)*.08;
    const material=new THREE.MeshStandardMaterial({color:'#fff8ea',roughness:1,transparent:true,opacity:.8,depthWrite:false});
    for(let j=0;j<6;j++){
      const m=new THREE.Mesh(geo,material);m.position.set((j-2.5)*1.5,Math.sin(j*1.8)*.4,Math.cos(j)*.5);
      m.scale.set(2.2,j===2||j===3?1.8:.95,1.6);m.userData.baseOpacity=.8;g.add(m);
    }
    world.add(g);clouds.push(g);
  }return clouds;
}
