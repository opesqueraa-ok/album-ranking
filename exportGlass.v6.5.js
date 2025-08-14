// Export images v6.5 (layout as per spec)
(function(){
  const COLORS={5:'#e12928',6:'#f0ca15',7:'#23be32',8:'#02aec6',9:'#0285c6',10:'#2e47ee'};
  const NEUTRAL='#2a3140';
  const PAD_OUT=40;      // margen entre fondo blur y panel
  const PAD_IN=50;       // margen interno del panel
  const CORNER=26;

  function colorFor(v){ if(!Number.isFinite(v)) return NEUTRAL; const k=Math.max(5,Math.min(10,Math.round(v))); return COLORS[k]; }

  function state(){
    const tracksEl=document.getElementById('tracks');
    const tracks=[...tracksEl.children].map(r=>r.value()).filter(t=>t.name||t.dur||Number.isFinite(t.score));
    return { album:document.getElementById('album').value.trim(), artist:document.getElementById('artist').value.trim(), released:document.getElementById('released').value.trim(), rankedby:document.getElementById('rankedby').value.trim(), cover:document.getElementById('coverOut').src||'', tracks };
  }

  function rrect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  function drawLegend(ctx, x, y){
    const items=[['5','Poor',5],['6','Decent',6],['7','Okay',7],['8','Good',8],['9','Prime',9],['10','Perfect',10]];
    let cx=x, cy=y; const bw=68, bh=42, gap=16;
    items.forEach(([label,text,val])=>{
      ctx.fillStyle=colorFor(val); rrect(ctx,cx,cy,bw,bh,10); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='bold 20px system-ui, Arial'; ctx.fillText(label, cx+12, cy+27);
      ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='500 18px system-ui, Arial'; ctx.fillText(text, cx+bw+10, cy+26);
      cx += bw + 120; // espacio para el texto
    });
  }

  function truncateToWidth(ctx, text, maxW){
    let t=text; if(ctx.measureText(t).width<=maxW) return t;
    while(t.length>2 && ctx.measureText(t+'…').width>maxW){ t=t.slice(0,-1); }
    return t+'…';
  }

  function drawColumns(ctx, x, y, w, h, rows){
    // Auto columnas: 1<=10, 2<=20, 3>20
    const n=rows.length; const cols = n>20 ? 3 : (n>10 ? 2 : 1);
    const colGap=24; const colW = (w - (cols-1)*colGap)/cols;
    const lineH=40;
    let idx=0;
    for(let c=0;c<cols;c++){
      const startY=y; let cy=startY;
      const maxRows=Math.ceil(n/cols);
      for(let r=0; r<maxRows && idx<n; r++, idx++){
        const t=rows[idx]; const num=String(t.n||idx+1); const score = Number.isFinite(t.score)? t.score.toFixed(1).replace(/\.0$/,'') : '-';
        const badgeW=62, badgeH=28;
        ctx.fillStyle='#fff'; ctx.font='500 24px system-ui, Arial';
        ctx.fillText(num+'.', x + c*(colW+colGap), cy);
        const nameX = x + c*(colW+colGap) + 36;
        const maxNameW = colW - 36 - (badgeW+12);
        const shown = truncateToWidth(ctx, (t.name||'—'), maxNameW);
        ctx.fillText(shown, nameX, cy);
        const bx = x + c*(colW+colGap) + colW - badgeW;
        const by = cy - 24;
        ctx.fillStyle = colorFor(t.score); rrect(ctx,bx,by,badgeW,badgeH,8); ctx.fill();
        ctx.fillStyle='#fff'; ctx.font='700 20px system-ui, Arial'; ctx.fillText(score, bx+12, by+21);
        cy += lineH;
        if(cy>y+h) break;
      }
    }
  }

  function exportBase(w,h,withChart){
    const s=state();
    const bg=new Image();
    bg.onload=()=>{
      const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; const ctx=canvas.getContext('2d');
      // fondo blur
      ctx.filter='blur(24px)';
      const rw=Math.max(w, h*bg.width/bg.height), rh=Math.max(h, w*bg.height/bg.width);
      ctx.drawImage(bg,(w-rw)/2,(h-rh)/2,rw,rh); ctx.filter='none';
      // panel
      const panel = {x:PAD_OUT,y:PAD_OUT,w:w-PAD_OUT*2,h:h-PAD_OUT*2};
      ctx.fillStyle='rgba(0,0,0,.5)'; rrect(ctx,panel.x,panel.y,panel.w,panel.h,CORNER); ctx.fill();
      const left = panel.x + PAD_IN, right = panel.x + panel.w - PAD_IN, top = panel.y + PAD_IN;
      // header text
      ctx.fillStyle='#fff';
      ctx.font='800 72px system-ui, Arial'; ctx.fillText(s.album||'—', left, top+60);
      ctx.font='700 34px system-ui, Arial'; ctx.fillText(s.artist||'—', left, top+106);
      ctx.font='500 26px system-ui, Arial'; ctx.fillText(s.released||'—', left, top+138);
      if(s.rankedby){ ctx.font='700 26px system-ui, Arial'; ctx.fillText('Ranked By: '+s.rankedby, left, top+170); }
      // cover + average
      const coverSize=260; const coverX=right-coverSize; const coverY=top;
      const coverImg=new Image();
      coverImg.onload=()=>{
        rrect(ctx,coverX,coverY,coverSize,coverSize,18); ctx.save(); ctx.clip(); ctx.drawImage(coverImg,coverX,coverY,coverSize,coverSize); ctx.restore();
        const scores=(s.tracks||[]).map(t=>t.score).filter(v=>Number.isFinite(v));
        const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length):NaN;
        const bubbleW=84, bubbleH=56; const bx=coverX+coverSize-bubbleW, by=coverY+coverSize+12;
        rrect(ctx,bx,by,bubbleW,bubbleH,12); ctx.fillStyle='#0c7aa6'; ctx.fill();
        ctx.fillStyle='#fff'; ctx.font='800 34px system-ui, Arial'; ctx.fillText(Number.isFinite(avg)?avg.toFixed(1):'—', bx+18, by+38);
        // legend
        drawLegend(ctx, left, top+210);
        // columns area
        const contentTop = top + 270;
        const contentHeight = withChart ? (panel.y+panel.h - 80 - contentTop - 280) : (panel.y+panel.h - 80 - contentTop);
        drawColumns(ctx, left, contentTop, right-left, contentHeight, s.tracks||[]);
        // chart (only story)
        if(withChart){
          drawExportChart(ctx, (s.tracks||[]).map(t=>t.score).filter(v=>Number.isFinite(v)), left, contentTop+contentHeight+30, right-left, 240);
        }
        // footer
        ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font='500 18px system-ui, Arial';
        ctx.fillText('Created by Ok Pretty Boy with help from ChatGPT', left, panel.y+panel.h-24);
        // download
        const url=canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download= withChart ? 'album-story.png' : 'album-4x5.png'; a.click();
      };
      coverImg.onerror=()=>{
        // sin portada: aún renderiza todo
        const scores=(s.tracks||[]).map(t=>t.score).filter(v=>Number.isFinite(v));
        const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length):NaN;
        ctx.fillStyle='#0c7aa6'; rrect(ctx,right-120,top+260,84,56,12); ctx.fill();
        ctx.fillStyle='#fff'; ctx.font='800 34px system-ui, Arial'; ctx.fillText(Number.isFinite(avg)?avg.toFixed(1):'—', right-102, top+298);
        drawLegend(ctx, left, top+210);
        const contentTop = top + 270;
        const contentHeight = withChart ? (panel.y+panel.h - 80 - contentTop - 280) : (panel.y+panel.h - 80 - contentTop);
        drawColumns(ctx, left, contentTop, right-left, contentHeight, s.tracks||[]);
        if(withChart){ drawExportChart(ctx, (s.tracks||[]).map(t=>t.score).filter(v=>Number.isFinite(v)), left, contentTop+contentHeight+30, right-left, 240); }
        ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font='500 18px system-ui, Arial';
        ctx.fillText('Created by Ok Pretty Boy with help from ChatGPT', left, panel.y+panel.h-24);
        const url=canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download= withChart ? 'album-story.png' : 'album-4x5.png'; a.click();
      };
      coverImg.src = s.cover || '';
    };
    bg.onerror=()=>{
      const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; const ctx=canvas.getContext('2d');
      ctx.fillStyle='#0f1115'; ctx.fillRect(0,0,w,h); ctx.fillStyle='#fff'; ctx.font='800 72px system-ui, Arial'; ctx.fillText('Album Rater',80,140);
      const url=canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download= withChart ? 'album-story.png' : 'album-4x5.png'; a.click();
    };
    bg.src = (state().cover||'');
  }

  function drawExportChart(ctx, values, x, y, w, h){
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.stroke();
    for(let s=5; s<=10; s++){ const yy = y + h - ((s-5)/5)*h; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x+w, yy); ctx.stroke(); }
    if (!values?.length){ ctx.restore(); return; }
    const n = values.length;
    const X = i => x + (i/(Math.max(1,n-1))) * w;
    const Y = v => y + h - ((v-5)/5)*h;
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(X(0), Y(values[0])); for (let i=1;i<n;i++) ctx.lineTo(X(i), Y(values[i])); ctx.stroke();
    ctx.fillStyle = '#fff'; for (let i=0;i<n;i++){ ctx.beginPath(); ctx.arc(X(i), Y(values[i]), 5, 0, 2*Math.PI); ctx.fill(); }
    ctx.restore();
  }

  function bindExport(){
    const a=document.getElementById('exportStory'); if(a && !a._bound){ a._bound=true; a.addEventListener('click', ()=> exportBase(1080,1920,true)); }
    const b=document.getElementById('export45'); if(b && !b._bound){ b._bound=true; b.addEventListener('click', ()=> exportBase(1080,1350,false)); }
  }
  if(document.readyState==='complete' || document.readyState==='interactive'){ bindExport(); } else { document.addEventListener('DOMContentLoaded', bindExport); }
})();