// בורר רקע: שחור / לבן / צבעוני. נשמר במחשב.
(function(){
  var KEY="skin", root=document.documentElement;
  function get(){ try{ return localStorage.getItem(KEY)||"dark"; }catch(e){ return "dark"; } }
  function apply(s){ root.setAttribute("data-skin",s); document.querySelectorAll(".skins button").forEach(function(b){ b.classList.toggle("on",b.dataset.skin===s); }); }
  function set(s){ try{ localStorage.setItem(KEY,s); }catch(e){} apply(s); }
  apply(get());
  window.Skin={set:set,get:get,
    html:function(){ return '<div class="skins" title="רקע"><button data-skin="dark">שחור</button><button data-skin="light">לבן</button><button data-skin="color">צבעוני</button></div>'; },
    wire:function(){ document.querySelectorAll(".skins button").forEach(function(b){ b.onclick=function(){ set(b.dataset.skin); }; }); apply(get()); }};
  document.addEventListener("DOMContentLoaded",window.Skin.wire);
})();
