'use strict';
// ── Corrida do Aloncinho v4 — Subway Surfers visual ─────────────────────────

const canvas   = document.getElementById('runner-canvas');
const scoreEl  = document.getElementById('runner-score');
const bestEl   = document.getElementById('runner-best');
const speedEl  = document.getElementById('runner-speed');
const powersEl = document.getElementById('runner-powers');
if (!canvas) throw new Error('runner canvas not found');
const ctx = canvas.getContext('2d');
const W = 360, H = 600;

const LANES  = [72, 180, 288];
const BASE_Y = H - 120;
const GRAV   = 0.62;
const JUMP_V = 13.4;
const JMP_CLR= 32;

const VP_X = W / 2;
const VP_Y = 155;
const LB   = [14, 124, 236, 346];

const CARD_DEF = {
  red:    { bg:'#FF1744', fg:'#fff', glyph:'🔥', name:'Fogo',   bonus:50  },
  blue:   { bg:'#2196F3', fg:'#fff', glyph:'🛡', name:'Escudo', bonus:30  },
  yellow: { bg:'#FFD600', fg:'#000', glyph:'🧲', name:'Ímã',    bonus:20  },
  green:  { bg:'#00E676', fg:'#000', glyph:'⚡', name:'Turbo',  bonus:40  },
  wild:   { bg:'#E040FB', fg:'#fff', glyph:'★',  name:'Super!', bonus:100 },
};
const CARD_KEYS = Object.keys(CARD_DEF);

const OBJ_POOL = [
  { kind:'train', w:92, h:108, layer:'ground', span:1, tc:'#E53935', tc2:'#B71C1C', tcl:'#FF8A80' },
  { kind:'train', w:92, h:108, layer:'ground', span:1, tc:'#1E88E5', tc2:'#0D47A1', tcl:'#82B1FF' },
  { kind:'train', w:92, h:108, layer:'ground', span:1, tc:'#43A047', tc2:'#1B5E20', tcl:'#A5D6A7' },
  { kind:'train', w:92, h:108, layer:'ground', span:1, tc:'#FB8C00', tc2:'#E65100', tcl:'#FFCC80' },
  { kind:'barrier', w:108, h:32, layer:'ground', span:2 },
  { kind:'sign',    w:92,  h:32, layer:'air',   span:1 },
  { kind:'lowbar',  w:320, h:22, layer:'ground', span:3 },
  { kind:'highbar', w:320, h:20, layer:'air',   span:3 },
];

let state = 'start';
let frame = 0, score = 0, baseSpeed = 3.0;
let best  = parseInt(localStorage.getItem('runner-best') || '0');

const P = {
  lane:1, x:LANES[1], y:BASE_Y, w:36, h:54,
  targetX:LANES[1], jumpH:0, jumpVY:0,
  crouching:false, turbo:0, magnet:0,
};

let obstacles=[], cards=[], parts=[], popups=[];

const clouds = [
  {x:55, y:62, r:26, spd:0.09},{x:195,y:44,r:20,spd:0.07},
  {x:295,y:80,r:16,spd:0.12}, {x:135,y:32,r:22,spd:0.08},
];

const CITY = [
  {x:0,w:24,h:82},{x:26,w:18,h:60},{x:46,w:28,h:98},{x:78,w:20,h:70},
  {x:100,w:16,h:52},{x:118,w:22,h:86},
  {x:220,w:20,h:75},{x:242,w:16,h:55},{x:260,w:26,h:92},
  {x:288,w:20,h:65},{x:310,w:24,h:82},{x:336,w:20,h:60},
];

// ── INPUT ──────────────────────────────────────────────────────────────────────
const held={};
document.addEventListener('keydown',e=>{
  if(held[e.key])return; held[e.key]=true; onKey(e.key);
  if([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();
});
document.addEventListener('keyup',e=>{
  delete held[e.key];
  if(['ArrowDown','s','S'].includes(e.key))P.crouching=false;
});

function onKey(k){
  if(state!=='play'){begin();return;}
  if(k==='ArrowLeft' ||k==='a'||k==='A')shiftLane(-1);
  if(k==='ArrowRight'||k==='d'||k==='D')shiftLane(+1);
  if(k==='ArrowUp'   ||k==='w'||k==='W'||k===' ')jump();
  if(k==='ArrowDown' ||k==='s'||k==='S')P.crouching=true;
}

function bindBtn(id,fn){
  const el=document.getElementById(id); if(!el)return;
  el.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='play')begin();else fn(true);});
  el.addEventListener('pointerup',  e=>{e.preventDefault();fn(false);});
  el.addEventListener('pointerleave',e=>{fn(false);});
}
bindBtn('runner-left',  b=>{if(b)shiftLane(-1);});
bindBtn('runner-right', b=>{if(b)shiftLane(+1);});
bindBtn('runner-jump',  b=>{if(b)jump();});
bindBtn('runner-crouch',b=>{P.crouching=b;});
canvas.addEventListener('click',()=>{if(state!=='play')begin();});

let tsX=0,tsY=0;
canvas.addEventListener('touchstart',e=>{tsX=e.touches[0].clientX;tsY=e.touches[0].clientY;e.preventDefault();},{passive:false});
canvas.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tsX, dy=e.changedTouches[0].clientY-tsY;
  if(state!=='play'){begin();return;}
  if(Math.abs(dy)>Math.abs(dx)){if(dy<-20)jump();else if(dy>20){P.crouching=true;setTimeout(()=>{P.crouching=false;},400);}}
  else if(Math.abs(dx)>20)shiftLane(dx<0?-1:1);
  e.preventDefault();
},{passive:false});

// ── GAME ACTIONS ───────────────────────────────────────────────────────────────
function shiftLane(d){const n=Math.max(0,Math.min(2,P.lane+d));if(n===P.lane)return;P.lane=n;P.targetX=LANES[n];}
function jump(){if(P.jumpH<2){P.jumpVY=JUMP_V;P.crouching=false;}}
function begin(){
  score=0;baseSpeed=3.0;frame=0;obstacles=[];cards=[];parts=[];popups=[];
  P.lane=1;P.x=LANES[1];P.targetX=LANES[1];
  P.jumpH=0;P.jumpVY=0;P.crouching=false;P.turbo=0;P.magnet=0;
  state='play';
}

// ── SPAWN ──────────────────────────────────────────────────────────────────────
function spawnObstacle(){
  const pool=OBJ_POOL.filter(o=>!(o.span>1&&baseSpeed<4.5)&&!(o.span>2&&baseSpeed<5.5));
  const def=pool[Math.floor(Math.random()*pool.length)];
  if(def.span===3){obstacles.push({...def,lane:-1,x:W/2,y:-def.h-10});}
  else if(def.span===2){
    const sl=Math.floor(Math.random()*2);
    obstacles.push({...def,lane:-2,startLane:sl,x:(LANES[sl]+LANES[sl+1])/2,y:-def.h-10});
  } else {
    const lane=Math.floor(Math.random()*3);
    obstacles.push({...def,lane,x:LANES[lane],y:-def.h-10});
  }
}
function spawnCard(){
  const ck=CARD_KEYS[Math.floor(Math.random()*CARD_KEYS.length)];
  const lane=Math.floor(Math.random()*3);
  cards.push({ck,x:LANES[lane],y:-28,w:24,h:24});
}

// ── COLLISION ──────────────────────────────────────────────────────────────────
function obstacleKills(o){
  if     (o.lane===-1){}
  else if(o.lane===-2){if(P.lane!==o.startLane&&P.lane!==o.startLane+1)return false;}
  else                {if(P.lane!==o.lane)return false;}
  if(o.layer==='ground'){if(P.jumpH>=JMP_CLR)return false;}
  if(o.layer==='air')  {if(P.crouching)return false;if(P.jumpH>=85)return false;}
  const playerY=P.y-P.jumpH;
  const dy=Math.abs(playerY-o.y);
  const dh=(P.crouching?P.h*0.42:P.h*0.58)/2+o.h*0.46;
  return dy<dh;
}

// ── COLLECT ────────────────────────────────────────────────────────────────────
function collectCard(ck){
  const d=CARD_DEF[ck]; score+=d.bonus;
  if(ck==='yellow')P.magnet=360;
  if(ck==='green') P.turbo=240;
  if(ck==='wild')  {P.magnet=300;P.turbo=200;}
  burst(P.x,P.y-P.jumpH,d.bg,14);
  popups.push({x:P.x,y:P.y-P.jumpH-40,text:`+${d.bonus}`,color:d.bg,life:1});
}
function burst(x,y,color,n){
  for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-0.5)*9,vy:(Math.random()-0.5)*9-2,r:3+Math.random()*4,color,life:1,decay:0.03+Math.random()*0.03});
}

// ── DRAW UTILS ────────────────────────────────────────────────────────────────
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r??6);}
function perspX(bx,y){const t=Math.max(0,(y-VP_Y)/(H-VP_Y));return VP_X+(bx-VP_X)*t;}
function fs(fill,stk,lw){ctx.fillStyle=fill;ctx.fill();if(stk){ctx.strokeStyle=stk;ctx.lineWidth=lw??2;ctx.stroke();}}

// ── BACKGROUND ────────────────────────────────────────────────────────────────
function drawBg(){
  // Sunset sky — Subway Surfers palette
  const sky=ctx.createLinearGradient(0,0,0,VP_Y+55);
  sky.addColorStop(0,'#BF360C');
  sky.addColorStop(0.3,'#E64A19');
  sky.addColorStop(0.65,'#FF8F00');
  sky.addColorStop(1,'#FFD54F');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,VP_Y+55);

  // Sun
  const sx=W*0.8,sy=52,sr=30;
  const halo=ctx.createRadialGradient(sx,sy,0,sx,sy,sr*3.5);
  halo.addColorStop(0,'rgba(255,230,80,0.65)');
  halo.addColorStop(0.5,'rgba(255,150,0,0.2)');
  halo.addColorStop(1,'rgba(255,100,0,0)');
  ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(sx,sy,sr*3.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#FFF176'; ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();

  // Clouds (warm tint)
  clouds.forEach(cl=>{cl.x-=cl.spd;if(cl.x<-cl.r*4)cl.x=W+cl.r*3;drawCloud(cl.x,cl.y,cl.r);});

  // City silhouette
  CITY.forEach(b=>{
    const top=VP_Y+12-b.h;
    ctx.fillStyle='rgba(20,8,0,0.82)'; ctx.fillRect(b.x,top,b.w,b.h);
    ctx.fillStyle='rgba(255,200,80,0.55)';
    for(let wy=top+6;wy<VP_Y+8;wy+=10){
      ctx.fillRect(b.x+3,wy,b.w*0.28,6);
      if(b.w>20)ctx.fillRect(b.x+b.w*0.54,wy,b.w*0.28,6);
    }
  });

  drawPlatform();
}

function drawCloud(cx,cy,r){
  ctx.save();
  ctx.fillStyle='rgba(255,220,150,0.72)';
  ctx.shadowColor='rgba(240,100,0,0.2)'; ctx.shadowBlur=6;
  [{dx:0,dy:0,rr:r},{dx:-r*.72,dy:r*.25,rr:r*.65},{dx:r*.72,dy:r*.25,rr:r*.6},{dx:r*.28,dy:-r*.3,rr:r*.55}]
    .forEach(p=>{ctx.beginPath();ctx.arc(cx+p.dx,cy+p.dy,p.rr,0,Math.PI*2);ctx.fill();});
  ctx.restore();
}

function drawPlatform(){
  const spd=baseSpeed+(P.turbo>0?2:0);
  const tOff=(frame*spd*1.4)%55;

  // Concrete fill
  const gnd=ctx.createLinearGradient(0,VP_Y,0,H);
  gnd.addColorStop(0,'#263238'); gnd.addColorStop(0.18,'#37474F');
  gnd.addColorStop(0.75,'#455A64'); gnd.addColorStop(1,'#546E7A');
  ctx.fillStyle=gnd;
  ctx.beginPath(); ctx.moveTo(0,VP_Y+18); ctx.lineTo(W,VP_Y+18);
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();

  // Grass sides
  const grass=ctx.createLinearGradient(0,VP_Y,0,H);
  grass.addColorStop(0,'#1B5E20'); grass.addColorStop(1,'#388E3C');
  ctx.fillStyle=grass;
  ctx.beginPath();
  ctx.moveTo(0,VP_Y+18); ctx.lineTo(perspX(LB[0],VP_Y+18),VP_Y+18);
  ctx.lineTo(LB[0],H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(perspX(LB[3],VP_Y+18),VP_Y+18); ctx.lineTo(W,VP_Y+18);
  ctx.lineTo(W,H); ctx.lineTo(LB[3],H); ctx.closePath(); ctx.fill();

  // Tile lines
  ctx.strokeStyle='rgba(255,255,255,0.06)';
  for(let i=0;i<=20;i++){
    const prog=((i*55-tOff)/(H-VP_Y));
    if(prog<0||prog>1)continue;
    const ty=VP_Y+prog*(H-VP_Y);
    ctx.lineWidth=Math.max(0.5,(ty-VP_Y)/(H-VP_Y)*2.5);
    ctx.beginPath(); ctx.moveTo(perspX(LB[0],ty),ty); ctx.lineTo(perspX(LB[3],ty),ty); ctx.stroke();
  }

  // Lane dashes
  ctx.setLineDash([22,16]);
  ctx.strokeStyle='rgba(255,255,255,0.11)';
  [LB[1],LB[2]].forEach(bx=>{
    ctx.lineDashOffset=-(frame*spd*0.8%38);
    ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(VP_X,VP_Y); ctx.lineTo(bx,H); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Crossties
  for(let i=0;i<=24;i++){
    const prog=((i*55-tOff)/(H-VP_Y));
    if(prog<-0.05||prog>1)continue;
    const ty=VP_Y+prog*(H-VP_Y);
    const x0=perspX(LB[0]+2,ty), x3=perspX(LB[3]-2,ty);
    const sc=(ty-VP_Y)/(H-VP_Y);
    const tH=Math.max(2,sc*16);
    ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(x0,ty+1,x3-x0,tH);
    ctx.fillStyle='#3E2723'; ctx.fillRect(x0,ty-tH/2,x3-x0,tH);
    ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(x0,ty-tH/2,x3-x0,tH*0.38);
  }

  // 4 rails
  for(let i=0;i<=3;i++){
    const bx=LB[i];
    ctx.strokeStyle='#90A4AE'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(VP_X,VP_Y); ctx.lineTo(bx,H); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.45)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(VP_X+0.5,VP_Y); ctx.lineTo(bx+1.5,H); ctx.stroke();
  }

  // Yellow safety lines
  ctx.strokeStyle='#FFD600'; ctx.lineWidth=2.5;
  ctx.setLineDash([12,8]);
  [LB[0],LB[3]].forEach(bx=>{
    ctx.lineDashOffset=-(frame*spd*0.5%20);
    ctx.beginPath(); ctx.moveTo(VP_X,VP_Y); ctx.lineTo(bx,H); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Turbo streaks
  if(P.turbo>0){
    ctx.save(); ctx.globalAlpha=0.14; ctx.strokeStyle='#00E676'; ctx.lineWidth=3;
    for(let i=0;i<5;i++){
      const lx=3+i*3,ly=((i*55+frame*(baseSpeed+2)*2.8)%(H+80))-40;
      ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx,ly+55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-lx,ly); ctx.lineTo(W-lx,ly+55); ctx.stroke();
    }
    ctx.restore();
  }
}

// ── OBSTACLES ─────────────────────────────────────────────────────────────────
function drawObstacle(o){
  const{kind,x,y,w,h}=o;
  ctx.save();

  if(kind==='train'){
    const tc=o.tc||'#E53935', tc2=o.tc2||'#B71C1C', tcl=o.tcl||'#FF8A80';
    const ty=y-h;
    // Drop shadow
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(x-w/2+5,ty+8,w,h);
    // Body
    ctx.beginPath(); rr(x-w/2,ty,w,h,9); ctx.fillStyle=tc; ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=2.5; ctx.stroke();
    // Cab roof
    ctx.save(); ctx.beginPath(); rr(x-w/2,ty,w,h,9); ctx.clip();
    ctx.fillStyle=tc2; ctx.fillRect(x-w/2,ty,w,h*0.28); ctx.restore();
    // Windshield
    ctx.beginPath(); rr(x-w/2+10,ty+h*0.07,w-20,h*0.2,4);
    ctx.fillStyle='#B3E5FC'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(x-w/2+14,ty+h*0.08,(w-28)*0.45,4);
    // Side windows
    const sw=(w-26)/2;
    ctx.beginPath(); rr(x-w/2+9,ty+h*0.32,sw,h*0.19,3);
    ctx.fillStyle='#E3F2FD'; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); rr(x+5,ty+h*0.32,sw,h*0.19,3);
    ctx.fillStyle='#E3F2FD'; ctx.fill(); ctx.stroke();
    // Stripe
    ctx.fillStyle=tcl; ctx.fillRect(x-w/2,ty+h*0.55,w,5);
    // Headlights
    [[x-w/2+11,ty+h*0.63],[x+w/2-11,ty+h*0.63]].forEach(([hx,hy])=>{
      const hg=ctx.createRadialGradient(hx,hy,0,hx,hy,13);
      hg.addColorStop(0,'rgba(255,245,100,0.95)');
      hg.addColorStop(0.5,'rgba(255,200,0,0.3)');
      hg.addColorStop(1,'rgba(255,180,0,0)');
      ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(hx,hy,13,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFF176'; ctx.beginPath(); ctx.arc(hx,hy,5,0,Math.PI*2); ctx.fill();
    });
    // Grille
    ctx.beginPath(); rr(x-w/2+8,ty+h*0.74,w-16,h*0.13,3);
    ctx.fillStyle=tc2; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1; ctx.stroke();
    for(let i=1;i<4;i++){
      const gx=x-w/2+8+(w-16)*i/4;
      ctx.beginPath(); ctx.moveTo(gx,ty+h*0.74); ctx.lineTo(gx,ty+h*0.87); ctx.stroke();
    }
    // Wheels
    [x-w/2+14,x+w/2-14].forEach(wx=>{
      ctx.fillStyle='#212121'; ctx.beginPath(); ctx.arc(wx,ty+h-3,9,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#616161'; ctx.beginPath(); ctx.arc(wx,ty+h-3,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#B0BEC5'; ctx.beginPath(); ctx.arc(wx,ty+h-3,2,0,Math.PI*2); ctx.fill();
    });
    // BIG clear label
    ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=4;
    ctx.strokeText('⬆ PULE!',x,ty+h*0.52);
    ctx.fillStyle='#FFF176'; ctx.fillText('⬆ PULE!',x,ty+h*0.52);

  } else if(kind==='sign'){
    const topY=Math.max(VP_Y+15,y-32);
    ctx.strokeStyle='#5D4037'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x-w/2+12,topY); ctx.lineTo(x-w/2+12,y-h/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w/2-12,topY); ctx.lineTo(x+w/2-12,y-h/2); ctx.stroke();
    ctx.beginPath(); rr(x-w/2,y-h/2,w,h,5);
    ctx.fillStyle='#0097A7'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(x-w/2+4,y-h/2+3,w-8,5);
    ctx.font='bold 13px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=4;
    ctx.strokeText('⬇ ABAIXE!',x,y);
    ctx.fillStyle='#E0F7FA'; ctx.fillText('⬇ ABAIXE!',x,y);

  } else if(kind==='lowbar'){
    const g=ctx.createLinearGradient(x-w/2,0,x+w/2,0);
    g.addColorStop(0,'#BF360C'); g.addColorStop(0.5,'#E64A19'); g.addColorStop(1,'#BF360C');
    ctx.beginPath(); rr(x-w/2,y-h/2,w,h,4);
    ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.15)';
    for(let i=0;i<7;i++)ctx.fillRect(x-w/2+i*47,y-h/2,24,h);
    ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(x-w/2+4,y-h/2+2,w-8,4);
    ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=4;
    ctx.strokeText('⬆  PULE TUDO!  ⬆',x,y-h/2-16);
    ctx.fillStyle='#FFD600'; ctx.fillText('⬆  PULE TUDO!  ⬆',x,y-h/2-16);

  } else if(kind==='highbar'){
    ctx.fillStyle='#37474F'; ctx.fillRect(26,y-h/2-24,10,24); ctx.fillRect(W-36,y-h/2-24,10,24);
    const g2=ctx.createLinearGradient(0,y-h/2,0,y+h/2);
    g2.addColorStop(0,'#546E7A'); g2.addColorStop(1,'#37474F');
    ctx.beginPath(); rr(x-w/2,y-h/2,w,h,4);
    ctx.fillStyle=g2; ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(0,229,255,0.18)';
    for(let i=0;i<5;i++)ctx.fillRect(x-w/2+i*64,y-h/2,32,h);
    ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=4;
    ctx.strokeText('⬇  AGACHE!  ⬇',x,y+h/2+16);
    ctx.fillStyle='#00E5FF'; ctx.fillText('⬇  AGACHE!  ⬇',x,y+h/2+16);

  } else if(kind==='barrier'){
    ctx.fillStyle='#F9A825';
    ctx.fillRect(x-w/2-5,y-h/2-16,8,h+30); ctx.fillRect(x+w/2-3,y-h/2-16,8,h+30);
    ctx.beginPath(); rr(x-w/2,y-h/2,w,h,4);
    ctx.fillStyle='#E53935'; ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.22)';
    for(let i=0;i<5;i++)ctx.fillRect(x-w/2+i*22,y-h/2,11,h);
    ctx.font='bold 13px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=4;
    ctx.strokeText('⬆ PULE!',x,y);
    ctx.fillStyle='#fff'; ctx.fillText('⬆ PULE!',x,y);
  }

  ctx.restore();
}

// ── COINS ─────────────────────────────────────────────────────────────────────
function drawCard(c){
  const d=CARD_DEF[c.ck];
  const{x,y}=c,bob=Math.sin(frame*0.12+x*0.06)*3,r=14;
  ctx.save(); ctx.translate(0,bob);
  ctx.shadowColor=d.bg; ctx.shadowBlur=16;
  ctx.fillStyle=d.bg; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.42)';
  ctx.beginPath(); ctx.ellipse(x-3,y-3,r*0.44,r*0.28,-0.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=d.fg; ctx.font='bold 11px sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(d.glyph,x,y+0.5);
  ctx.restore();
}

// ── PLAYER ────────────────────────────────────────────────────────────────────
function drawPlayer(){
  const{x,y,w,h,jumpH,crouching,turbo}=P;
  const ry=y-jumpH,bounce=jumpH<2?Math.sin(frame*0.3)*2:0;
  const leg=Math.sin(frame*0.38);
  const ch=crouching?h*0.46:h,cOff=crouching?h*0.26:0;

  if(jumpH>4){
    const sc=Math.max(0.18,1-jumpH/140);
    ctx.save(); ctx.globalAlpha=0.3*sc; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(x,y+10,w*0.52*sc,6*sc,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if(P.magnet>0&&frame%24<12){
    ctx.save(); ctx.globalAlpha=0.22; ctx.strokeStyle='#FFD600'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(x,ry,90+(frame%24)*2,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  if(turbo>0){
    for(let i=1;i<=4;i++){
      ctx.save(); ctx.globalAlpha=0.07*(5-i); ctx.fillStyle='#00E676';
      ctx.beginPath(); rr(x-w/2,ry-ch/2+cOff+i*9,w,ch-i*7,5); ctx.fill(); ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(x,ry+bounce+cOff);

  const jackCol=turbo>0?'#00C853':'#F44336';
  const pantsCol='#1565C0',skinCol='#FFCC80',shoeCol='#212121';

  function draw(fillCol,strokeCol,lw){ctx.fillStyle=fillCol;ctx.fill();ctx.strokeStyle=strokeCol??'rgba(0,0,0,0.7)';ctx.lineWidth=lw??1.8;ctx.stroke();}

  if(!crouching){
    // Legs
    ctx.save(); ctx.translate(-w*.16,ch*.18); ctx.rotate(leg*.42);
    ctx.beginPath(); ctx.rect(-7,0,14,ch*.36); draw(pantsCol); ctx.restore();
    ctx.save(); ctx.translate(w*.16,ch*.18); ctx.rotate(-leg*.42);
    ctx.beginPath(); ctx.rect(-7,0,14,ch*.36); draw(pantsCol); ctx.restore();
    // Shoes
    ctx.save(); ctx.translate(-w*.16+leg*3,ch*.52); ctx.beginPath(); rr(-9,-5,20,9,3); draw(shoeCol); ctx.restore();
    ctx.save(); ctx.translate( w*.16-leg*3,ch*.52); ctx.beginPath(); rr(-11,-5,20,9,3); draw(shoeCol); ctx.restore();
    ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.save(); ctx.translate(-w*.16+leg*3,ch*.52); ctx.fillRect(-7,-1,12,2); ctx.restore();
    ctx.save(); ctx.translate( w*.16-leg*3,ch*.52); ctx.fillRect(-9,-1,12,2); ctx.restore();
    // Arms
    const arm=-leg*.32;
    ctx.save(); ctx.translate(-w/2-5,-ch*.06); ctx.rotate(arm);
    ctx.beginPath(); ctx.rect(-5,0,10,ch*.24); draw(jackCol); ctx.restore();
    ctx.save(); ctx.translate( w/2+5,-ch*.06); ctx.rotate(-arm);
    ctx.beginPath(); ctx.rect(-5,0,10,ch*.24); draw(jackCol); ctx.restore();
    ctx.fillStyle=skinCol; ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(-w/2-4,-ch*.06+ch*.24,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc( w/2+4,-ch*.06+ch*.24,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.rect(-w*.43,ch*.06,w*.38,ch*.3); draw(pantsCol);
    ctx.beginPath(); ctx.rect( w*.05,ch*.06,w*.38,ch*.3); draw(pantsCol);
    ctx.beginPath(); rr(-w*.43,ch*.36,w*.34,10,2); draw(shoeCol);
    ctx.beginPath(); rr( w*.05,ch*.36,w*.34,10,2); draw(shoeCol);
  }

  // Body
  ctx.beginPath(); rr(-w/2,-ch*.28,w,ch*.46,7); draw(jackCol,'rgba(0,0,0,0.75)',2);
  ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(-w/2+4,-ch*.28+3,w-8,7);
  ctx.fillStyle='rgba(255,255,255,0.35)';
  ctx.font='bold 8px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('11',0,-ch*.05);

  // Head
  const hR=crouching?w*.22:w*.26,hY=crouching?-ch*.3:-ch*.36;
  ctx.beginPath(); ctx.arc(0,hY,hR,0,Math.PI*2); draw(skinCol,'rgba(0,0,0,0.55)',1.5);
  ctx.fillStyle='#1A1A1A';
  ctx.beginPath(); ctx.arc(-5,hY+1,3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 5,hY+1,3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(-4,hY,1.2,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 6,hY,1.2,0,Math.PI*2); ctx.fill();
  if(!crouching){ctx.strokeStyle='#1A1A1A';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,hY+5,4,0.2,Math.PI-0.2);ctx.stroke();}

  // Cap
  if(!crouching){
    ctx.beginPath(); rr(-hR*1.4,hY-hR*.52,hR*2.8,hR*.32,3); draw('#FAFAFA','rgba(0,0,0,0.55)',1.5);
    ctx.beginPath(); ctx.arc(0,hY-hR*.74,hR*.97,Math.PI,0);
    ctx.rect(-hR*.97,hY-hR*.74,hR*1.94,hR*.32); draw('#FAFAFA','rgba(0,0,0,0.55)',1.5);
    ctx.fillStyle='#F44336'; ctx.fillRect(-hR*.97,hY-hR*.78,hR*1.94,4);
    ctx.fillStyle='#BDBDBD'; ctx.beginPath(); ctx.arc(0,hY-hR*1.7,2.5,0,Math.PI*2); ctx.fill();
  } else {
    ctx.beginPath(); rr(-hR*1.1,hY-hR*.5,hR*2.2,hR*.3,3); draw('#FAFAFA','rgba(0,0,0,0.5)',1.5);
    ctx.beginPath(); ctx.arc(0,hY-hR*.5,hR*.82,Math.PI,0); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#F44336'; ctx.fillRect(-hR*.82,hY-hR*.54,hR*1.64,3);
  }

  ctx.restore();
}

function drawParticle(p){
  ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
  ctx.beginPath(); ctx.arc(p.x,p.y,p.r*Math.max(0.2,p.life),0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawPopup(p){
  ctx.save(); ctx.globalAlpha=p.life;
  ctx.font='bold 17px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.strokeStyle='rgba(0,0,0,0.75)'; ctx.lineWidth=3;
  ctx.strokeText(p.text,p.x,p.y); ctx.fillStyle=p.color; ctx.fillText(p.text,p.x,p.y);
  ctx.restore();
}

// ── START SCREEN ──────────────────────────────────────────────────────────────
function drawStart(){
  drawBg();
  ctx.fillStyle='rgba(0,3,18,0.8)'; ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.fillStyle='rgba(10,18,50,0.97)'; ctx.beginPath(); rr(16,108,W-32,382,20); ctx.fill();
  const pb=ctx.createLinearGradient(16,108,W-16,490);
  pb.addColorStop(0,'#FF6F00'); pb.addColorStop(0.5,'#FFD600'); pb.addColorStop(1,'#FF6F00');
  ctx.strokeStyle=pb; ctx.lineWidth=2.5; ctx.stroke();

  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='bold 30px sans-serif';
  ctx.strokeStyle='rgba(0,0,0,0.85)'; ctx.lineWidth=5;
  ctx.strokeText('Corrida do Aloncinho',W/2,152);
  ctx.fillStyle='#FFD600'; ctx.fillText('Corrida do Aloncinho',W/2,152);
  ctx.fillStyle='#90CAF9'; ctx.font='11px sans-serif';
  ctx.fillText('Subway Runner — desvie e colete!',W/2,173);

  // Obstacle guide
  const guide=[
    {bg:'rgba(229,57,53,0.2)',bc:'#E53935',tip:'Trem no trilho',action:'⬆ PULE'},
    {bg:'rgba(0,151,167,0.2)',bc:'#0097A7',tip:'Placa suspensa',action:'⬇ ABAIXE'},
    {bg:'rgba(230,74,25,0.2)',bc:'#E64A19',tip:'Barra no chão',action:'⬆ PULE TUDO'},
    {bg:'rgba(84,110,122,0.2)',bc:'#546E7A',tip:'Barra no alto',action:'⬇ AGACHE TUDO'},
  ];
  ctx.font='12px sans-serif'; ctx.textAlign='left';
  guide.forEach((g,i)=>{
    const gy=202+i*40;
    ctx.fillStyle=g.bg; ctx.beginPath(); rr(28,gy-14,W-56,32,8); ctx.fill();
    ctx.strokeStyle=g.bc; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='12px sans-serif'; ctx.fillText(g.tip,36,gy+2);
    ctx.fillStyle=g.bc; ctx.font='bold 13px sans-serif'; ctx.textAlign='right';
    ctx.fillText(g.action,W-36,gy+2); ctx.textAlign='left';
  });

  ctx.textAlign='center';
  ctx.fillStyle='rgba(255,255,255,0.42)'; ctx.font='11px sans-serif';
  ctx.fillText('← → faixa  ·  ↑/Espaço pular  ·  ↓ agachar',W/2,378);

  if(best>0){ctx.fillStyle='#FFD600';ctx.font='14px sans-serif';ctx.fillText(`🏆 Recorde: ${best}`,W/2,402);}

  const bg2=ctx.createLinearGradient(W/2-112,416,W/2+112,462);
  bg2.addColorStop(0,'#FF6D00'); bg2.addColorStop(1,'#FFD600');
  ctx.fillStyle=bg2; ctx.beginPath(); rr(W/2-112,416,224,48,24); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#0D0D1A'; ctx.font='bold 19px sans-serif';
  ctx.fillText('▶  JOGAR AGORA',W/2,440);
  ctx.restore();
}

// ── DEAD SCREEN ───────────────────────────────────────────────────────────────
function drawDead(){
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(8,10,38,0.97)'; ctx.beginPath(); rr(22,H/2-148,W-44,298,20); ctx.fill();
  ctx.strokeStyle='#EF5350'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.textAlign='center'; ctx.textBaseline='middle';

  ctx.font='bold 38px sans-serif';
  ctx.strokeStyle='rgba(0,0,0,0.85)'; ctx.lineWidth=6;
  ctx.strokeText('GAME OVER!',W/2,H/2-100);
  ctx.fillStyle='#EF5350'; ctx.fillText('GAME OVER!',W/2,H/2-100);

  ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=4;
  ctx.strokeText(`${Math.floor(score)} pts`,W/2,H/2-52);
  ctx.fillStyle='#ECEFF1'; ctx.font='bold 26px sans-serif'; ctx.fillText(`${Math.floor(score)} pts`,W/2,H/2-52);
  ctx.fillStyle='#FFD600'; ctx.font='17px sans-serif'; ctx.fillText(`🏆 Recorde: ${best}`,W/2,H/2-16);

  if(Math.floor(score)>=best&&score>0){ctx.fillStyle='#00E5FF';ctx.font='bold 15px sans-serif';ctx.fillText('★  Novo recorde!  ★',W/2,H/2+14);}

  const rg=ctx.createLinearGradient(W/2-110,H/2+52,W/2+110,H/2+98);
  rg.addColorStop(0,'#00B0FF'); rg.addColorStop(1,'#00E5FF');
  ctx.fillStyle=rg; ctx.beginPath(); rr(W/2-110,H/2+52,220,48,24); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='#012B3E'; ctx.font='bold 18px sans-serif';
  ctx.fillText('↻  TENTAR DE NOVO',W/2,H/2+76);
  ctx.restore();
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD(){
  if(scoreEl)scoreEl.textContent=Math.floor(score);
  if(bestEl) bestEl.textContent=best;
  const lvl=Math.ceil((baseSpeed-3.0)/0.38)+1;
  if(speedEl)speedEl.textContent=`${Math.min(9,lvl)}×`;
}
function updatePowers(){
  if(!powersEl)return;
  const chips=[];
  if(P.magnet>0)chips.push({label:'🧲 Ímã', color:'#FFD600',pct:P.magnet/360});
  if(P.turbo >0)chips.push({label:'⚡ Turbo',color:'#00E676',pct:P.turbo/240});
  powersEl.innerHTML=chips.map(c=>`
    <div class="runner-power-chip"><span>${c.label}</span>
      <div class="runner-chip-bar-bg">
        <div class="runner-chip-bar" style="width:${Math.min(100,Math.round(c.pct*100))}%;background:${c.color}"></div>
      </div></div>`).join('');
}

// ── MAIN LOOP ─────────────────────────────────────────────────────────────────
function loop(){
  requestAnimationFrame(loop);
  ctx.clearRect(0,0,W,H);
  if(state==='start'){drawStart();return;}
  drawBg();
  if(state==='dead'){
    obstacles.forEach(drawObstacle);cards.forEach(drawCard);
    parts.forEach(drawParticle);drawPlayer();drawDead();return;
  }

  frame++;
  const spd=baseSpeed+(P.turbo>0?2:0);
  if(frame%600===0)baseSpeed=Math.min(baseSpeed+0.38,8.6);
  score+=spd*0.05;
  if(Math.floor(score)>best){best=Math.floor(score);localStorage.setItem('runner-best',best);}

  if(P.jumpH>0||P.jumpVY>0){P.jumpVY-=GRAV;P.jumpH=Math.max(0,P.jumpH+P.jumpVY);if(P.jumpH===0)P.jumpVY=0;}
  if(P.turbo >0)P.turbo--;
  if(P.magnet>0)P.magnet--;
  P.x+=(P.targetX-P.x)*0.2;

  const oRate=Math.max(46,108-Math.floor(baseSpeed*7));
  if(frame%oRate===0)spawnObstacle();
  const cRate=Math.max(26,68-Math.floor(baseSpeed*4));
  if(frame%cRate===0)spawnCard();

  let died=false;
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i]; o.y+=spd;
    if(o.y>H+80){obstacles.splice(i,1);continue;}
    if(obstacleKills(o)){died=true;break;}
  }
  for(let i=cards.length-1;i>=0;i--){
    const c=cards[i]; c.y+=spd;
    if(P.magnet>0){const dx=P.x-c.x,dy=(P.y-P.jumpH)-c.y,d=Math.sqrt(dx*dx+dy*dy);if(d<140&&d>1){c.x+=dx/d*4;c.y+=dy/d*4;}}
    if(c.y>H+50){cards.splice(i,1);continue;}
    const pCY=P.y-P.jumpH,pCH=P.crouching?P.h*0.46:P.h*0.6;
    if(Math.abs(P.x-c.x)<(P.w+c.w)*0.5&&Math.abs(pCY-c.y)<(pCH+c.h)*0.5){collectCard(c.ck);cards.splice(i,1);continue;}
  }
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.18;p.life-=p.decay;
    if(p.life<=0){parts.splice(i,1);continue;}
  }
  for(let i=popups.length-1;i>=0;i--){
    const p=popups[i];p.y-=1.8;p.life-=0.022;
    if(p.life<=0){popups.splice(i,1);continue;}
  }

  obstacles.forEach(drawObstacle);cards.forEach(drawCard);
  parts.forEach(drawParticle);drawPlayer();popups.forEach(drawPopup);

  const hY=P.y-P.jumpH-P.h*0.68;
  if(P.crouching){
    ctx.save(); ctx.globalAlpha=0.75;
    ctx.font='bold 10px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=2.5;
    ctx.strokeText('⬇ AGACHADO',P.x,hY); ctx.fillStyle='#00E5FF'; ctx.fillText('⬇ AGACHADO',P.x,hY);
    ctx.restore();
  } else if(P.jumpH>10){
    ctx.save(); ctx.globalAlpha=0.75;
    ctx.font='bold 10px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=2.5;
    ctx.strokeText('⬆ PULANDO!',P.x,hY); ctx.fillStyle='#FFD600'; ctx.fillText('⬆ PULANDO!',P.x,hY);
    ctx.restore();
  }

  if(died)state='dead';
  if(frame%4===0){updateHUD();updatePowers();}
}

bestEl&&(bestEl.textContent=best);
loop();
