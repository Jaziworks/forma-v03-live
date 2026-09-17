import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import sansData from 'three/examples/fonts/helvetiker_regular.typeface.json' with {type:'json'};
import serifData from 'three/examples/fonts/gentilis_regular.typeface.json' with {type:'json'};
import opentype from 'opentype.js';
const builtins={sans:new FontLoader().parse(sansData),serif:new FontLoader().parse(serifData)};
const cache=new Map();
export function fontOptions(fonts){return [['mono','Monoline'],['slant','Slanted'],['sans','Sans outline'],['serif','Serif outline'],...Object.values(fonts).map(f=>[f.id,f.name])]}
function decode(data){const raw=atob(data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return opentype.parse(bytes.buffer)}
function fontFor(id,fonts){const entry=fonts[id];if(!entry)throw Error('This project is missing its imported font.');if(!cache.has(id))cache.set(id,decode(entry.data));return cache.get(id)}
export async function registerFontFile(file){
 if(!/\.(ttf|otf|woff)$/i.test(file.name))throw Error('Use a TTF, OTF or WOFF font. WOFF2 is not supported.');
 const buffer=await file.arrayBuffer(),font=opentype.parse(buffer);
 if(!font.glyphs?.length)throw Error('This font has no outlines.');
 let binary='';for(const byte of new Uint8Array(buffer))binary+=String.fromCharCode(byte);
 const id='local-'+crypto.randomUUID();
 const name=(font.names.fullName?.en||font.names.fontFamily?.en||file.name).slice(0,70);
 cache.set(id,font);return {id,name,data:btoa(binary)};
}
export function validateFonts(fonts){
 if(!fonts||typeof fonts!=='object'||Array.isArray(fonts)||Object.keys(fonts).length>8)throw Error('Invalid font collection.');
 for(const [id,f] of Object.entries(fonts)){
 if(!f||f.id!==id||typeof f.name!=='string'||f.name.length>70||typeof f.data!=='string'||f.data.length>12e6)throw Error('Invalid imported font.');
 fontFor(id,fonts);
 }
}
function sampled(path){const out=[];for(const sub of path.subPaths){const pts=sub.getPoints(8);if(pts.length>1)out.push(pts.map(p=>[p.x,p.y]))}return out}
export function fontContours(text,id,fonts,spacing=1.13){
 if(!text.trim())return [];
 const contours=[];let cursor=0;
 if(builtins[id]){
 const font=builtins[id];
 for(const char of [...text].slice(0,44)){
 const glyph=font.data.glyphs[char]||font.data.glyphs['?'];
 if(!glyph)continue;
 const shapes=font.generateShapes(char,1);
 for(const shape of shapes){for(const p of [shape,...shape.holes]){const pts=p.getPoints(8);if(pts.length>1)contours.push(pts.map(v=>[v.x+cursor,v.y]))}}
 cursor+=(glyph.ha/font.data.resolution)*spacing;
 }
 }else{
 const font=fontFor(id,fonts);
 for(const char of [...text].slice(0,44)){
 const glyph=font.charToGlyph(char),path=glyph.getPath(cursor,0,1),shape=new THREE.ShapePath();
 for(const c of path.commands){if(c.type==='M')shape.moveTo(c.x,-c.y);else if(c.type==='L')shape.lineTo(c.x,-c.y);else if(c.type==='Q')shape.quadraticCurveTo(c.x1,-c.y1,c.x,-c.y);else if(c.type==='C')shape.bezierCurveTo(c.x1,-c.y1,c.x2,-c.y2,c.x,-c.y);else if(c.type==='Z')shape.currentPath.closePath()}
 contours.push(...sampled(shape));cursor+=(glyph.advanceWidth||font.unitsPerEm*.5)/font.unitsPerEm*spacing;
 }
 }
 if(!contours.length)return [];
 const flat=contours.flat();let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const [x,y] of flat){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 // Densify straight segments as well as curves before projecting onto the mesh.
 const result=[];
 for(const contour of contours){const line=[];for(let i=0;i<contour.length;i++){
 const p=contour[i],q=contour[Math.max(0,i-1)];
 const steps=i?Math.max(1,Math.ceil(Math.hypot((p[0]-q[0])/(maxX-minX||1),(p[1]-q[1])/(maxY-minY||1))*60)):1;
 for(let j=1;j<=steps;j++)line.push([((q[0]+(p[0]-q[0])*j/steps)-minX)/(maxX-minX||1),((q[1]+(p[1]-q[1])*j/steps)-minY)/(maxY-minY||1)]);
 }result.push(line)}
 return result;
}
