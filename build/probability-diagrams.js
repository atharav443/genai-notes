#!/usr/bin/env node
// Generate accessible standalone SVGs and inline the same assets in essay sources.
// Run this before build-essay.js. Marker blocks make repeated runs deterministic.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'probability');
fs.mkdirSync(OUT, { recursive: true });
const palette = {
  1: ['#1d4ed8', '#eff6ff'], 2: ['#0e7490', '#ecfeff'],
  3: ['#047857', '#ecfdf5'], 4: ['#4d7c0f', '#f7fee7'],
  5: ['#a21caf', '#fdf4ff'], 6: ['#b45309', '#fffbeb'],
  7: ['#57534e', '#f5f5f4']
};
const ink = '#202b3c', muted = '#526174', border = '#d8e0e8';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const txt = (x, y, s, size = 15, fill = ink, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`;
const rect = (x, y, w, h, fill = '#fff', stroke = border, r = 10) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const line = (x1, y1, x2, y2, stroke = border, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" ${extra.includes('stroke-width=') ? '' : 'stroke-width="1.5"'} ${extra}/>`;
const circle = (x, y, r, fill, stroke = fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const curve = (d, color, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" ${extra}/>`;
const arrow = (x1, y1, x2, y2, color = muted) => {
  const a = Math.atan2(y2-y1, x2-x1), len = 6;
  return line(x1,y1,x2,y2,color) + curve(`M${x2-len*Math.cos(a-.5)},${y2-len*Math.sin(a-.5)} L${x2},${y2} L${x2-len*Math.cos(a+.5)},${y2-len*Math.sin(a+.5)}`,color);
};
const center = 'text-anchor="middle"';
const bold = 'font-weight="650"';
function note(y, a, b, color, wash) {
  return rect(12,y,336,66,wash,'none') + txt(180,y+26,a,17,color,`${center} ${bold}`) + txt(180,y+49,b,14,muted,center);
}
const figs = [];
function figure(chapter, id, title, description, height, draw, caption) {
  const [color,wash] = palette[chapter];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="prob-diagram" width="360" height="${height}" viewBox="0 0 360 ${height}" role="img" aria-labelledby="${id}-title ${id}-desc" font-family="system-ui, -apple-system, sans-serif">\n<title id="${id}-title">${esc(title)}</title>\n<desc id="${id}-desc">${esc(description)}</desc>\n<rect width="360" height="${height}" fill="#fff"/>\n${txt(18,28,title,17,ink,bold)}\n${draw(color,wash)}\n</svg>`;
  figs.push({chapter,id,svg,caption});
}

figure(1,'prob1-pebbles','Probability is a share of the mass',
  'Ten equally likely pebbles each weigh one tenth. Six form event A and four form its complement. Their probabilities are 0.6 and 0.4.',300,(c,w)=>{
  let s = txt(18,54,'10 outcomes · weight 1/10 each',14,muted);
  for(let i=0;i<10;i++) {
    let x=48+(i%5)*66,y=91+Math.floor(i/5)*53;
    s+=circle(x,y,17,i<6?c:'#fff',i<6?c:muted)+txt(x,y+5,i<6?'A':'Aᶜ',14,i<6?'#fff':muted,center);
  }
  s+=rect(18,183,194.4,25,c,'none',0)+rect(212.4,183,129.6,25,'#e2e8f0','none',0);
  s+=txt(18,232,'6 in A → P(A) = 0.6',15,c,bold)+txt(18,257,'4 outside A → P(Aᶜ) = 0.4',15,muted);
  return s+txt(18,284,'All ten weights add to 1.',14,muted);
},'<b>Pebble World.</b> Each dot has the same probability mass. Add the weights inside an event to find its probability.');

figure(1,'prob1-dice','Why a sum of seven has six ways',
  'A six by six grid gives all 36 ordered outcomes of two fair dice. The six cells whose sum is seven are highlighted. Seven therefore has probability six over 36, or one sixth.',436,(c,w)=>{
  let s=txt(195,57,'Second die',14,muted,center)+txt(18,82,'First die',14,muted);
  for(let j=0;j<6;j++) s+=txt(95+j*43,82,j+1,14,muted,center);
  for(let i=0;i<6;i++) {
    s+=txt(49,113+i*39,i+1,14,muted,center);
    for(let j=0;j<6;j++) {
      const hit=i+j===5;
      s+=rect(75+j*43,90+i*39,39,35,hit?c:'#f1f5f9','none',6)+txt(94.5+j*43,113+i*39,i+j+2,15,hit?'#fff':ink,center);
    }
  }
  s+=note(339,'P(sum = 7) = 6/36 = 1/6','36 equally likely cells; 6 highlighted.',c,w);
  return s+txt(180,426,'The 11 sums are not equally likely.',14,muted,center);
},'<b>Count equal-weight outcomes.</b> Ordered pairs are equally likely for fair, independent dice. Sums are also a valid sample space, but must be assigned their actual, unequal probabilities.');

figure(1,'prob1-choice-tree','One path, one complete choice',
  'Four shirts each connect to three trouser choices, giving twelve outfits. A separate six-position licence plate has three letter choices of 26 possibilities followed by three digit choices of ten possibilities.',448,(c,w)=>{
  let s=txt(18,57,'4 shirts × 3 trousers = 12 outfits',15,muted);
  for(let i=0;i<4;i++) {
    let y=93+i*55;
    s+=rect(18,y-17,100,35,w,'none',7)+txt(68,y+6,`Shirt ${i+1}`,15,c,center);
    for(let j=0;j<3;j++) s+=arrow(118,y,167+j*66,y+(j-1)*17);
    for(let j=0;j<3;j++) s+=circle(167+j*66,y+(j-1)*17,13,c)+txt(167+j*66,y+(j-1)*17+5,['a','b','c'][j],14,'#fff',center);
  }
  s+=line(18,292,342,292)+txt(18,322,'A plate has six choice positions',15,ink,bold);
  for(let j=0;j<6;j++) s+=rect(18+j*55,339,49,38,j<3?w:'#f1f5f9','none',6)+txt(42.5+j*55,364,j<3?'A–Z':'0–9',14,j<3?c:ink,center)+txt(42.5+j*55,399,j<3?'26':'10',14,muted,center);
  return s+txt(180,433,'26³ × 10³ = 17,576,000 plates',16,c,`${center} ${bold}`);
},'<b>Sequential choice multiplies.</b> Every complete path specifies one outcome. Here each stage has the same number of choices regardless of the earlier selections.');

figure(1,'prob1-stars-bars','Stars choose scoops; bars divide flavours',
  'Three stars and three separator bars form six positions for four flavours. The example star bar star star bar bar gives one scoop of the first flavour, two of the second, and none of the last two. Choosing three star positions among six gives twenty arrangements.',344,(c,w)=>{
  let s=txt(18,57,'3 identical scoops · 4 distinct flavours',14,muted);
  const seq=['★','|','★','★','|','|'];
  seq.forEach((v,i)=>{s+=rect(18+i*55,79,48,54,v==='★'?w:'#f1f5f9','none',7)+txt(42+i*55,115,v,28,v==='★'?c:muted,center);});
  s+=txt(180,163,'3 stars + 3 bars = 6 positions',15,ink,center);
  ['1 scoop','2 scoops','0 scoops','0 scoops'].forEach((v,i)=>{s+=rect(18+i*83,184,75,55,'#f8fafc',border,7)+txt(55.5+i*83,204,`Flavour ${i+1}`,12,muted,center)+txt(55.5+i*83,226,v,14,ink,center);});
  return s+note(260,'Choose 3 of 6 positions: 20','C(3 + 4 − 1, 3) = C(6, 3)',c,w);
},'<b>Stars and bars.</b> Four flavours need three separators. Choose the positions of three stars among six positions: there are 20 possible unordered selections with replacement.');

figure(2,'prob2-conditioning','Keep the evidence, then rescale',
  'Of one hundred people, thirty drink tea and coffee, thirty drink tea only, and forty drink neither. Restricting to the sixty tea drinkers makes the thirty coffee drinkers one half of the remaining population.',382,(c,w)=>{
  let s=txt(18,56,'Before: all 100 people',15,muted);
  s+=rect(18,73,162,78,c,'none',0)+rect(180,73,162,78,w,'none',0)+rect(18,151,324,52,'#e2e8f0','none',0);
  s+=txt(99,105,'Tea + coffee',15,'#fff',center)+txt(99,132,'30',20,'#fff',`${center} ${bold}`)+txt(261,105,'Tea only',15,c,center)+txt(261,132,'30',20,c,`${center} ${bold}`)+txt(180,184,'Neither: 40',15,muted,center);
  s+=arrow(180,214,180,246,c)+txt(18,238,'Keep tea',14,c);
  s+=rect(18,261,162,58,c,'none',0)+rect(180,261,162,58,w,'none',0)+txt(99,286,'30 / 60',16,'#fff',center)+txt(99,308,'coffee',14,'#fff',center)+txt(261,286,'30 / 60',16,c,center)+txt(261,308,'no coffee',14,c,center);
  return s+txt(180,353,'P(coffee | tea) = 30/60 = 1/2',16,c,`${center} ${bold}`);
},'<b>Conditioning is restriction and renormalisation.</b> Keep the 60 tea drinkers. Of those, 30 also drink coffee, so the conditional probability is 1/2. Rectangle areas represent population shares.');

figure(2,'prob2-card-tree','Multiply along a path; add across paths',
  'First ace with probability four over 52 branches to a second ace with probability three over 51 or a non-ace with probability 48 over 51. First non-ace with probability 48 over 52 branches to ace four over 51 or non-ace 47 over 51. All four joint probabilities sum to one.',458,(c,w)=>{
  let s=txt(18,56,'Two draws without replacement',14,muted);
  s+=rect(18,76,324,36,w,'none',7)+txt(180,100,'First card: ace · 4/52',16,c,center);
  s+=arrow(99,112,99,143,c)+arrow(261,112,261,143,c);
  s+=rect(18,148,154,79,'#f8fafc')+rect(188,148,154,79,'#f8fafc');
  s+=txt(95,172,'Ace · 3/51',15,ink,center)+txt(95,201,'12/2652',16,c,`${center} ${bold}`)+txt(265,172,'Not ace · 48/51',14,ink,center)+txt(265,201,'192/2652',16,c,`${center} ${bold}`);
  s+=rect(18,248,324,36,w,'none',7)+txt(180,272,'First card: not ace · 48/52',16,c,center);
  s+=arrow(99,284,99,310,c)+arrow(261,284,261,310,c);
  s+=rect(18,315,154,79,'#f8fafc')+rect(188,315,154,79,'#f8fafc');
  s+=txt(95,339,'Ace · 4/51',15,ink,center)+txt(95,368,'192/2652',16,c,`${center} ${bold}`)+txt(265,339,'Not ace · 47/51',14,ink,center)+txt(265,368,'2256/2652',16,c,`${center} ${bold}`);
  return s+txt(180,432,'(12 + 192 + 192 + 2256)/2652 = 1',14,muted,center);
},'<b>A two-stage tree.</b> Branch labels are conditional probabilities; the bold fractions are joint path probabilities. Multiply the first-card and second-card probabilities along each path.');

figure(2,'prob2-bayes','A rare condition, seen in whole people',
  'Among one million people, one hundred have the condition and 999900 do not. A test with 99 percent sensitivity and one percent false positives gives 99 true positives and 9999 false positives. Of 10098 positive results, only 99 are true positives: about 0.98 percent.',456,(c,w)=>{
  let s=rect(18,52,324,43,w,'none')+txt(180,80,'1,000,000 people tested',17,c,`${center} ${bold}`);
  s+=arrow(99,95,99,121)+arrow(261,95,261,121);
  s+=rect(18,126,154,100,'#f8fafc')+rect(188,126,154,100,'#f8fafc');
  s+=txt(95,152,'Condition',15,ink,center)+txt(95,182,'100',25,c,`${center} ${bold}`)+txt(95,209,'99% test positive',13,muted,center);
  s+=txt(265,152,'No condition',15,ink,center)+txt(265,182,'999,900',25,ink,`${center} ${bold}`)+txt(265,209,'1% test positive',13,muted,center);
  s+=arrow(95,228,95,256,c)+arrow(265,228,265,256,c);
  s+=rect(18,261,154,64,w,'none')+rect(188,261,154,64,'#f1f5f9','none');
  s+=txt(95,287,'99',23,c,`${center} ${bold}`)+txt(95,311,'true positives',14,c,center)+txt(265,287,'9,999',23,ink,`${center} ${bold}`)+txt(265,311,'false positives',14,muted,center);
  s+=arrow(95,330,157,357,c)+arrow(265,330,203,357,c);
  return s+note(369,'99 / 10,098 ≈ 0.98%','Among positives, fewer than 1% have it.',c,w);
},'<b>Natural frequencies reveal the base rate.</b> False positives outnumber true positives by about 101 to 1. The boxes show counts, not population-proportional areas.');

figure(3,'prob3-pmf-cdf','One distribution, two views',
  'For a binomial count of heads in two fair coin flips, the probability masses at zero, one, and two are one quarter, one half, and one quarter. The right-continuous cumulative distribution jumps to one quarter at zero, three quarters at one, and one at two.',510,(c,w)=>{
  let s=txt(18,56,'X = heads in two fair coin flips',14,muted)+txt(18,86,'PMF · mass at each value',15,c,bold);
  const xs=[90,190,290],ps=[.25,.5,.25];
  s+=line(45,223,330,223,muted)+line(45,108,45,223,muted);
  ps.forEach((p,i)=>{s+=line(xs[i],223,xs[i],223-p*200,c,'stroke-width="5"')+circle(xs[i],223-p*200,5,c)+txt(xs[i],211-p*200,p,14,c,center)+txt(xs[i],245,i,14,muted,center);});
  s+=txt(335,245,'x',14,muted)+txt(18,281,'CDF · accumulated mass',15,c,bold);
  const y=p=>439-p*115;
  s+=line(45,439,330,439,muted)+line(45,315,45,439,muted)+txt(35,329,'1',13,muted,'text-anchor="end"');
  const pts=[[45,y(0),90,y(0)],[90,y(.25),190,y(.25)],[190,y(.75),290,y(.75)],[290,y(1),330,y(1)]];
  pts.forEach(([a,b,d,e])=>{s+=line(a,b,d,e,c,'stroke-width="3"');});
  [0,1,2].forEach((v,i)=>{let before=[0,.25,.75][i],after=[.25,.75,1][i];s+=line(xs[i],y(before),xs[i],y(after),border,'stroke-dasharray="3 4"')+circle(xs[i],y(before),4,'#fff',c)+circle(xs[i],y(after),4,c)+txt(xs[i],462,v,14,muted,center);});
  return s+txt(180,496,'Each CDF jump equals the PMF mass.',14,muted,center);
},'<b>Mass and accumulation.</b> The PMF places mass at each count. The CDF adds those masses from left to right. Filled dots show that F(x) includes the mass at x.');

figure(3,'prob3-temperature','Same logits, different temperature',
  'Logits two, one, and zero produce three categorical probabilities. Temperature one half gives approximately 0.867, 0.117, 0.016. Temperature one gives 0.665, 0.245, 0.090. Temperature two gives 0.506, 0.307, 0.186. Lower temperature concentrates mass on the largest logit.',420,(c,w)=>{
  let s=txt(18,56,'Logits (2, 1, 0) → softmax(z / T)',15,muted);
  const colors=[c,'#334155','#94a3b8'];
  [[.5,'Sharper'],[1,'Original'],[2,'Flatter']].forEach(([t,label],row)=>{
    const ex=[2,1,0].map(z=>Math.exp(z/t)),sum=ex.reduce((a,b)=>a+b,0),ps=ex.map(x=>x/sum),y=92+row*94;
    s+=txt(18,y,`T = ${t} · ${label}`,15,ink,bold);
    let x=18;ps.forEach((p,i)=>{s+=rect(x,y+13,p*324,25,colors[i],'none',0);x+=p*324;});
    s+=txt(18,y+61,ps.map(x=>x.toFixed(3)).join('  /  '),15,muted);
  });
  return s+note(341,'Lower T → more concentrated','For finite T > 0, the ordering stays fixed.',c,w);
},'<b>Temperature redistributes mass.</b> The three segments represent the same tokens in the same order. Bar lengths use the exact softmax values; displayed probabilities are rounded.');

figure(4,'prob4-baseline','Same expected gradient, less noise',
  'For a fair Bernoulli variable and payoff ten X, the gradient estimator is payoff minus baseline times the score, which is plus one when X is one and minus one when X is zero. With baseline zero the estimates are zero and ten, each with probability one half, giving mean five and variance 25. With baseline five both estimates equal five, giving variance zero.',462,(c,w)=>{
  let s=txt(18,56,'X ∼ Bernoulli(1/2), payoff = 10X',14,muted)+txt(18,81,'Estimator: (payoff − b) × score',14,muted);
  [['No baseline · b = 0',[0,10],'Variance = 25'],['Baseline · b = 5',[5,5],'Variance = 0']].forEach(([label,vals,v],row)=>{
    const top=112+row*164,y=top+83,x=z=>45+z*27;
    s+=txt(18,top,label,16,c,bold)+rect(x(5)-19,top+17,38,88,w,'none',5)+line(45,y,315,y,muted);
    [0,5,10].forEach(z=>{s+=line(x(z),y-4,x(z),y+4,muted)+txt(x(z),y+25,z,14,muted,center);});
    vals.forEach((z,i)=>{s+=circle(x(z),top+36+i*25,7,i===0?c:'#fff',c);});
    s+=txt(18,top+142,`Mean = 5 · ${v}`,15,ink);
  });
  return s+txt(180,452,'● X = 0     ○ X = 1     each with P = 1/2',13,muted,center);
},'<b>A baseline buys precision.</b> Both estimators have mean 5. In this example, subtracting the baseline makes the two possible gradient estimates coincide, removing variance entirely.');

figure(5,'prob5-density','Probability is area, not height',
  'The uniform density on zero to one has height one. The shaded interval from one quarter to one half has width one quarter, hence probability one quarter. Any single point has zero width and therefore zero probability.',344,(c,w)=>{
  let s=txt(18,56,'Uniform(0, 1) · density f(x) = 1',14,muted);
  s+=rect(65,95,252,130,w,'none',0)+rect(128,95,63,130,c,'none',0);
  s+=line(42,225,337,225,muted)+line(65,243,65,78,muted)+curve('M42,225 H65 V95 H317 V225 H337',c);
  [[65,'0'],[128,'0.25'],[191,'0.5'],[317,'1']].forEach(([x,v])=>{s+=line(x,225,x,232,muted)+txt(x,253,v,14,muted,center);});
  s+=txt(47,101,'1',14,muted,'text-anchor="end"')+txt(25,79,'f(x)',14,muted);
  return s+note(270,'P(0.25 ≤ X ≤ 0.5) = 0.25','Width 0.25 × height 1 = area 0.25',c,w);
},'<b>Area, not height.</b> The shaded area is the interval probability. A density can exceed 1; its total area must equal 1. A single point contributes no area.');

figure(5,'prob5-inverse-cdf','Turn a uniform height into a sample',
  'For the continuous CDF F(x) equals x squared on zero to one, choose a uniform height u equals 0.64. Move horizontally to the CDF and vertically to x equals square root of u equals 0.8. The resulting density is two x on zero to one.',381,(c,w)=>{
  let s=txt(18,56,'Example: F(x) = x² on [0, 1]',15,muted);
  const x=t=>65+250*t,y=t=>267-170*t;
  s+=line(65,267,333,267,muted)+line(65,276,65,80,muted);
  let d='';for(let i=0;i<=100;i++){const t=i/100;d+=`${i?'L':'M'}${x(t).toFixed(2)},${y(t*t).toFixed(2)} `;}s+=curve(d,c);
  s+=line(65,y(.64),x(.8),y(.64),c,'stroke-dasharray="5 4"')+line(x(.8),y(.64),x(.8),267,c,'stroke-dasharray="5 4"')+circle(x(.8),y(.64),5,c);
  s+=txt(57,y(.64)+5,'0.64',14,c,'text-anchor="end"')+txt(53,99,'1',14,muted,'text-anchor="end"')+txt(65,291,'0',14,muted,center)+txt(x(.8),291,'0.8',14,c,center)+txt(315,291,'1',14,muted,center)+txt(26,80,'F(x)',14,muted);
  s+=txt(97,139,'Across →',14,c)+txt(274,229,'↓ Down',14,c);
  return s+note(309,'u = 0.64 → x = √u = 0.8','Draw u uniformly; return F⁻¹(u).',c,w);
},'<b>Inverse-CDF sampling.</b> Read across from a uniform height to the CDF, then down to x. This continuous example has density 2x, so samples favour the right side of the interval.');

figure(5,'prob5-reparameterization','Two routes to the same gradient',
  'The score-function route samples z from a parameter-dependent Gaussian and differentiates the log density, weighting by the function value. The pathwise route samples independent standard Gaussian epsilon, computes z equals mu plus sigma epsilon, and differentiates through that deterministic map. Both require their usual regularity conditions.',490,(c,w)=>{
  let s=txt(18,56,'Both target ∇ E[f(z)]',15,muted);
  s+=rect(18,75,324,165,'#f8fafc')+txt(34,102,'01  Score-function route',16,ink,bold)+txt(34,134,'Sample z ∼ N(μ, σ²)',16,ink)+arrow(180,146,180,165,c)+txt(180,191,'f(z) × ∇ log p(z)',18,c,`${center} ${bold}`)+txt(34,220,'Differentiate the log density.',14,muted);
  s+=rect(18,258,324,202,w,'none')+txt(34,286,'02  Pathwise route',16,c,bold)+txt(34,316,'Sample ε ∼ N(0, 1)',16,ink)+arrow(180,325,180,345,c)+txt(180,371,'z = μ + σε',21,c,`${center} ${bold}`)+txt(34,405,'∂z/∂μ = 1     ∂z/∂σ = ε',16,ink)+txt(34,435,'Differentiate f through z.',14,muted);
  return s+txt(180,483,'For smooth VAE losses, pathwise is often quieter.',13,muted,center);
},'<b>Two gradient estimators, one sampling law.</b> Reparameterisation makes the parameter dependence explicit in a differentiable map. It often reduces variance for smooth objectives; lower variance is not a universal guarantee.');

figure(6,'prob6-triangle','A joint density, its shadow, and a slice',
  'A uniform density of two fills the triangle zero less than y less than x less than one. Its x marginal is two x and its y marginal is two times one minus y. Conditioning on y equals one half leaves x uniform between one half and one, with density two and total area one.',476,(c,w)=>{
  let s=txt(18,56,'Uniform on 0 ≤ y ≤ x ≤ 1',15,muted);
  s+=`<path d="M70 263 L310 263 L310 83 Z" fill="${w}" stroke="${c}" stroke-width="2"/>`;
  s+=line(70,263,333,263,muted)+line(70,280,70,72,muted)+txt(58,86,'1',14,muted,'text-anchor="end"')+txt(310,288,'1',14,muted,center)+txt(70,288,'0',14,muted,center)+txt(337,269,'x',15,muted)+txt(28,86,'y',15,muted);
  s+=line(70,173,190,173,muted,'stroke-dasharray="4 4"')+line(190,173,310,173,c,'stroke-width="5"')+txt(55,178,'1/2',14,c,'text-anchor="end"')+txt(219,232,'joint f = 2',16,c,center)+txt(237,153,'y = 1/2',15,c,center);
  s+=rect(18,310,324,61,'#f8fafc')+txt(34,336,'Marginals',15,ink,bold)+txt(34,359,'fX(x) = 2x    fY(y) = 2(1 − y)',15,muted);
  return s+note(388,'Given Y = 1/2: fX|Y = 2','Support (1/2, 1); area 2 × 1/2 = 1.',c,w);
},'<b>The shadow and the slice.</b> Integrate the triangle along one direction to obtain a marginal. Fix y to obtain a conditional slice, then divide by its marginal density. At y = 1/2 that divisor is 1, so the height stays 2.');

figure(7,'prob7-jensen','Which way does Jensen point?',
  'Equal probability at zero and two gives mean one. For the convex function x squared, the average function value is two while the function of the average is one; the chord is above the curve. For the concave function four minus x squared, these become two and three; the chord is below the curve.',520,(c,w)=>{
  let s=txt(18,56,'P(X = 0) = P(X = 2) = 1/2',14,muted);
  [false,true].forEach((concave,row)=>{
    const top=83+row*218,base=top+131,xx=x=>70+120*x,yy=v=>concave?base-(4-v)*26:base-v*26;
    s+=txt(18,top,concave?'Concave · g(x) = 4 − x²':'Convex · g(x) = x²',16,c,bold)+line(57,base,330,base,muted);
    let d='';for(let i=0;i<=50;i++){let x=i/25;d+=`${i?'L':'M'}${xx(x)},${yy(x*x)} `;}s+=curve(d,c)+line(xx(0),yy(0),xx(2),yy(4),muted,'stroke-dasharray="5 4"');
    s+=circle(xx(1),yy(2),5,'#fff',muted)+circle(xx(1),yy(1),5,c)+line(xx(1),yy(1),xx(1),yy(2),muted);
    s+=txt(70,base+22,'0',14,muted,center)+txt(190,base+22,'1',14,muted,center)+txt(310,base+22,'2',14,muted,center)+txt(180,base+50,concave?'E[g(X)] = 2 ≤ 3 = g(E[X])':'E[g(X)] = 2 ≥ 1 = g(E[X])',15,c,`${center} ${bold}`);
  });
  return s;
},'<b>Average of the curve versus curve of the average.</b> The solid dot is g(E[X]); the open dot on the dashed chord is E[g(X)]. Convex puts the chord above; concave reverses the inequality.');

for(let chapter=1;chapter<=7;chapter++) {
  const file=path.join(ROOT,'viz',`prob-${chapter}.body.html`);
  let body=fs.readFileSync(file,'utf8');
  const chapterFigs=figs.filter(f=>f.chapter===chapter);
  let replaced=0;
  const blocks=chapterFigs.map(f=>{
    fs.writeFileSync(path.join(OUT,f.id+'.svg'),f.svg+'\n');
    return `<!--prob-svg:${f.id}:start-->\n<div class="fig probability-figure" id="figure-${f.id}"><div class="box">${f.svg}</div><div class="cap">${f.caption}</div></div>\n<!--prob-svg:${f.id}:end-->`;
  });
  if(body.includes('<!--prob-svg:')) {
    chapterFigs.forEach((f,i)=>{
      const re=new RegExp(`<!--prob-svg:${f.id}:start-->[\\s\\S]*?<!--prob-svg:${f.id}:end-->`);
      if(!re.test(body)) throw new Error(`Missing figure marker: ${f.id}`);
      body=body.replace(re,()=>blocks[i]);replaced++;
    });
  } else if(chapter===6) {
    const anchor='<h2>3 &middot; Conditional densities, and the slice</h2>';
    if(!body.includes(anchor)) throw new Error('Missing triangle insertion anchor');
    body=body.replace(anchor,blocks[0]+'\n\n'+anchor);replaced++;
  } else {
    body=body.replace(/<div class="fig"><div class="box"><pre class="d">[\s\S]*?<\/pre><\/div><div class="cap">[\s\S]*?<\/div><\/div>/g,()=>{
      if(!blocks[replaced]) throw new Error(`Unexpected diagram in chapter ${chapter}`);
      return blocks[replaced++];
    });
  }
  if(replaced!==chapterFigs.length || /<pre\b/.test(body)) throw new Error(`Diagram coverage mismatch: chapter ${chapter}`);
  fs.writeFileSync(file,body);
  console.log(`Probability ${chapter}: ${replaced} SVG figures`);
}
