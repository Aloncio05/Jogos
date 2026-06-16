'use strict';
// ── Corrida do Aloncinho v5 — Perspectiva real + mecânica polida ─────────────

const canvas   = document.getElementById('runner-canvas');
const scoreEl  = document.getElementById('runner-score');
const bestEl   = document.getElementById('runner-best');
const speedEl  = document.getElementById('runner-speed');
const powersEl = document.getElementById('runner-powers');
if (!canvas) throw new Error('runner canvas not found');
const ctx = canvas.getContext('2d');
const W = 360, H = 600;

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const LANES  = [72, 180, 288];       // lane center x at canvas bottom
const BASE_Y = H - 100;             // player ground y
const GRAV   = 0.80;                // snappier gravity
const JUMP_V = 14.5;               // jump velocity
const JMP_CLR= 28;                  // min jumpH to clear ground obstacle

// Perspective
const VP_X = W / 2;   // vanishing point x
const VP_Y = 148;     // horizon y
const LB   = [10, 120, 240, 350]; // lane boundary x at canvas bottom

// ── CARDS ─────────────────────────────────────────────────────────────────────
const CARD_DEF = {
  red:    { bg:'#FF1744', fg:'#fff', glyph:'🔥', bonus:50  },
  blue:   { bg:'#2196F3', fg:'#fff', glyph:'🛡', bonus:30  },
  yellow: { bg:'#FFD600', fg:'#000', glyph:'🧲', bonus:20  },
  green:  { bg:'#00E676', fg:'#000', glyph:'⚡', bonus:40  },
  wild:   { bg:'#E040FB', fg:'#fff', glyph:'★',  bonus:100 },
};
const CARD_KEYS = Object.keys(CARD_DEF);

// ── OBSTACLES — each entry stores its own colors so random picks are distinct ─
const OBJ_POOL = [
  { kind:'train', w:90,h:110,layer:'ground',span:1,tc:'#E53935',tc2:'#B71C1C',tcl:'#FF8A80' },
  { kind:'train', w:90,h:110,layer:'ground',span:1,tc:'#1E88E5',tc2:'#0D47A1',tcl:'#82B1FF' },
  { kind:'train', w:90,h:110,layer:'ground',span:1,tc:'#43A047',tc2:'#1B5E20',tcl:'#A5D6A7' },
  { kind:'train', w:90,h:110,layer:'ground',span:1,tc:'#FB8C00',tc2:'#E65100',tcl:'#FFCC80' },
  { kind:'barrier',w:108,h:34,layer:'ground',span:2 },
  { kind:'sign',  w:92,h:34, layer:'air',  span:1 },
  { kind:'lowbar',w:322,h:24,layer:'ground',span:3 },
  { kind:'highbar',w:322,h:22,layer:'air', span:3 },
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let state='start', frame=0, score=0, baseSpeed=3.0;
let best=parseInt(localStorage.getItem('runner-best')||'0');

const P={
  lane:1, x:LANES[1], y:BASE_Y, w:36, h:54,
  targetX:LANES[1], jumpH:0, jumpVY:0,
  crouching:false, turbo:0, magnet:0,
};
let obstacles=[], cards=[], parts=[], popups=[];

// Animated env
const clouds=[
  {x:55,y:60,r:26,spd:0.09},{x:195,y:43,r:20,spd:0.07},
  {x:295,y:78,r:17,spd:0.12},{x:130,y:30,r:23,spd:0.08},
];
const CITY=[
  {x:0,w:24,h:84},{x:26,w:18,h:62},{x:46,w:30,h:100},{x:78,w:20,h:70},
  {x:100,w:16,h:52},{x:118,w:24,h:88},
  {x:218,w:20,h:77},{x:240,w:16,h:55},{x:258,w:28,h:94},
  {x:288,w:20,h:66},{x:310,w:26,h:84},{x:338,w:22,h:62},
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
  if(k==='ArrowLeft'||k==='a'||k==='A')shiftLane(-1);
  if(k==='ArrowRight'||k==='d'||k==='D')shiftLane(+1);
  if(k==='ArrowUp'||k==='w'||k==='W'||k===' ')jump();
  if(k==='ArrowDown'||k==='s'||k==='S')P.crouching=true;
}
function bindBtn(id,fn){
  const el=document.getElementById(id);if(!el)return;
  el.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='play')begin();else fn(true);});
  el.addEventListener('pointerup',e=>{e.preventDefault();fn(false);});
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
  const dx=e.changedTouches[0].clientX-tsX,dy=e.changedTouches[0].clientY-tsY;
  if(state!=='play'){begin();return;}
  if(Math.abs(dy)>Math.abs(dx)){if(dy<-20)jump();else if(dy>20){P.crouching=true;setTimeout(()=>{P.crouching=false;},400);}}
  else if(Math.abs(dx)>20)shiftLane(dx<0?-1:1);
  e.preventDefault();
},{passive:false});

// ── ACTIONS ────────────────────────────────────────────────────────────────────
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
  // Spawn near horizon so they grow from the distance
  const startY=VP_Y+10;
  if(def.span===3)        obstacles.push({...def,lane:-1,x:W/2,y:startY});
  else if(def.span===2){  const sl=Math.floor(Math.random()*2);
    obstacles.push({...def,lane:-2,startLane:sl,x:(LANES[sl]+LANES[sl+1])/2,y:startY});}
  else{const lane=Math.floor(Math.random()*3);
    obstacles.push({...def,lane,x:LANES[lane],y:startY});}
}
function spawnCard(){
  const ck=CARD_KEYS[Math.floor(Math.random()*CARD_KEYS.length)];
  const lane=Math.floor(Math.random()*3);
  cards.push({ck,x:LANES[lane],y:VP_Y+10,w:24,h:24});
}

// ── PERSPECTIVE ────────────────────────────────────────────────────────────────
// Scale factor at world-y (0→horizon,1→bottom)
function pScale(y){return Math.max(0.01,(y-VP_Y)/(H-VP_Y));}
// Perspective x: interpolate from VP_X (horizon) to bottomX (ground)
function pX(bottomX,y){return VP_X+(bottomX-VP_X)*pScale(y);}

// ── COLLISION ──────────────────────────────────────────────────────────────────
function obstacleKills(o){
  if     (o.lane===-1){}
  else if(o.lane===-2){if(P.lane!==o.startLane&&P.lane!==o.startLane+1)return false;}
  else                {if(P.lane!==o.lane)return false;}
  if(o.layer==='ground'){if(P.jumpH>=JMP_CLR)return false;}
  if(o.layer==='air')  {if(P.crouching)return false;if(P.jumpH>=80)return false;}
  // Use scaled hitbox so it matches visual size
  const sc=pScale(o.y);
  const scaledH=o.h*sc;
  const playerY=P.y-P.jumpH;
  const dy=Math.abs(playerY-o.y);
  const dh=(P.crouching?P.h*0.36:P.h*0.50)/2 + scaledH*0.36;
  return dy<dh;
}

// ── COLLECT ────────────────────────────────────────────────────────────────────
function collectCard(ck){
  const d=CARD_DEF[ck]; score+=d.bonus;
  if(ck==='yellow')P.magnet=360;
  if(ck==='green') P.turbo=240;
  if(ck==='wild')  {P.magnet=300;P.turbo=200;}
  burst(P.x,P.y-P.jumpH,d.bg,14);
  popups.push({x:P.x,y:P.y-P.jumpH-45,text:`+${d.bonus}`,color:d.bg,life:1});
}
function burst(x,y,col,n){
  for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-.5)*9,vy:(Math.random()-.5)*9-2,r:3+Math.random()*4,color:col,life:1,decay:.03+Math.random()*.03});
}

// ── DRAW UTILS ────────────────────────────────────────────────────────────────
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r??6);}

// ── BACKGROUND ────────────────────────────────────────────────────────────────
function drawBg(){
  // Sunset sky
  const sky=ctx.createLinearGradient(0,0,0,VP_Y+55);
  sky.addColorStop(0,'#BF360C'); sky.addColorStop(.3,'#E64A19');
  sky.addColorStop(.65,'#FF8F00'); sky.addColorStop(1,'#FFD54F');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,VP_Y+55);

  // Sun halo + disk
  const sx=W*.8,sy=50,sr=30;
  const sh=ctx.createRadialGradient(sx,sy,0,sx,sy,sr*3.5);
  sh.addColorStop(0,'rgba(255,230,80,.65)'); sh.addColorStop(.5,'rgba(255,150,0,.18)'); sh.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=sh; ctx.beginPath(); ctx.arc(sx,sy,sr*3.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#FFF176'; ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(sx-6,sy-6,sr*.35,0,Math.PI*2); ctx.fill();

  // Clouds
  clouds.forEach(cl=>{cl.x-=cl.spd;if(cl.x<-cl.r*4)cl.x=W+cl.r*3;drawCloud(cl.x,cl.y,cl.r);});

  // City silhouette
  CITY.forEach(b=>{
    const top=VP_Y+10-b.h;
    ctx.fillStyle='rgba(20,8,0,.85)'; ctx.fillRect(b.x,top,b.w,b.h);
    ctx.fillStyle='rgba(255,200,80,.5)';
    for(let wy=top+7;wy<VP_Y+6;wy+=11){
      ctx.fillRect(b.x+3,wy,b.w*.28,6);
      if(b.w>20)ctx.fillRect(b.x+b.w*.56,wy,b.w*.28,6);
    }
  });

  drawPlatform();
}

function drawCloud(cx,cy,r){
  ctx.save(); ctx.fillStyle='rgba(255,220,150,.72)';
  ctx.shadowColor='rgba(240,100,0,.2)'; ctx.shadowBlur=6;
  [{dx:0,dy:0,rr:r},{dx:-r*.72,dy:r*.25,rr:r*.65},{dx:r*.72,dy:r*.25,rr:r*.6},{dx:r*.28,dy:-r*.3,rr:r*.55}]
    .forEach(p=>{ctx.beginPath();ctx.arc(cx+p.dx,cy+p.dy,p.rr,0,Math.PI*2);ctx.fill();});
  ctx.restore();
}

function drawPlatform(){
  const spd=baseSpeed+(P.turbo>0?2:0);
  const off=(frame*spd*1.4)%55;

  // Ground
  const gnd=ctx.createLinearGradient(0,VP_Y,0,H);
  gnd.addColorStop(0,'#1C2831'); gnd.addColorStop(.2,'#2C3E50');
  gnd.addColorStop(.75,'#37474F'); gnd.addColorStop(1,'#455A64');
  ctx.fillStyle=gnd;
  ctx.beginPath(); ctx.moveTo(0,VP_Y+16); ctx.lineTo(W,VP_Y+16);
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();

  // Grass sides
  const gr=ctx.createLinearGradient(0,VP_Y,0,H);
  gr.addColorStop(0,'#1A5E20'); gr.addColorStop(1,'#2E7D32');
  ctx.fillStyle=gr;
  ctx.beginPath(); ctx.moveTo(0,VP_Y+16); ctx.lineTo(pX(LB[0],VP_Y+16),VP_Y+16);
  ctx.lineTo(LB[0],H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(pX(LB[3],VP_Y+16),VP_Y+16); ctx.lineTo(W,VP_Y+16);
  ctx.lineTo(W,H); ctx.lineTo(LB[3],H); ctx.closePath(); ctx.fill();

  // Horizontal tile lines
  ctx.strokeStyle='rgba(255,255,255,.055)';
  for(let i=0;i<=22;i++){
    const pr=((i*55-off)/(H-VP_Y));
    if(pr<0||pr>1)continue;
    const ty=VP_Y+pr*(H-VP_Y);
    ctx.lineWidth=Math.max(.5,(ty-VP_Y)/(H-VP_Y)*2.8);
    ctx.beginPath(); ctx.moveTo(pX(LB[0],ty),ty); ctx.lineTo(pX(LB[3],ty),ty); ctx.stroke();
  }

  // Lane dashes
  ctx.setLineDash([22,16]); ctx.strokeStyle='rgba(255,255,255,.1)';
  [LB[1],LB[2]].forEach(bx=>{
    ctx.lineDashOffset=-(frame*spd*.8%38); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(VP_X,VP_Y); ctx.lineTo(bx,H); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Crossties
  for(let i=0;i<=26;i++){
    const pr=((i*55-off)/(H-VP_Y));
    if(pr<-.05||pr>1)continue;
    const ty=VP_Y+pr*(H-VP_Y);
    const x0=pX(LB[0]+2,ty),x3=pX(LB[3]-2,ty);
    const sc=(ty-VP_Y)/(H-VP_Y),tH=Math.max(2,sc*18);
    ctx.fillStyle='rgba(0,0,0,.22)'; ctx.fillRect(x0,ty+1,x3-x0,tH);
    ctx.fillStyle='#3E2723'; ctx.fillRect(x0,ty-tH/2,x3-x0,tH);
    ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fillRect(x0,ty-tH/2,x3-x0,tH*.4);
  }

  // Rails
  for(let i=0;i<=3;i++){
    const bx=LB[i];
    ctx.strokeStyle='#90A4AE'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(VP_X,VP_Y); ctx.lineTo(bx,H); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(VP_X+.5,VP_Y); ctx.lineTo(bx+1.5,H); ctx.stroke();
  }

  // Safety lines
  ctx.strokeStyle='#FFD600'; ctx.lineWidth=2.5; ctx.setLineDash([12,8]);
  [LB[0],LB[3]].forEach(bx=>{
    ctx.lineDashOffset=-(frame*spd*.5%20);
    ctx.beginPath(); ctx.moveTo(VP_X,VP_Y); ctx.lineTo(bx,H); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Turbo streaks
  if(P.turbo>0){
    ctx.save(); ctx.globalAlpha=.14; ctx.strokeStyle='#00E676'; ctx.lineWidth=3;
    for(let i=0;i<5;i++){
      const lx=3+i*3,ly=((i*55+frame*(baseSpeed+2)*2.8)%(H+80))-40;
      ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx,ly+55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-lx,ly); ctx.lineTo(W-lx,ly+55); ctx.stroke();
    }
    ctx.restore();
  }
}

// ── OBSTACLE DRAWING — perspective scaling via ctx.scale ──────────────────────
function drawObstacle(o){
  if(o.y<=VP_Y)return; // below horizon only
  const sc=pScale(o.y);
  // Perspective x: obstacle x converges to VP_X at horizon
  const visX=VP_X+(o.x-VP_X)*sc;
  // Warning glow when close
  const isClose=o.y>BASE_Y-80;

  ctx.save();
  ctx.translate(visX,o.y);
  ctx.scale(sc,sc);

  if(isClose){
    ctx.shadowColor='#FF1744';
    ctx.shadowBlur=30/sc;
  }

  const{kind,w,h}=o;
  const LSTR='rgba(0,0,0,0.75)';

  if(kind==='train'){
    const tc=o.tc||'#E53935',tc2=o.tc2||'#B71C1C',tcl=o.tcl||'#FF8A80';
    // Train drawn from (0,0) at wheel level, body goes from -h to 0
    // Shadow
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(-w/2+6,-h+8,w,h);
    // Body
    ctx.beginPath(); rr(-w/2,-h,w,h,9); ctx.fillStyle=tc; ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=2.5; ctx.stroke();
    // Cab roof (clipped)
    ctx.save(); ctx.clip();
    ctx.fillStyle=tc2; ctx.fillRect(-w/2,-h,w,h*.28);
    ctx.restore();
    // Windshield
    ctx.beginPath(); rr(-w/2+10,-h+h*.08,w-20,h*.2,4);
    ctx.fillStyle='#B3E5FC'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(-w/2+14,-h+h*.09,(w-28)*.45,4);
    // Side windows
    const sw=(w-26)/2;
    ctx.beginPath(); rr(-w/2+9,-h+h*.33,sw,h*.19,3); ctx.fillStyle='#E3F2FD'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); rr(5,-h+h*.33,sw,h*.19,3); ctx.fillStyle='#E3F2FD'; ctx.fill(); ctx.stroke();
    // Accent stripe
    ctx.fillStyle=tcl; ctx.fillRect(-w/2,-h+h*.56,w,5);
    // Headlights
    [[-w/2+11,-h+h*.64],[w/2-11,-h+h*.64]].forEach(([hx,hy])=>{
      const hg=ctx.createRadialGradient(hx,hy,0,hx,hy,13);
      hg.addColorStop(0,'rgba(255,245,100,.95)'); hg.addColorStop(.5,'rgba(255,200,0,.28)'); hg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(hx,hy,13,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFF176'; ctx.beginPath(); ctx.arc(hx,hy,5,0,Math.PI*2); ctx.fill();
    });
    // Grille
    ctx.beginPath(); rr(-w/2+8,-h+h*.75,w-16,h*.12,3);
    ctx.fillStyle=tc2; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1; ctx.stroke();
    for(let i=1;i<4;i++){const gx=-w/2+8+(w-16)*i/4;ctx.beginPath();ctx.moveTo(gx,-h+h*.75);ctx.lineTo(gx,-h+h*.87);ctx.stroke();}
    // Wheels
    [-w/2+14,w/2-14].forEach(wx=>{
      ctx.fillStyle='#212121'; ctx.beginPath(); ctx.arc(wx,-3,9,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#616161'; ctx.beginPath(); ctx.arc(wx,-3,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#B0BEC5'; ctx.beginPath(); ctx.arc(wx,-3,2,0,Math.PI*2); ctx.fill();
    });
    // Label
    ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=4; ctx.strokeText('⬆ PULE!',0,-h*.5);
    ctx.fillStyle='#FFF176'; ctx.fillText('⬆ PULE!',0,-h*.5);

  } else if(kind==='sign'){
    // Air obstacle — drawn from y=-h/2 to y=h/2
    const topY=-h*2;
    ctx.strokeStyle='#5D4037'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-w/2+12,topY); ctx.lineTo(-w/2+12,-h/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w/2-12,topY); ctx.lineTo(w/2-12,-h/2); ctx.stroke();
    ctx.beginPath(); rr(-w/2,-h/2,w,h,5);
    ctx.fillStyle='#0097A7'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(-w/2+4,-h/2+3,w-8,5);
    ctx.font='bold 13px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=4; ctx.strokeText('⬇ ABAIXE!',0,0);
    ctx.fillStyle='#E0F7FA'; ctx.fillText('⬇ ABAIXE!',0,0);

  } else if(kind==='lowbar'){
    // Full-width ground bar — must jump
    const g=ctx.createLinearGradient(-w/2,0,w/2,0);
    g.addColorStop(0,'#BF360C'); g.addColorStop(.5,'#E64A19'); g.addColorStop(1,'#BF360C');
    ctx.beginPath(); rr(-w/2,-h/2,w,h,4); ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.15)';
    for(let i=0;i<7;i++)ctx.fillRect(-w/2+i*47,-h/2,24,h);
    ctx.fillStyle='rgba(255,255,255,.22)'; ctx.fillRect(-w/2+4,-h/2+2,w-8,4);
    ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=4; ctx.strokeText('⬆  PULE TUDO!  ⬆',0,-h/2-18);
    ctx.fillStyle='#FFD600'; ctx.fillText('⬆  PULE TUDO!  ⬆',0,-h/2-18);

  } else if(kind==='highbar'){
    // Full-width overhead bar — must crouch
    ctx.fillStyle='#37474F'; ctx.fillRect(-w/2+2,-h/2-28,10,28); ctx.fillRect(w/2-12,-h/2-28,10,28);
    const g2=ctx.createLinearGradient(0,-h/2,0,h/2);
    g2.addColorStop(0,'#546E7A'); g2.addColorStop(1,'#37474F');
    ctx.beginPath(); rr(-w/2,-h/2,w,h,4); ctx.fillStyle=g2; ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(0,229,255,.18)';
    for(let i=0;i<5;i++)ctx.fillRect(-w/2+i*64,-h/2,32,h);
    ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=4; ctx.strokeText('⬇  AGACHE!  ⬇',0,h/2+18);
    ctx.fillStyle='#00E5FF'; ctx.fillText('⬇  AGACHE!  ⬇',0,h/2+18);

  } else if(kind==='barrier'){
    ctx.fillStyle='#F9A825'; ctx.fillRect(-w/2-5,-h/2-18,8,h+32); ctx.fillRect(w/2-3,-h/2-18,8,h+32);
    ctx.beginPath(); rr(-w/2,-h/2,w,h,4); ctx.fillStyle='#E53935'; ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.22)';
    for(let i=0;i<5;i++)ctx.fillRect(-w/2+i*22,-h/2,11,h);
    ctx.font='bold 13px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=4; ctx.strokeText('⬆ PULE!',0,0);
    ctx.fillStyle='#fff'; ctx.fillText('⬆ PULE!',0,0);
  }

  ctx.restore();
}

// ── COIN ──────────────────────────────────────────────────────────────────────
function drawCard(c){
  if(c.y<=VP_Y)return;
  const sc=pScale(c.y), visX=VP_X+(c.x-VP_X)*sc;
  const bob=Math.sin(frame*.12+c.x*.06)*3*sc, r=14*sc;
  const d=CARD_DEF[c.ck];
  ctx.save(); ctx.translate(0,bob);
  ctx.shadowColor=d.bg; ctx.shadowBlur=14;
  ctx.fillStyle=d.bg; ctx.beginPath(); ctx.arc(visX,c.y,r,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.42)';
  ctx.beginPath(); ctx.ellipse(visX-r*.22,c.y-r*.22,r*.42,r*.26,-.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=d.fg; ctx.font=`bold ${Math.max(8,11*sc)}px sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(d.glyph,visX,c.y+.5);
  ctx.restore();
}

// ── PLAYER ────────────────────────────────────────────────────────────────────
function drawPlayer(){
  const{x,y,w,h,jumpH,crouching,turbo}=P;
  const ry=y-jumpH, bounce=jumpH<2?Math.sin(frame*.3)*2:0;
  const leg=Math.sin(frame*.38);
  const ch=crouching?h*.46:h, cOff=crouching?h*.26:0;

  // Jump shadow
  if(jumpH>4){
    const sc=Math.max(.18,1-jumpH/140);
    ctx.save(); ctx.globalAlpha=.3*sc; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(x,y+10,w*.52*sc,6*sc,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  // Magnet ring
  if(P.magnet>0&&frame%24<12){
    ctx.save(); ctx.globalAlpha=.22; ctx.strokeStyle='#FFD600'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(x,ry,90+(frame%24)*2,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  // Turbo trail
  if(turbo>0){
    for(let i=1;i<=4;i++){
      ctx.save(); ctx.globalAlpha=.07*(5-i); ctx.fillStyle='#00E676';
      ctx.beginPath(); rr(x-w/2,ry-ch/2+cOff+i*9,w,ch-i*7,5); ctx.fill(); ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(x,ry+bounce+cOff);
  const jc=turbo>0?'#00C853':'#F44336'; // red jacket
  function draw(fc,sc,lw){ctx.fillStyle=fc;ctx.fill();ctx.strokeStyle=sc??'rgba(0,0,0,.72)';ctx.lineWidth=lw??1.8;ctx.stroke();}

  if(!crouching){
    // Legs
    ctx.save(); ctx.translate(-w*.16,ch*.18); ctx.rotate(leg*.42);
    ctx.beginPath(); ctx.rect(-7,0,14,ch*.36); draw('#1565C0'); ctx.restore();
    ctx.save(); ctx.translate(w*.16,ch*.18); ctx.rotate(-leg*.42);
    ctx.beginPath(); ctx.rect(-7,0,14,ch*.36); draw('#1565C0'); ctx.restore();
    // Shoes
    ctx.save(); ctx.translate(-w*.16+leg*3,ch*.52); ctx.beginPath(); rr(-9,-5,20,9,3); draw('#212121'); ctx.restore();
    ctx.save(); ctx.translate(w*.16-leg*3,ch*.52); ctx.beginPath(); rr(-11,-5,20,9,3); draw('#212121'); ctx.restore();
    ctx.fillStyle='rgba(255,255,255,.55)';
    ctx.save(); ctx.translate(-w*.16+leg*3,ch*.52); ctx.fillRect(-7,-1,12,2); ctx.restore();
    ctx.save(); ctx.translate(w*.16-leg*3,ch*.52); ctx.fillRect(-9,-1,12,2); ctx.restore();
    // Arms
    const arm=-leg*.32;
    ctx.save(); ctx.translate(-w/2-5,-ch*.06); ctx.rotate(arm); ctx.beginPath(); ctx.rect(-5,0,10,ch*.24); draw(jc); ctx.restore();
    ctx.save(); ctx.translate(w/2+5,-ch*.06); ctx.rotate(-arm); ctx.beginPath(); ctx.rect(-5,0,10,ch*.24); draw(jc); ctx.restore();
    ctx.fillStyle='#FFCC80'; ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(-w/2-4,-ch*.06+ch*.24,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(w/2+4,-ch*.06+ch*.24,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.rect(-w*.43,ch*.06,w*.38,ch*.3); draw('#1565C0');
    ctx.beginPath(); ctx.rect(w*.05,ch*.06,w*.38,ch*.3); draw('#1565C0');
    ctx.beginPath(); rr(-w*.43,ch*.36,w*.34,10,2); draw('#212121');
    ctx.beginPath(); rr(w*.05,ch*.36,w*.34,10,2); draw('#212121');
  }
  // Body
  ctx.beginPath(); rr(-w/2,-ch*.28,w,ch*.46,7); draw(jc,'rgba(0,0,0,.8)',2);
  ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(-w/2+4,-ch*.28+3,w-8,7);
  ctx.fillStyle='rgba(255,255,255,.3)';
  ctx.font='bold 8px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('11',0,-ch*.05);
  // Head
  const hR=crouching?w*.22:w*.26,hY=crouching?-ch*.3:-ch*.36;
  ctx.beginPath(); ctx.arc(0,hY,hR,0,Math.PI*2); draw('#FFCC80','rgba(0,0,0,.55)',1.5);
  ctx.fillStyle='#1A1A1A';
  ctx.beginPath(); ctx.arc(-5,hY+1,3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(5,hY+1,3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(-4,hY,1.2,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(6,hY,1.2,0,Math.PI*2); ctx.fill();
  if(!crouching){ctx.strokeStyle='#1A1A1A';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,hY+5,4,.2,Math.PI-.2);ctx.stroke();}
  // Cap
  if(!crouching){
    ctx.beginPath(); rr(-hR*1.4,hY-hR*.52,hR*2.8,hR*.32,3); draw('#FAFAFA','rgba(0,0,0,.55)',1.5);
    ctx.beginPath(); ctx.arc(0,hY-hR*.74,hR*.97,Math.PI,0);
    ctx.rect(-hR*.97,hY-hR*.74,hR*1.94,hR*.32); draw('#FAFAFA','rgba(0,0,0,.55)',1.5);
    ctx.fillStyle='#F44336'; ctx.fillRect(-hR*.97,hY-hR*.78,hR*1.94,4);
    ctx.fillStyle='#BDBDBD'; ctx.beginPath(); ctx.arc(0,hY-hR*1.7,2.5,0,Math.PI*2); ctx.fill();
  } else {
    ctx.beginPath(); rr(-hR*1.1,hY-hR*.5,hR*2.2,hR*.3,3); draw('#FAFAFA','rgba(0,0,0,.5)',1.5);
    ctx.beginPath(); ctx.arc(0,hY-hR*.5,hR*.82,Math.PI,0); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#F44336'; ctx.fillRect(-hR*.82,hY-hR*.54,hR*1.64,3);
  }
  ctx.restore();
}

function drawParticle(p){
  ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
  ctx.beginPath(); ctx.arc(p.x,p.y,p.r*Math.max(.2,p.life),0,Math.PI*2); ctx.fill(); ctx.restore();
}
function drawPopup(p){
  ctx.save(); ctx.globalAlpha=p.life;
  ctx.font='bold 17px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.strokeStyle='rgba(0,0,0,.75)'; ctx.lineWidth=3;
  ctx.strokeText(p.text,p.x,p.y); ctx.fillStyle=p.color; ctx.fillText(p.text,p.x,p.y);
  ctx.restore();
}

// ── LANE INDICATOR ────────────────────────────────────────────────────────────
function drawLaneIndicator(){
  const lx=LANES[P.lane],iy=BASE_Y+22;
  ctx.save(); ctx.globalAlpha=.5+(Math.sin(frame*.18)*.15);
  ctx.fillStyle='#FFD600';
  ctx.beginPath(); ctx.moveTo(lx,iy); ctx.lineTo(lx-10,iy+14); ctx.lineTo(lx+10,iy+14); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ── START SCREEN ──────────────────────────────────────────────────────────────
function drawStart(){
  drawBg();
  ctx.fillStyle='rgba(0,3,18,.82)'; ctx.fillRect(0,0,W,H);
  ctx.save();
  // Panel
  ctx.fillStyle='rgba(10,15,45,.97)'; ctx.beginPath(); rr(14,104,W-28,388,20); ctx.fill();
  const pb=ctx.createLinearGradient(14,104,W-14,492);
  pb.addColorStop(0,'#FF6F00'); pb.addColorStop(.5,'#FFD600'); pb.addColorStop(1,'#FF6F00');
  ctx.strokeStyle=pb; ctx.lineWidth=2.5; ctx.stroke();

  ctx.textAlign='center'; ctx.textBaseline='middle';
  // Title
  ctx.font='bold 30px sans-serif';
  ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=5;
  ctx.strokeText('Corrida do Aloncinho',W/2,148);
  ctx.fillStyle='#FFD600'; ctx.fillText('Corrida do Aloncinho',W/2,148);
  ctx.fillStyle='#90CAF9'; ctx.font='11px sans-serif';
  ctx.fillText('Subway Runner — obstáculos vêm de frente!',W/2,170);

  // Guide
  const g=[
    {bg:'rgba(229,57,53,.22)',bc:'#E53935',tip:'Trem no trilho',act:'⬆ PULE'},
    {bg:'rgba(0,151,167,.22)',bc:'#0097A7',tip:'Placa suspensa',act:'⬇ ABAIXE'},
    {bg:'rgba(230,74,25,.22)',bc:'#E64A19',tip:'Barra no chão (3 faixas)',act:'⬆ PULE TUDO'},
    {bg:'rgba(84,110,122,.22)',bc:'#546E7A',tip:'Barra no alto (3 faixas)',act:'⬇ AGACHE'},
  ];
  ctx.font='12px sans-serif'; ctx.textAlign='left';
  g.forEach((e,i)=>{
    const gy=200+i*40;
    ctx.fillStyle=e.bg; ctx.beginPath(); rr(26,gy-14,W-52,32,8); ctx.fill();
    ctx.strokeStyle=e.bc; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='12px sans-serif'; ctx.fillText(e.tip,34,gy+2);
    ctx.fillStyle=e.bc; ctx.font='bold 13px sans-serif'; ctx.textAlign='right';
    ctx.fillText(e.act,W-34,gy+2); ctx.textAlign='left';
  });

  ctx.textAlign='center';
  ctx.fillStyle='rgba(255,255,255,.4)'; ctx.font='11px sans-serif';
  ctx.fillText('← → faixa  ·  ↑/Espaço pular  ·  ↓ segurar = agachar',W/2,378);
  if(best>0){ctx.fillStyle='#FFD600';ctx.font='14px sans-serif';ctx.fillText(`🏆 Recorde: ${best}`,W/2,402);}
  const bg2=ctx.createLinearGradient(W/2-112,416,W/2+112,462);
  bg2.addColorStop(0,'#FF6D00'); bg2.addColorStop(1,'#FFD600');
  ctx.fillStyle=bg2; ctx.beginPath(); rr(W/2-112,416,224,48,24); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#0D0D1A'; ctx.font='bold 19px sans-serif';
  ctx.fillText('▶  JOGAR AGORA',W/2,440);
  ctx.restore();
}

// ── DEAD SCREEN ───────────────────────────────────────────────────────────────
function drawDead(){
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.72)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(8,10,38,.97)'; ctx.beginPath(); rr(20,H/2-152,W-40,304,20); ctx.fill();
  ctx.strokeStyle='#EF5350'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='bold 38px sans-serif';
  ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=6;
  ctx.strokeText('GAME OVER!',W/2,H/2-104);
  ctx.fillStyle='#EF5350'; ctx.fillText('GAME OVER!',W/2,H/2-104);
  ctx.strokeStyle='rgba(0,0,0,.6)'; ctx.lineWidth=4;
  ctx.strokeText(`${Math.floor(score)} pts`,W/2,H/2-54);
  ctx.fillStyle='#ECEFF1'; ctx.font='bold 26px sans-serif'; ctx.fillText(`${Math.floor(score)} pts`,W/2,H/2-54);
  ctx.fillStyle='#FFD600'; ctx.font='17px sans-serif'; ctx.fillText(`🏆 Recorde: ${best}`,W/2,H/2-16);
  if(Math.floor(score)>=best&&score>0){ctx.fillStyle='#00E5FF';ctx.font='bold 15px sans-serif';ctx.fillText('★  Novo recorde!  ★',W/2,H/2+14);}
  const rg=ctx.createLinearGradient(W/2-110,H/2+55,W/2+110,H/2+100);
  rg.addColorStop(0,'#00B0FF'); rg.addColorStop(1,'#00E5FF');
  ctx.fillStyle=rg; ctx.beginPath(); rr(W/2-110,H/2+55,220,48,24); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='#012B3E'; ctx.font='bold 18px sans-serif'; ctx.fillText('↻  TENTAR DE NOVO',W/2,H/2+79);
  ctx.restore();
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD(){
  if(scoreEl)scoreEl.textContent=Math.floor(score);
  if(bestEl) bestEl.textContent=best;
  const lvl=Math.ceil((baseSpeed-3.0)/.38)+1;
  if(speedEl)speedEl.textContent=`${Math.min(9,lvl)}×`;
}
function updatePowers(){
  if(!powersEl)return;
  const c=[];
  if(P.magnet>0)c.push({label:'🧲 Ímã', color:'#FFD600',pct:P.magnet/360});
  if(P.turbo >0)c.push({label:'⚡ Turbo',color:'#00E676',pct:P.turbo/240});
  powersEl.innerHTML=c.map(e=>`<div class="runner-power-chip"><span>${e.label}</span>
    <div class="runner-chip-bar-bg"><div class="runner-chip-bar" style="width:${Math.min(100,Math.round(e.pct*100))}%;background:${e.color}"></div></div></div>`).join('');
}

// ── MAIN LOOP ─────────────────────────────────────────────────────────────────
function loop(){
  requestAnimationFrame(loop);
  ctx.clearRect(0,0,W,H);
  if(state==='start'){drawStart();return;}
  drawBg();
  if(state==='dead'){
    obstacles.forEach(drawObstacle); cards.forEach(drawCard);
    parts.forEach(drawParticle); drawPlayer(); drawDead(); return;
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  frame++;
  const spd=baseSpeed+(P.turbo>0?2:0);
  if(frame%600===0)baseSpeed=Math.min(baseSpeed+.38,8.6);
  score+=spd*.05;
  if(Math.floor(score)>best){best=Math.floor(score);localStorage.setItem('runner-best',best);}

  if(P.jumpH>0||P.jumpVY>0){P.jumpVY-=GRAV;P.jumpH=Math.max(0,P.jumpH+P.jumpVY);if(P.jumpH===0)P.jumpVY=0;}
  if(P.turbo >0)P.turbo--;
  if(P.magnet>0)P.magnet--;
  P.x+=(P.targetX-P.x)*.2;

  const oRate=Math.max(52,120-Math.floor(baseSpeed*8));
  if(frame%oRate===0)spawnObstacle();
  const cRate=Math.max(30,72-Math.floor(baseSpeed*5));
  if(frame%cRate===0)spawnCard();

  let died=false;
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i]; o.y+=spd;
    if(o.y>H+20){obstacles.splice(i,1);continue;}
    if(obstacleKills(o)){died=true;break;}
  }
  for(let i=cards.length-1;i>=0;i--){
    const c=cards[i]; c.y+=spd;
    if(P.magnet>0){const dx=P.x-c.x,dy=(P.y-P.jumpH)-c.y,d=Math.sqrt(dx*dx+dy*dy);if(d<140&&d>1){c.x+=dx/d*4;c.y+=dy/d*4;}}
    if(c.y>H+30){cards.splice(i,1);continue;}
    const pCY=P.y-P.jumpH,pCH=P.crouching?P.h*.46:P.h*.6;
    if(Math.abs(P.x-c.x)<(P.w+c.w)*.5&&Math.abs(pCY-c.y)<(pCH+c.h)*.5){collectCard(c.ck);cards.splice(i,1);}
  }
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.18;p.life-=p.decay;
    if(p.life<=0)parts.splice(i,1);
  }
  for(let i=popups.length-1;i>=0;i--){
    const p=popups[i];p.y-=1.8;p.life-=.022;
    if(p.life<=0)popups.splice(i,1);
  }

  // ── DRAW ───────────────────────────────────────────────────────────────────
  // Sort obstacles back-to-front so closer ones draw on top
  const sorted=[...obstacles].sort((a,b)=>a.y-b.y);
  sorted.forEach(drawObstacle);
  cards.forEach(drawCard);
  parts.forEach(drawParticle);
  drawLaneIndicator();
  drawPlayer();
  popups.forEach(drawPopup);

  // State hints
  const hY=P.y-P.jumpH-P.h*.7;
  if(P.crouching){
    ctx.save(); ctx.globalAlpha=.8; ctx.font='bold 10px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=2.5;
    ctx.strokeText('⬇ AGACHADO',P.x,hY); ctx.fillStyle='#00E5FF'; ctx.fillText('⬇ AGACHADO',P.x,hY);
    ctx.restore();
  } else if(P.jumpH>10){
    ctx.save(); ctx.globalAlpha=.8; ctx.font='bold 10px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=2.5;
    ctx.strokeText('⬆ PULANDO!',P.x,hY); ctx.fillStyle='#FFD600'; ctx.fillText('⬆ PULANDO!',P.x,hY);
    ctx.restore();
  }

  if(died)state='dead';
  if(frame%4===0){updateHUD();updatePowers();}
}

bestEl&&(bestEl.textContent=best);
loop();
