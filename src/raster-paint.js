import * as THREE from 'three';

export function ensurePaintUV(geometry) {
  if (geometry.attributes.uv) return geometry;
  // Imported surfaces get distinct islands, so painting cannot leak onto
  // another face merely because two pieces overlap in a planar projection.
  const g=geometry.index?geometry.toNonIndexed():geometry;
  if(g!==geometry)geometry.dispose();
  const faces=g.attributes.position.count/3, grid=Math.ceil(Math.sqrt(faces)), uv=[];
  for(let i=0;i<faces;i++){
    const x=i%grid,y=Math.floor(i/grid),pad=.08;
    uv.push((x+pad)/grid,(y+pad)/grid,(x+1-pad)/grid,(y+pad)/grid,(x+pad)/grid,(y+1-pad)/grid);
  }
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  return g;
}
function rng(seed){let a=seed>>>0;return ()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function stampFor(stroke){
 const c=document.createElement('canvas');c.width=c.height=128;
 const ctx=c.getContext('2d'),image=ctx.createImageData(128,128);
 const color=new THREE.Color(stroke.color).convertLinearToSRGB();
 const random=rng(stroke.seed||91),grain=Math.max(0,Math.min(1,stroke.texture));
 const bristles=Array.from({length:128},()=>.15+random()*.85);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const dx=(x-63.5)/64,dy=(y-63.5)/64,r=Math.hypot(dx,dy);
  let a=Math.max(0,Math.min(1,(1-r)*8));
  if(stroke.type==='pastel')a*=random()<(grain*.72+.08)?0:(.25+random()*.75);
  else if(stroke.type==='acrylic')a*=Math.max(0,1-grain+grain*bristles[x])*(random()<grain*.09?0:.8+random()*.2);
  const i=(y*128+x)*4;image.data[i]=Math.round(color.r*255);image.data[i+1]=Math.round(color.g*255);image.data[i+2]=Math.round(color.b*255);
  image.data[i+3]=Math.round(a*255);
 }
 ctx.putImageData(image,0,0);return c;
}
export function startRasterLayer(o,m){
 m.paintCanvas=document.createElement('canvas');m.paintCanvas.width=m.paintCanvas.height=2048;
 m.paintContext=m.paintCanvas.getContext('2d');
 const texture=new THREE.CanvasTexture(m.paintCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=4;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
 const geometry=m.base.geometry.clone(),p=geometry.attributes.position,n=geometry.attributes.normal;
 for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*.006,p.getY(i)+n.getY(i)*.006,p.getZ(i)+n.getZ(i)*.006);
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false,alphaTest:.005,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Raster surface painting';mesh.renderOrder=1;
 m.paint.add(mesh);m.paintTexture=texture;m.paint.visible=o.paintVisible;
 m.paintStamps=new Map();
}
export function rasterDab(stroke,m,point,pressure=1){
 if(!m.paintCanvas)throw Error('Missing raster surface.');
 const geometry=m.base.geometry,closest={};geometry.boundsTree.closestPointToPoint(point,closest);
 if(closest.faceIndex===undefined)return;
 const p=geometry.attributes.position,uv=geometry.attributes.uv,index=geometry.index;
 const ids=[0,1,2].map(k=>index?index.getX(closest.faceIndex*3+k):closest.faceIndex*3+k);
 const tri=new THREE.Triangle(...ids.map(i=>new THREE.Vector3().fromBufferAttribute(p,i)));
 const normal=tri.getNormal(new THREE.Vector3()),origin=closest.point.clone();
 const up=Math.abs(normal.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
 const right=new THREE.Vector3().crossVectors(up,normal).normalize(),vertical=new THREE.Vector3().crossVectors(normal,right).normalize();
 const radius=Math.max(.004,stroke.size*pressure),sphere=new THREE.Sphere(origin,radius*1.25);
 if(!m.paintStamps.has(stroke.id))m.paintStamps.set(stroke.id,stampFor(stroke));
 const stamp=m.paintStamps.get(stroke.id),ctx=m.paintContext,size=m.paintCanvas.width;
 const delta=new THREE.Vector3(),faceNormal=new THREE.Vector3();
 geometry.boundsTree.shapecast({
  intersectsBounds:box=>box.intersectsSphere(sphere),
  intersectsTriangle:(triangle,face)=>{
   triangle.getNormal(faceNormal);
   if(faceNormal.dot(normal)<.12||triangle.closestPointToPoint(origin,new THREE.Vector3()).distanceTo(origin)>radius*1.2)return false;
   const vs=[triangle.a,triangle.b,triangle.c];
   const src=vs.map(v=>{delta.copy(v).sub(origin);return [64+delta.dot(right)/radius*64,64-delta.dot(vertical)/radius*64]});
   const dest=[0,1,2].map(k=>{const i=index?index.getX(face*3+k):face*3+k;return [uv.getX(i)*size,(1-uv.getY(i))*size]});
   const [a,b,c]=src,[u,v,w]=dest;
   const x1=b[0]-a[0],y1=b[1]-a[1],x2=c[0]-a[0],y2=c[1]-a[1],det=x1*y2-x2*y1;
   if(Math.abs(det)<1e-8)return false;
   const du1=v[0]-u[0],du2=w[0]-u[0],dv1=v[1]-u[1],dv2=w[1]-u[1];
   const A=(du1*y2-du2*y1)/det,C=(du2*x1-du1*x2)/det,B=(dv1*y2-dv2*y1)/det,D=(dv2*x1-dv1*x2)/det;
   ctx.save();ctx.beginPath();ctx.moveTo(...u);ctx.lineTo(...v);ctx.lineTo(...w);ctx.closePath();ctx.clip();
   ctx.globalCompositeOperation=stroke.type==='eraser'?'destination-out':'source-over';
   ctx.globalAlpha=stroke.opacity;
   ctx.setTransform(A,B,C,D,u[0]-A*a[0]-C*a[1],u[1]-B*a[0]-D*a[1]);
   ctx.drawImage(stamp,0,0);ctx.restore();return false;
  }
 });
 m.paintTexture.needsUpdate=true;
}
export function replayRasterStroke(stroke,m){
 const pts=stroke.points.map(p=>new THREE.Vector3(...p));
 for(let i=0;i<pts.length;i++){
  const pressure=stroke.pressures?.[i]??1;
  if(!i){rasterDab(stroke,m,pts[i],pressure);continue}
  const distance=pts[i].distanceTo(pts[i-1]);
  if(distance>Math.max(.6,stroke.size*8))continue;
  const steps=Math.max(1,Math.ceil(distance/Math.max(.005,stroke.size*.2)));
  for(let j=1;j<=steps;j++)rasterDab(stroke,m,pts[i-1].clone().lerp(pts[i],j/steps),pressure);
 }
}
