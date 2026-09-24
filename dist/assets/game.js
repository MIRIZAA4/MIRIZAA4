// עזרים משותפים למשחקים
window.G = {
  pad(n){return String(n).padStart(2,"0");},
  fmt(sec){sec=Math.max(0,Math.round(sec));return G.pad(Math.floor(sec/60))+":"+G.pad(sec%60);},
  // טיימר ספירה לאחור/קדימה. onTick(secLeftOrElapsed), onEnd()
  timer(el, opts){
    let t={sec:opts.seconds||0, dir:opts.dir||-1, running:false, id:null};
    function draw(){ if(el){ el.textContent=G.fmt(t.sec); el.classList.toggle("warn", t.dir<0 && t.sec<=10); } }
    t.start=()=>{ if(t.running) return; t.running=true; t.id=setInterval(()=>{ t.sec+=t.dir; draw(); opts.onTick&&opts.onTick(t.sec); if(t.dir<0&&t.sec<=0){t.stop(); opts.onEnd&&opts.onEnd();} },1000); draw(); };
    t.stop=()=>{t.running=false; clearInterval(t.id);};
    t.reset=(s)=>{t.stop(); t.sec=(s!=null?s:(opts.seconds||0)); draw();};
    t.add=(s)=>{t.sec+=s; draw();};
    draw(); return t;
  },
  beep(freq,ms){ try{ const a=G._ac||(G._ac=new (window.AudioContext||window.webkitAudioContext)()); const o=a.createOscillator(), g=a.createGain(); o.frequency.value=freq||660; o.connect(g); g.connect(a.destination); g.gain.value=.15; o.start(); setTimeout(()=>{o.stop();}, ms||180);}catch(e){} },
  shuffle(a){a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a;},
  norm(s){ return (s||"").toString().trim().replace(/["'״׳\-\s]/g,"").replace(/ך/g,"כ").replace(/ם/g,"מ").replace(/ן/g,"נ").replace(/ף/g,"פ").replace(/ץ/g,"צ"); },
  save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
  load(k,d){try{const v=localStorage.getItem(k); return v?JSON.parse(v):d;}catch(e){return d;}},
  el(id){return document.getElementById(id);},
  // אישור בשתי לחיצות (במקום חלון קופץ)
  ask(btn, fn){ if(btn.dataset.armed){ delete btn.dataset.armed; btn.textContent=btn.dataset.orig; fn(); return; } btn.dataset.orig=btn.textContent; btn.dataset.armed="1"; btn.textContent="בטוח? לחצו שוב"; setTimeout(()=>{ if(btn.dataset.armed){ delete btn.dataset.armed; btn.textContent=btn.dataset.orig; } },3000); },
  note(el,msg,ok){ el.className="feedback "+(ok?"ok":"bad"); el.textContent=msg; },
  shell(title, backHref){
    const h=document.createElement("header"); h.className="site";
    h.innerHTML=`<div class="container"><a class="logo" href="${backHref||"../index.html"}"><span class="mark">משחקי</span> משפחה</a><nav><a href="${backHref||"../index.html"}">← לכל המשחקים</a></nav></div>`;
    document.body.prepend(h);
    document.title=title+" · משחקי משפחה";
  }
};
