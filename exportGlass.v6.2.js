// Export images v6.2 (unchanged)
(function(){
  const COLORS={10:'#2e47ee',9:'#0285c6',8:'#02aec6',7:'#23be32',6:'#f0ca15',5:'#e12928'};
  const NEUTRAL='#2a3140';
  function colorFor(v){ if(!Number.isFinite(v)) return NEUTRAL; const k=Math.max(5,Math.min(10,Math.floor(v))); return COLORS[k]; }
  function drawRowsOnCanvas(ctx, rows, left, yStart){
    const COL = { dur:left, num:left+110, name:left+150, score:left+700 };
    let y = yStart, lineH = 36;
    ctx.fillStyle = 'rgba(207,217,255,.9)'; ctx.font = '600 24px system-ui, Arial';
    ctx.fillText('Duration', COL.dur, y); ctx.fillText('#', COL.num, y); ctx.fillText('Name', COL.name, y); ctx.fillText('Score', COL.score, y);
    y += 10;
    rows.forEach((t,i)=>{
      y += lineH;
      const dur = (t.dur || '—'), num = String(t.n || (i+1)), name = (t.name || '—');
      const score = Number.isFinite(t.score)? t.score.toFixed(1).replace(/\.0$/,'') : '-';
      ctx.fillStyle='#fff'; ctx.font='500 26px system-ui, Arial';
      ctx.fillText(dur, COL.dur, y); ctx.fillText(num, COL.num, y);
      const maxNameW = COL.score - COL.name - 24; let shown = name;
      while (ctx.measureText(shown).width > maxNameW && shown.length > 3) { shown = shown.slice(0, -1); }
      if (shown !== name) shown = shown.slice(0, -1) + '…';
      ctx.fillText(shown, COL.name, y);
      const w = 62, h = 28; const bx = COL.score, by = y - 22;
      const color = colorFor(t.score);
      ctx.fillStyle = color; ctx.fillRect(bx, by, w, h);
      ctx.fillStyle = '#fff'; ctx.font = '700 22px system-ui, Arial'; ctx.fillText(score, bx + 12, by + 22);
    });
    return y;
  }
  function drawExportChart(ctx, values, x, y, w, h){
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.stroke();
    values = (values||[]).filter(v=>Number.isFinite(v));
    for(let s=5; s<=10; s++){ const yy = y + h - ((s-5)/5)*h; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x+w, yy); ctx.stroke(); }
    if (!values.length){ ctx.restore(); return; }
    const n = values.length;
    const X = i => x + (i/(Math.max(1,n-1))) * w;
    const Y = v => y + h - ((v-5)/5)*h;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(0), Y(values[0]));
    for (let i=1;i<n;i++) ctx.lineTo(X(i), Y(values[i])); ctx.stroke();
    ctx.fillStyle = '#fff'; for (let i=0;i<n;i++){ ctx.beginPath(); ctx.arc(X(i), Y(values[i]), 5, 0, 2*Math.PI); ctx.fill(); }
    ctx.restore();
  }
  function getState(){
    const tracksEl=document.getElementById('tracks');
    const tracks=[...tracksEl.children].map(r=>r.value()).filter(t=>t.name||t.dur||Number.isFinite(t.score));
    return { album:document.getElementById('album').value.trim(), artist:document.getElementById('artist').value.trim(), released:document.getElementById('released').value.trim(), rankedby:document.getElementById('rankedby').value.trim(), cover:document.getElementById('coverOut').src||'', tracks };
  }
  function exportCanvas(w,h,filename){
    const s=getState();
    const bg=new Image();
    bg.onload=()=>{
      const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; const ctx=canvas.getContext('2d');
      ctx.filter='blur(24px)';
      const rw=Math.max(w, h*bg.width/bg.height), rh=Math.max(h, w*bg.height/bg.width);
      ctx.drawImage(bg,(w-rw)/2,(h-rh)/2,rw,rh); ctx.filter='none';
      ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(0,0,w,h);
      const panel={x:64,y:64,w:w-128,h:h-128,r:28};
      ctx.fillStyle='rgba(15,17,21,.55)'; ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=1.2;
      ctx.beginPath(); const r=panel.r;
      ctx.moveTo(panel.x+r,panel.y);
      ctx.arcTo(panel.x+panel.w,panel.y,panel.x+panel.w,panel.y+panel.h,r);
      ctx.arcTo(panel.x+panel.w,panel.y+panel.h,panel.x,panel.y+panel.h,r);
      ctx.arcTo(panel.x,panel.y+panel.h,panel.x,panel.y,r);
      ctx.arcTo(panel.x,panel.y,panel.x+panel.w,panel.y,r);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      const pad=36, left=panel.x+pad, right=panel.x+panel.w-pad;
      ctx.fillStyle='#fff'; ctx.font='800 72px system-ui, Arial'; ctx.fillText(s.album||'—', left, panel.y+90);
      ctx.font='600 36px system-ui, Arial'; ctx.fillText(s.artist||'—', left, panel.y+130);
      ctx.font='500 26px system-ui, Arial'; ctx.fillText(s.released||'—', left, panel.y+165);
      const coverSize=360, coverY=panel.y+pad, coverX=right-coverSize;
      const coverImg=new Image();
      coverImg.onload=()=>{
        ctx.drawImage(coverImg, coverX, coverY, coverSize, coverSize);
        const scores=(s.tracks||[]).map(t=>t.score).filter(v=>Number.isFinite(v));
        const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length):NaN;
        ctx.fillStyle='#fff'; ctx.font='800 120px system-ui, Arial'; ctx.fillText(Number.isFinite(avg)?avg.toFixed(1):'—', coverX, coverY+coverSize+120);
        const tableTop=panel.y+220; const yEnd=drawRowsOnCanvas(ctx,(s.tracks||[]),left,tableTop);
        const chartTop=Math.max(yEnd+30, coverY+coverSize+160); const chartH=260; const chartW=right-left;
        drawExportChart(ctx, (s.tracks||[]).map(t=>t.score), left, chartTop, chartW, chartH);
        if(s.rankedby){ ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='500 24px system-ui, Arial'; ctx.fillText('Ranked by: '+s.rankedby, left, panel.y+panel.h-26); }
        ctx.fillStyle='rgba(255,255,255,.7)'; ctx.font='500 20px system-ui, Arial';
        ctx.fillText('Created by Ok Pretty Boy with help from ChatGPT', left, panel.y+panel.h-60);
        const url=canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
      };
      coverImg.onerror=()=>{
        const scores=(s.tracks||[]).map(t=>t.score).filter(v=>Number.isFinite(v));
        const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length):NaN;
        ctx.fillStyle='#fff'; ctx.font='800 120px system-ui, Arial'; ctx.fillText(Number.isFinite(avg)?avg.toFixed(1):'—', right-coverSize, panel.y+pad+coverSize+120);
        const tableTop=panel.y+220; const yEnd=drawRowsOnCanvas(ctx,(s.tracks||[]),left,tableTop);
        const chartTop=Math.max(yEnd+30, panel.y+pad+coverSize+160); const chartH=260; const chartW=right-left;
        drawExportChart(ctx, (s.tracks||[]).map(t=>t.score), left, chartTop, chartW, chartH);
        const url=canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
      };
      coverImg.src = s.cover || '';
    };
    bg.onerror=()=>{
      const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; const ctx=canvas.getContext('2d');
      ctx.fillStyle='#0f1115'; ctx.fillRect(0,0,w,h); ctx.fillStyle='#fff'; ctx.font='800 72px system-ui, Arial'; ctx.fillText('Album Rater',80,140);
      const url=canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
    };
    bg.src = (getState().cover||'');
  }
  document.getElementById('exportStory').onclick=()=> exportCanvas(1080,1920,'album-story.png');
  document.getElementById('export45').onclick=()=> exportCanvas(1080,1350,'album-4x5.png');
})();