// גישה למשחקים. כרגע: קודי פתיחה (עד חיבור ספק סליקה). הקודים יוחלפו במנגנון תשלום אמיתי.
window.Access = (function(){
  const CODES = { "print-house":["DAFUS2026","MISHPACHA"], "couple-quiz":["MAZALTOV","MISHPACHA"], "family-race":["MEROTZ","MISHPACHA"], "family-court":["MISHPAT","MISHPACHA"] };
  function owned(id){ try{ return localStorage.getItem("owned:"+id)==="1"; }catch(e){ return false; } }
  function unlock(id, code){
    code=(code||"").trim().toUpperCase();
    if((CODES[id]||[]).includes(code)){ try{localStorage.setItem("owned:"+id,"1");}catch(e){} return true; }
    return false;
  }
  function ensureModal(){
    if(document.getElementById("accessModal")) return;
    const d=document.createElement("div"); d.className="modal-bg"; d.id="accessModal";
    d.innerHTML=`<div class="modal">
      <h3>🔒 המשך המשחק פתוח לרוכשים</h3>
      <p>נהניתם מהטעימה? כדי להמשיך יש לרכוש את המשחק. אחרי הרכישה מקבלים קוד פתיחה.</p>
      <p class="small muted">(בשלב זה האתר בהרצה: הרכישה מתבצעת מול בעלי האתר, והקוד מגיע במייל או בטלפון.)</p>
      <label>קוד פתיחה</label>
      <div class="answer-row"><input type="text" id="accessCode" placeholder="הקלידו קוד"><button class="btn primary" id="accessBtn">פתיחה</button></div>
      <div class="feedback" id="accessFb"></div>
      <div class="row" style="margin-top:12px"><a class="btn gold" href="../index.html#buy">לרכישה</a><button class="btn ghost" id="accessClose">סגירה</button></div>
    </div>`;
    document.body.appendChild(d);
    d.querySelector("#accessClose").onclick=()=>d.classList.remove("open");
  }
  // מחזיר true אם יש גישה; אחרת פותח חלון ומחזיר false. onUnlock נקרא אחרי פתיחה מוצלחת.
  function require(id, onUnlock){
    if(owned(id)) return true;
    ensureModal();
    const d=document.getElementById("accessModal"); d.classList.add("open");
    const fb=d.querySelector("#accessFb"), inp=d.querySelector("#accessCode");
    d.querySelector("#accessBtn").onclick=()=>{
      if(unlock(id, inp.value)){ fb.className="feedback ok"; fb.textContent="המשחק נפתח. בהצלחה!"; setTimeout(()=>{d.classList.remove("open"); onUnlock&&onUnlock();},600); }
      else { fb.className="feedback bad"; fb.textContent="הקוד לא נכון."; }
    };
    return false;
  }
  return {owned, unlock, require};
})();
