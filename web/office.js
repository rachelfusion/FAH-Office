// The 3D office: room, characters, demo simulator and character editor.
// live.js switches it to real Discord data when you're logged in.
(function(){
const $=id=>document.getElementById(id);
if(!window.THREE){ $('stage').insertAdjacentHTML('beforeend','<div class="nogl">The 3D library could not load. Check your connection and reload.</div>'); return; }
const PI=Math.PI, rand=(a,b)=>a+Math.random()*(b-a);
let seed=7; const srand=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };

/* ============================ looks & people ============================ */
const OPT={
  skin:['#ffe0c2','#f6c9a0','#e0ac69','#c68642','#8d5524','#5c3a21'],
  hairStyle:[['short','Short'],['long','Long'],['bob','Bob'],['bun','Bun'],['spiky','Spiky'],['puff','Curly'],['buzz','Buzz']],
  hair:['#1b1b1b','#3b2416','#8b4a2b','#d9a441','#f2e3b3','#ff5fa2','#a78bfa','#5ee7ff','#b6f36a','#e8e8e8'],
  topStyle:[['tee','Tee'],['hoodie','Hoodie']],
  top:['#ff5fa2','#ff8a5c','#ffd166','#b6f36a','#3cc9b4','#5ee7ff','#6c7bff','#a78bfa','#f5f5f5','#2b2438','#111111'],
  pants:['#2b2438','#3d405b','#1f3b44','#6b4f3a','#8a8a95','#d8d2c4'],
  hat:[['none','None'],['cap','Cap'],['beanie','Beanie'],['cat','Cat ears'],['headphones','Headphones'],['crown','Crown']],
  glasses:[['none','None'],['round','Glasses'],['shades','Shades']],
};
const PEOPLE=[
  {id:'you',name:'You',me:true,bed:0,seat:1,look:{skin:'#f6c9a0',hairStyle:'bob',hair:'#2a1a12',topStyle:'hoodie',top:'#a78bfa',pants:'#2b2438',hat:'none',hatColor:'#ffd166',glasses:'round'}},
  {id:'mia',name:'Mia',bed:1,seat:0,look:{skin:'#ffe0c2',hairStyle:'long',hair:'#ff5fa2',topStyle:'tee',top:'#111111',pants:'#3d405b',hat:'cat',hatColor:'#2b2438',glasses:'none'}},
  {id:'dan',name:'Dan',bed:2,seat:2,look:{skin:'#8d5524',hairStyle:'puff',hair:'#1b1b1b',topStyle:'hoodie',top:'#3cc9b4',pants:'#1f3b44',hat:'headphones',hatColor:'#ff5fa2',glasses:'none'}},
  {id:'zee',name:'Zee',bed:3,seat:4,look:{skin:'#e0ac69',hairStyle:'bun',hair:'#5ee7ff',topStyle:'tee',top:'#ffd166',pants:'#2b2438',hat:'none',hatColor:'#6c7bff',glasses:'shades'}},
];
const BOTS=[
  {id:'dj',name:'DJ Bot',color:'#a78bfa',song:'lo-fi beats to lock in to'},
  {id:'tunes',name:'Tunes',color:'#5ee7ff',song:'late night synthwave'},
];
const KEY='crew-office-looks-v2';
try{ const s=JSON.parse(localStorage.getItem(KEY)||'{}'); PEOPLE.forEach(p=>{ if(s[p.id]){ const {name,...look}=s[p.id]; Object.assign(p.look,look); if(name) p.name=name; } }); }catch(_){}

/* ============================ renderer & camera ============================ */
const stage=$('stage'), canvas=$('c3d');
let renderer;
try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true}); }
catch(e){ stage.insertAdjacentHTML('beforeend','<div class="nogl">Your browser could not start 3D graphics (WebGL).</div>'); return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-1,1,1,-1,0.1,200);
const CAM={yaw:0.72,pitch:0.62,zoom:1,target:new THREE.Vector3(11,0,8.4)};
function placeCamera(){
  const d=60; camera.position.set(CAM.target.x+Math.sin(CAM.yaw)*Math.cos(CAM.pitch)*d, Math.sin(CAM.pitch)*d, CAM.target.z+Math.cos(CAM.yaw)*Math.cos(CAM.pitch)*d);
  camera.lookAt(CAM.target); camera.zoom=CAM.zoom; camera.updateProjectionMatrix();
}
function resize(){
  const w=stage.clientWidth, h=stage.clientHeight; if(!w||!h) return;
  renderer.setSize(w,h,false);
  const asp=w/h, V=Math.max(15, 27.5/asp);
  camera.left=-V*asp/2; camera.right=V*asp/2; camera.top=V/2; camera.bottom=-V/2; placeCamera();
}
new ResizeObserver(resize).observe(stage);

// low, moody light: dim purple ambience + moonlight + coloured pools
scene.add(new THREE.HemisphereLight(0x8a7bff,0x1a1024,0.5));
const moon=new THREE.DirectionalLight(0x9aa8ff,0.32);
moon.position.set(-4,26,-6); moon.target.position.set(11,0,8); scene.add(moon,moon.target);
moon.castShadow=true; moon.shadow.mapSize.set(2048,2048);
Object.assign(moon.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:90}); moon.shadow.bias=-0.0006;
const fill=new THREE.DirectionalLight(0xffd6f0,0.16); fill.position.set(30,20,30); scene.add(fill);
function plight(c,i,d,x,y,z){ const l=new THREE.PointLight(c,i,d,1.4); l.position.set(x,y,z); scene.add(l); return l; }
const L_BUNK=plight(0xffa95e,1.3,8,2.6,2.2,5);
const L_TABLE=plight(0xffcf9e,1.25,8.5,11,2.4,4.5);
const L_LOUNGE=plight(0xff4fa0,1.5,8.5,17.4,2.0,12.8);
const L_TV=plight(0x5ee7ff,0.9,5.5,20.6,1.3,12.8);
const L_DJ=plight(0xa78bfa,1.2,6.5,18.2,1.9,5.6);
const L_KITCHEN=plight(0x7fe9ff,0.7,4.5,18.3,1.6,1.0);

/* ============================ geometry helpers (rounded everything) ============================ */
const GEO=new Map(), MC=new Map();
const hex=c=>typeof c==='string'?parseInt(c.slice(1),16):c;
function M(c,em){ const k=c+'|'+(em||0); if(!MC.has(k)) MC.set(k,new THREE.MeshLambertMaterial(em?{color:hex(c),emissive:hex(c),emissiveIntensity:em}:{color:hex(c)})); return MC.get(k); }
function own(c,em=0,ec){ return new THREE.MeshLambertMaterial({color:hex(c),emissive:hex(ec||c),emissiveIntensity:em}); }
function cached(k,make){ let g=GEO.get(k); if(!g){ g=make(); g.userData.cached=true; GEO.set(k,g); } return g; }
function rbox(w,h,d,r){
  r=Math.max(0,Math.min(r,w/2-1e-3,h/2-1e-3,d/2-1e-3));
  return cached([w,h,d,r].map(v=>v.toFixed(3)).join(','),()=>{
    if(r<0.012) return new THREE.BoxGeometry(w,h,d);
    const seg=5, g=new THREE.BoxGeometry(1,1,1,seg,seg,seg).toNonIndexed();
    const pos=g.attributes.position, nor=g.attributes.normal, p=new THREE.Vector3(), n=new THREE.Vector3(), half=0.5/seg, bx=w/2-r, by=h/2-r, bz=d/2-r;
    for(let i=0;i<pos.count;i++){ p.fromBufferAttribute(pos,i); n.copy(p); n.x-=Math.sign(n.x)*half; n.y-=Math.sign(n.y)*half; n.z-=Math.sign(n.z)*half; n.normalize();
      pos.setXYZ(i,bx*Math.sign(p.x)+n.x*r,by*Math.sign(p.y)+n.y*r,bz*Math.sign(p.z)+n.z*r); nor.setXYZ(i,n.x,n.y,n.z); }
    g.computeBoundingSphere(); return g;
  });
}
function mesh(geo,mat,x,y,z,parent,o={}){ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=o.cast!==false; m.receiveShadow=o.recv!==false; (parent||scene).add(m); return m; }
function B(w,h,d,c,x,y,z,parent,o={}){
  const mn=Math.min(w,h,d), r= o.r ?? (mn<0.05?0:Math.min(0.12,mn*0.3));
  return mesh(rbox(w,h,d,r),o.mat||M(c,o.em),x,y,z,parent,o);
}
function BB(x0,z0,x1,z1,y0,y1,c,o={}){ return B(x1-x0,y1-y0,z1-z0,c,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,o.parent,o); }
function cyl(r,h,c,x,y,z,o={}){ const g=cached(`cy${r},${o.r2??r},${h},${o.seg||24}`,()=>new THREE.CylinderGeometry(r,o.r2??r,h,o.seg||24)); const m=mesh(g,o.mat||M(c,o.em),x,y,z,o.parent,o); if(o.rx) m.rotation.x=o.rx; if(o.rz) m.rotation.z=o.rz; return m; }
function sph(r,c,x,y,z,parent,o={}){ const g=cached(`sp${r},${o.seg||16}`,()=>new THREE.SphereGeometry(r,o.seg||16,Math.max(6,(o.seg||16)*0.75|0))); return mesh(g,o.mat||M(c,o.em),x,y,z,parent,o); }
function capsule(r,len,c,x,y,z,parent,o={}){ const g=cached(`ca${r},${len}`,()=>new THREE.CapsuleGeometry(r,len,5,12)); return mesh(g,o.mat||M(c,o.em),x,y,z,parent,o); }
function cone(r,h,c,x,y,z,parent,o={}){ const g=cached(`co${r},${h},${o.seg||8}`,()=>new THREE.ConeGeometry(r,h,o.seg||8)); return mesh(g,o.mat||M(c,o.em),x,y,z,parent,o); }
function dome(r,c,x,y,z,parent,o={}){ const g=cached(`do${r}`,()=>new THREE.SphereGeometry(r,20,10,0,PI*2,0,PI/2)); return mesh(g,o.mat||M(c,o.em),x,y,z,parent,o); }
function torus(r,t,arc,c,x,y,z,parent,o={}){ const g=cached(`to${r},${t},${arc}`,()=>new THREE.TorusGeometry(r,t,8,24,arc)); return mesh(g,o.mat||M(c,o.em),x,y,z,parent,o); }
function rug(x0,z0,x1,z1,rad,c,y=0.012){ const w=x1-x0, d=z1-z0, s=new THREE.Shape(), r=Math.min(rad,w/2,d/2);
  s.moveTo(-w/2+r,-d/2); s.lineTo(w/2-r,-d/2); s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r); s.lineTo(w/2,d/2-r); s.quadraticCurveTo(w/2,d/2,w/2-r,d/2); s.lineTo(-w/2+r,d/2); s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r); s.lineTo(-w/2,-d/2+r); s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
  const m=new THREE.Mesh(new THREE.ShapeGeometry(s,8),M(c)); m.rotation.x=-PI/2; m.position.set((x0+x1)/2,y,(z0+z1)/2); m.receiveShadow=true; scene.add(m); return m; }
function shade(h,a){ const n=hex(h); let r=n>>16,g=(n>>8)&255,b=n&255; const f=v=>Math.max(0,Math.min(255,Math.round(a<0?v*(1+a):v+(255-v)*a))); return (f(r)<<16)|(f(g)<<8)|f(b); }
const glowTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.2,'rgba(255,255,255,.5)'); g.addColorStop(.55,'rgba(255,255,255,.12)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); return new THREE.CanvasTexture(c); })();
function glow(x,y,z,c,size,op=.5,parent){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:hex(c),transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false})); s.position.set(x,y,z); s.scale.set(size,size,size); (parent||scene).add(s); return s; }
function neon(text,color,w,h,font){
  const c=document.createElement('canvas'); c.width=1024; c.height=256; const x=c.getContext('2d'); const tex=new THREE.CanvasTexture(c);
  const draw=()=>{ x.clearRect(0,0,1024,256); x.textAlign='center'; x.textBaseline='middle'; x.font=font;
    x.shadowColor=color; x.shadowBlur=40; x.strokeStyle=color; x.lineWidth=12; x.strokeText(text,512,132);
    x.shadowBlur=18; x.fillStyle='#ffffff'; x.fillText(text,512,132); x.shadowBlur=0; x.globalAlpha=.55; x.fillStyle=color; x.fillText(text,512,132); x.globalAlpha=1; tex.needsUpdate=true; };
  draw(); if(document.fonts&&document.fonts.load) document.fonts.load(font).then(draw).catch(()=>{});
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
}

/* ============================ nav grid ============================ */
const CELL=0.5, GW=44, GD=32, NAV=new Uint8Array(GW*GD).fill(1);
for(let i=0;i<GW;i++) NAV[i]=0; for(let j=0;j<GD;j++) NAV[j*GW]=0;
function blockArea(x0,z0,x1,z1,pad=0.2){ for(let j=0;j<GD;j++) for(let i=0;i<GW;i++){ const cx=(i+.5)*CELL, cz=(j+.5)*CELL; if(cx>x0-pad&&cx<x1+pad&&cz>z0-pad&&cz<z1+pad) NAV[j*GW+i]=0; } }
function solid(x0,z0,x1,z1,y0,y1,c,o){ blockArea(x0,z0,x1,z1); return BB(x0,z0,x1,z1,y0,y1,c,o); }
const walk=(i,j)=>i>=0&&j>=0&&i<GW&&j<GD&&NAV[j*GW+i]===1;
const cellOf=(x,z)=>[Math.min(GW-1,Math.max(0,Math.floor(x/CELL))),Math.min(GD-1,Math.max(0,Math.floor(z/CELL)))];
function nearestWalk(i,j){ if(walk(i,j)) return [i,j]; for(let r=1;r<10;r++) for(let dj=-r;dj<=r;dj++) for(let di=-r;di<=r;di++){ if(Math.max(Math.abs(di),Math.abs(dj))!==r) continue; if(walk(i+di,j+dj)) return [i+di,j+dj]; } return [i,j]; }
function los(a,b){ const d=Math.hypot(b.x-a.x,b.z-a.z), n=Math.ceil(d/0.15); for(let k=1;k<n;k++){ const [i,j]=cellOf(a.x+(b.x-a.x)*k/n, a.z+(b.z-a.z)*k/n); if(!walk(i,j)) return false; } return true; }
function findPath(from,to){
  const [si,sj]=nearestWalk(...cellOf(from.x,from.z)), [ti,tj]=nearestWalk(...cellOf(to.x,to.z));
  const prev=new Int32Array(GW*GD).fill(-2), q=[sj*GW+si]; prev[q[0]]=-1; let h=0, ok=false;
  const D=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(h<q.length){ const k=q[h++], i=k%GW, j=(k/GW)|0; if(i===ti&&j===tj){ok=true;break;}
    for(const [di,dj] of D){ const ni=i+di, nj=j+dj; if(!walk(ni,nj)) continue; if(di&&dj&&(!walk(i+di,j)||!walk(i,j+dj))) continue; const nk=nj*GW+ni; if(prev[nk]!==-2) continue; prev[nk]=k; q.push(nk); } }
  if(!ok) return [{x:to.x,z:to.z}];
  const cells=[]; let k=tj*GW+ti; while(k!==-1){ cells.push({x:(k%GW+.5)*CELL,z:(((k/GW)|0)+.5)*CELL}); k=prev[k]; } cells.reverse();
  const pts=[{x:from.x,z:from.z},...cells.slice(1,-1),{x:to.x,z:to.z}], out=[pts[0]]; let a=0;
  while(a<pts.length-1){ let b=pts.length-1; while(b>a+1&&!los(pts[a],pts[b])) b--; out.push(pts[b]); a=b; }
  return out.slice(1);
}

/* ============================ the room ============================ */
const SP={beds:[],seats:[],lounge:[],extras:[]};
const DYN={lamps:[],lampGlows:[],blankets:[],cones:[],leds:[],docks:[],strip:[],stripGlows:[],tv:null,lava:[],disco:null,discoGlints:[]};
const C={floor:0x241d2e,plank:0x2b2337,wallB:0x2c2343,wallL:0x271f3c,trim:0x3b2f58,wood:0x5c3f35,woodD:0x3d2a24,dark:0x2a2236};

// floor & walls
BB(-0.3,-0.3,22,16,-0.4,0,C.floor,{r:0,cast:false});
for(let z=0.5;z<16;z+=0.5) BB(0,z,22,z+0.015,0,0.004,C.plank,{r:0,cast:false});
BB(-0.3,-0.3,22,0,0,3.2,C.wallB,{r:0,cast:false}); BB(-0.3,0,0,16,0,3.2,C.wallL,{r:0,cast:false});
BB(0,0,22,0.06,0,0.16,C.trim,{r:0,cast:false}); BB(0,0,0.06,16,0,0.16,C.trim,{r:0,cast:false});
// RGB LED strip along the top of both walls
for(let x=0;x<22;x+=1){ const m=own('#ff5fa2',1); BB(x,0.02,x+1,0.07,3.05,3.11,0,{mat:m,r:0,cast:false}); DYN.strip.push({m,u:x}); }
for(let z=0;z<16;z+=1){ const m=own('#ff5fa2',1); BB(0.02,z,0.07,z+1,3.05,3.11,0,{mat:m,r:0,cast:false}); DYN.strip.push({m,u:22+z}); }
for(let x=1;x<22;x+=2.5) DYN.stripGlows.push({s:glow(x,3.0,0.15,'#ff5fa2',2.2,.28),u:x});
for(let z=1.5;z<16;z+=2.5) DYN.stripGlows.push({s:glow(0.15,3.0,z,'#ff5fa2',2.2,.28),u:22+z});
// zone rugs
rug(0.1,0.1,4.4,9.5,0.5,0x332a55);
rug(7.3,1.9,14.7,7.1,0.9,0x1c3644);
cyl(2.9,0.02,0x4b2150,17.6,0.01,12.9,{seg:48,cast:false}); cyl(2.55,0.024,0x5d2a63,17.6,0.012,12.9,{seg:48,cast:false});
rug(15.6,0.05,21.95,2.4,0.3,0x2d2840);
// night windows
function skyline(x0,x1,y0,y1){ let x=x0+0.05; while(x<x1-0.15){ const w=0.18+srand()*0.3, top=y0+0.15+srand()*(y1-y0-0.4); BB(x,0.065,Math.min(x+w,x1-0.05),0.075,y0+0.02,top,0x0a0d1c,{r:0,cast:false});
  for(let wy=y0+0.1;wy<top-0.08;wy+=0.14) for(let wx=x+0.04;wx<Math.min(x+w,x1-0.05)-0.05;wx+=0.08) if(srand()<.35) BB(wx,0.076,wx+0.035,0.08,wy,wy+0.05,srand()<.8?0xffd27a:0xff7ab8,{em:1,r:0,cast:false}); x+=w+0.03; } }
BB(5.4,-0.04,8.6,0.05,1.15,2.65,C.trim,{r:0.04,cast:false}); BB(5.5,0,8.5,0.06,1.25,2.55,0x151a3d,{em:.7,r:0,cast:false}); skyline(5.5,8.5,1.25,2.55); BB(6.97,0.04,7.03,0.09,1.25,2.55,C.trim,{r:0,cast:false});
BB(0.8,-0.04,3.8,0.05,1.35,2.75,C.trim,{r:0.04,cast:false}); BB(0.9,0,3.7,0.06,1.45,2.65,0x1a1f4d,{em:.7,r:0,cast:false});
[[1.3,2.3],[1.8,1.95],[2.5,2.45],[3.2,2.05],[2.9,1.75],[1.4,1.7],[3.4,2.5],[2.2,2.15]].forEach(([x,y])=>sph(0.025,0xffffff,x,y,0.07,scene,{em:1,cast:false,seg:6}));
sph(0.2,0xfff2c8,2.0,2.25,0.05,scene,{em:.9,cast:false}); glow(2.0,2.25,0.2,'#fff2c8',1.2,.35);
// neon signs
const n1=neon('locked in','#ff5fa2',3.2,0.8,'400 150px Pacifico, cursive'); n1.position.set(11,2.62,0.08); scene.add(n1); glow(11,2.62,0.3,'#ff5fa2',4.2,.3);
const n2=neon('touch grass','#7dffb2',2.9,0.72,'400 140px Pacifico, cursive'); n2.rotation.y=PI/2; n2.position.set(0.08,2.05,14.1); scene.add(n2); glow(0.3,2.05,14.1,'#7dffb2',3.6,.28);
// whiteboard (smaller, under the neon)
BB(9.4,0,12.6,0.07,1.0,2.08,C.trim,{r:0.04,cast:false}); BB(9.5,0.03,12.5,0.09,1.08,2.0,0xd9d4e6,{r:0.02,cast:false});
[[9.8,11.0,1.75,0xff5fa2],[9.8,10.6,1.58,0x3cc9b4],[9.8,11.2,1.41,0x6c7bff],[9.8,10.3,1.24,0x3cc9b4]].forEach(([a,b,y,c])=>BB(a,0.09,b,0.11,y,y+0.04,c,{r:0,cast:false}));
[[11.5,1.6,0xffd166],[11.95,1.3,0xff8fb1],[12.05,1.68,0xb6f36a]].forEach(([x,y,c])=>BB(x,0.09,x+0.32,0.12,y,y+0.28,c,{r:0.02,cast:false}));
// left wall: bookshelf, glowing poster
solid(0,10.6,0.5,12.6,0,1.9,C.woodD,{r:0.05});
const bookCols=[0xff5fa2,0x3cc9b4,0xffd166,0x6c7bff,0xff8a5c,0xa78bfa];
[0.45,1.05,1.65].forEach((y,r)=>{ BB(0.02,10.65,0.5,12.55,y,y+0.05,C.wood,{r:0}); let n=0; for(let z=10.75;z<12.4;z+=0.18,n++){ BB(0.08,z,0.42,z+0.14,y+0.05,y+0.05+0.3+((n*7+r*3)%5)*0.03,bookCols[(n+r*2)%6],{r:0.02}); } });
BB(0,9.0,0.05,9.9,1.2,2.35,0x3b1d4f,{em:.25,r:0.03,cast:false}); sph(0.22,0xff5fa2,0.06,1.95,9.45,scene,{em:.9,cast:false}); BB(0.05,9.15,0.07,9.75,1.35,1.42,0x5ee7ff,{em:1,r:0,cast:false});

// bunk room
solid(4.5,0,4.7,7,0,1.4,C.wallB,{r:0.06}); BB(4.45,0,4.75,7,1.4,1.48,C.trim,{r:0.04});
const fairy=(pts)=>pts.forEach(([x,y,z],k)=>{ sph(0.045,0xffc67a,x,y,z,scene,{em:1.2,cast:false,seg:8}); if(k%3===0) glow(x,y,z,'#ffb35e',0.7,.55); });
fairy(Array.from({length:24},(_,k)=>{ const z=0.3+k*0.4, t=((z-0.3)%1.8)/1.8; return [0.1,2.55-Math.sin(PI*t)*0.22,z]; }));
fairy(Array.from({length:17},(_,k)=>{ const z=0.2+k*0.4, t=((z-0.2)%1.6)/1.6; return [4.6,1.62-Math.sin(PI*t)*0.12,z]; }));
[1.4,3.6,5.8,8.0].forEach((zc,i)=>{
  solid(0.1,zc-0.78,2.48,zc+0.78,0,0.36,0x3a2d52,{r:0.1});
  BB(0.06,zc-0.82,0.28,zc+0.82,0,1.1,0x4a3a6a,{r:0.1});
  BB(0.18,zc-0.72,2.42,zc+0.72,0.32,0.56,0xe9e3f5,{r:0.12});
  BB(0.4,zc-0.48,1.05,zc+0.48,0.52,0.72,0xffffff,{r:0.1});
  const bl=mesh(rbox(1.12,1,1.5,0.15),own('#cccccc'),1.9,0.6,zc); bl.scale.y=0.1; DYN.blankets.push(bl);
  BB(2.46,zc-0.72,2.5,zc+0.72,0.05,0.09,0xa78bfa,{em:1.2,r:0,cast:false}); glow(2.55,0.1,zc,'#a78bfa',1.3,.4);
  solid(0.2,zc+0.88,0.68,zc+1.34,0,0.5,0x3a2d52,{r:0.08});
  const lm=own('#fff3dc',0.15,'#ffcf8a'); sph(0.13,0,0.44,0.64,zc+1.11,scene,{mat:lm}); DYN.lamps.push(lm);
  DYN.lampGlows.push(glow(0.44,0.66,zc+1.11,'#ffb35e',1.2,.12));
  SP.beds.push({kind:'bed',i,approach:{x:3.2,z:zc},pose:{x:2.05,y:0.9,z:zc,rot:PI/2,anim:'sleep'}});
});

// big shared table, pendant lamps, under-glow
solid(8,3.4,14,5.6,0.68,0.8,C.wood,{r:0.1});
[[8.2,3.6],[13.8,3.6],[8.2,5.4],[13.8,5.4]].forEach(([x,z])=>cyl(0.07,0.68,C.woodD,x,0.34,z));
BB(8.2,5.58,13.8,5.62,0.6,0.64,0xff5fa2,{em:1.3,r:0,cast:false}); [9,10.4,11.8,13.2].forEach(x=>glow(x,0.5,5.75,'#ff5fa2',1.6,.35));
[9,11,13].forEach(x=>{ cyl(0.008,0.6,0x111111,x,3.35,4.5,{cast:false}); dome(0.26,0x1d1826,x,3.02,4.5,scene); sph(0.085,0xffe2b0,x,3.0,4.5,scene,{em:1.3,cast:false}); glow(x,2.9,4.5,'#ffcf9e',1.6,.5); });
cyl(0.16,0.25,0xc56b3c,11,0.93,4.5); [[11,1.18,4.5,.22],[10.85,1.1,4.4,.15],[11.15,1.12,4.6,.16]].forEach(([x,y,z,r])=>sph(r,0x3fae6e,x,y,z,scene));
cyl(0.06,0.12,0xffffff,9.9,0.86,4.35); cyl(0.06,0.12,0xff5fa2,12.3,0.86,4.75); BB(12.6,4.1,13.0,4.4,0.8,0.82,0xffd166,{r:0});
const chairCols=[0xff5fa2,0x5ee7ff,0xa78bfa,0xb6f36a,0xff8a5c,0x6c7bff];
[[9,2.6,0],[11,2.6,0],[13,2.6,0],[9,6.4,PI],[11,6.4,PI],[13,6.4,PI]].forEach(([x,z,rot],i)=>{
  const c=chairCols[i], back=rot===0?-1:1;
  B(0.6,0.12,0.58,C.dark,x,0.4,z,scene,{r:0.06}); B(0.6,0.78,0.12,c,x,0.85,z+back*0.28,scene,{r:0.06}); B(0.34,0.4,0.13,C.dark,x,0.82,z+back*0.285,scene,{r:0.06});
  cyl(0.04,0.34,0x444444,x,0.17,z); cyl(0.26,0.04,0x333333,x,0.03,z);
  const lz=rot===0?3.8:5.2, f=rot===0?1:-1;
  B(0.52,0.03,0.36,0xc9cbe0,x,0.815,lz,scene,{r:0.012});
  B(0.52,0.34,0.03,0xc9cbe0,x,0.99,lz+f*0.17,scene,{r:0.012});
  const gm=own('#1a1d26',0,'#8fd3ff'); B(0.46,0.28,0.01,0,x,0.99,lz+f*0.153,scene,{mat:gm,r:0,cast:false});
  const gg=glow(x,1.0,lz+f*0.05,'#8fd3ff',0.9,.45); gg.visible=false;
  SP.seats.push({kind:'seat',i,approach:{x,z},pose:{x,y:0.18,z,rot,anim:'type'},laptop:gm,glow:gg});
});
SP.extras.push({kind:'board',approach:{x:10,z:1.35},pose:{x:10,y:0,z:1.3,rot:PI,anim:'board'},icon:'✏️'});
SP.extras.push({kind:'board',approach:{x:12,z:1.35},pose:{x:12,y:0,z:1.3,rot:PI,anim:'board'},icon:'✏️'});

// kitchen
solid(15.8,0,20.9,0.85,0,0.9,0x2f2846,{r:0.06}); BB(15.75,0,20.95,0.92,0.9,0.98,0x4a3d66,{r:0.03});
for(let k=0;k<6;k++) BB(15.9+k*0.83,0.85,16.65+k*0.83,0.88,0.1,0.8,0x372f52,{r:0.01});
BB(15.8,0,20.9,0.45,1.78,2.55,0x2f2846,{r:0.06,cast:false});
BB(15.9,0.4,20.8,0.44,1.74,1.77,0x7fe9ff,{em:1.3,r:0,cast:false}); [16.6,18.3,20.0].forEach(x=>glow(x,1.55,0.55,'#7fe9ff',1.4,.32));
B(0.55,0.62,0.45,0x1d1826,17,1.29,0.38,scene,{r:0.1}); sph(0.03,0xff5d5d,17,1.42,0.62,scene,{em:1,cast:false}); cyl(0.07,0.12,0xffffff,17,1.04,0.55);
B(0.8,0.03,0.5,0x6a6f86,19,0.975,0.45,scene,{r:0.012}); cyl(0.03,0.32,0x9aa3b0,19,1.12,0.18);
cyl(0.22,0.12,0xf2eefc,20.2,1.04,0.45); [[20.1,0.45,0xff5d5d],[20.3,0.4,0xffd166],[20.2,0.55,0xb6f36a]].forEach(([x,z,c])=>sph(.08,c,x,1.13,z));
solid(21.0,0.02,21.95,0.95,0,2.05,0x9fe3d0,{r:0.18}); cyl(0.025,0.5,0xe8f7f2,21.78,1.35,0.98); BB(21.02,0.95,21.93,0.97,1.32,1.35,0x7cc9b6,{r:0});
SP.extras.push({kind:'coffee',approach:{x:17,z:1.55},pose:{x:17,y:0,z:1.45,rot:PI,anim:'mug'},icon:'☕'});
SP.extras.push({kind:'fridge',approach:{x:20.35,z:1.6},pose:{x:20.35,y:0,z:1.5,rot:PI*0.8,anim:'mug'},icon:'🧃'});

// DJ booth, speakers, bot docks
solid(17,5,19.4,5.8,0,1.0,0x1b1724,{r:0.1}); BB(16.95,4.95,19.45,5.85,0.98,1.06,0x2c2540,{r:0.04});
[17.6,18.8].forEach(x=>{ cyl(0.26,0.04,0x0c0c0f,x,1.08,5.4); cyl(0.07,0.05,0xff5fa2,x,1.1,5.4,{em:.6}); });
['#ff5fa2','#ffd166','#7dffb2','#5ee7ff','#a78bfa','#ff5fa2','#ffd166'].forEach((c,k)=>{ const m=own(c,0.1); B(0.18,0.13,0.04,0,17.39+k*0.28,0.62,5.82,scene,{mat:m,r:0.02,cast:false}); DYN.leds.push(m); });
[16.45,19.95].forEach(x=>{ solid(x-0.36,4.95,x+0.36,5.75,0,1.5,0x15121c,{r:0.12});
  DYN.cones.push(cyl(0.22,0.05,0x0a0a0d,x,0.55,5.77,{rx:PI/2})); DYN.cones.push(cyl(0.11,0.05,0x0a0a0d,x,1.18,5.77,{rx:PI/2}));
  torus(0.24,0.015,PI*2,0xa78bfa,x,0.55,5.78,scene,{em:1,cast:false}); });
const BOOTH=[{x:17.6,z:4.35},{x:18.8,z:4.35}], DOCKS=[{x:21.25,z:3.3},{x:21.25,z:4.8}];
DOCKS.forEach(d=>{ cyl(0.45,0.08,0x2c2540,d.x,0.04,d.z); const m=own('#7dffb2',0.4); cyl(0.36,0.02,0,d.x,0.09,d.z,{mat:m,cast:false}); DYN.docks.push(m); });

// lounge: velvet couch, round coffee table, lava lamp, TV, beanbags, disco ball
solid(14.3,11,15.6,14.6,0,0.45,0x4b2f78,{r:0.16}); B(0.34,0.7,3.6,0x4b2f78,14.47,0.75,12.8,scene,{r:0.15});
solid(14.3,10.68,15.6,11.02,0,0.8,0x432a6c,{r:0.15}); solid(14.3,14.58,15.6,14.92,0,0.8,0x432a6c,{r:0.15});
[[11.05,12.2],[12.25,13.4],[13.45,14.55]].forEach(([a,b])=>BB(14.62,a,15.58,b,0.42,0.6,0x6a45a8,{r:0.12}));
sph(0.17,0xff5fa2,14.75,0.85,11.45,scene).scale.set(.6,1,1); sph(0.17,0x5ee7ff,14.75,0.85,14.15,scene).scale.set(.6,1,1);
[11.62,12.82,14.0].forEach(z=>SP.lounge.push({kind:'couch',approach:{x:16.35,z},pose:{x:15.05,y:0.32,z,rot:PI/2,anim:'phone'}}));
blockArea(17.25,12.15,18.75,13.35); cyl(0.78,0.08,C.wood,18,0.42,12.75); cyl(0.08,0.38,C.woodD,18,0.19,12.75); cyl(0.4,0.03,C.woodD,18,0.015,12.75);
cyl(0.2,0.1,0xf2eefc,17.6,0.51,12.55); BB(18.1,12.95,18.5,13.25,0.46,0.49,0xff5fa2,{r:0});
cyl(0.1,0.12,0x2a2236,18.35,0.52,12.45); cyl(0.07,0.36,0xff6fb0,18.35,0.76,12.45,{mat:new THREE.MeshBasicMaterial({color:0xff6fb0,transparent:true,opacity:.35})}); cyl(0.1,0.08,0x2a2236,18.35,0.98,12.45);
[0,1,2].forEach(k=>DYN.lava.push(sph(0.045+k*0.01,0xffa040,18.35,0.7,12.45,scene,{em:1.2,cast:false,seg:10})));
glow(18.35,0.8,12.45,'#ff7ab0',1.1,.45);
solid(21.1,11.7,21.8,13.9,0,0.5,0x1b1724,{r:0.08}); B(0.1,1.25,1.95,0x0b0b0f,21.4,1.3,12.8,scene,{r:0.04});
DYN.tv=own('#334455',0.7); B(0.02,1.12,1.8,0,21.34,1.3,12.8,scene,{mat:DYN.tv,r:0,cast:false});
[[18.2,14.75,0xff7eb6],[19.9,14.75,0x3cc9b4]].forEach(([x,z,c])=>{
  const s=sph(0.6,c,x,0.27,z,scene,{seg:24}); s.scale.set(1,0.5,1);
  blockArea(x-0.5,z-0.5,x+0.5,z+0.5);
  SP.lounge.push({kind:'beanbag',approach:{x,z:13.75},pose:{x,y:0.1,z,rot:Math.atan2(21.3-x,12.8-z),anim:'phone'}});
});
cyl(0.025,1.7,0x222222,21.4,0.85,15.3); cyl(0.2,0.05,0x222222,21.4,0.03,15.3); cyl(0.2,0.3,0xff8fc4,21.4,1.75,15.3,{r2:0.28,em:.8}); glow(21.4,1.7,15.3,'#ff5fa2',1.6,.4);
cyl(0.008,0.6,0x888888,17.6,3.2,12.9,{cast:false});
DYN.disco=new THREE.Mesh(new THREE.SphereGeometry(0.34,10,8),new THREE.MeshLambertMaterial({color:0xd8d8ea,emissive:0x8888aa,emissiveIntensity:.25,flatShading:true})); DYN.disco.position.set(17.6,2.85,12.9); scene.add(DYN.disco);
for(let k=0;k<5;k++) DYN.discoGlints.push(glow(17.6,2.85,12.9,['#ff5fa2','#5ee7ff','#a78bfa','#ffd166','#7dffb2'][k],0.35,0));

function plant(x,z,s=1){ blockArea(x-0.3*s,z-0.3*s,x+0.3*s,z+0.3*s); cyl(0.22*s,0.42*s,0xe8e2f2,x,0.21*s,z,{r2:0.16*s});
  [[0,0.75,0,.3,0x2f8f5b],[.17,.6,.1,.22,0x3fae6e],[-.16,.62,-.06,.22,0x2f8f5b],[.05,1.0,-.05,.2,0x4cc27f],[-.08,.9,.14,.17,0x3fae6e]].forEach(([dx,dy,dz,r,c])=>{ const m=sph(r*s,c,x+dx*s,dy*s,z+dz*s); m.scale.set(1,0.75,1); }); }
plant(6.3,0.6,1.1); plant(14.9,0.6); plant(0.7,15.3,1.3); plant(21.4,9.4); plant(4.8,15.3); plant(4.05,0.55,0.8); plant(8.6,9.4,0.9);

// meeting room with Simon: glass walls, oval table, presentation screen
SP.meeting=[];
const MEET={};
{
  rug(5.6,10.3,12.4,15.7,0.6,0x1e2a4a);
  const glassMat=new THREE.MeshLambertMaterial({color:0x9fe8ff,transparent:true,opacity:.13,depthWrite:false});
  const glassWall=(x0,z0,x1,z1)=>{ blockArea(x0,z0,x1,z1); const m=BB(x0,z0,x1,z1,0.05,1.6,0,{mat:glassMat,r:0,cast:false,recv:false}); m.renderOrder=2; };
  glassWall(5.45,10.15,10.8,10.25);           // back wall (door gap on the right)
  glassWall(5.45,10.15,5.55,15.7);            // left wall
  glassWall(12.45,10.15,12.55,15.7);          // right wall (lounge side)
  [[5.5,10.2],[8.1,10.2],[10.8,10.2],[12.5,10.2],[5.5,12.95],[5.5,15.7],[12.5,12.95],[12.5,15.7]].forEach(([x,z])=>B(0.1,1.7,0.1,C.trim,x,0.85,z,scene,{r:0.03}));
  BB(5.45,10.16,10.8,10.24,1.6,1.66,0x5ee7ff,{em:1,r:0,cast:false}); BB(5.46,10.2,5.54,15.7,1.6,1.66,0x5ee7ff,{em:1,r:0,cast:false}); BB(12.46,10.2,12.54,15.7,1.6,1.66,0x5ee7ff,{em:1,r:0,cast:false});
  B(2.9,0.62,0.05,0x120d1e,8.15,2.05,10.2,scene,{r:0.03,cast:false});
  const ns=neon('meeting w/ simon','#5ee7ff',2.8,0.7,'400 120px Pacifico, cursive'); ns.position.set(8.15,2.05,10.24); scene.add(ns); glow(8.15,2.05,10.5,'#5ee7ff',3.2,.22);
  MEET.sign=neon('in meeting','#ff4d6d',1.3,0.33,'700 150px DM Sans, sans-serif'); MEET.sign.position.set(11.65,1.9,10.22); scene.add(MEET.sign); MEET.sign.material.opacity=.15;
  MEET.signGlow=glow(11.65,1.9,10.4,'#ff4d6d',1.4,0);
  // oval table
  blockArea(7.2,12.2,10.8,13.8);
  const top=cyl(1,0.1,0,9,0.75,13,{mat:M(0x5a3d33),seg:40}); top.scale.set(1.8,1,0.8);
  [7.9,10.1].forEach(x=>cyl(0.09,0.7,C.woodD,x,0.35,13)); cyl(0.12,0.05,0x222222,9,0.82,13);
  [[7.9,12.55],[9,12.55],[10.1,12.55],[7.9,13.45],[9,13.45],[10.1,13.45]].forEach(([x,z])=>B(0.22,0.012,0.3,0xf4f2f8,x,0.806,z,scene,{r:0,cast:false}));
  cyl(0.06,0.12,0xffffff,8.4,0.86,12.75); cyl(0.06,0.12,0x5ee7ff,9.7,0.86,13.3);
  // chairs: 3 facing the camera side, 3 facing away
  const mchair=(x,z,rot,c)=>{ const back=rot===0?-1:1; B(0.56,0.1,0.54,C.dark,x,0.4,z,scene,{r:0.05}); B(0.56,0.62,0.1,c,x,0.78,z+back*0.27,scene,{r:0.05}); cyl(0.04,0.34,0x444444,x,0.17,z); cyl(0.24,0.04,0x333333,x,0.03,z); };
  [[7.8,11.5,0],[9,11.5,0],[10.2,11.5,0],[9,14.5,PI],[7.8,14.5,PI],[10.2,14.5,PI]].forEach(([x,z,rot],i)=>{ mchair(x,z,rot,0x6c7bff); SP.meeting.push({kind:'meeting',i,approach:{x,z},pose:{x,y:0.18,z,rot,anim:'listen'},icon:'🤝'}); });
  // Simon's head chair + laptop, and the presentation screen
  B(0.54,0.1,0.56,C.dark,6.55,0.4,13,scene,{r:0.05}); B(0.1,0.7,0.56,0xff5fa2,6.27,0.82,13,scene,{r:0.05}); cyl(0.04,0.34,0x444444,6.55,0.17,13);
  B(0.36,0.03,0.5,0xc9cbe0,7.45,0.815,13,scene,{r:0.012}); B(0.03,0.32,0.5,0xc9cbe0,7.62,0.98,13,scene,{r:0.012});
  blockArea(5.75,12.4,5.95,13.6);
  cyl(0.04,1.0,0x333333,5.85,0.5,13); B(0.5,0.04,0.5,0x333333,5.85,0.02,13,scene,{r:0.02});
  B(0.08,0.85,1.3,0x111111,5.85,1.45,13,scene,{r:0.03});
  const sc=document.createElement('canvas'); sc.width=512; sc.height=340; const sx=sc.getContext('2d');
  sx.fillStyle='#14102a'; sx.fillRect(0,0,512,340); sx.fillStyle='#f2edff'; sx.font='700 34px DM Sans, sans-serif'; sx.fillText('Q4 vibe check',28,52);
  [['#ff5fa2',150],['#a78bfa',210],['#5ee7ff',120],['#b6f36a',250],['#ffd166',190]].forEach(([c,h],k)=>{ sx.fillStyle=c; sx.fillRect(40+k*90,300-h,56,h); });
  sx.strokeStyle='#ffffff'; sx.lineWidth=3; sx.beginPath(); sx.moveTo(30,302); sx.lineTo(490,302); sx.stroke();
  MEET.screen=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),color:0x2a2a3a});
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.78),MEET.screen); scr.rotation.y=PI/2; scr.position.set(5.9,1.45,13); scene.add(scr);
  MEET.screenGlow=glow(6.2,1.45,13,'#a78bfa',1.6,0);
  MEET.light=plight(0x9fd0ff,0.25,7,9,2.3,13);
  MEET.present={kind:'simon',approach:{x:6.35,z:12.05},pose:{x:6.35,y:0,z:12.05,rot:PI/2,anim:'present'},icon:'📊'};
  MEET.idle={kind:'simon',approach:{x:6.75,z:13.0},pose:{x:6.62,y:0.18,z:13.0,rot:PI/2,anim:'type'},icon:'💼'};
}
function setMeetingVisuals(on){
  MEET.sign.material.opacity=on?1:.15; MEET.signGlow.material.opacity=on?.5:0;
  MEET.screen.color.setHex(on?0xffffff:0x2a2a3a); MEET.screenGlow.material.opacity=on?.35:0;
  MEET.light.intensity=on?1.2:0.25;
}

/* ============================ characters (soft, rounded) ============================ */
function hairParts(g,L){
  const c=L.hair, s=L.hairStyle;
  const top=()=>B(0.7,0.24,0.64,c,0,0.56,-0.01,g,{r:0.11});
  const fringe=(w=0.64)=>B(w,0.15,0.13,c,0,0.5,0.24,g,{r:0.065});
  const back=len=>B(0.7,len,0.15,c,0,0.6-len/2,-0.25,g,{r:0.07});
  const sides=len=>[-1,1].forEach(sx=>B(0.11,len,0.52,c,sx*0.315,0.56-len/2,-0.02,g,{r:0.05}));
  if(s==='short'){ top(); fringe(0.52); back(0.38); sides(0.22); }
  else if(s==='long'){ top(); fringe(); back(0.98); sides(0.74); }
  else if(s==='bob'){ top(); fringe(); back(0.52); sides(0.5); }
  else if(s==='bun'){ top(); fringe(0.52); back(0.38); sides(0.2); sph(0.16,c,0,0.76,-0.1,g); }
  else if(s==='spiky'){ top(); fringe(0.52); back(0.34); sides(0.2); [[-.2,.08,-.35],[0,.04,0],[.2,.08,.35],[-.12,-.16,-.25],[.13,-.16,.25]].forEach(([x,z,rz])=>{ const m=cone(0.1,0.26,c,x,0.74,z,g,{seg:6}); m.rotation.set(z*1.2,0,rz); }); }
  else if(s==='puff'){ [[0,.64,-.02,.32],[-.24,.56,0,.24],[.24,.56,0,.24],[0,.6,-.22,.28],[-.18,.66,-.16,.22],[.18,.66,-.16,.22],[0,.74,.08,.22],[-.3,.36,-.08,.17],[.3,.36,-.08,.17]].forEach(([x,y,z,r])=>sph(r,c,x,y,z,g)); }
  else if(s==='buzz'){ B(0.68,0.1,0.62,c,0,0.57,0,g,{r:0.05}); back(0.22); }
}
function hatParts(head,L){
  const c=L.hatColor||'#ffd166', g=new THREE.Group(); head.add(g);
  if(L.hairStyle==='puff'&&L.hat!=='headphones'){ g.position.y=0.17; g.scale.set(1.12,1,1.1); }
  if(L.hat==='cap'){ const d=dome(0.36,c,0,0.5,-0.01,g); d.scale.set(1,0.65,0.95); B(0.52,0.05,0.3,c,0,0.53,0.38,g,{r:0.025}); sph(0.04,shade(c,-.25),0,0.74,0,g); }
  else if(L.hat==='beanie'){ const d=dome(0.37,c,0,0.5,0,g); d.scale.set(1,0.8,0.95); B(0.74,0.14,0.68,shade(c,-.2),0,0.52,0,g,{r:0.07}); sph(0.1,0xffffff,0,0.82,0,g); }
  else if(L.hat==='cat'){ [-1,1].forEach(sx=>{ const e=cone(0.11,0.22,c,sx*0.21,0.7,0.02,g,{seg:4}); e.rotation.set(0,PI/4,-sx*0.3); const n=cone(0.06,0.13,0xff9fc0,sx*0.21,0.69,0.07,g,{seg:4}); n.rotation.set(0,PI/4,-sx*0.3); }); }
  else if(L.hat==='headphones'){ torus(0.37,0.035,PI,0x221c2c,0,0.3,0,g); [-1,1].forEach(sx=>{ cyl(0.13,0.1,c,sx*0.37,0.3,0,{rz:PI/2,parent:g}); cyl(0.1,0.04,0x221c2c,sx*0.32,0.3,0,{rz:PI/2,parent:g}); }); }
  else if(L.hat==='crown'){ cyl(0.22,0.12,0xf2c14e,0,0.64,0,{r2:0.24,em:.2,parent:g}); for(let k=0;k<6;k++){ const a=k/6*PI*2; cone(0.05,0.13,0xf2c14e,Math.sin(a)*0.2,0.76,Math.cos(a)*0.2,g,{em:.2,seg:4}); } sph(0.04,0xff5fa2,0,0.64,0.24,g,{em:.5}); }
}
function buildPerson(L){
  const body=new THREE.Group(), P={body,eyes:[]};
  const top=L.top, sk=L.skin;
  // chibi proportions: hip at 0.28, short torso, big head (~half the height)
  ['legL','legR'].forEach((k,n)=>{ const leg=new THREE.Group(); leg.position.set(n?0.11:-0.11,0.28,0); body.add(leg);
    capsule(0.09,0.07,L.pants,0,-0.11,0,leg); B(0.2,0.11,0.26,0xf4f2f8,0,-0.225,0.035,leg,{r:0.05}); B(0.21,0.03,0.27,0x2a2236,0,-0.27,0.035,leg,{r:0.012}); P[k]=leg; });
  const torso=new THREE.Group(); torso.position.y=0.28; body.add(torso); P.torso=torso;
  B(0.48,0.4,0.36,top,0,0.19,0,torso,{r:0.16});
  if(L.topStyle==='hoodie'){ B(0.42,0.18,0.16,shade(top,-.15),0,0.33,-0.17,torso,{r:0.08}); B(0.26,0.1,0.03,shade(top,-.1),0,0.1,0.175,torso,{r:0.02}); [-1,1].forEach(sx=>capsule(0.013,0.07,0xffffff,sx*0.055,0.27,0.185,torso,{cast:false})); }
  else { sph(0.06,shade(top,top==='#111111'||top==='#2b2438'?.5:-.3),0,0.21,0.175,torso,{cast:false}).scale.set(1,1,0.25); }
  ['armL','armR'].forEach((k,n)=>{ const arm=new THREE.Group(); arm.position.set(n?0.3:-0.3,0.33,0); torso.add(arm);
    if(L.topStyle==='hoodie') capsule(0.075,0.14,shade(top,-.05),0,-0.12,0,arm);
    else { capsule(0.082,0.04,top,0,-0.05,0,arm); capsule(0.064,0.1,sk,0,-0.15,0,arm); }
    sph(0.075,sk,0,-0.25,0,arm);
    const hand=new THREE.Group(); hand.position.set(0,-0.27,0.02); arm.add(hand); P[k]=arm; P[k+'H']=hand; });
  const head=new THREE.Group(); head.position.y=0.37; torso.add(head); P.head=head;
  B(0.8,0.72,0.72,sk,0,0.36,0,head,{r:0.27});
  [-0.17,0.17].forEach(x=>{ const e=new THREE.Group(); e.position.set(x,0.33,0.355); head.add(e);
    sph(0.088,0x1b1622,0,0,0,e,{cast:false}).scale.set(1,1.25,0.5);
    sph(0.03,0xffffff,0.03,0.045,0.035,e,{cast:false,seg:8}); sph(0.014,0xffffff,-0.025,-0.04,0.035,e,{cast:false,seg:6}); P.eyes.push(e); });
  [-0.27,0.27].forEach(x=>sph(0.06,0xff8fa8,x,0.19,0.33,head,{cast:false}).scale.set(1.3,0.55,0.3));
  B(0.07,0.022,0.02,0x5a2f3a,0,0.17,0.36,head,{r:0.01,cast:false});
  const deco=new THREE.Group(); deco.scale.setScalar(1.24); head.add(deco);
  hairParts(deco,L); hatParts(deco,L);
  if(L.glasses==='round'){ [-0.137,0.137].forEach(x=>torus(0.09,0.014,PI*2,0x221c2c,x,0.266,0.3,deco,{cast:false})); B(0.07,0.02,0.02,0x221c2c,0,0.28,0.3,deco,{r:0,cast:false}); }
  if(L.glasses==='shades'){ [-0.137,0.137].forEach(x=>B(0.2,0.13,0.035,0x140d1c,x,0.266,0.305,deco,{r:0.05,cast:false})); B(0.07,0.03,0.03,0x140d1c,0,0.28,0.305,deco,{r:0,cast:false}); }
  P.phone=new THREE.Group(); B(0.13,0.22,0.03,0x1b1622,0,0,0,P.phone,{r:0.03}); B(0.11,0.18,0.008,0x9fdcff,0,0,0.017,P.phone,{em:1,r:0,cast:false}); P.phone.position.set(0,-0.03,0.07); P.armRH.add(P.phone);
  P.mug=new THREE.Group(); cyl(0.065,0.14,0xffffff,0,0,0,{parent:P.mug}); torus(0.038,0.012,PI*2,0xffffff,0.075,0,0,P.mug); P.mug.position.set(0,-0.02,0.08); P.armRH.add(P.mug);
  return P;
}
function buildBot(color){
  const body=new THREE.Group(), P={body};
  B(0.46,0.18,0.38,0x3e4258,0,0.1,0,body,{r:0.08}); B(0.52,0.5,0.42,0xc3c8de,0,0.43,0,body,{r:0.17});
  P.eq=[0,1,2].map(k=>B(0.07,0.16,0.02,0,-0.1+k*0.1,0.42,0.215,body,{mat:own(color,1),r:0,cast:false}));
  [-1,1].forEach(sx=>capsule(0.05,0.2,0x9aa1bb,sx*0.31,0.42,0,body));
  const head=new THREE.Group(); head.position.y=0.67; body.add(head); P.head=head;
  B(0.66,0.5,0.5,0xdfe3f2,0,0.25,0,head,{r:0.19}); B(0.52,0.34,0.03,0x10131f,0,0.25,0.245,head,{r:0.08,cast:false});
  P.eyeMat=own(color,1); [-0.12,0.12].forEach(x=>sph(0.055,0,x,0.27,0.26,head,{mat:P.eyeMat,cast:false}).scale.set(1,1,0.4));
  capsule(0.022,0.14,0xdfe3f2,0,0.6,0,head); P.bulb=own(color,1); sph(0.06,0,0,0.72,0,head,{mat:P.bulb});
  torus(0.36,0.03,PI,0x221c2c,0,0.27,0,head); [-1,1].forEach(sx=>cyl(0.12,0.09,0x221c2c,sx*0.36,0.27,0,{rz:PI/2,parent:head}));
  P.glow=glow(0,0.45,0.3,color,0.9,0,body);
  return P;
}
function disposeGroup(g){ g.traverse(o=>{ if(o.geometry&&!o.geometry.userData.cached) o.geometry.dispose(); if(o.material&&o.material.map===glowTex) o.material.dispose(); }); }

const labelsBox=$('labels');
const CH=[];
const NPCS=[];
const ALL=()=>CH.concat(NPCS);
function makeChar(e,kind,list=CH){
  const ch={id:e.id,kind,e,g:new THREE.Group(),path:[],spot:null,posed:false,glide:null,state:kind==='bot'?'off':'offline',anim:'stand',phase:rand(0,6),timer:rand(8,20),speaking:false,playing:false,pop:null,popT:0,lblKey:''};
  scene.add(ch.g);
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.36,0.47,32),new THREE.MeshBasicMaterial({color:0xb6f36a,transparent:true,opacity:.85,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
  ring.rotation.x=-PI/2; ring.position.y=0.04; ring.visible=false; ch.g.add(ring); ch.ring=ring;
  ch.lbl=document.createElement('div'); ch.lbl.className='lbl'+(e.me?' me':''); labelsBox.appendChild(ch.lbl);
  rebuild(ch); list.push(ch); return ch;
}
function rebuild(ch){
  if(ch.P){ ch.g.remove(ch.P.body); disposeGroup(ch.P.body); }
  ch.P= ch.kind==='bot'? buildBot(ch.e.color) : buildPerson(ch.e.look);
  ch.P.body.traverse(o=>{ o.userData.cid=ch.id; });
  ch.g.add(ch.P.body);
  if(ch.posed&&ch.spot&&ch.kind==='person') ch.P.body.rotation.x= ch.spot.pose.anim==='sleep'? -PI/2 : 0;
  if(ch.kind==='person') DYN.blankets[ch.e.bed].material.color.setHex(hex(ch.e.look.top));
}
const byId=id=>CH.find(c=>c.id===id);

/* ============================ movement & poses ============================ */
function onPose(s,on){
  if(s.kind==='bed'){ const bl=DYN.blankets[s.i]; bl.scale.y=on?0.42:0.1; bl.position.y=on?0.8:0.6; DYN.lamps[s.i].emissiveIntensity=on?1.1:0.15; DYN.lampGlows[s.i].material.opacity=on?.75:.12; }
  if(s.kind==='seat'){ s.laptop.emissiveIntensity=on?1:0; s.glow.visible=on; }
}
function snapPose(ch,s){
  const p=s.pose; ch.g.position.set(p.x,p.y,p.z); ch.g.rotation.y=p.rot;
  if(ch.kind==='person') ch.P.body.rotation.x= p.anim==='sleep'? -PI/2 : 0;
  ch.posed=true; ch.glide=null; onPose(s,true);
}
function unpose(ch){
  if(ch.posed&&ch.spot){ const a=ch.spot.approach; ch.g.position.set(a.x,0,a.z); if(ch.kind==='person') ch.P.body.rotation.x=0; onPose(ch.spot,false); }
  ch.posed=false; ch.glide=null;
}
function goTo(ch,s){
  unpose(ch);
  if(ch.spot&&ch.spot.by===ch.id) ch.spot.by=null;
  ch.spot=s; if(s) s.by=ch.id;
  ch.g.position.y=0;
  ch.path= s? findPath({x:ch.g.position.x,z:ch.g.position.z}, s.approach) : [];
}
function placeAt(ch,s){ unpose(ch); if(ch.spot&&ch.spot.by===ch.id) ch.spot.by=null; ch.spot=s; s.by=ch.id; ch.path=[]; snapPose(ch,s); }
const free=list=>list.filter(s=>!s.by);
function seatFor(ch){ const pref=SP.seats[ch.e.seat]; return (!pref.by||pref.by===ch.id)?pref:(free(SP.seats)[0]||pref); }
function loungeFor(){ const f=free(SP.lounge); return f[Math.floor(Math.random()*f.length)]||SP.lounge[0]; }
function lerpAng(a,b,t){ const d=((b-a+PI)%(2*PI)+2*PI)%(2*PI)-PI; return a+d*t; }

function meetingSeatFor(ch){ const f=free(SP.meeting); return f[0]||SP.meeting[0]; }
function setState(ch,st,{instant=false,quiet=false}={}){
  if(st==='afk') st='meeting'; // older bot versions call it afk
  const prev=ch.state; if(prev===st&&!instant) return;
  ch.state=st; ch.timer=rand(10,22); ch.speaking=false;
  const target= st==='offline'? SP.beds[ch.e.bed] : st==='working'? seatFor(ch) : meetingSeatFor(ch);
  if(instant) placeAt(ch,target); else { goTo(ch,target); ch.pop={offline:'😴',working:'⚡',meeting:'🤝'}[st]; ch.popT=2.4; }
  if(!quiet) logState(ch,prev,st);
  renderRows();
}
function setBot(ch,on,{instant=false,quiet=false}={}){
  const st=on?'on':'off'; if(ch.state===st&&!instant) return;
  ch.state=st; if(!on) ch.playing=false;
  const i=BOTS.findIndex(b=>b.id===ch.id), dest=(on?BOOTH:DOCKS)[i];
  ch.spot={kind:'bot',approach:dest,pose:{x:dest.x,y:0,z:dest.z,rot:0,anim:'bot'}};
  if(instant){ ch.g.position.set(dest.x,0,dest.z); ch.g.rotation.y=0; ch.path=[]; ch.posed=true; ch.glide=null; }
  else { ch.posed=false; ch.glide=null; ch.path=findPath({x:ch.g.position.x,z:ch.g.position.z},dest); }
  if(!quiet) log('voiceStateUpdate', on?`${ch.e.name} joined 🔊 Office`:`${ch.e.name} left 🔊 Office`, on?`${ch.e.name} unplugs and rolls up to the decks`:`${ch.e.name} rolls back to its charging dock`);
  renderRows();
}
function setPlaying(ch,v,{quiet=false}={}){
  if(v) CH.forEach(o=>{ if(o.kind==='bot'&&o!==ch) o.playing=false; });
  ch.playing=v;
  if(!quiet) log('music', v?`${ch.e.name} started “${ch.e.song}”`:`${ch.e.name} stopped`, v?'speakers thump, disco ball spins':'speakers go quiet');
  renderRows();
}

let meetingOn=null;
function updateMeeting(instant){
  const simon=NPCS[0]; if(!simon) return;
  const on=CH.some(c=>c.kind==='person'&&c.state==='meeting');
  if(on===meetingOn&&!instant) return;
  meetingOn=on; setMeetingVisuals(on);
  const spot=on?MEET.present:MEET.idle;
  if(instant) placeAt(simon,spot); else { goTo(simon,spot); simon.pop=on?'👋':'☕'; simon.popT=2.4; }
  simon.speaking=false;
}
function aiTick(ch,dt){
  if(ch.kind==='npc'){ ch.speaking= ch.posed&&ch.spot===MEET.present; return; }
  if(ch.kind!=='person'||!ch.posed) return;
  ch.timer-=dt; if(ch.timer>0) return;
  if(ch.state==='working'){
    if(ch.spot.kind==='seat'){
      if(Math.random()<.5){ const f=free(SP.extras.concat(SP.lounge)); if(f.length){ goTo(ch,f[Math.floor(Math.random()*f.length)]); ch.timer=rand(5,8); return; } }
      ch.timer=rand(14,28);
    } else { goTo(ch,seatFor(ch)); ch.timer=rand(16,30); }
  } else ch.timer=30;
}

const RESET_KEYS=['legL','legR','armL','armR','head','torso'];
function animPerson(ch,t,force){
  const P=ch.P, ph=ch.phase;
  const a= force || (ch.path.length||(ch.glide&&!ch.posed&&ch.glide.t<0.6) ? 'walk' : (ch.posed? ch.spot.pose.anim : 'stand'));
  ch.anim=a;
  RESET_KEYS.forEach(k=>P[k].rotation.set(0,0,0));
  P.body.position.y=0; P.phone.visible=false; P.mug.visible=false;
  const sit=()=>{ P.legL.rotation.x=-PI/2; P.legR.rotation.x=-PI/2; };
  if(a==='walk'){ const s=Math.sin(t*11+ph); P.legL.rotation.x=s*.6; P.legR.rotation.x=-s*.6; P.armL.rotation.x=-s*.55; P.armR.rotation.x=s*.55; P.body.position.y=Math.abs(Math.cos(t*11+ph))*.05; P.head.rotation.z=Math.sin(t*5.5+ph)*.05; }
  else if(a==='type'){ sit();
    if(ch.speaking){ P.armR.rotation.x=-1.0+Math.sin(t*5)*.35; P.armR.rotation.z=.2; P.armL.rotation.x=-1.2; P.head.rotation.y=Math.sin(t*2.2)*.3; P.head.rotation.x=Math.sin(t*9)*.04; }
    else { P.armL.rotation.x=-1.25+Math.sin(t*16+ph)*.07; P.armR.rotation.x=-1.25+Math.sin(t*16+ph+1.6)*.07; P.head.rotation.x=.12+Math.sin(t*.7+ph)*.04; } }
  else if(a==='phone'){ sit(); P.armR.rotation.x=-1.3+Math.sin(t*5+ph)*.03; P.armR.rotation.z=.3; P.armL.rotation.x=-1.1; P.armL.rotation.z=-.35; P.head.rotation.x=.35; P.phone.visible=true;
    if(Math.sin(t*.4+ph)>.92){ P.head.rotation.x=0; P.head.rotation.y=.4; } }
  else if(a==='sleep'){ P.torso.rotation.x=Math.sin(t*1.5+ph)*.025; P.head.rotation.y=Math.sin(t*.3+ph)*.1; }
  else if(a==='mug'){ const sip=Math.sin(t*1.1+ph)>.75; P.armR.rotation.x=sip?-2.1:-1.0; P.head.rotation.x=sip?-.25:0; P.mug.visible=true; }
  else if(a==='board'){ P.armR.rotation.x=-2.4+Math.sin(t*5)*.18; P.armR.rotation.z=Math.sin(t*3)*.25; P.head.rotation.x=-.1; }
  else if(a==='listen'){ sit(); P.armL.rotation.x=-1.0; P.armR.rotation.x=-1.0; P.armL.rotation.z=.25; P.armR.rotation.z=-.25;
    P.head.rotation.x= Math.sin(t*1.3+ph)>.85 ? .18 : .02; P.head.rotation.y= Math.sin(t*.35+ph)*.35; }
  else if(a==='present'){ P.armL.rotation.z=-1.25+Math.sin(t*2.2)*.2; P.armL.rotation.x=-.2; P.armR.rotation.x=-.5+Math.sin(t*3.1)*.35; P.armR.rotation.z=.15;
    P.head.rotation.y=Math.sin(t*.8)*.35; P.head.rotation.x=Math.sin(t*6)*.04; P.body.position.y=Math.abs(Math.sin(t*1.6))*.015; }
  else if(a==='wave'){ P.armR.rotation.z=2.5+Math.sin(t*8)*.35; P.head.rotation.z=Math.sin(t*2)*.08; P.body.position.y=Math.abs(Math.sin(t*4))*.03; }
  else if(a==='vibe'){ P.body.position.y=Math.abs(Math.sin(t*4))*.04; P.head.rotation.z=Math.sin(t*4)*.12; P.armL.rotation.z=-.25-Math.abs(Math.sin(t*4))*.2; P.armR.rotation.z=.25+Math.abs(Math.sin(t*4))*.2; }
  else { P.torso.rotation.z=Math.sin(t*1.4+ph)*.025; P.head.rotation.y=Math.sin(t*.5+ph)*.3; }
  const blink= a==='sleep' || ((t+ph*3)%4.3)<.12;
  P.eyes.forEach(e=>e.scale.y=blink?.12:1);
  if(ch.ring){ ch.ring.visible= ch.speaking && a!=='sleep'; if(ch.ring.visible){ const s=1+Math.sin(t*9)*.08; ch.ring.scale.set(s,s,s); } }
}
function animBot(ch,t){
  const P=ch.P, on=ch.state==='on', moving=ch.path.length>0;
  P.body.position.y= moving? 0.04+Math.sin(t*14)*.02 : ch.playing? Math.abs(Math.sin(t*6))*.06 : 0;
  P.head.rotation.set(on||moving?0:.28, 0, ch.playing?Math.sin(t*3)*.16:0);
  P.eyeMat.emissiveIntensity= on||moving? 1.2 : 0.1;
  P.bulb.emissiveIntensity= on? (Math.floor(t*2)%2?1.2:.2) : .1;
  P.glow.material.opacity= on? (ch.playing? .35+Math.sin(t*12)*.15 : .2) : 0;
  P.eq.forEach((m,k)=>{ m.scale.y= ch.playing? .4+Math.abs(Math.sin(t*10+k*1.7))*1.4 : .5; });
  ch.ring.visible= ch.playing&&on; if(ch.ring.visible){ const s=1+Math.sin(t*12)*.1; ch.ring.scale.set(s,s,s); }
}

function moveChar(ch,dt){
  if(ch.glide){
    const G=ch.glide; G.t=Math.min(1,G.t+dt/0.35);
    const e=G.t*G.t*(3-2*G.t);
    ch.g.position.set(G.from.x+(G.to.x-G.from.x)*e, G.from.y+(G.to.y-G.from.y)*e, G.from.z+(G.to.z-G.from.z)*e);
    ch.g.rotation.y=lerpAng(G.r0,G.to.rot,e);
    if(G.t>=1){ snapPose(ch,ch.spot); if(ch.kind==='person') ch.timer=rand(10,24); }
    return;
  }
  if(!ch.path.length) return;
  const p=ch.path[0], pos=ch.g.position, dx=p.x-pos.x, dz=p.z-pos.z, d=Math.hypot(dx,dz), step=(ch.kind==='bot'?1.6:2.1)*dt;
  if(d>0.02) ch.g.rotation.y=lerpAng(ch.g.rotation.y,Math.atan2(dx,dz),Math.min(1,dt*12));
  if(d<=step){ pos.x=p.x; pos.z=p.z; ch.path.shift(); } else { pos.x+=dx/d*step; pos.z+=dz/d*step; }
  if(!ch.path.length&&ch.spot) ch.glide={t:0,from:pos.clone(),to:ch.spot.pose,r0:ch.g.rotation.y};
}

/* ============================ labels ============================ */
const v3=new THREE.Vector3();
const ZONES=[['bunk room',2.3,10.0],['big table',11,7.8],['lounge',17.6,16.1],['decks',18.2,6.5],['kitchen',16.6,2.8]].map(([t,x,z])=>{ const el=document.createElement('div'); el.className='zone'; el.textContent=t; labelsBox.appendChild(el); return {el,x,z}; });
function screenPos(x,y,z){ v3.set(x,y,z).project(camera); return [(v3.x+1)/2*stage.clientWidth,(1-v3.y)/2*stage.clientHeight]; }
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function iconFor(ch){
  if(ch.kind==='bot') return ch.path.length?'':(ch.state==='off'?'🔌':ch.playing?'🎶':'🎛️');
  if(!ch.posed) return '';
  if(ch.spot.icon) return ch.spot.icon;
  return {sleep:'💤',type:'💻',phone:'📱',listen:'🤝'}[ch.spot.pose.anim]||'';
}
function updateLabels(dt){
  ALL().forEach(ch=>{
    const sleeping= ch.kind==='person'&&ch.posed&&ch.spot&&ch.spot.pose.anim==='sleep';
    const p=ch.g.position;
    const [x,y]= sleeping? screenPos(p.x-1.05,1.45,p.z) : screenPos(p.x,p.y+(ch.kind==='bot'?1.8:1.85),p.z);
    ch.lbl.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
    if(ch.pop){ ch.popT-=dt; if(ch.popT<=0) ch.pop=null; }
    const ic=iconFor(ch);
    const key=[ch.e.name,ch.speaking,ic,sleeping,ch.pop].join('|');
    if(key!==ch.lblKey){ ch.lblKey=key;
      ch.lbl.innerHTML=`${ch.speaking?'<i class="sp"></i>':''}${ch.kind==='bot'?'<span class="bt">BOT</span>':ch.kind==='npc'?'<span class="bt npc">NPC</span>':''}${esc(ch.e.name)}${ic?' '+ic:''}${sleeping?'<span class="zzz"><b>z</b><i>z</i><u>Z</u></span>':''}${ch.pop?`<span class="pop">${ch.pop}</span>`:''}`; }
  });
  ZONES.forEach(z=>{ const [x,y]=screenPos(z.x,0.05,z.z); z.el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`; });
}

/* ============================ ambient animation: LEDs, music, lava, disco ============================ */
function noteTex(ch,color){ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.font='bold 50px system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.shadowColor=color; x.shadowBlur=12; x.fillStyle=color; x.fillText(ch,32,34); return new THREE.CanvasTexture(c); }
const NOTE_TEX=['#ff5fa2','#ffd166','#7dffb2','#5ee7ff','#a78bfa'].flatMap(c=>['♪','♫'].map(n=>noteTex(n,c)));
const notes=[]; let noteT=0;
const tmpC=new THREE.Color();
const stripHue=(u,t)=>0.52+0.42*(0.5+0.5*Math.sin(u*0.32+t*0.7));
function ambient(dt,t){
  const playing=CH.some(c=>c.kind==='bot'&&c.playing&&c.state==='on');
  if(playing){ noteT-=dt; if(noteT<=0){ noteT=0.26; const x=Math.random()<.5?16.45:19.95;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:NOTE_TEX[Math.floor(Math.random()*NOTE_TEX.length)],transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})); s.scale.set(.5,.5,.5); s.position.set(x+rand(-.2,.2),1.6,5.4); scene.add(s);
    notes.push({s,vx:rand(-.5,.5),vz:rand(.1,.6),life:0}); } }
  for(let i=notes.length-1;i>=0;i--){ const n=notes[i]; n.life+=dt; n.s.position.x+=n.vx*dt; n.s.position.z+=n.vz*dt; n.s.position.y+=0.8*dt; n.s.material.opacity=Math.max(0,1-n.life/2.2);
    if(n.life>2.2){ scene.remove(n.s); n.s.material.dispose(); notes.splice(i,1); } }
  const beat=playing? Math.max(0,Math.sin(t*14)) : 0;
  DYN.cones.forEach((c,k)=>{ const s=1+(playing?Math.max(0,Math.sin(t*14+k))*.2:0); c.scale.set(s,1,s); });
  DYN.leds.forEach((m,k)=>m.emissiveIntensity= playing? (Math.floor(t*6+k)%3===0?1.3:.15) : .08);
  L_DJ.intensity= playing? 1.0+beat*0.9 : 0.7;
  DYN.strip.forEach(({m,u})=>{ m.emissive.setHSL(stripHue(u,t),0.95,0.55); m.color.copy(m.emissive); });
  DYN.stripGlows.forEach(({s,u})=>s.material.color.setHSL(stripHue(u,t),0.95,0.55));
  DYN.tv.emissive.setHSL((t*0.05)%1,0.6,0.4); DYN.tv.color.copy(DYN.tv.emissive);
  L_TV.color.copy(DYN.tv.emissive).lerp(tmpC.set(0x5ee7ff),.5); L_TV.intensity=0.7+Math.sin(t*7)*0.08+Math.sin(t*2.3)*0.1;
  DYN.lava.forEach((b,k)=>{ b.position.y=0.76+Math.sin(t*0.6+k*2.1)*0.12; b.position.x=18.35+Math.sin(t*0.9+k)*0.015; });
  DYN.disco.rotation.y+=dt*(playing?1.6:0.25); DYN.disco.material.emissiveIntensity= playing? .35+beat*.4 : .2;
  DYN.discoGlints.forEach((g,k)=>{ const a=t*(playing?1.6:.25)*1.3+k*1.26; g.position.set(17.6+Math.cos(a)*0.36,2.85+Math.sin(a*1.7)*0.18,12.9+Math.sin(a)*0.36); g.material.opacity= playing? (Math.sin(t*9+k*2)>.2?.9:.2) : .12; });
  L_LOUNGE.intensity= 1.4+(playing?beat*0.3:0);
}

/* ============================ camera controls & clicking ============================ */
const ptrs=new Map(); let drag=null, pinch0=0, zoom0=1;
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
stage.addEventListener('pointerdown',e=>{ try{ stage.setPointerCapture(e.pointerId); }catch(_){} ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===1) drag={x:e.clientX,y:e.clientY,yaw:CAM.yaw,pitch:CAM.pitch,moved:false};
  if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinch0=Math.hypot(a.x-b.x,a.y-b.y)||1; zoom0=CAM.zoom; if(drag) drag.moved=true; } });
stage.addEventListener('pointermove',e=>{ if(!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; CAM.zoom=Math.min(2.6,Math.max(.8,zoom0*Math.hypot(a.x-b.x,a.y-b.y)/pinch0)); placeCamera(); return; }
  if(!drag) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>4){ drag.moved=true; stage.classList.add('dragging'); }
  if(drag.moved){ CAM.yaw=Math.min(1.4,Math.max(0.15,drag.yaw-dx*0.006)); CAM.pitch=Math.min(1.1,Math.max(0.35,drag.pitch+dy*0.004)); placeCamera(); } });
function endPtr(e){ if(!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); stage.classList.remove('dragging');
  if(drag&&!drag.moved&&ptrs.size===0&&e.type==='pointerup'){ const r=stage.getBoundingClientRect(); ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ndc,camera);
    const hits=ray.intersectObjects(CH.filter(c=>c.kind==='person').map(c=>c.g),true); const h=hits.find(x=>x.object.userData.cid&&x.object.isMesh); if(h) openCust(h.object.userData.cid); }
  if(ptrs.size===0) drag=null; }
stage.addEventListener('pointerup',endPtr); stage.addEventListener('pointercancel',endPtr);
stage.addEventListener('wheel',e=>{ e.preventDefault(); CAM.zoom=Math.min(2.6,Math.max(.8,CAM.zoom*(1-e.deltaY*0.0012))); placeCamera(); },{passive:false});

/* ============================ log & simulator ============================ */
function stamp(){ return new Date().toTimeString().slice(0,8); }
function log(ev,text,to){ const box=$('log'), d=document.createElement('div'); d.innerHTML=`<span class="t">${stamp()}</span> <span class="ev">${ev}</span> ${esc(text)}${to?`<span class="to">→ office: ${esc(to)}</span>`:''}`; box.appendChild(d); box.scrollTop=box.scrollHeight; }
const vb=(ch,s3,base)=>ch.e.name==='You'?base:s3;
function logState(ch,a,b){
  const n=ch.e.name;
  if(b==='offline') return log('voiceStateUpdate',`${n} left 🔊 Office`,`${n} ${vb(ch,'logs','log')} off and ${vb(ch,'goes','go')} to bed`);
  if(a==='offline'&&b==='working') return log('voiceStateUpdate',`${n} joined 🔊 Office`,`${n} ${vb(ch,'wakes','wake')} up and ${vb(ch,'locks','lock')} in at the big table`);
  if(a==='offline'&&b==='meeting') return log('voiceStateUpdate',`${n} joined 🔊 Office, deafened`,`${n} ${vb(ch,'rolls','roll')} out of bed straight into a meeting with Simon`);
  if(b==='meeting') return log('voiceStateUpdate',`${n} deafened`,`${n} ${vb(ch,'heads','head')} into a meeting with Simon`);
  if(b==='working') return log('voiceStateUpdate',`${n} undeafened`,`${n} ${vb(ch,'leaves','leave')} the meeting and ${vb(ch,'locks','lock')} back in`);
}
function rowSub(ch){
  if(ch.kind==='bot') return ch.state==='off'?'not in the call · charging':ch.playing?`in call · playing ${ch.e.song}`:'in call · on the decks';
  return {offline:'not in the call · sleeping',working:'in the call · locked in',meeting:'deafened · in a meeting with Simon'}[ch.state];
}
function renderRows(){
  const box=$('rows'); box.innerHTML='';
  CH.forEach(ch=>{
    const r=document.createElement('div'); r.className='row';
    const img= ch.kind==='person'? portrait(ch.e.look) : botPortrait(ch.e.color);
    r.innerHTML=`<img alt="" src="${img}"><div class="who"><b>${esc(ch.e.name)}</b>${ch.kind==='bot'?' <span class="bt">BOT</span>':''}<small>${esc(rowSub(ch))}</small></div>`;
    const b=document.createElement('button'); b.className='edit';
    if(ch.kind==='person'){ b.textContent='✏️ fit'; b.setAttribute('aria-label',`Restyle ${ch.e.name}`); b.onclick=()=>openCust(ch.id); }
    else { b.textContent=ch.playing?'⏸ stop':'▶ play'; b.disabled=ch.state!=='on'; b.onclick=()=>setPlaying(ch,!ch.playing); }
    const live=MODE==='live';
    if(!live || (ch.kind==='person'&&ch.e.me)) r.appendChild(b); else r.appendChild(document.createElement('span'));
    const seg=document.createElement('div'); seg.className='seg'+(ch.kind==='bot'?' two':''); seg.setAttribute('role','group'); seg.setAttribute('aria-label',`${ch.e.name} status`);
    const opts= ch.kind==='bot'? [['off','🔌 not in call'],['on','🎛️ in call']] : [['offline','💤 asleep'],['working','💻 locked in'],['meeting','🤝 w/ simon']];
    opts.forEach(([s,l])=>{ const o=document.createElement('button'); o.dataset.s=s; o.textContent=l; o.setAttribute('aria-pressed',ch.state===s);
      if(live){ o.disabled=true; o.title='Set by Discord'; }
      else o.onclick=()=>{ ch.kind==='bot'? setBot(ch,s==='on') : setState(ch,s); }; seg.appendChild(o); });
    r.appendChild(seg); box.appendChild(r);
  });
  const c=s=>CH.filter(x=>x.kind==='person'&&x.state===s).length, bots=CH.filter(x=>x.kind==='bot'&&x.state==='on').length;
  $('counts').innerHTML=`<b>${c('working')}</b> locked in · <b>${c('meeting')}</b> with Simon · <b>${c('offline')}</b> asleep · <b>${bots}</b> ${bots===1?'bot':'bots'} in call`;
}
let demoTimers=[];
$('demo').onclick=()=>{
  demoTimers.forEach(clearTimeout); demoTimers=[];
  CH.forEach(ch=>{ ch.speaking=false; ch.kind==='bot'? setBot(ch,false,{instant:true,quiet:true}) : setState(ch,'offline',{instant:true,quiet:true}); });
  $('log').innerHTML=''; log('demo','lights out, nobody in the call yet'); renderRows();
  const P=id=>byId(id);
  [[600,()=>setState(P('mia'),'working')],[2200,()=>setState(P('dan'),'working')],[3800,()=>setBot(P('dj'),true)],[6200,()=>setPlaying(P('dj'),true)],
   [7400,()=>setState(P('you'),'working')],[11000,()=>setState(P('dan'),'meeting')],[13000,()=>setState(P('zee'),'working')],[19000,()=>setState(P('dan'),'working')],[24000,()=>setState(P('mia'),'offline')]]
   .forEach(([ms,fn])=>demoTimers.push(setTimeout(fn,ms)));
};
$('allSleep').onclick=()=>{ demoTimers.forEach(clearTimeout); demoTimers=[]; CH.forEach(ch=>{ if(ch.kind==='bot') setBot(ch,false); else setState(ch,'offline'); }); };

setInterval(()=>{
  if(MODE==='live'){ CH.forEach(c=>c.speaking=false); return; }
  const ws=CH.filter(c=>c.kind==='person'&&c.state==='working'&&c.posed&&c.spot.kind==='seat');
  const talking=ws.filter(c=>c.speaking).length;
  ws.forEach(c=>{ if(c.speaking){ if(Math.random()<.4) c.speaking=false; } else if(talking<2&&Math.random()<.15) c.speaking=true; });
  CH.forEach(c=>{ if(c.kind==='person'&&!ws.includes(c)) c.speaking=false; });
},800);

/* ============================ portraits & customizer preview ============================ */
const PORT={};
const pr=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true}); pr.setPixelRatio(1); pr.setSize(96,96);
const prScene=new THREE.Scene(); prScene.add(new THREE.HemisphereLight(0xffffff,0x3a2a55,0.85));
const prK=new THREE.DirectionalLight(0xffffff,.45); prK.position.set(2,3,4); prScene.add(prK);
const prP=new THREE.PointLight(0xff5fa2,.8,6); prP.position.set(-1.5,1.6,1); prScene.add(prP);
const prCam=new THREE.PerspectiveCamera(26,1,0.1,20); prCam.position.set(0.55,1.12,2.6); prCam.lookAt(0,1.0,0);
function snap(P,bg,y){ P.body.rotation.y=0.25; P.body.position.y=y||0; prScene.add(P.body); pr.setClearColor(bg,1); pr.render(prScene,prCam); const url=pr.domElement.toDataURL(); prScene.remove(P.body); disposeGroup(P.body); return url; }
function portrait(L){ const k=JSON.stringify(L); return PORT[k]||(PORT[k]=snap(buildPerson(L),0x241a38)); }
function botPortrait(color){ const k='bot'+color; return PORT[k]||(PORT[k]=snap(buildBot(color),0x241a38,0.45)); }

const PV={open:false,t:0,char:null};
const pv=new THREE.WebGLRenderer({canvas:$('prev'),antialias:true,alpha:true}); pv.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); pv.setSize(250,300,false);
const pvScene=new THREE.Scene(); pvScene.add(new THREE.HemisphereLight(0xb9a8ff,0x1a1024,0.75));
const pvK=new THREE.DirectionalLight(0xfff0e6,.45); pvK.position.set(1,4,4); pvScene.add(pvK);
const pvA=new THREE.PointLight(0xff5fa2,1.4,7,1.4); pvA.position.set(-2,1.8,1.2); pvScene.add(pvA);
const pvB=new THREE.PointLight(0x5ee7ff,1.2,7,1.4); pvB.position.set(2,1.4,1.0); pvScene.add(pvB);
const pvCam=new THREE.PerspectiveCamera(28,250/300,0.1,30); pvCam.position.set(0,1.05,4.0); pvCam.lookAt(0,0.7,0);
const plat=new THREE.Mesh(new THREE.CylinderGeometry(0.78,0.82,0.12,40),M(0x2a2140)); plat.position.y=-0.06; pvScene.add(plat);
const platRing=new THREE.Mesh(new THREE.TorusGeometry(0.8,0.015,8,60),new THREE.MeshBasicMaterial({color:0xff5fa2})); platRing.rotation.x=PI/2; platRing.position.y=0.0; pvScene.add(platRing);
PV.tick=dt=>{ PV.t+=dt; if(PV.char){ const c=PV.char; c.P.body.rotation.y+=dt*0.7; animPerson(c,PV.t,PV.t<2.2?'wave':'vibe'); } platRing.material.color.setHSL(stripHue(0,PV.t),.95,.6); pv.render(pvScene,pvCam); };

let drafts=null, editing='you';
function setPreview(L){ if(PV.char){ pvScene.remove(PV.char.P.body); disposeGroup(PV.char.P.body); } const P=buildPerson(L); pvScene.add(P.body); PV.char={P,path:[],posed:false,glide:null,phase:0,speaking:false}; }
const editable=()=>MODE==='live'? PEOPLE.filter(p=>p.me) : PEOPLE;
function openCust(id){
  if(MODE==='live'){ const mine=PEOPLE.find(p=>p.me); if(!mine) return; id=mine.id; }
  drafts=Object.fromEntries(PEOPLE.map(p=>[p.id,{...p.look,name:p.name}])); editing=id;
  $('modal').hidden=false; PV.open=true; renderCust(true);
}
function closeCust(){ $('modal').hidden=true; PV.open=false; }
function renderCust(resetT){
  const L=drafts[editing];
  $('tabs').innerHTML=''; editable().forEach(p=>{ const b=document.createElement('button'); b.setAttribute('role','tab'); b.setAttribute('aria-selected',p.id===editing); b.textContent=drafts[p.id].name||p.name; b.onclick=()=>{ editing=p.id; renderCust(true); }; $('tabs').appendChild(b); });
  const Cc=$('ctrl'), sc=Cc.scrollTop; Cc.innerHTML='';
  const fld=(label,el)=>{ const d=document.createElement('div'); d.className='fld'; const l=document.createElement('div'); l.className='lab'; l.textContent=label; d.append(l,el); Cc.appendChild(d); };
  const sw=(key,list)=>{ const d=document.createElement('div'); d.className='sw'; list.forEach(c=>{ const b=document.createElement('button'); b.style.background=c; b.title=c; b.setAttribute('aria-label',`${key} ${c}`); b.setAttribute('aria-pressed',L[key]===c); b.onclick=()=>{ L[key]=c; renderCust(); }; d.appendChild(b); }); return d; };
  const chips=(key,list)=>{ const d=document.createElement('div'); d.className='chips'; list.forEach(([v,l])=>{ const b=document.createElement('button'); b.textContent=l; b.setAttribute('aria-pressed',L[key]===v); b.onclick=()=>{ L[key]=v; renderCust(); }; d.appendChild(b); }); return d; };
  const inp=document.createElement('input'); inp.type='text'; inp.id='nameInput'; inp.maxLength=14; inp.value=L.name; inp.setAttribute('aria-label','Name');
  inp.oninput=()=>{ L.name=inp.value; const tb=$('tabs').children[editable().findIndex(p=>p.id===editing)]; if(tb) tb.textContent=inp.value||'…'; };
  const wrap=document.createElement('div'); wrap.appendChild(inp); if(MODE!=='live') fld('Name',wrap);
  fld('Skin',sw('skin',OPT.skin));
  fld('Hair',chips('hairStyle',OPT.hairStyle)); fld('Hair colour',sw('hair',OPT.hair));
  fld('Top',chips('topStyle',OPT.topStyle)); fld('Top colour · also your blanket',sw('top',OPT.top));
  fld('Pants',sw('pants',OPT.pants));
  fld('Hat',chips('hat',OPT.hat)); if(!['none','crown'].includes(L.hat)) fld('Hat colour',sw('hatColor',OPT.top));
  fld('Glasses',chips('glasses',OPT.glasses));
  Cc.scrollTop=resetT?0:sc;
  const rot=PV.char?PV.char.P.body.rotation.y:0;
  setPreview(L); PV.char.P.body.rotation.y=resetT?0:rot;
  PV.t= resetT? 0 : Math.max(PV.t,2.3);
}
const pick=a=>a[Math.floor(Math.random()*a.length)];
$('rand').onclick=()=>{ const L=drafts[editing]; Object.assign(L,{skin:pick(OPT.skin),hairStyle:pick(OPT.hairStyle)[0],hair:pick(OPT.hair),topStyle:pick(OPT.topStyle)[0],top:pick(OPT.top),pants:pick(OPT.pants),hat:pick(OPT.hat)[0],hatColor:pick(OPT.top),glasses:pick(OPT.glasses)[0]}); renderCust(true); };
$('mCancel').onclick=closeCust;
$('modal').addEventListener('click',e=>{ if(e.target.id==='modal') closeCust(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('modal').hidden) closeCust(); });
$('mSave').onclick=()=>{
  if(MODE==='live'){
    const p=PEOPLE.find(x=>x.me); if(!p){ closeCust(); return; }
    const {name,...look}=drafts[p.id]; p.look=look; const ch=byId(p.id); ch.e=p; rebuild(ch); ch.lblKey='';
    closeCust(); renderRows();
    if(API.onSaveLook) API.onSaveLook(look).then(()=>log('profile','your look is saved','everyone sees your new fit'),e=>log('profile',`could not save your look: ${e.message||e}`));
    return;
  }
  const save={};
  PEOPLE.forEach(p=>{ const {name,...look}=drafts[p.id]; p.look=look; p.name=(name||'').trim()||p.name; save[p.id]={...look,name:p.name}; const ch=byId(p.id); ch.e=p; rebuild(ch); ch.lblKey=''; });
  try{ localStorage.setItem(KEY,JSON.stringify(save)); }catch(_){}
  log('profile','looks updated','new fits applied');
  closeCust(); renderRows();
};

/* ============================ main loop & start ============================ */
let last=performance.now(), TT=0;
function tick(dt){ TT+=dt; updateMeeting(); ALL().forEach(ch=>{ moveChar(ch,dt); aiTick(ch,dt); ch.kind==='bot'?animBot(ch,TT):animPerson(ch,TT); }); ambient(dt,TT);
  DYN.docks.forEach((m,i)=>{ const b=BOTS[i]&&byId(BOTS[i].id); m.emissiveIntensity= b&&b.state==='off'&&!b.path.length? .4+Math.sin(TT*3)*.3 : .1; }); }
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000)); last=now;
  tick(dt); renderer.render(scene,camera); updateLabels(dt);
  if(PV.open) PV.tick(dt);
  requestAnimationFrame(frame);
}
/* ============================ live mode (used by live.js) ============================ */
let MODE='demo';
const LIVE={rosterKey:''};
const PREF_SEATS=[1,0,2,4,3,5];
const DEFAULT_LOOKS=[...PEOPLE.map(p=>({...p.look})),
  {skin:'#c68642',hairStyle:'spiky',hair:'#b6f36a',topStyle:'hoodie',top:'#2b2438',pants:'#1f3b44',hat:'beanie',hatColor:'#ff5fa2',glasses:'none'},
  {skin:'#ffe0c2',hairStyle:'short',hair:'#f2e3b3',topStyle:'tee',top:'#5ee7ff',pants:'#3d405b',hat:'cap',hatColor:'#2b2438',glasses:'round'}];
const BOT_COLORS=['#a78bfa','#5ee7ff'];
function clearRoster(){
  demoTimers.forEach(clearTimeout); demoTimers=[];
  CH.forEach(ch=>{ unpose(ch); scene.remove(ch.g); disposeGroup(ch.P.body); ch.lbl.remove(); });
  CH.length=0;
  [...SP.beds,...SP.seats,...SP.lounge,...SP.extras,...SP.meeting].forEach(s=>s.by=null);
  DYN.blankets.forEach(b=>b.material.color.setHex(0x8f86a8));
}
function setRoster(people,bots){
  clearRoster();
  PEOPLE.length=0; PEOPLE.push(...people); BOTS.length=0; BOTS.push(...bots);
  PEOPLE.forEach(p=>makeChar(p,'person')); BOTS.forEach(b=>makeChar(b,'bot'));
}
function applyLive(snap,{looks={},meId=null}={}){
  const crew=(snap.crew||[]).slice(0,4), bots=(snap.bots||[]).slice(0,2);
  const key=crew.map(c=>c.id).join(',')+'|'+bots.map(b=>b.id).join(',')+'|'+meId;
  if(key!==LIVE.rosterKey){
    LIVE.rosterKey=key;
    setRoster(
      crew.map((c,i)=>({id:c.id,name:c.name,me:c.id===meId,bed:i,seat:PREF_SEATS[i],look:{...(looks[c.id]||DEFAULT_LOOKS[i%DEFAULT_LOOKS.length])}})),
      bots.map((b,i)=>({id:b.id,name:b.name,color:BOT_COLORS[i],song:'music'})));
    CH.forEach(ch=>{
      if(ch.kind==='person') setState(ch,crew.find(c=>c.id===ch.id).state,{instant:true,quiet:true});
      else { const on=bots.find(b=>b.id===ch.id).state==='on'; setBot(ch,on,{instant:true,quiet:true}); setPlaying(ch,on,{quiet:true}); }
    });
    $('log').innerHTML=''; log('live',`connected to ${snap.channel?'🔊 '+snap.channel:'Discord'}`,'showing who is really there');
  } else {
    CH.forEach(ch=>{
      if(ch.kind==='person'){ const c=crew.find(x=>x.id===ch.id); if(c.name!==ch.e.name){ ch.e.name=c.name; ch.lblKey=''; } setState(ch,c.state); }
      else { const on=bots.find(x=>x.id===ch.id).state==='on'; if((ch.state==='on')!==on){ setBot(ch,on); setPlaying(ch,on,{quiet:true}); } }
    });
  }
  renderRows();
}
const NOTES={
  'no-api':'Demo mode: there is no server behind this copy, so everything here is simulated.',
  'signed-out':'Demo mode. Log in with Discord to see the real office.',
  'not-crew':'You are logged in, but your Discord account is not on the crew list (CREW_USER_IDS).',
  'no-bot':'Logged in, but the bot address is not set yet (BOT_LIVE_URL in Vercel). Showing the demo.',
  'connecting':'Logged in. Connecting to office-bot… (if this sticks, check the bot is running). Showing the demo meanwhile.',
  'live':'Live from Discord: people move when they join, deafen or leave the voice channel. Tap ✏️ fit to restyle yourself.',
};
function setMode(mode,{reason,user}={}){
  MODE=mode==='live'?'live':'demo';
  const chip=$('modeChip');
  chip.textContent= MODE==='live'? '● live' : 'demo mode'; chip.className='mode-chip'+(MODE==='live'?' live':'');
  $('loginBtn').hidden= !(MODE==='demo'&&reason==='signed-out');
  $('logoutBtn').hidden= !user;
  $('rowsNote').textContent= NOTES[MODE==='live'?'live':reason]||NOTES['no-api'];
  $('demoActions').hidden= MODE==='live';
  renderRows();
}
function setLiveStatus(status){
  const chip=$('modeChip');
  if(status==='live'){ chip.textContent='● live'; chip.className='mode-chip live'; }
  else { chip.textContent='reconnecting…'; chip.className='mode-chip wait'; }
}
const API={setMode,applyLive,setLiveStatus,onSaveLook:null,
  debug:{CH,step:(n=1,dt=.05)=>{ for(let i=0;i<n;i++) tick(dt); renderer.render(scene,camera); updateLabels(0); },setState:(id,s)=>setState(byId(id),s),CAM,placeCamera}};
window.Office=API;

PEOPLE.forEach(p=>makeChar(p,'person'));
BOTS.forEach(b=>makeChar(b,'bot'));
makeChar({id:'simon',name:'Simon',look:{skin:'#f1c27d',hairStyle:'short',hair:'#5a4636',topStyle:'hoodie',top:'#2b2438',pants:'#3d405b',hat:'none',hatColor:'#ffd166',glasses:'round'}},'npc',NPCS);
resize();
const S0={you:'offline',mia:'working',dan:'working',zee:'meeting'};
CH.forEach(ch=>{ if(ch.kind==='person') setState(ch,S0[ch.id],{instant:true,quiet:true}); else setBot(ch,ch.id==='dj',{instant:true,quiet:true}); });
setPlaying(byId('dj'),true,{quiet:true});
updateMeeting(true);
log('ready','watching 🔊 Office in The Crew');
log('voiceStateUpdate','Mia and Dan are in the call, Zee is deafened, DJ Bot is playing','placed at the table, in the meeting with Simon, and at the decks');
renderRows();
requestAnimationFrame(frame);
})();
