/* ---------- shared UI helpers (from the approved mockup) ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ICON={
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
 boards:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
 chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H9l-5 4z"/></svg>',
 dm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.8 6 5.5"/></svg>',
 news:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>',
 pay:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="1"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/></svg>',
 jobs:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M9 7V4h6v3M3 12h18"/></svg>',
 clips:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
 stocks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18M4 16l5-5 4 3 7-8"/><path d="M15 6h5v5"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>'
};
function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,2400)}
function check(text){
  if(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/.test(text))return"That looks like an email address. Take it out so nobody can be identified.";
  if(/(\+?\d[\d\s().-]{8,}\d)/.test(text))return"That looks like a phone number. Take it out so nobody can be identified.";
  if(/\b(\d{1,5}\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|dr|drive|ln|lane))\b/i.test(text))return"That looks like a street address. Locations stay off Unbadged.";
  return null;
}
const PROF=/\b(f+u+c+k+\w*|sh+i+t+\w*|bullshit|bitch\w*|bastard\w*|asshole\w*|dumbass|jackass|ass|damn\w*|goddamn\w*|hell|dick\w*|piss\w*|crap\w*)\b/gi;
const T=str=>{const h=esc(str);return S.prof?h.replace(PROF,m=>`<span class="prof" tabindex="0" role="button" title="Tap to show">${m}</span>`):h};
const AV_COL=["#d9540b","#1f4e79","#2b7a4b","#8a4fbf","#b42323","#a07a12","#3a6f8f","#0f766e","#7c4a2d","#475569"];
const AV_GLY=[
 ["Hard hat","M4 16h16M6 16a6 6 0 0 1 12 0M12 9v3M9 10v2M15 10v2"],
 ["Box","M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"],
 ["Wrench","M14.5 5.5a4 4 0 0 0 4 5.5l-8.5 8.5a2.1 2.1 0 0 1-3-3L15.5 8a4 4 0 0 0-1-2.5z"],
 ["Coffee","M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h1.5a2 2 0 0 1 0 4H16M8 4v2M11 4v2"],
 ["Headset","M5 14v-2a7 7 0 0 1 14 0v2M5 14h3v5H5zM16 14h3v5h-3z"],
 ["Moon","M19 14.5A8 8 0 1 1 9.5 5a6.5 6.5 0 0 0 9.5 9.5z"],
 ["Cart","M3 5h2l2 10h11l2-7H6M9 19.5h.01M17 19.5h.01"],
 ["Bolt","M13 3L5 14h6l-1 7 8-11h-6z"],
 ["Name tag","M3 7h18v11H3zM3 11h18M7 15h6"],
 ["Ghost","M6 20V10a6 6 0 0 1 12 0v10l-2-2-2 2-2-2-2 2-2-2zM10 11h.01M14 11h.01"],
];
function OWNER_AV(size){return `<span class="av oav ${size}" aria-label="Founder"><span class="oav-in"><svg viewBox="0 0 24 24"><defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffc83d"/><stop offset="1" stop-color="#e08a00"/></linearGradient></defs><path d="M5 9.5l3.4 2.8L12 6.5l3.6 5.8L19 9.5l-1.4 7H6.4z" fill="url(#og)" stroke="#5a3a00" stroke-width=".8" stroke-linejoin="round"/><rect x="6.2" y="17.6" width="11.6" height="2.6" rx="1" fill="url(#og)"/><circle cx="12" cy="6.2" r="1.3" fill="#fff3b0"/><circle cx="5" cy="9.3" r="1" fill="#fff3b0"/><circle cx="19" cy="9.3" r="1" fill="#fff3b0"/></svg></span></span>`}
const FTAG=()=>`<span class="ftag" title="Founder of Unbadged"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9l4 3.2L12 6l4 6.2L20 9l-1.6 9H5.6z" fill="currentColor"/></svg>FOUNDER</span>`;
const COG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
/* Starting pay = U.S. Bureau of Labor Statistics, OEWS national estimates, May 2025 (hourly 10th pct, median, 90th pct).
   Company rows use the national figure for that type of job. The last field is the BLS job title used. */
const PAY_SOURCE="U.S. Bureau of Labor Statistics, May 2025";
const WAGE_ROWS=[
 ["Retail","Walmart","Overnight stocker",14.48,17.95,23.68,"Stockers and order fillers"],
 ["Retail","Walmart","Team lead",15.92,23.33,37.06,"Supervisors of retail sales workers"],
 ["Retail","Target","General merchandise",13.08,17.03,23.02,"Retail salespersons"],
 ["Retail","Costco","Front end / cashier",11.79,15.81,19.43,"Cashiers"],
 ["Retail","Home Depot","Sales associate",13.08,17.03,23.02,"Retail salespersons"],
 ["Retail","Any employer","Cashier",11.79,15.81,19.43,"Cashiers"],
 ["Retail","Any employer","Store manager",15.92,23.33,37.06,"Supervisors of retail sales workers"],
 ["Retail","Any employer","Pharmacy technician",17.32,22.00,29.35,"Pharmacy technicians"],
 ["Warehouse","Amazon","Warehouse associate",15.03,19.35,26.51,"Laborers and freight, stock, and material movers"],
 ["Warehouse","Any employer","Forklift operator",17.71,22.32,30.06,"Industrial truck and tractor operators"],
 ["Warehouse","UPS","Package handler",15.03,19.35,26.51,"Laborers and freight, stock, and material movers"],
 ["Warehouse","Any employer","Shipping and receiving clerk",16.66,21.76,29.90,"Shipping, receiving, and inventory clerks"],
 ["Warehouse","Any employer","Inventory specialist",16.66,21.76,29.90,"Shipping, receiving, and inventory clerks"],
 ["Trades","Any employer","Apprentice electrician",15.88,20.51,28.05,"Electrician helpers"],
 ["Trades","Any employer","Journeyman electrician",20.50,30.38,52.17,"Electricians"],
 ["Trades","Any employer","Welder",18.87,25.84,37.28,"Welders, cutters, solderers, and brazers"],
 ["Trades","Any employer","Pipe welder",18.87,25.84,37.28,"Welders, cutters, solderers, and brazers"],
 ["Trades","Any employer","Apprentice plumber",16.15,20.36,27.78,"Plumber and pipefitter helpers"],
 ["Trades","Any employer","Plumber",21.22,30.67,52.13,"Plumbers, pipefitters, and steamfitters"],
 ["Trades","Any employer","HVAC technician",19.25,29.33,45.78,"HVAC mechanics and installers"],
 ["Trades","Any employer","Carpenter",19.43,29.12,48.03,"Carpenters"],
 ["Trades","Any employer","Maintenance technician",17.00,23.84,37.11,"Maintenance and repair workers"],
 ["Trades","Any employer","Industrial machinery mechanic",22.17,31.02,45.76,"Industrial machinery mechanics"],
 ["Trades","Any employer","Roofer",18.01,26.65,39.29,"Roofers"],
 ["Trades","Any employer","Heavy equipment operator",20.28,28.78,48.60,"Construction equipment operators"],
 ["Automotive","Any employer","Automotive technician",16.66,24.34,39.32,"Automotive service technicians"],
 ["Automotive","Any employer","Diesel mechanic",21.41,29.70,42.66,"Bus and truck mechanics, diesel specialists"],
 ["Automotive","Any employer","Collision repair tech",17.74,26.39,42.28,"Automotive body repairers"],
 ["Automotive","Any employer","Tire and lube technician",14.43,18.13,24.15,"Tire repairers and changers"],
 ["Transportation","Any employer","CDL truck driver",19.30,28.19,38.17,"Heavy and tractor-trailer truck drivers"],
 ["Transportation","Any employer","Delivery driver",14.81,21.57,38.61,"Light truck drivers"],
 ["Transportation","Any employer","Bus driver",19.25,28.39,40.72,"Bus drivers, transit and intercity"],
 ["Food service","Starbucks","Barista",10.98,15.00,20.51,"Fast food and counter workers"],
 ["Food service","Any employer","Line cook",13.80,17.98,23.03,"Restaurant cooks"],
 ["Food service","Any employer","Fast food crew",10.98,15.00,20.51,"Fast food and counter workers"],
 ["Food service","Any employer","Server (with tips)",8.70,16.94,31.12,"Waiters and waitresses"],
 ["Food service","Any employer","Shift manager",14.40,21.19,31.52,"Food service supervisors"],
 ["Healthcare","Any employer","CNA",16.32,20.32,24.99,"Nursing assistants"],
 ["Healthcare","Any employer","Medical assistant",17.33,21.97,28.52,"Medical assistants"],
 ["Healthcare","Any employer","Phlebotomist",17.20,21.75,28.26,"Phlebotomists"],
 ["Healthcare","Any employer","Home health aide",13.00,17.21,21.65,"Home health and personal care aides"],
 ["Healthcare","Any employer","Hospital EVS / housekeeping",13.29,17.07,23.35,"Maids and housekeeping cleaners"],
 ["Customer service","Call center","Customer service rep",15.27,21.53,30.57,"Customer service representatives"],
 ["Customer service","Any employer","Bank teller",16.52,20.69,23.88,"Tellers"],
 ["Customer service","Any employer","Remote support rep",15.27,21.53,30.57,"Customer service representatives"],
 ["Tech and telecom","Any employer","Field service technician",21.27,30.72,46.51,"Telecom equipment installers and repairers"],
 ["Tech and telecom","Any employer","Cable installer",21.79,35.73,49.85,"Telecom line installers and repairers"],
 ["Tech and telecom","Any employer","IT help desk",19.70,29.74,48.34,"Computer user support specialists"],
 ["Other","Any employer","Security guard",14.52,18.28,28.29,"Security guards"],
 ["Other","Any employer","Janitor / custodian",13.77,17.71,24.17,"Janitors and cleaners"],
 ["Other","Any employer","Landscaper",14.98,18.82,27.28,"Landscaping and groundskeeping workers"],
];
const WAGES=WAGE_ROWS.map(([cat,co,role,lo,med,hi,bls])=>({cat,co,role,lo,med,hi,bls}));
const WAGE_CATS=[...new Set(WAGES.map(w=>w.cat))];
const wLabel=w=>(w.co==="Any employer"?"":w.co+" · ")+w.role;
function pixelate(g,img,b,W,H){
  const x=Math.max(0,b.x-b.w*.15),y=Math.max(0,b.y-b.h*.2),w=Math.min(W-x,b.w*1.3),h=Math.min(H-y,b.h*1.4);
  const t=document.createElement("canvas");t.width=6;t.height=Math.max(2,Math.round(6*h/w));
  const sx=img.naturalWidth/W,sy=img.naturalHeight/H;
  t.getContext("2d").drawImage(img,x*sx,y*sy,w*sx,h*sy,0,0,t.width,t.height);
  g.save();g.beginPath();g.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,7);g.clip();g.imageSmoothingEnabled=false;g.drawImage(t,0,0,t.width,t.height,x,y,w,h);g.restore();
}
function sw(id,on,label,sub){return `<label class="setrow"><span><b>${label}</b><small>${sub}</small></span><span class="switch"><input type="checkbox" id="${id}" ${on?"checked":""}></span></label>`}
const ACCENTS=[["Safety orange","#ff7b30"],["Electric blue","#4ea8ff"],["Teal","#2dd4bf"],["Green","#4ade80"],["Gold","#f5b83d"],["Red","#ff6363"],["Pink","#f472b6"],["Purple","#a78bfa"]];
function drawQR(el,text){
  try{const q=qrcode(0,"M");q.addData(text);q.make();const n=q.getModuleCount();let d="";
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c} ${r}h1v1h-1z`;
    el.innerHTML=`<svg viewBox="-2 -2 ${n+4} ${n+4}" role="img" aria-label="QR code for linking a device" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n+4}" height="${n+4}" fill="#ffffff"/><path d="${d}" fill="#111111"/></svg>`}
  catch(e){el.innerHTML='<div class="qrfall">QR code shows here</div>'}
}
const REASONS={
 person:["Harassment or bullying","Sharing someone's personal info","Threats or violence","Hate speech","Sexual content","Involves someone under 18","Spam or scam","Company secrets or insider info","Pretending to be someone else","Something else"],
 group:["Harassment or bullying","Sexual content","Involves someone under 18","Hate speech","Threats or violence","Spam or scam","Something else"],
 board:["Spam or scam","Hate speech","Harassment or bullying","False or misleading info","Insider info or pump-and-dump","Wrong company or duplicate board","Something else"],
};
const KIND_LABEL={account:"account",post:"post",message:"message",group:"group chat",room:"room",board:"board"};
function modal(html){const ov=$("#photoModal");ov.hidden=false;ov.innerHTML=`<div class="card pm" role="dialog">${html}</div>`;const close=()=>{ov.hidden=true;ov.innerHTML=""};const x=$("#pmX");if(x)x.onclick=close;return close}

/* beta tester look: neon ring avatar + BETA TESTER tag (exclusive to testers the owner picks) */
const BETA_GLYPH='<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7df9ff"/><stop offset=".5" stop-color="#b18cff"/><stop offset="1" stop-color="#ff7ae6"/></linearGradient></defs><path d="M9.2 20.5V7.6a3.6 3.6 0 0 1 7.2 0c0 1.7-1.1 2.8-2.6 3.2 2 .3 3.4 1.7 3.4 3.7 0 2.3-1.8 3.9-4.2 3.9-1.4 0-2.6-.5-3.4-1.4" fill="none" stroke="url(#bg1)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.2 5.2l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="#7df9ff"/></svg>';
function BETA_AV(size){return `<span class="av bav ${size}" aria-label="Beta tester"><span class="bav-in">${BETA_GLYPH}</span></span>`}
const BTAG=()=>`<span class="btag" title="Official Unbadged beta tester"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" fill="currentColor"/></svg>BETA TESTER</span>`;
