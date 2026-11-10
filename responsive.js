(() => {
  const home=/(?:^|\/)(?:index\.html)?$/.test(location.pathname);
  let nav=document.querySelector('.nav-wrap,.project-nav');
  if(!nav)return;
  if(nav.classList.contains('project-nav')){
    nav.innerHTML='<a class="nav-brand" href="./index.html#works">NNN_</a><button class="mobile-menu-button" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-navigation"><span></span><span></span><span></span></button><div id="mobile-navigation" class="project-nav-links"><a href="./index.html#works">Work</a><a href="./index.html#photography">Photography</a><a href="./about.html">About</a></div>';
  }
  let button=nav.querySelector('.mobile-menu-button');
  if(!button){button=document.createElement('button');button.className='mobile-menu-button';button.type='button';button.setAttribute('aria-label','Open menu');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','mobile-navigation');button.innerHTML='<span></span><span></span><span></span>';nav.insertBefore(button,nav.querySelector('nav,.project-nav-links'));}
  let links=nav.querySelector('nav,.project-nav-links');links.id='mobile-navigation';
  const makeToggle=()=>{const control=document.createElement('button');control.type='button';control.className='liquid-toggle';control.setAttribute('role','switch');control.setAttribute('aria-label','Visual mode');control.innerHTML='<span class="liquid-toggle-knob"></span>';return control;};
  const navToggle=makeToggle();nav.append(navToggle);
  const panel=document.createElement('div');panel.className='responsive-menu-panel';panel.setAttribute('aria-hidden','true');panel.innerHTML='<div class="responsive-menu-head"><a href="./index.html#works">NNN_</a><button type="button" class="responsive-menu-close" aria-label="Close menu">×</button></div><div class="responsive-menu-main"><a href="./index.html#works">Work</a><a href="./index.html#photography">Photography</a><a href="./about.html">About</a></div><div class="responsive-menu-foot"><span>SOCIAL</span><span>Instagram</span><span>LinkedIn</span></div>';
  const panelToggle=makeToggle();panel.querySelector('.responsive-menu-head').insertBefore(panelToggle,panel.querySelector('.responsive-menu-close'));
  let toggleOn=localStorage.getItem('portfolio-liquid-toggle')==='on';
  const paintToggle=()=>{document.body.classList.toggle('portfolio-dark',toggleOn);for(const control of [navToggle,panelToggle])control.setAttribute('aria-checked',String(toggleOn));};
  for(const control of [navToggle,panelToggle])control.addEventListener('click',()=>{toggleOn=!toggleOn;localStorage.setItem('portfolio-liquid-toggle',toggleOn?'on':'off');paintToggle();});
  paintToggle();
  document.body.append(panel);
  const close=()=>{document.body.classList.remove('responsive-menu-open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open menu');panel.setAttribute('aria-hidden','true');};
  button.addEventListener('click',()=>{const open=!document.body.classList.contains('responsive-menu-open');document.body.classList.toggle('responsive-menu-open',open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Close menu':'Open menu');panel.setAttribute('aria-hidden',String(!open));});
  panel.querySelector('.responsive-menu-close').addEventListener('click',close);
  panel.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  const responsiveOriginals=new WeakMap();
  const adapted=new Set();
  const adaptiveRules=[['.project-hero h1,.project-info h2','font-size'],['.project-hero','min-height'],['.oclock-type-lab','padding'],['.oclock-type-lab','gap'],['.project-hero video,.project-hero img,.editor-media-frame video,.editor-media-frame img','object-fit'],['.works[data-project-grid],.editor-columns,.project-gallery,.custom-section[data-columns]','grid-template-columns']];
  const adaptMedia=()=>{
    const narrow=innerWidth<=980;
    for(const [selector,prop] of adaptiveRules){
      document.querySelectorAll(selector).forEach(el=>{
        if(narrow){
          let original=responsiveOriginals.get(el);
          if(!original){original={};responsiveOriginals.set(el,original);}
          if(!(prop in original))original[prop]=[el.style.getPropertyValue(prop),el.style.getPropertyPriority(prop)];
          if(el.style.getPropertyValue(prop))el.style.removeProperty(prop);
          adapted.add(el);
        }
      });
    }
    if(!narrow){for(const el of adapted){const original=responsiveOriginals.get(el)||{};for(const [prop,[value,priority]] of Object.entries(original))if(value)el.style.setProperty(prop,value,priority);else el.style.removeProperty(prop);responsiveOriginals.delete(el);}adapted.clear();}
  };
  adaptMedia();window.addEventListener('resize',adaptMedia);
  const lockCardRadius=()=>{
    document.querySelectorAll('main .panel,main .editor-column,main .editor-media-frame,main .gallery-slide,main .project-gallery figure,main .custom-section,main .next-project,main .project-hero').forEach(el=>{if(el.style.getPropertyValue('border-radius')!=='10px'||el.style.getPropertyPriority('border-radius')!=='important')el.style.setProperty('border-radius','10px','important');});
    document.querySelectorAll('main .project-hero h1').forEach(el=>{if(el.style.getPropertyValue('letter-spacing')!=='-.025em'||el.style.getPropertyPriority('letter-spacing')!=='important')el.style.setProperty('letter-spacing','-.025em','important');});
    document.querySelectorAll('main .editor-columns:has(> .oclock-hover-card:not(.editor-media-frame))>.oclock-hover-card').forEach(el=>{for(const property of ['height','min-height','max-height'])if(el.style.getPropertyValue(property)!=='120px'||el.style.getPropertyPriority(property)!=='important')el.style.setProperty(property,'120px','important');});
  };
  lockCardRadius();
  const mediaObserver=new MutationObserver(()=>{if(innerWidth<=980)adaptMedia();lockCardRadius();});
  mediaObserver.observe(document.querySelector('main'),{subtree:true,childList:true,attributes:true,attributeFilter:['style']});
  if('IntersectionObserver' in window){
    const hoverObserver=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('in-view',entry.isIntersecting&&entry.intersectionRatio>=.45);},{threshold:[0,.25,.45,.65,1]});
    const observeHover=()=>document.querySelectorAll('[data-project-grid] .project,.editor-hoverable,.oclock-hover-card').forEach(el=>{if(el.dataset.scrollHoverBound)return;el.dataset.scrollHoverBound='true';hoverObserver.observe(el);});
    observeHover();const hoverMount=new MutationObserver(observeHover);hoverMount.observe(document.querySelector('main'),{childList:true,subtree:true});
  }
  const revealSelector='[data-project-grid] .project,.oclock-hover-card,.editor-media-frame:not(.oclock-hover-card),.editor-photo-gallery>.gallery-slide,.project-gallery figure:not(.editor-media-frame)';
  const updateScrollReveal=()=>{const viewport=window.innerHeight||1,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;for(const card of document.querySelectorAll(revealSelector)){const box=card.getBoundingClientRect();const position=Math.max(0,Math.min(1,(viewport*.94-box.top)/(viewport*.74)));const progress=reduced?1:position*position*(3-2*position);card.style.setProperty('--scroll-blur',`${(5*(1-progress)).toFixed(2)}px`);card.style.setProperty('--reveal-opacity',(0.38+0.62*progress).toFixed(3));}};
  let revealFrame=0;const scheduleScrollReveal=()=>{if(revealFrame)return;revealFrame=requestAnimationFrame(()=>{revealFrame=0;updateScrollReveal();});};
  window.addEventListener('scroll',scheduleScrollReveal,{passive:true});window.addEventListener('resize',scheduleScrollReveal);
  updateScrollReveal();
  new MutationObserver(scheduleScrollReveal).observe(document.querySelector('main'),{childList:true,subtree:true});
  const settingsKey='portfolio-responsive-settings';let settings={};try{settings=JSON.parse(localStorage.getItem(settingsKey)||'{}')}catch{}
  const style=document.createElement('style');style.id='responsive-user-styles';document.head.append(style);
  const apply=()=>{const t=Math.max(0,Math.min(120,Number(settings.tabletPadding??32))),m=Math.max(0,Math.min(120,Number(settings.mobilePadding??20)));style.textContent=`@media(min-width:981px){body .nav-wrap,body .project-nav{top:var(--nav-y)!important;left:var(--desktop-edge)!important;right:var(--desktop-edge)!important;width:auto!important;box-shadow:none!important}body main{padding-left:var(--desktop-edge)!important;padding-right:var(--desktop-edge)!important;padding-top:calc(var(--nav-y) * 2 + var(--nav-height))!important}}@media(max-width:980px){body main{padding-left:24px!important;padding-right:24px!important;padding-top:calc(var(--nav-y) * 2 + var(--nav-height))!important}body main .works[data-project-grid]{grid-template-columns:minmax(0,1fr)!important}body main .project-hero h1{font-size:clamp(44px,9vw,78px)!important;line-height:.95!important}body main .project-info h2{font-size:clamp(42px,7vw,64px)!important;line-height:1!important}body main .project-hero-copy{padding:40px!important}body main .project-info{padding:50px 40px!important}body main .editor-columns,body main .project-gallery{grid-template-columns:minmax(0,1fr)!important}}@media(min-width:641px) and (max-width:980px){body main .works[data-project-grid] .project-copy{padding:${t}px!important}}@media(max-width:640px){body main{padding-left:16px!important;padding-right:16px!important;padding-top:calc(var(--nav-y) * 2 + var(--nav-height))!important}body main .works[data-project-grid] .project-copy{padding:${m}px!important}body main .project-hero h1{font-size:clamp(40px,12vw,56px)!important;line-height:1!important}body main .project-info h2{font-size:clamp(36px,10vw,46px)!important;line-height:1.03!important}body main .project-hero-copy{padding:24px!important}body main .project-info{padding:40px 24px!important}body main .project-summary{font-size:18px!important;line-height:1.25!important}}body main :is(.panel,.editor-column,.editor-media-frame,.gallery-slide,.project-gallery figure,.custom-section,.next-project,.project-hero){border-radius:10px!important}body main .works[data-project-grid],body main .editor-columns,body main .project-gallery{column-gap:14px!important;row-gap:14px!important}@media(max-width:980px){body main .works[data-project-grid],body main .editor-columns,body main .project-gallery{column-gap:16px!important;row-gap:16px!important}}`;};apply();
  const mount=()=>{const editor=document.querySelector('#editor-tool-page');if(!editor||editor.querySelector('#responsive-controls'))return false;const box=document.createElement('details');box.id='responsive-controls';box.className='debug-group';box.open=true;box.innerHTML='<summary>Tablet & mobile</summary><p class="editor-note">Open a real screen-size preview. You can edit inside that window, then return to this desktop window.</p><div class="debug-grid"><button type="button" data-preview="tablet">Open tablet · 768px</button><button type="button" data-preview="mobile">Open mobile · 390px</button></div><label>Tablet card padding <input id="tablet-card-padding" type="number" min="0" max="120"></label><label>Mobile card padding <input id="mobile-card-padding" type="number" min="0" max="120"></label>';
  editor.prepend(box);box.querySelector('#tablet-card-padding').value=settings.tabletPadding??32;box.querySelector('#mobile-card-padding').value=settings.mobilePadding??20;
  box.querySelectorAll('[data-preview]').forEach(b=>b.addEventListener('click',()=>{const mobile=b.dataset.preview==='mobile';window.open(location.href,mobile?'portfolio-mobile-preview':'portfolio-tablet-preview',`width=${mobile?390:768},height=${mobile?844:1024},resizable=yes,scrollbars=yes`);}));
  for(const [id,key] of [['tablet-card-padding','tabletPadding'],['mobile-card-padding','mobilePadding']])box.querySelector('#'+id).addEventListener('input',e=>{settings[key]=e.target.value;localStorage.setItem(settingsKey,JSON.stringify(settings));apply();});return true;};
  if(!mount()){const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});}
})();
