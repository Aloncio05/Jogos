const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "docs", "runner-design.pdf");

const W = 595;
const H = 842;
const margin = 42;

function esc(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

class Page {
  constructor(title) {
    this.parts = [];
    this.title = title;
    this.bg();
  }

  raw(value) {
    this.parts.push(value);
  }

  bg() {
    this.rect(0, 0, W, H, "#d88835");
    this.rect(0, H * 0.48, W, H * 0.52, "#78d8ff");
    this.circle(82, 760, 76, "#fff495");
    this.circle(510, 720, 124, "#ffd75d");
    for (let x = 0; x <= W; x += 36) this.line(x, 0, x, H, "#ffffff", 0.18);
    for (let y = 0; y <= H; y += 36) this.line(0, y, W, y, "#ffffff", 0.18);
  }

  rect(x, y, w, h, color, stroke) {
    const [r, g, b] = hexToRgb(color);
    this.raw(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x} ${y} ${w} ${h} re f`);
    if (stroke) {
      const [sr, sg, sb] = hexToRgb(stroke);
      this.raw(`${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG ${x} ${y} ${w} ${h} re S`);
    }
  }

  poly(points, color, stroke) {
    const [r, g, b] = hexToRgb(color);
    const start = points[0];
    const lines = points.slice(1).map(([x, y]) => `${x} ${y} l`).join(" ");
    this.raw(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${start[0]} ${start[1]} m ${lines} h f`);
    if (stroke) {
      const [sr, sg, sb] = hexToRgb(stroke);
      this.raw(`${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG ${start[0]} ${start[1]} m ${lines} h S`);
    }
  }

  line(x1, y1, x2, y2, color = "#ffffff", width = 1) {
    const [r, g, b] = hexToRgb(color);
    this.raw(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  circle(cx, cy, radius, color) {
    const [r, g, b] = hexToRgb(color);
    const c = radius * 0.5522847498;
    this.raw(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${cx + radius} ${cy} m ${cx + radius} ${cy + c} ${cx + c} ${cy + radius} ${cx} ${cy + radius} c ${cx - c} ${cy + radius} ${cx - radius} ${cy + c} ${cx - radius} ${cy} c ${cx - radius} ${cy - c} ${cx - c} ${cy - radius} ${cx} ${cy - radius} c ${cx + c} ${cy - radius} ${cx + radius} ${cy - c} ${cx + radius} ${cy} c f`);
  }

  text(text, x, y, size = 12, color = "#ffffff", font = "F1") {
    const [r, g, b] = hexToRgb(color);
    this.raw(`BT /${font} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x} ${y} Td (${esc(text)}) Tj ET`);
  }

  wrap(text, x, y, maxChars, size = 12, color = "#dce8ff", leading = 16) {
    const words = String(text).split(/\s+/);
    let line = "";
    let cy = y;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        this.text(line, x, cy, size, color);
        cy -= leading;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) this.text(line, x, cy, size, color);
    return cy - leading;
  }

  titleBlock(title, subtitle) {
    this.text("GAME DESIGN DOCUMENT", margin, 790, 10, "#9df7ff", "F2");
    this.text(title, margin, 748, 38, "#ffffff", "F2");
    this.wrap(subtitle, margin, 718, 62, 14, "#f7fbff", 19);
  }

  panel(x, y, w, h, title, body, accent = "#ffd940") {
    this.rect(x, y, w, h, "#111936", "#354268");
    this.rect(x, y + h - 8, w, 8, accent);
    this.text(title, x + 14, y + h - 30, 15, "#ffffff", "F2");
    this.wrap(body, x + 14, y + h - 52, Math.floor((w - 28) / 6.2), 10.8, "#dce8ff", 14);
  }

  footer(pageNumber, label) {
    this.text(`Pagina ${pageNumber}`, margin, 24, 9, "#8b96bd");
    this.text(label, W - margin - 150, 24, 9, "#8b96bd");
  }

  lanePreview(x, y, w, h) {
    this.rect(x, y, w, h, "#d88835", "#8f521f");
    this.line(x + w * 0.24, y, x + w * 0.43, y + h, "#303744", 3);
    this.line(x + w * 0.42, y, x + w * 0.49, y + h, "#303744", 3);
    this.line(x + w * 0.58, y, x + w * 0.51, y + h, "#303744", 3);
    this.line(x + w * 0.76, y, x + w * 0.57, y + h, "#303744", 3);
    for (let yy = y + 8; yy < y + h; yy += 13) this.line(x + 8, yy, x + w - 8, yy, "#7a431a", 1.2);
  }
}

function addCover() {
  const p = new Page("cover");
  p.titleBlock("Corrida do Aloncinho", "Runner infinito inspirado em Subway Surfers: trilhos de trem, cidade colorida, moedas douradas, pulo, deslize e movimento lateral rapido.");
  p.rect(330, 120, 188, 520, "#050816", "#53608c");
  p.rect(344, 136, 160, 488, "#78d8ff");
  p.circle(368, 592, 18, "#fff495");
  p.rect(344, 452, 160, 82, "#ffd75d");
  p.rect(344, 452, 44, 102, "#ff354f");
  p.rect(388, 468, 38, 86, "#14a2e8");
  p.rect(426, 452, 38, 112, "#ffd940");
  p.rect(464, 462, 40, 92, "#13c46b");
  p.rect(344, 136, 160, 316, "#d88835");
  p.poly([[382, 452], [466, 452], [504, 136], [344, 136]], "#c4772b", "#8f521f");
  for (let yy = 154; yy < 438; yy += 34) p.line(350, yy, 498, yy + 6, "#7a431a", 2);
  p.line(382, 136, 410, 452, "#303744", 5);
  p.line(414, 136, 421, 452, "#303744", 5);
  p.line(456, 136, 427, 452, "#303744", 5);
  p.line(490, 136, 438, 452, "#303744", 5);
  p.rect(430, 356, 50, 86, "#f13a32", "#11172d");
  p.rect(436, 412, 38, 20, "#dff9ff", "#11172d");
  p.rect(440, 368, 10, 12, "#ffd940", "#11172d");
  p.rect(460, 368, 10, 12, "#ffd940", "#11172d");
  p.circle(426, 330, 12, "#ffd940");
  p.circle(414, 286, 12, "#ffd940");
  p.circle(432, 248, 12, "#ffd940");
  p.circle(420, 214, 12, "#ffd940");
  p.circle(424, 224, 18, "#ffbd83");
  p.rect(407, 184, 34, 42, "#f7f0df", "#11172d");
  p.rect(404, 154, 12, 34, "#50b7ff", "#11172d");
  p.rect(432, 154, 12, 34, "#50b7ff", "#11172d");
  p.panel(margin, 450, 236, 96, "Genero", "Corrida infinita arcade para navegador e celular. Partidas curtas, facil de aprender e dificil de dominar.", "#00e0ff");
  p.panel(margin, 330, 236, 96, "Controles", "Esquerda, direita, pular e abaixar. No celular, usar gestos de arrastar nas quatro direcoes.", "#ffd940");
  p.panel(margin, 210, 236, 96, "Objetivo", "Sobreviver, coletar moedas, completar missoes e superar o recorde pessoal.", "#20d67b");
  p.footer(1, "Capa");
  return p;
}

function addVision() {
  const p = new Page("vision");
  p.titleBlock("Visao do Jogo", "A experiencia deve passar velocidade, sol, cor e reflexo. O jogador entende tudo olhando os trilhos por menos de um segundo.");
  p.panel(margin, 552, 245, 118, "Fantasia", "Correr por trilhos em uma cidade ensolarada desviando de trens, cones, buracos e placas enquanto coleta moedas.", "#ffd940");
  p.panel(308, 552, 245, 118, "Publico", "Jogadores casuais que gostam de Subway Surfers, controles simples, partidas rapidas e progressao por skins.", "#00e0ff");
  const steps = ["Jogar", "Desviar", "Coletar", "Usar poder", "Recorde"];
  steps.forEach((s, i) => {
    const x = margin + i * 102;
    p.rect(x, 388, 86, 96, "#111936", "#354268");
    p.circle(x + 43, 450, 18, "#ffd940");
    p.text(String(i + 1), x + 38, 444, 16, "#111936", "F2");
    p.text(s, x + 14, 410, 13, "#ffffff", "F2");
  });
  p.text("Loop principal", margin, 504, 22, "#ffffff", "F2");
  p.panel(margin, 210, 160, 110, "Camera", "Pseudo-3D vertical com pista afunilando para o horizonte.", "#7b68ee");
  p.panel(218, 210, 160, 110, "Ritmo", "Velocidade aumenta aos poucos, com respiros entre sequencias dificeis.", "#ff3b4f");
  p.panel(394, 210, 160, 110, "Feedback", "Coleta brilha, batida treme, pulo tem sombra e deslize baixa o corpo.", "#20d67b");
  p.footer(2, "Visao e loop");
  return p;
}

function addControls() {
  const p = new Page("controls");
  p.titleBlock("Controles", "Quatro acoes simples: ir para esquerda, ir para direita, pular e abaixar. O mesmo desenho funciona no teclado e no toque.");
  const cx = 92;
  const cy = 394;
  p.rect(cx + 92, cy + 92, 84, 64, "#f8fbff", "#6f7899");
  p.rect(cx, cy, 84, 64, "#f8fbff", "#6f7899");
  p.rect(cx + 184, cy, 84, 64, "#f8fbff", "#6f7899");
  p.rect(cx + 92, cy - 92, 84, 64, "#f8fbff", "#6f7899");
  p.text("PULAR", cx + 109, cy + 116, 12, "#111936", "F2");
  p.text("ESQ", cx + 24, cy + 24, 12, "#111936", "F2");
  p.text("DIR", cx + 211, cy + 24, 12, "#111936", "F2");
  p.text("ABAIXAR", cx + 107, cy - 68, 12, "#111936", "F2");
  p.panel(350, 510, 190, 72, "Esquerda", "Muda uma pista para a esquerda. Se ja estiver na borda, permanece nela.", "#00e0ff");
  p.panel(350, 420, 190, 72, "Direita", "Muda uma pista para a direita. Deve ser responsivo e sem atraso.", "#00e0ff");
  p.panel(350, 330, 190, 72, "Pular", "Evita buracos, cones baixos e barreiras pequenas.", "#ffd940");
  p.panel(350, 240, 190, 72, "Abaixar", "Desliza por baixo de placas e obstaculos suspensos.", "#ff3b4f");
  p.panel(margin, 160, 500, 64, "No celular", "Usar swipe: arrastar para esquerda, direita, cima ou baixo. Botoes visuais podem aparecer so no tutorial.", "#20d67b");
  p.footer(3, "Mapa de controles");
  return p;
}

function addObstacles() {
  const p = new Page("obstacles");
  p.titleBlock("Obstaculos", "Cada obstaculo tem leitura visual propria e uma resposta esperada. O jogo nunca deve bloquear todas as opcoes ao mesmo tempo.");
  const cards = [
    ["Caixa vermelha", "Desviar ou pular. Obstaculo basico para ensinar movimento lateral.", "#ff3b4f"],
    ["Barreira baixa", "Pular. Boa para sequencias rapidas no meio da pista.", "#ffd940"],
    ["Buraco", "Pular ou trocar de pista. Cria tensao sem poluir a tela.", "#050816"],
    ["Trem vindo", "Trocar de pista. Grande, vermelho e azul, parecido com a referencia.", "#f13a32"],
    ["Cones", "Desviar ou pular. Podem aparecer em pequenos grupos.", "#ff8a00"],
    ["Placa suspensa", "Abaixar. Forca o uso do deslize.", "#00e0ff"],
  ];
  cards.forEach((card, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * 171;
    const y = 382 - row * 190;
    p.rect(x, y, 154, 154, "#111936", "#354268");
    p.lanePreview(x + 14, y + 78, 126, 48);
    p.rect(x + 58, y + 93, 38, 24, card[2], "#11172d");
    p.text(card[0], x + 12, y + 54, 13, "#ffffff", "F2");
    p.wrap(card[1], x + 12, y + 36, 22, 9.5, "#dce8ff", 12);
  });
  p.panel(margin, 110, 500, 70, "Regra de justica", "Sempre deixar uma solucao clara: trocar de pista, pular ou abaixar. Dificuldade vem da velocidade e da combinacao, nao de armadilha impossivel.", "#20d67b");
  p.footer(4, "Obstaculos principais");
  return p;
}

function addProgression() {
  const p = new Page("progression");
  p.titleBlock("Power-ups e Progressao", "Recompensas deixam a corrida mais viciante: moedas, missoes, poderes e skins desbloqueaveis.");
  const powers = [
    ["Escudo", "Protege contra uma batida. Visual de bolha azul.", "#00e0ff"],
    ["Ima", "Puxa moedas proximas por alguns segundos.", "#ffd940"],
    ["Turbo", "Aumenta velocidade e pontuacao temporariamente.", "#ff3b4f"],
    ["Prancha", "Da segunda chance ao bater, estilo hoverboard.", "#7b68ee"],
  ];
  powers.forEach((power, i) => {
    const x = margin + i * 128;
    p.circle(x + 48, 558, 28, power[2]);
    p.panel(x, 392, 104, 126, power[0], power[1], power[2]);
  });
  p.panel(margin, 275, 154, 82, "Distancia", "+1 ponto por metro virtual percorrido.", "#00e0ff");
  p.panel(220, 275, 154, 82, "Moedas", "+10 pontos por moeda coletada.", "#ffd940");
  p.panel(398, 275, 154, 82, "Combo", "Sem bater aumenta multiplicador ate x5.", "#20d67b");
  p.panel(margin, 150, 154, 82, "Missao 1", "Colete 50 moedas em uma corrida.", "#ffd940");
  p.panel(220, 150, 154, 82, "Missao 2", "Desvie de 25 obstaculos sem bater.", "#00e0ff");
  p.panel(398, 150, 154, 82, "Missao 3", "Fique 90 segundos vivo em alta velocidade.", "#ff3b4f");
  p.footer(5, "Recompensas");
  return p;
}

function addVisualAndPlan() {
  const p = new Page("visual-plan");
  p.titleBlock("Direcao Visual e Escopo", "Visual diurno, quente e colorido: ceu azul, trilhos escuros, terra laranja, muro amarelo, trem vermelho e moedas douradas.");
  const colors = ["#78d8ff", "#d88835", "#ffd940", "#f13a32", "#303744", "#20d67b"];
  colors.forEach((color, i) => {
    const x = margin + i * 84;
    p.rect(x, 560, 68, 80, color, "#ffffff");
    p.text(color, x + 6, 542, 8, "#dce8ff");
  });
  p.panel(margin, 400, 245, 108, "Versao 1 jogavel", "Tres pistas, esquerda/direita, pulo, abaixar, quatro obstaculos, colisao simples e pontuacao por tempo vivo.", "#ffd940");
  p.panel(308, 400, 245, 108, "Versao 2 polida", "Moedas, power-ups, loja de skins, missoes diarias, dificuldade progressiva e efeitos sonoros.", "#00e0ff");
  p.panel(margin, 260, 154, 92, "Tela menu", "Jogar, skins, missoes e recorde.", "#20d67b");
  p.panel(220, 260, 154, 92, "Tela corrida", "HUD grande, pista limpa e feedback de coleta.", "#ffd940");
  p.panel(398, 260, 154, 92, "Fim", "Pontuacao, moedas, novo recorde e jogar de novo.", "#ff3b4f");
  p.panel(margin, 120, 500, 90, "Nomes sugeridos", "Corrida do Aloncinho, Aloncinho Rush, Rua Neon ou Turbo Aloncinho. O nome mais amigavel para o projeto atual e Corrida do Aloncinho.", "#7b68ee");
  p.footer(6, "Visual e plano");
  return p;
}

function buildPdf(pages) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageRefs = [];
  const contents = [];

  pages.forEach((page) => {
    const stream = page.parts.join("\n");
    const contentRef = add(`<< /Length ${Buffer.byteLength(stream, "binary")} >>\nstream\n${stream}\nendstream`);
    contents.push(contentRef);
    pageRefs.push(null);
  });

  const pagesRef = objects.length + pages.length + 1;
  pages.forEach((_, index) => {
    const pageRef = add(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contents[index]} 0 R >>`);
    pageRefs[index] = pageRef;
  });

  const kids = pageRefs.map((ref) => `${ref} 0 R`).join(" ");
  const actualPagesRef = add(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  if (actualPagesRef !== pagesRef) throw new Error("PDF object order mismatch");
  const catalogRef = add(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "binary");
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "binary");
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const pages = [addCover(), addVision(), addControls(), addObstacles(), addProgression(), addVisualAndPlan()];
fs.writeFileSync(outPath, buildPdf(pages));
console.log(`PDF gerado: ${outPath}`);
