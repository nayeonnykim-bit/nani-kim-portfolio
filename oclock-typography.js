(()=>{"use strict";
const markup=()=>`<section class="oclock-type-lab" data-editable-section data-layer-name="Typography comparison" data-oclock-type-lab>
  <article class="type-specimen" data-font="helvetica">
    <h2>Helvetica</h2>
    <div class="type-characters"><p>abcdefghijklmnop</p><p>ABCDEFGHIJKLMNOP</p><p>0123456789</p><p>!@#%”&amp;*?[]().</p></div>
    <div class="type-weight-control"><div class="type-weight-slider" role="slider" tabindex="0" aria-label="Helvetica font weight" aria-valuemin="100" aria-valuemax="700" aria-valuenow="400"><span class="type-weight-knob"></span></div><output class="type-weight-number">400</output></div><span class="type-weight-label">Regular</span>
  </article>
  <article class="type-specimen" data-font="caslon">
    <h2>Adobe Caslon Pro</h2>
    <div class="type-characters"><p>abcdefghijklmnop</p><p>ABCDEFGHIJKLMNOP</p><p>0123456789</p><p>!@#%”&amp;*?[]().</p></div>
    <div class="type-weight-control"><div class="type-weight-slider" role="slider" tabindex="0" aria-label="Adobe Caslon Pro font weight" aria-valuemin="400" aria-valuemax="700" aria-valuenow="400"><span class="type-weight-knob"></span></div><output class="type-weight-number">400</output></div><span class="type-weight-label">Regular</span>
  </article>
</section>`;
const steps={helvetica:[[100,"Thin"],[200,"UltraLight"],[300,"Light"],[400,"Regular"],[550,"Medium"],[700,"Bold"],[900,"Black"]],caslon:[[400,"Regular"],[600,"Semibold"],[700,"Bold"]]};
const bound=new WeakSet();
function bind(card){if(bound.has(card))return;const values=steps[card.dataset.font],slider=card.querySelector(".type-weight-slider"),knob=card.querySelector(".type-weight-knob"),number=card.querySelector(".type-weight-number"),label=card.querySelector(".type-weight-label"),preview=card.querySelector(".type-characters");if(!values||!slider||!knob||!number||!label||!preview)return;bound.add(card);delete card.dataset.weightBound;let current=Number(slider.getAttribute('aria-valuenow'))||400,dragging=false;
const family=card.dataset.font==='caslon'?'PortfolioCaslon':'PortfolioHelvetica';
const faces=values.map(([weight,name])=>({weight,name,family,style:'normal'}));
if(card.dataset.font==='helvetica')faces.push({weight:900,name:'Heavy',family:'PortfolioHelveticaHeavy',style:'normal'});
faces.push(...faces.map(face=>({...face,name:face.name==='Regular'?'Italic':face.name+' Italic',style:'italic',...(card.dataset.font==='helvetica'&&face.name==='Regular'?{weight:550,family:'PortfolioHelveticaItalic'}:{})})));
let picker=card.querySelector('.type-face-select');if(picker)picker.remove();picker=document.createElement('select');picker.className='type-face-select';picker.setAttribute('aria-label',(card.dataset.font==='caslon'?'Adobe Caslon Pro':'Helvetica')+' font style');faces.forEach((face,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=face.name+' · '+face.weight;picker.append(option);});card.append(picker);
let active=faces.find(face=>face.name===card.dataset.fontFace)||null;
const apply=(raw,face)=>{const next=values.reduce((a,b)=>Math.abs(b[0]-raw)<Math.abs(a[0]-raw)?b:a);active=face||faces.find(f=>f.weight===next[0]&&f.style===(active?.style||'normal'))||faces.find(f=>f.weight===next[0]);current=active.weight;card.dataset.fontFace=active.name;[preview,...preview.children].forEach(row=>{row.style.setProperty('font-weight',String(current),'important');row.style.setProperty('font-family',active.family,'important');row.style.setProperty('font-style',active.style,'important');row.style.setProperty('font-synthesis','none');});picker.value=String(faces.indexOf(active));number.value=current;number.textContent=current;label.textContent=active.name;slider.setAttribute("aria-valuemin",values[0][0]);slider.setAttribute("aria-valuemax",values.at(-1)[0]);slider.setAttribute("aria-valuenow",current);slider.setAttribute('aria-valuetext',current+' '+active.name);knob.style.left=((current-values[0][0])/(values.at(-1)[0]-values[0][0])*100)+"%";};
const fromX=x=>{const r=slider.getBoundingClientRect(),t=Math.max(0,Math.min(1,(x-r.left)/r.width));return values[0][0]+t*(values.at(-1)[0]-values[0][0]);};
const save=()=>{if(document.body.classList.contains('debug-editing'))window.__portfolioEditor?.save?.(false);};
picker.addEventListener('change',()=>{const face=faces[Number(picker.value)];apply(face.weight,face);save();});picker.addEventListener('click',e=>e.stopPropagation());
slider.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();dragging=true;slider.focus();slider.setPointerCapture(e.pointerId);apply(fromX(e.clientX));});slider.addEventListener("pointermove",e=>{if(dragging)apply(fromX(e.clientX));});for(const type of ["pointerup","pointercancel"])slider.addEventListener(type,()=>{if(dragging){dragging=false;save();}});
slider.addEventListener('click',e=>e.stopPropagation());
slider.addEventListener("keydown",e=>{const i=values.findIndex(s=>s[0]===current);let next;if(e.key==='ArrowRight'||e.key==='ArrowUp')next=values[Math.min(values.length-1,i+1)][0];if(e.key==='ArrowLeft'||e.key==='ArrowDown')next=values[Math.max(0,i-1)][0];if(e.key==='Home')next=values[0][0];if(e.key==='End')next=values.at(-1)[0];if(next!==undefined){e.preventDefault();e.stopPropagation();apply(next);save();}});
apply(current,active);}
function init(){let section=document.querySelector("[data-oclock-type-lab]");if(!section){const target=document.querySelector(".project-info");if(!target)return;target.insertAdjacentHTML("afterend",markup());section=document.querySelector("[data-oclock-type-lab]");window.__portfolioEditor?.select?.(section);window.__portfolioEditor?.save?.(false);}section.querySelectorAll(".type-specimen").forEach(bind);}
const observe=()=>{init();const main=document.querySelector('main');if(main)new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.type-specimen,[data-oclock-type-lab]')||n.querySelector?.('.type-specimen')))))main.querySelectorAll('.type-specimen').forEach(bind);}).observe(main,{childList:true,subtree:true});};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observe);else observe();
})();
