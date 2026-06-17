'use strict';
// ── Corrida do Aloncinho v7 — Visual neon + perspectiva Subway Surfers ────────

const canvas  = document.getElementById('runner-canvas');
const scoreEl = document.getElementById('runner-score');
const bestEl  = document.getElementById('runner-best');
const speedEl = document.getElementById('runner-speed');
const powersEl= document.getElementById('runner-powers');
const ctx     = canvas.getContext('2d');
const W = 360, H = 600;

// ── PERSPECTIVA ────────────────────────────────────────────────────────────────
// Ponto de fuga = centro do horizonte
const VP_X  = W / 2;   // x do ponto de fuga
const VP_Y  = 195;     // y do horizonte (linha onde trilhos convergem)
const BASE_Y= H - 80;  // y dos pés do jogador

// Faixas: posição x na linha do BASE_Y (parte mais larga da pista)
const LANE_X = [78, 180, 282];

// Perspectiva: escala e x visual de qualquer ponto do trilho
function pScale(y){ return Math.max(0,(y - VP_Y) / (H - VP_Y)); }
function pX(laneX, y){ return VP_X + (laneX - VP_X) * pScale(y); }

// ── FÍSICA ─────────────────────────────────────────────────────────────────────
const GRAV   = 0.82;
const JUMP_V = 15;
const JMP_CLR= 30;   // jumpH mínimo para passar sobre obstáculo de chão

// ── OBSTÁCULOS ─────────────────────────────────────────────────────────────────
const TRAIN_COLORS = [
  ['#e53935','#b71c1c'],   // vermelho
  ['#00acc1','#006064'],   // ciano
  ['#ffb300','#e65100'],   // âmbar
  ['#7b1fa2','#4a148c'],   // roxo
];
function mkTrain(ci){ const[a,b]=TRAIN_COLORS[ci]; return{kind:'train',w:84,h:118,layer:'ground',span:1,ca:a,cb:b}; }
const OBJ_POOL = [
  mkTrain(0), mkTrain(1), mkTrain(2), mkTrain(3),
  {kind:'barrier', w:272,h:26,layer:'ground',span:3,ca:'#ff6f00',cb:'#e65100'},
  {kind:'sign',    w:82, h:34,layer:'air',   span:1,ca:'#00bcd4',cb:'#006064'},
  {kind:'overhead',w:272,h:20,layer:'air',   span:3,ca:'#5c6bc0',cb:'#283593'},
];

// ── COLECTÁVEIS ────────────────────────────────────────────────────────────────
const CARDS = {
  gold: {col:'#FFD700',glyph:'★',bonus:10},
  cyan: {col:'#00E5FF',glyph:'⚡',bonus:30},
  pink: {col:'#FF4081',glyph:'🔥',bonus:50},
  green:{col:'#69F0AE',glyph:'🛡',bonus:25},
};
const CARD_KEYS = Object.keys(CARDS);

// ── ESTADO ─────────────────────────────────────────────────────────────────────
let state='start', frame=0, score=0, baseSpeed=3.2;
let best = parseInt(localStorage.getItem('runner-best')||'0');
const P = { lane:1, x:LANE_X[1], targetX:LANE_X[1], y:BASE_Y, w:30, h:60,
            jumpH:0, jumpVY:0, crouching:false, magnet:0, turbo:0 };
let obstacles=[], cards=[], parts=[], popups=[];

// ── AMBIENTE ───────────────────────────────────────────────────────────────────
const STARS = Array.from({length:55},()=>({
  x:Math.random()*W, y:Math.random()*VP_Y*.95,
  r:.5+Math.random()*1.5, phase:Math.random()*Math.PI*2
}));
const BUILDINGS = [
  {x:0,  w:28,h:90},{x:30, w:18,h:65},{x:50, w:32,h:108},{x:84, w:22,h:74},
  {x:108,w:16,h:52},{x:126,w:28,h:94},
  {x:214,w:22,h:78},{x:238,w:18,h:57},{x:258,w:30,h:100},{x:290,w:20,h:71},
  {x:312,w:28,h:87},{x:342,w:17,h:60},
];
const CLOUDS = [{x:60,y:52,w:72,h:22},{x:202,y:38,w:92,h:28},{x:298,y:68,w:62,h:18}];

// ── INPUT ──────────────────────────────────────────────────────────────────────
const held={};
document.addEventListener('keydown',e=>{
  if(held[e.key])return; held[e.key]=true; onKey(e.key);
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
});
document.addEventListener('keyup',e=>{
  delete held[e.key];
  if(['ArrowDown','s','S'].includes(e.key)) P.crouching=false;
});
function onKey(k){
  if(state!=='play'){begin();return;}
  if(['ArrowLeft','a','A'].includes(k))  shiftLane(-1);
  if(['ArrowRight','d','D'].includes(k)) shiftLane(+1);
  if(['ArrowUp','w','W',' '].includes(k))jump();
  if(['ArrowDown','s','S'].includes(k))  P.crouching=true;
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
  if(Math.abs(dy)>Math.abs(dx)){if(dy<-25)jump();else if(dy>25){P.crouching=true;setTimeout(()=>P.crouching=false,420);}}
  else if(Math.abs(dx)>25) shiftLane(dx<0?-1:1);
  e.preventDefault();
},{passive:false});

// ── AÇÕES ──────────────────────────────────────────────────────────────────────
function shiftLane(d){ const n=Math.max(0,Math.min(2,P.lane+d)); if(n===P.lane)return; P.lane=n; P.targetX=LANE_X[n]; }
function jump(){ if(P.jumpH<2){ P.jumpVY=JUMP_V; P.crouching=false; } }
function begin(){
  score=0; baseSpeed=3.2; frame=0; obstacles=[]; cards=[]; parts=[]; popups=[];
  P.lane=1; P.x=LANE_X[1]; P.targetX=LANE_X[1]; P.jumpH=0; P.jumpVY=0; P.crouching=false; P.magnet=0; P.turbo=0;
  state='play';
}

// ── SPAWN ──────────────────────────────────────────────────────────────────────
function spawnObstacle(){
  const pool = OBJ_POOL.filter(o=>o.span<3||baseSpeed>=5);
  const def  = pool[Math.floor(Math.random()*pool.length)];
  const lane = Math.floor(Math.random()*3);
  // laneX: posição real da faixa no BASE_Y; x visual calculado em tempo real
  obstacles.push({
    ...def,
    lane: def.span>=3 ? -1 : lane,
    laneX: def.span>=3 ? VP_X : LANE_X[lane],
    y: VP_Y + 2, // nasce no horizonte
  });
}
function spawnCard(){
  const ck   = CARD_KEYS[Math.floor(Math.random()*CARD_KEYS.length)];
  const lane = Math.floor(Math.random()*3);
  cards.push({ ck, laneX:LANE_X[lane], y:VP_Y+2, w:22, h:22 });
}

// ── COLISÃO ────────────────────────────────────────────────────────────────────
function kills(o){
  if(o.lane !== -1 && o.lane !== P.lane) return false;
  if(o.layer==='ground' && P.jumpH >= JMP_CLR) return false;
  if(o.layer==='air'    && P.crouching) return false;
  if(o.layer==='air'    && P.jumpH >= 95) return false;
  const sc  = pScale(o.y);
  const pY  = P.y - P.jumpH;
  const dy  = Math.abs(pY - o.y);
  const dh  = (P.crouching ? P.h*.34 : P.h*.46)/2 + o.h*sc*.34;
  return dy < dh;
}

// ── COLETAR ────────────────────────────────────────────────────────────────────
function collectCard(c){
  const d=CARDS[c.ck]; score+=d.bonus;
  if(c.ck==='cyan')  P.turbo=240;
  if(c.ck==='green') P.magnet=360;
  burst(P.x, P.y-P.jumpH, d.col, 12);
  popups.push({x:P.x, y:P.y-P.jumpH-42, text:`+${d.bonus}`, col:d.col, life:1});
}
function burst(x,y,col,n){
  for(let i=0;i<n;i++) parts.push({x,y,vx:(Math.random()-.5)*10,vy:(Math.random()-.5)*10-1.5,r:2+Math.random()*5,col,life:1,dec:.028+Math.random()*.024});
}

// ── UTILS ──────────────────────────────────────────────────────────────────────
function rr(x,y,w,h,r=6){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); }

// ── FUNDO ──────────────────────────────────────────────────────────────────────
function drawBg(){
  // Céu: roxo escuro → rosa → laranja
  const sky=ctx.createLinearGradient(0,0,0,VP_Y+45);
  sky.addColorStop(0,'#1a0533'); sky.addColorStop(.28,'#6b1fa0');
  sky.addColorStop(.65,'#d4508a'); sky.addColorStop(1,'#ff9f4a');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,VP_Y+45);

  // Estrelas piscando
  STARS.forEach(s=>{
    const a=.25+.75*Math.abs(Math.sin(frame*.04+s.phase));
    ctx.save(); ctx.globalAlpha=a; ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); ctx.restore();
  });

  // Nuvens
  CLOUDS.forEach((c,i)=>{
    CLOUDS[i].x -= .07; if(c.x < -c.w-10) CLOUDS[i].x = W+10;
    ctx.save(); ctx.globalAlpha=.6;
    const cg=ctx.createLinearGradient(c.x,c.y,c.x,c.y+c.h);
    cg.addColorStop(0,'rgba(255,100,160,.6)'); cg.addColorStop(1,'rgba(180,60,120,.2)');
    ctx.fillStyle=cg; ctx.beginPath();
    ctx.ellipse(c.x+c.w/2,c.y+c.h/2,c.w/2,c.h/2,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  });

  // Cidade silhueta
  BUILDINGS.forEach(b=>{
    const top=VP_Y-b.h;
    ctx.fillStyle='rgba(18,8,40,.93)'; ctx.fillRect(b.x,top,b.w,b.h);
    ctx.fillStyle='rgba(255,200,80,.38)';
    for(let wy=top+6;wy<VP_Y-4;wy+=12){
      ctx.fillRect(b.x+3,wy,b.w*.3,5);
      if(b.w>22) ctx.fillRect(b.x+b.w*.6,wy,b.w*.3,5);
    }
    ctx.strokeStyle='rgba(255,120,50,.5)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(b.x+b.w/2,top); ctx.lineTo(b.x+b.w/2,top-10); ctx.stroke();
    ctx.fillStyle='rgba(255,60,60,.85)'; ctx.beginPath(); ctx.arc(b.x+b.w/2,top-10,2,0,Math.PI*2); ctx.fill();
  });

  drawTrack();
}

// ── TRILHO ─────────────────────────────────────────────────────────────────────
function drawTrack(){
  const spd = baseSpeed + (P.turbo>0?2:0);
  const tileOff = (frame*spd*1.15)%60;

  // Chão
  const g=ctx.createLinearGradient(0,VP_Y,0,H);
  g.addColorStop(0,'#160e28'); g.addColorStop(.3,'#1a1230'); g.addColorStop(1,'#0d0a1a');
  ctx.fillStyle=g; ctx.fillRect(0,VP_Y,W,H-VP_Y);

  // Laterais fora das faixas
  ctx.fillStyle='#10071e';
  ctx.fillRect(0,VP_Y, LANE_X[0]-44, H-VP_Y);
  ctx.fillRect(LANE_X[2]+44, VP_Y, W-(LANE_X[2]+44), H-VP_Y);

  // Linhas horizontais (tiles em perspectiva)
  for(let i=0;i<=24;i++){
    const t = (i*60 - tileOff%60) / (H-VP_Y);
    if(t<0||t>1) continue;
    const yy = VP_Y + t*(H-VP_Y);
    const x0 = pX(LANE_X[0]-44, yy);
    const x1 = pX(LANE_X[2]+44, yy);
    ctx.strokeStyle = `rgba(140,110,240,${.04+t*.12})`;
    ctx.lineWidth = .7+t*2;
    ctx.beginPath(); ctx.moveTo(x0,yy); ctx.lineTo(x1,yy); ctx.stroke();
  }

  // Divisórias de faixa tracejadas
  const dashOff = (frame*spd*.85)%50;
  ctx.setLineDash([18,14]); ctx.lineWidth=2;
  // Divide em 3 faixas usando as 2 linhas internas
  const innerX = [LANE_X[0]+44, LANE_X[1]+44]; // linhas de divisão no BASE_Y
  innerX.forEach(bx=>{
    ctx.lineDashOffset = -dashOff;
    ctx.strokeStyle = 'rgba(180,150,255,.22)';
    ctx.beginPath(); ctx.moveTo(VP_X,VP_Y); ctx.lineTo(bx,H); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Trilhos neon (6 trilhos: 2 externos + 4 faixa)
  const railBX = [LANE_X[0]-44, LANE_X[0]+44, LANE_X[1]-1, LANE_X[1]+1, LANE_X[2]-44, LANE_X[2]+44];
  railBX.forEach(bx=>{
    const rg=ctx.createLinearGradient(0,VP_Y,0,H);
    rg.addColorStop(0,'rgba(160,130,255,0)');
    rg.addColorStop(.3,'rgba(190,165,255,.5)');
    rg.addColorStop(1,'rgba(220,200,255,.95)');
    ctx.strokeStyle=rg; ctx.lineWidth=2.8;
    ctx.beginPath(); ctx.moveTo(VP_X,VP_Y); ctx.lineTo(bx,H); ctx.stroke();
    // Reflexo branco
    ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=.8;
    ctx.beginPath(); ctx.moveTo(VP_X,VP_Y); ctx.lineTo(bx+1.5,H); ctx.stroke();
  });

  // Glow no chão (base dos trilhos)
  const fg=ctx.createLinearGradient(LANE_X[0]-44,0,LANE_X[2]+44,0);
  fg.addColorStop(0,'rgba(100,70,200,0)'); fg.addColorStop(.5,'rgba(130,100,255,.14)'); fg.addColorStop(1,'rgba(100,70,200,0)');
  ctx.fillStyle=fg; ctx.fillRect(LANE_X[0]-44, H-36, LANE_X[2]-LANE_X[0]+88, 36);

  // Linhas de velocidade no turbo
  if(P.turbo>0){
    ctx.save(); ctx.globalAlpha=.17; ctx.strokeStyle='#00E5FF'; ctx.lineWidth=2;
    for(let i=0;i<6;i++){
      const sx=14+i*55, sy=((i*80+frame*(baseSpeed+2)*3)%(H+80))-40;
      ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy+58); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-sx,sy); ctx.lineTo(W-sx,sy+58); ctx.stroke();
    }
    ctx.restore();
  }
}

// ── DESENHO DOS OBSTÁCULOS (perspectiva real) ──────────────────────────────────
// Cada obstáculo tem y: posição atual descendo de VP_Y até BASE_Y+
// pScale(y) dá a escala: 0 no horizonte → ~0.8 no jogador → 1 no fundo
// pX(laneX, y) dá o x visual em perspectiva
function drawObstacle(o){
  const sc = pScale(o.y);
  if(sc < 0.04) return; // muito pequeno, não desenhar
  const visX = pX(o.laneX, o.y);

  // Fade-in suave quando aparece no horizonte
  const alpha = Math.min(1, sc * 8);

  const isClose = o.y > BASE_Y - 90 && frame%8<4;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(visX, o.y);
  ctx.scale(sc, sc);
  if(isClose){ ctx.shadowColor='#FF1744'; ctx.shadowBlur=32/sc; }

  const {kind,w,h,ca,cb} = o;
  if(kind==='train')        drawTrain(w,h,ca,cb);
  else if(kind==='sign')    drawSign(w,h,ca,cb);
  else if(kind==='barrier') drawBarrier(w,h,ca,cb);
  else if(kind==='overhead')drawOverhead(w,h,ca,cb);

  ctx.restore();
}

// Trem: desenhado de (0,0) na base das rodas, corpo vai de -h a 0
function drawTrain(w,h,ca,cb){
  // Sombra
  ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(-w/2+8,6-h,w,h);

  // Corpo com gradiente
  const bg=ctx.createLinearGradient(-w/2,-h,w/2,0);
  bg.addColorStop(0,cb); bg.addColorStop(.5,ca); bg.addColorStop(1,cb);
  ctx.beginPath(); rr(-w/2,-h,w,h,10); ctx.fillStyle=bg; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.8)'; ctx.lineWidth=2.5; ctx.stroke();

  // Destaque topo (reflexo)
  ctx.save(); ctx.clip();
  ctx.fillStyle='rgba(255,255,255,.1)'; ctx.fillRect(-w/2,-h,w,h*.22); ctx.restore();

  // Parabrisa (vidro)
  const gg=ctx.createLinearGradient(0,-h+h*.06,0,-h+h*.32);
  gg.addColorStop(0,'rgba(160,230,255,.92)'); gg.addColorStop(1,'rgba(60,120,200,.72)');
  ctx.beginPath(); rr(-w/2+12,-h+h*.06,w-24,h*.26,4); ctx.fillStyle=gg; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(-w/2+16,-h+h*.09,(w-32)*.42,5);

  // Faixa central
  ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(-w/2,-h+h*.35,w,4);

  // Faróis com glow
  [[-w/2+14,-h+h*.68],[w/2-14,-h+h*.68]].forEach(([hx,hy])=>{
    const hg=ctx.createRadialGradient(hx,hy,0,hx,hy,17);
    hg.addColorStop(0,'rgba(255,250,180,1)'); hg.addColorStop(.45,'rgba(255,215,0,.3)'); hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(hx,hy,17,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FFFDE7'; ctx.beginPath(); ctx.arc(hx,hy,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(hx+1.5,hy-1.5,2,0,Math.PI*2); ctx.fill();
  });

  // Grelha frontal
  ctx.beginPath(); rr(-w/2+10,-h+h*.75,w-20,h*.16,3); ctx.fillStyle=cb; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1; ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.lineWidth=1;
  for(let i=1;i<5;i++){ const gx=-w/2+10+(w-20)*i/5; ctx.beginPath(); ctx.moveTo(gx,-h+h*.75); ctx.lineTo(gx,-h+h*.91); ctx.stroke(); }

  // Rodas com raios animados
  ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=5;
  [-w/2+16,w/2-16].forEach(wx=>{
    ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.arc(wx,-2,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(wx,-2,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.beginPath(); ctx.arc(wx,-2,2.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#666'; ctx.lineWidth=1.5;
    for(let a=0;a<3;a++){ const ang=a*Math.PI/3+frame*.06; ctx.beginPath(); ctx.moveTo(wx,-2); ctx.lineTo(wx+Math.cos(ang)*6,-2+Math.sin(ang)*6); ctx.stroke(); }
  });
  ctx.shadowBlur=0;
}

function drawSign(w,h,ca,cb){
  ctx.strokeStyle='#555'; ctx.lineWidth=2;
  [-w/2+12,w/2-12].forEach(cx=>{ ctx.beginPath(); ctx.moveTo(cx,-h*3); ctx.lineTo(cx,-h/2); ctx.stroke(); });
  const sg=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);
  sg.addColorStop(0,ca); sg.addColorStop(1,cb);
  ctx.beginPath(); rr(-w/2,-h/2,w,h,6); ctx.fillStyle=sg; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.22)'; ctx.fillRect(-w/2+5,-h/2+4,w-10,6);
  ctx.fillStyle='rgba(255,255,255,.95)';
  ctx.font=`bold ${Math.round(h*.85)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('▼',0,2);
}

function drawBarrier(w,h,ca,cb){
  [-w/2+6,w/2-6].forEach(px=>{
    ctx.fillStyle='#777'; ctx.fillRect(px-4,-h-20,8,h*2+22);
    ctx.fillStyle='rgba(255,80,30,.9)'; ctx.beginPath(); ctx.arc(px,-h-20,5,0,Math.PI*2); ctx.fill();
  });
  const bg=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);
  bg.addColorStop(0,ca); bg.addColorStop(.5,cb); bg.addColorStop(1,ca);
  ctx.beginPath(); rr(-w/2,-h/2,w,h,4); ctx.fillStyle=bg; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=2; ctx.stroke();
  ctx.save(); ctx.clip(); ctx.fillStyle='rgba(255,255,255,.2)';
  for(let i=0;i<9;i++) ctx.fillRect(-w/2+i*34,-h/2,16,h); ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.28)'; ctx.fillRect(-w/2+6,-h/2+3,w-12,4);
  ctx.fillStyle='rgba(255,255,255,.9)';
  ctx.font=`bold ${Math.round(h*1.15)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('▲',-w/4,0); ctx.fillText('▲',w/4,0);
}

function drawOverhead(w,h,ca,cb){
  ctx.fillStyle='#555'; ctx.fillRect(-w/2,-h*.5-26,8,28); ctx.fillRect(w/2-8,-h*.5-26,8,28);
  const pg=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);
  pg.addColorStop(0,ca); pg.addColorStop(.5,cb); pg.addColorStop(1,ca);
  ctx.beginPath(); rr(-w/2,-h/2,w,h,4); ctx.fillStyle=pg; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=2; ctx.stroke();
  ctx.save(); ctx.clip(); ctx.fillStyle='rgba(150,180,255,.15)';
  for(let i=0;i<6;i++) ctx.fillRect(-w/2+i*50,-h/2,24,h); ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.28)'; ctx.fillRect(-w/2+8,-h/2+3,w-16,4);
  ctx.fillStyle='rgba(255,255,255,.9)';
  ctx.font=`bold ${Math.round(h*1.25)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('▼',-w/4,0); ctx.fillText('▼',w/4,0);
}

// ── CARD COLETÁVEL ─────────────────────────────────────────────────────────────
function drawCard(c){
  const sc = pScale(c.y);
  if(sc < 0.05) return;
  const visX = pX(c.laneX, c.y);
  const r = 12 * sc;
  const d = CARDS[c.ck];
  const bob = Math.sin(frame*.15+c.laneX*.04)*3*sc;
  ctx.save(); ctx.globalAlpha=Math.min(1,sc*8); ctx.translate(0,bob);
  ctx.shadowColor=d.col; ctx.shadowBlur=14;
  ctx.fillStyle=d.col; ctx.beginPath(); ctx.arc(visX,c.y,r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.lineWidth=1.5*sc; ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(visX-r*.3,c.y-r*.3,r*.38,r*.24,-.4,0,Math.PI*2); ctx.fill();
  if(sc>0.25){
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.font=`bold ${Math.round(11*sc)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(d.glyph,visX,c.y+.5);
  }
  ctx.restore();
}

// ── PERSONAGEM (visto de costas) ───────────────────────────────────────────────
function drawPlayer(){
  const{x,y,h,jumpH,crouching,turbo}=P;
  const ry=y-jumpH;
  const bounce=jumpH<2?Math.sin(frame*.35)*1.8:0;
  const leg=Math.sin(frame*.42);
  const ch=crouching?h*.48:h;

  // Sombra no chão
  if(jumpH>5){
    const sc=Math.max(.15,1-jumpH/155);
    ctx.save(); ctx.globalAlpha=.28*sc; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(x,y+12,P.w*.55*sc,7*sc,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  // Anel magnético
  if(P.magnet>0&&frame%26<13){
    ctx.save(); ctx.globalAlpha=.2; ctx.strokeStyle='#FFD700'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(x,ry-ch/2,82+frame%14,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }

  ctx.save(); ctx.translate(x, ry+bounce);
  const jc = turbo>0?'#00C853':'#FF5722';
  function fill(fc,sw=1.8){ ctx.fillStyle=fc; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,.65)'; ctx.lineWidth=sw; ctx.stroke(); }

  if(!crouching){
    const lA=leg*.36;
    // Pernas alternando
    ctx.save(); ctx.translate(-8,0); ctx.rotate(-lA); ctx.beginPath(); ctx.rect(-5.5,-26,11,26); fill('#1565C0'); ctx.restore();
    ctx.save(); ctx.translate(8,0);  ctx.rotate(lA);  ctx.beginPath(); ctx.rect(-5.5,-26,11,26); fill('#1565C0'); ctx.restore();
    // Tênis
    ctx.save(); ctx.translate(-8+lA*10,0); ctx.beginPath(); rr(-9,-5,20,9,3); fill('#212121',1);
    ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(-7,-1,13,2); ctx.restore();
    ctx.save(); ctx.translate(8-lA*10,0);  ctx.beginPath(); rr(-11,-5,20,9,3); fill('#212121',1);
    ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(-9,-1,13,2); ctx.restore();
    // Braços
    ctx.save(); ctx.translate(-17,-36); ctx.rotate(lA*.42); ctx.beginPath(); ctx.rect(-4.5,0,9,20); fill(jc,1.5); ctx.restore();
    ctx.save(); ctx.translate(17,-36);  ctx.rotate(-lA*.42); ctx.beginPath(); ctx.rect(-4.5,0,9,20); fill(jc,1.5); ctx.restore();
    // Mãos
    ctx.fillStyle='#FFCC80'; ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(-16+lA*6,-18,4.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(16-lA*6,-18,4.5,0,Math.PI*2);  ctx.fill(); ctx.stroke();
    // Corpo (costas da jaqueta)
    ctx.beginPath(); rr(-14,-ch*.54,28,ch*.48,7); fill(jc,2);
    ctx.fillStyle='rgba(0,0,0,.14)'; ctx.fillRect(-2,-ch*.52,4,ch*.44);
    ctx.fillStyle='rgba(255,255,255,.48)'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('11',0,-ch*.26);
    // Cabeça
    ctx.beginPath(); ctx.arc(0,-ch*.72,13,0,Math.PI*2); fill('#FFCC80',1.5);
    ctx.fillStyle='#3e2000'; ctx.beginPath(); ctx.arc(0,-ch*.72,13,-.15,Math.PI+.15,false); ctx.fill();
    // Boné de costas
    ctx.beginPath(); rr(-16,-ch*.78-9,32,9,3); fill('#fff',1.5);
    ctx.beginPath(); ctx.arc(0,-ch*.78-9,14,Math.PI,0); fill('#fff',1.5);
    ctx.fillStyle='#F44336'; ctx.fillRect(-13,-ch*.78-4,26,4);
    ctx.fillStyle='#ccc'; ctx.beginPath(); ctx.arc(0,-ch*.78-23,3,0,Math.PI*2); ctx.fill();
  } else {
    // Agachado
    ctx.beginPath(); ctx.rect(-12,-14,10,14); fill('#1565C0');
    ctx.beginPath(); ctx.rect(2,-14,10,14);   fill('#1565C0');
    ctx.beginPath(); rr(-14,0,14,8,2); fill('#212121',1);
    ctx.beginPath(); rr(0,0,14,8,2);   fill('#212121',1);
    ctx.beginPath(); rr(-15,-26,30,20,5); fill(jc,2);
    ctx.fillStyle='rgba(0,0,0,.14)'; ctx.fillRect(-2,-24,4,18);
    ctx.beginPath(); ctx.arc(0,-32,10,0,Math.PI*2); fill('#FFCC80',1.5);
    ctx.fillStyle='#3e2000'; ctx.beginPath(); ctx.arc(0,-32,10,-.15,Math.PI+.15,false); ctx.fill();
    ctx.beginPath(); rr(-13,-38,26,7,3); fill('#fff',1.5);
    ctx.beginPath(); ctx.arc(0,-38,11,Math.PI,0); fill('#fff',1.5);
    ctx.fillStyle='#F44336'; ctx.fillRect(-11,-35,22,3);
  }
  ctx.restore();
}

// ── AVISOS (setas próximas ao jogador) ────────────────────────────────────────
function drawWarnings(){
  obstacles.forEach(o=>{
    if(o.y < BASE_Y-130) return;
    if(o.lane!==-1 && o.lane!==P.lane) return;
    const t = Math.max(0,(o.y-(BASE_Y-130))/130);
    const pulse = .5+.5*Math.abs(Math.sin(frame*.28));
    ctx.save(); ctx.globalAlpha=t*pulse;
    if(o.layer==='ground' && P.jumpH<JMP_CLR){
      ctx.shadowColor='#FF1744'; ctx.shadowBlur=18; ctx.fillStyle='#FF1744';
      const ay=P.y+28;
      ctx.beginPath(); ctx.moveTo(P.x,ay-24); ctx.lineTo(P.x-16,ay); ctx.lineTo(P.x+16,ay); ctx.closePath(); ctx.fill();
    } else if(o.layer==='air' && !P.crouching && P.jumpH<80){
      ctx.shadowColor='#00E5FF'; ctx.shadowBlur=18; ctx.fillStyle='#00E5FF';
      const ay=P.y-P.h-50;
      ctx.beginPath(); ctx.moveTo(P.x,ay+24); ctx.lineTo(P.x-16,ay); ctx.lineTo(P.x+16,ay); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur=0; ctx.restore();
  });
}

// ── INDICADOR DE FAIXA ─────────────────────────────────────────────────────────
function drawLaneIndicator(){
  const lx=LANE_X[P.lane], iy=BASE_Y+22;
  ctx.save(); ctx.globalAlpha=.38+Math.sin(frame*.22)*.2;
  ctx.shadowColor='#E040FB'; ctx.shadowBlur=14; ctx.fillStyle='#E040FB';
  ctx.beginPath(); ctx.moveTo(lx,iy); ctx.lineTo(lx-12,iy+16); ctx.lineTo(lx+12,iy+16); ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0; ctx.restore();
}

// ── PARTÍCULAS & POPUPS ────────────────────────────────────────────────────────
function drawParticle(p){
  ctx.save(); ctx.globalAlpha=p.life; ctx.shadowColor=p.col; ctx.shadowBlur=8;
  ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*Math.max(.15,p.life),0,Math.PI*2); ctx.fill(); ctx.restore();
}
function drawPopup(p){
  ctx.save(); ctx.globalAlpha=p.life; ctx.font='bold 18px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor=p.col; ctx.shadowBlur=10;
  ctx.strokeStyle='rgba(0,0,0,.8)'; ctx.lineWidth=3; ctx.strokeText(p.text,p.x,p.y);
  ctx.fillStyle=p.col; ctx.fillText(p.text,p.x,p.y); ctx.restore();
}

// ── TELA INICIAL ────────────────────────────────────────────────────────────────
function drawStart(){
  drawBg();
  ctx.fillStyle='rgba(8,4,22,.78)'; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(12,8,32,.97)'; ctx.beginPath(); rr(16,90,W-32,420,22); ctx.fill();
  const pb=ctx.createLinearGradient(16,90,W-16,510);
  pb.addColorStop(0,'#7c4dff'); pb.addColorStop(.5,'#ff4081'); pb.addColorStop(1,'#ff6d00');
  ctx.strokeStyle=pb; ctx.lineWidth=2.5; ctx.stroke();
  ctx.shadowColor='#ff4081'; ctx.shadowBlur=18;
  ctx.font='bold 31px sans-serif';
  ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=5; ctx.strokeText('Corrida do Aloncinho',W/2,140);
  ctx.fillStyle='#fff'; ctx.fillText('Corrida do Aloncinho',W/2,140); ctx.shadowBlur=0;
  ctx.font='11px sans-serif'; ctx.fillStyle='rgba(200,180,255,.72)';
  ctx.fillText('Desvie dos trens — colete estrelas — sobreviva!',W/2,164);
  const guide=[
    {icon:'🚆',bg:'rgba(229,57,53,.2)', bc:'#e53935',tip:'Trem no trilho',  hint:'⬆ PULE'},
    {icon:'▼', bg:'rgba(0,188,212,.2)', bc:'#00bcd4',tip:'Placa suspensa',  hint:'⬇ AGACHE'},
    {icon:'🚧',bg:'rgba(255,111,0,.2)', bc:'#ff6f00',tip:'Barreira (3 faixas)',hint:'⬆ PULE'},
    {icon:'╌', bg:'rgba(92,107,192,.2)',bc:'#5c6bc0',tip:'Tubo aéreo (3 faixas)',hint:'⬇ AGACHE'},
  ];
  guide.forEach((g,i)=>{
    const gy=192+i*44;
    ctx.fillStyle=g.bg; ctx.beginPath(); rr(28,gy-14,W-56,30,8); ctx.fill();
    ctx.strokeStyle=g.bc; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font='13px sans-serif'; ctx.textAlign='left'; ctx.fillText(`${g.icon}  ${g.tip}`,38,gy+2);
    ctx.fillStyle=g.bc; ctx.font='bold 13px sans-serif'; ctx.textAlign='right'; ctx.fillText(g.hint,W-36,gy+2);
  });
  ctx.textAlign='center';
  ctx.fillStyle='rgba(180,160,255,.45)'; ctx.font='11px sans-serif'; ctx.fillText('← → faixa  ·  ↑/Espaço pular  ·  ↓ agachar',W/2,384);
  if(best>0){ ctx.fillStyle='#FFD700'; ctx.font='bold 14px sans-serif'; ctx.fillText(`🏆 Recorde: ${best}`,W/2,406); }
  const bt=ctx.createLinearGradient(W/2-110,418,W/2+110,468);
  bt.addColorStop(0,'#7c4dff'); bt.addColorStop(1,'#ff4081');
  ctx.fillStyle=bt; ctx.beginPath(); rr(W/2-110,418,220,50,25); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 19px sans-serif'; ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=4;
  ctx.fillText('▶  JOGAR AGORA',W/2,443); ctx.shadowBlur=0; ctx.restore();
}

// ── GAME OVER ──────────────────────────────────────────────────────────────────
function drawDead(){
  ctx.save(); ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(10,5,30,.97)'; ctx.beginPath(); rr(24,H/2-160,W-48,320,22); ctx.fill();
  const pb=ctx.createLinearGradient(24,H/2-160,W-24,H/2+160);
  pb.addColorStop(0,'#ef5350'); pb.addColorStop(1,'#7c4dff'); ctx.strokeStyle=pb; ctx.lineWidth=2.5; ctx.stroke();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='#ef5350'; ctx.shadowBlur=18; ctx.font='bold 38px sans-serif';
  ctx.strokeStyle='rgba(0,0,0,.9)'; ctx.lineWidth=6; ctx.strokeText('GAME OVER',W/2,H/2-110);
  ctx.fillStyle='#ff5252'; ctx.fillText('GAME OVER',W/2,H/2-110); ctx.shadowBlur=0;
  ctx.font='bold 26px sans-serif';
  ctx.strokeStyle='rgba(0,0,0,.6)'; ctx.lineWidth=4; ctx.strokeText(`${Math.floor(score)} pts`,W/2,H/2-60);
  ctx.fillStyle='#fff'; ctx.fillText(`${Math.floor(score)} pts`,W/2,H/2-60);
  ctx.fillStyle='#FFD700'; ctx.font='16px sans-serif'; ctx.fillText(`🏆 Recorde: ${best}`,W/2,H/2-22);
  if(score>0&&Math.floor(score)>=best){ ctx.fillStyle='#00E5FF'; ctx.font='bold 14px sans-serif'; ctx.fillText('★ Novo recorde! ★',W/2,H/2+6); }
  const bg2=ctx.createLinearGradient(W/2-108,H/2+50,W/2+108,H/2+98);
  bg2.addColorStop(0,'#00bcd4'); bg2.addColorStop(1,'#7c4dff');
  ctx.fillStyle=bg2; ctx.beginPath(); rr(W/2-108,H/2+50,216,50,25); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 18px sans-serif'; ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=4;
  ctx.fillText('↻  TENTAR DE NOVO',W/2,H/2+75); ctx.shadowBlur=0; ctx.restore();
}

// ── HUD & POWERS ──────────────────────────────────────────────────────────────
function updateHUD(){
  if(scoreEl) scoreEl.textContent=Math.floor(score);
  if(bestEl)  bestEl.textContent=best;
  const lv=Math.min(9,Math.ceil((baseSpeed-3.2)/.38)+1);
  if(speedEl) speedEl.textContent=`${lv}×`;
}
function updatePowers(){
  if(!powersEl) return;
  const c=[];
  if(P.magnet>0) c.push({label:'🧲 Ímã', col:'#FFD700',pct:P.magnet/360});
  if(P.turbo >0) c.push({label:'⚡ Turbo',col:'#00E5FF',pct:P.turbo/240});
  powersEl.innerHTML=c.map(e=>`<div class="runner-power-chip"><span>${e.label}</span>
    <div class="runner-chip-bar-bg"><div class="runner-chip-bar" style="width:${Math.min(100,Math.round(e.pct*100))}%;background:${e.col}"></div></div></div>`).join('');
}

// ── LOOP PRINCIPAL ─────────────────────────────────────────────────────────────
function loop(){
  requestAnimationFrame(loop);
  ctx.clearRect(0,0,W,H);
  if(state==='start'){ drawStart(); return; }
  drawBg();
  if(state==='dead'){
    obstacles.forEach(drawObstacle); cards.forEach(drawCard);
    parts.forEach(drawParticle); drawPlayer(); drawDead(); return;
  }

  frame++;
  const spd = baseSpeed + (P.turbo>0?2:0);
  if(frame%600===0) baseSpeed=Math.min(baseSpeed+.38,8.6);
  score += spd*.055;
  if(Math.floor(score)>best){ best=Math.floor(score); localStorage.setItem('runner-best',best); }

  // Física
  if(P.jumpH>0||P.jumpVY>0){ P.jumpVY-=GRAV; P.jumpH=Math.max(0,P.jumpH+P.jumpVY); if(P.jumpH===0)P.jumpVY=0; }
  if(P.turbo >0) P.turbo--;
  if(P.magnet>0) P.magnet--;
  P.x += (P.targetX-P.x)*.22;

  // Spawn
  const oRate=Math.max(55,130-Math.floor(baseSpeed*9));
  if(frame%oRate===0) spawnObstacle();
  const cRate=Math.max(28,70-Math.floor(baseSpeed*5));
  if(frame%cRate===0) spawnCard();

  // Atualizar obstáculos
  let died=false;
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i]; o.y+=spd;
    if(o.y>H+40){ obstacles.splice(i,1); continue; }
    if(kills(o)){ died=true; break; }
  }
  // Atualizar cards
  for(let i=cards.length-1;i>=0;i--){
    const c=cards[i]; c.y+=spd;
    if(P.magnet>0){
      const visX=pX(c.laneX,c.y), dx=P.x-visX, dy=(P.y-P.jumpH)-c.y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<130&&d>1){ c.laneX+=dx/d*4/Math.max(.05,pScale(c.y)); c.y+=dy/d*4; }
    }
    if(c.y>H+20){ cards.splice(i,1); continue; }
    const visX=pX(c.laneX,c.y), sc=pScale(c.y), r=12*sc;
    const pY=P.y-P.jumpH;
    if(Math.abs(P.x-visX)<P.w*.6 && Math.abs(pY-c.y)<(P.crouching?P.h*.48:P.h*.65)+r){ collectCard(c); cards.splice(i,1); }
  }
  // Partículas
  for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=.16; p.life-=p.dec; if(p.life<=0)parts.splice(i,1); }
  for(let i=popups.length-1;i>=0;i--){ const p=popups[i]; p.y-=1.9; p.life-=.025; if(p.life<=0)popups.splice(i,1); }

  // Desenhar (back-to-front: objetos mais longe primeiro)
  const sorted=[...obstacles].sort((a,b)=>a.y-b.y);
  sorted.forEach(drawObstacle);
  [...cards].sort((a,b)=>a.y-b.y).forEach(drawCard);
  parts.forEach(drawParticle);
  drawLaneIndicator();
  drawWarnings();
  drawPlayer();
  popups.forEach(drawPopup);

  if(died) state='dead';
  if(frame%4===0){ updateHUD(); updatePowers(); }
}

if(bestEl) bestEl.textContent=best;
loop();
