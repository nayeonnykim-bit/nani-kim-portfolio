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
const steps={helvetica:[[100,"UltraLight"],[300,"Light"],[400,"Regular"],[500,"Medium"],[700,"Bold"]],caslon:[[400,"Regular"],[600,"SemiBold"],[700,"Bold"]]};
function bind(card){if(card.dataset.weightBound)return;card.dataset.weightBound="true";const values=steps[card.dataset.font],slider=card.querySelector(".type-weight-slider"),knob=card.querySelector(".type-weight-knob"),number=card.querySelector(".type-weight-number"),label=card.querySelector(".type-weight-label"),preview=card.querySelector(".type-characters");let current=400,dragging=false;
const apply=raw=>{const next=values.reduce((a,b)=>Math.abs(b[0]-raw)<Math.abs(a[0]-raw)?b:a);current=next[0];preview.style.fontWeight=current;number.value=current;number.textContent=current;label.textContent=next[1];slider.setAttribute("aria-valuenow",current);knob.style.left=((current-values[0][0])/(values.at(-1)[0]-values[0][0])*100)+"%";};
const fromX=x=>{const r=slider.getBoundingClientRect(),t=Math.max(0,Math.min(1,(x-r.left)/r.width));return values[0][0]+t*(values.at(-1)[0]-values[0][0]);};
slider.addEventListener("pointerdown",e=>{dragging=true;slider.setPointerCapture(e.pointerId);apply(fromX(e.clientX));});slider.addEventListener("pointermove",e=>{if(dragging)apply(fromX(e.clientX));});for(const type of ["pointerup","pointercancel"])slider.addEventListener(type,()=>dragging=false);
slider.addEventListener("keydown",e=>{const i=values.findIndex(s=>s[0]===current);if(e.key==="ArrowRight"&&i<values.length-1){e.preventDefault();apply(values[i+1][0]);}if(e.key==="ArrowLeft"&&i>0){e.preventDefault();apply(values[i-1][0]);}});
apply(current);}
function init(){let section=document.querySelector("[data-oclock-type-lab]");if(!section){const target=document.querySelector(".project-info");if(!target)return;target.insertAdjacentHTML("afterend",markup());section=document.querySelector("[data-oclock-type-lab]");window.__portfolioEditor?.select?.(section);window.__portfolioEditor?.save?.(false);}section.querySelectorAll(".type-specimen").forEach(bind);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();setTimeout(init,600);
})();
