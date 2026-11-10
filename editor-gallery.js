/* Gallery state lives in the page; image bytes use the editor's existing asset store. */
export function setupGallery(api){
  const {main,menu,M,select,commit,scan,report,renderSettings}=api;
  const $=s=>menu.querySelector(s),timers=new Map(),bound=new WeakSet();
  const active=()=>{const selected=api.selection();if(!selected)return null;const owner=selected.closest('.editor-photo-gallery');if(owner)return owner;const nested=selected.querySelectorAll('.editor-photo-gallery');return nested.length===1?nested[0]:null;};
  const slides=g=>[...g.querySelectorAll(':scope > .gallery-slide')];
  const specs=[['mode','Layout','select','slideshow',['grid','columnized','slideshow','freeform','justify']],['columns','Columns','number','2'],['gap','Gap (px)','number','8'],['height','Height (px)','number','500'],['interval','Slide duration (seconds)','number','4'],['speed','Transition speed (seconds)','number','0.5'],['nav','Navigation','select','arrows',['none','arrows','dots','both']],['fit','Image fit','select','contain',['contain','cover']],['horizontal','Horizontal align','select','center',['left','center','right']],['vertical','Vertical align','select','center',['top','center','bottom']],['autoplay','Autoplay','checkbox',true],['captions','Captions','checkbox',true],['fullwidth','Full width','checkbox',true],['zoom','Disable zoom','checkbox',true],['shuffle','Shuffle','checkbox',false]];
  const box=document.createElement('details');box.className='debug-group';box.open=true;box.id='gallery-settings';box.innerHTML='<summary>Photo gallery / slideshow</summary><button type="button" id="gallery-add">+ Photo gallery</button><label class="debug-upload">Add photos / videos<input id="gallery-upload" type="file" multiple accept="image/*,video/*"></label><p class="editor-note">Select a gallery, then add photos. Images use the Media optimization setting. Select an existing project gallery and choose Convert below to use its photos.</p><button type="button" id="gallery-convert">Convert selected photo gallery</button>'+specs.map(([key,label,type,value,options])=>'<label>'+label+(type==='select'?'<select id="gallery-'+key+'">'+options.map(o=>'<option value="'+o+'"'+(o===value?' selected':'')+'>'+o+'</option>').join('')+'</select>':'<input id="gallery-'+key+'" type="'+type+'" '+(type==='checkbox'?(value?'checked':''):'value="'+value+'" min="0" max="'+(key==='columns'?7:3000)+'" step="'+(['speed','interval'].includes(key)?'.1':'1')+'"')+'>')+'</label>').join('')+'<div class="debug-grid"><button type="button" id="gallery-previous">← Preview previous</button><button type="button" id="gallery-next">Preview next →</button></div><p id="gallery-summary" class="editor-note" aria-live="polite">No gallery selected.</p><div id="gallery-slides-list"></div>';
  $('#editor-tool-media').prepend(box);
  const extra=[['effect','Transition effect','select','fade',['fade','slide']],['frame','Frame ratio','select','fixed',['fixed','original']],['pauseHover','Pause on hover','checkbox',false],['preview','Play while editing','checkbox',true]];specs.push(...extra);$('#gallery-interval').closest('label').firstChild.textContent='Delay (seconds) ';$('#gallery-nav').insertAdjacentHTML('beforeend','<option value="single">single advance · click photo</option>');$('#gallery-speed').closest('label').insertAdjacentHTML('afterend',extra.map(([key,label,type,value,options])=>'<label>'+label+(type==='select'?'<select id="gallery-'+key+'">'+options.map(v=>'<option value="'+v+'">'+v+'</option>').join('')+'</select>':'<input id="gallery-'+key+'" type="checkbox" '+(value?'checked':'')+'>')+'</label>').join(''));const galleryPicker=document.createElement('label');galleryPicker.innerHTML='Editing gallery<select id="gallery-target" aria-label="Editing photo gallery"><option value="">Select a gallery on the page</option></select>';box.querySelector('summary').after(galleryPicker);$('#gallery-target').addEventListener('change',e=>{const galleries=[...main.querySelectorAll('.editor-photo-gallery')],g=galleries[Number(e.target.value)];if(g){select(g);api.tab('media');sync();}});
  const addButton=document.createElement('button');addButton.type='button';addButton.dataset.add='gallery';addButton.textContent='+ Gallery';$('#editor-tool-page [data-add="columns"]').after(addButton);
  function init(g){for(const[key,,type,value]of specs)if(g.dataset['gallery'+cap(key)]===undefined)g.dataset['gallery'+cap(key)]=String(value);g.dataset.editableSection='';g.dataset.layerName||='Photo gallery';g.dataset.editorCreated='gallery';g.classList.add('editor-photo-gallery','panel');}
  function cap(s){return s[0].toUpperCase()+s.slice(1);}
  function freeformControls(row,slide,i,g){for(const[key,label,value]of [['x','Freeform X (%)',(i%3)*32],['y','Freeform Y (px)',Math.floor(i/3)*200],['width','Freeform width (%)',30]]){const wrap=document.createElement('label'),input=document.createElement('input');wrap.textContent=label;input.type='number';input.value=slide.style.getPropertyValue('--slide-'+key).replace(/px|%/g,'')||value;input.onchange=()=>{slide.style.setProperty('--slide-'+key,(+input.value||0)+(key==='y'?'px':'%'));commit();};wrap.append(input);row.append(wrap);slide.style.setProperty('--slide-'+key,input.value+(key==='y'?'px':'%'));}}
  function show(g,index){const items=slides(g);if(!items.length)return;index=((index%items.length)+items.length)%items.length;const count=Math.min(items.length,Math.max(1,Math.min(7,Number(g.dataset.galleryColumns)||2)));g.style.setProperty('--gallery-visible',count);items.forEach((s,i)=>{const slot=(i-index+items.length)%items.length,visible=slot<count;s.style.setProperty('--gallery-slot',slot);s.classList.toggle('gallery-active',visible);s.setAttribute('aria-hidden',String(g.dataset.galleryMode==='slideshow'&&!visible));s.querySelectorAll('video').forEach(v=>{if(g.dataset.galleryMode==='slideshow'&&!visible)v.pause();else if(v.autoplay)v.play().catch(()=>{});});});g.dataset.galleryCurrent=String(index);g.querySelectorAll('.gallery-dot').forEach((d,i)=>d.setAttribute('aria-current',String(i===index)));}
  function step(g,dir){const items=slides(g);let i=+(g.dataset.galleryCurrent||0);if(g.dataset.galleryShuffle==='true'&&dir>0&&items.length>1)i=(i+1+Math.floor(Math.random()*(items.length-1)))%items.length;else i+=dir;show(g,i);}
  const sizes=new Map();
  function originalHeight(g){if(g.dataset.galleryFrame!=='original')return;const img=g.querySelector('.gallery-slide img,.gallery-slide video'),aspect=(img?.naturalWidth||img?.videoWidth||Number(img?.getAttribute('width'))||2)/(img?.naturalHeight||img?.videoHeight||Number(img?.getAttribute('height'))||3),count=Math.max(1,Number(g.style.getPropertyValue('--gallery-visible'))||Number(g.dataset.galleryColumns)||1),gap=Number(g.dataset.galleryGap)||0;const height=Math.max(1,(g.clientWidth-(count-1)*gap)/count/aspect);g.style.setProperty('--gallery-original-height',height+'px');}
  function refresh(){
    for(const[g,t]of timers)if(!g.isConnected){clearInterval(t);timers.delete(g);}
    for(const[g,observer]of sizes)if(!g.isConnected){observer.disconnect();sizes.delete(g);}
    main.querySelectorAll('.editor-photo-gallery').forEach(g=>{
      init(g);g.classList.remove('project-gallery');const columns=Math.max(1,Math.min(7,+g.dataset.galleryColumns||2));g.style.setProperty('--gallery-columns',columns);if(g.dataset.galleryMode==='grid')g.style.setProperty('grid-template-columns','repeat('+columns+',minmax(0,1fr))','important');else g.style.removeProperty('grid-template-columns');if(g.dataset.galleryMode==='columnized')g.style.setProperty('column-count',columns,'important');else g.style.removeProperty('column-count');
      g.style.setProperty('--gallery-gap',Math.max(0,+g.dataset.galleryGap||0)+'px');
      g.style.setProperty('--gallery-height',Math.max(100,+g.dataset.galleryHeight||500)+'px');
      g.style.setProperty('--gallery-speed',Math.max(0,+g.dataset.gallerySpeed||0)+'s');
      g.style.setProperty('--gallery-fit',g.dataset.galleryFit==='cover'?'cover':'contain');
      g.style.setProperty('--gallery-position',g.dataset.galleryHorizontal+' '+g.dataset.galleryVertical);
      if(timers.has(g)){clearInterval(timers.get(g));timers.delete(g);}
      g.querySelectorAll(':scope > .gallery-navigation').forEach(n=>n.remove());
      const items=slides(g);
      if(items.length){
        show(g,+g.dataset.galleryCurrent||0);originalHeight(g);
        const nav=document.createElement('div');nav.className='gallery-navigation';nav.dataset.editorUi='true';
        if(g.dataset.galleryNav==='arrows'||g.dataset.galleryNav==='both')for(const[dir,label]of [[-1,'Previous slide'],[1,'Next slide']]){const b=document.createElement('button');b.type='button';b.textContent=dir<0?'←':'→';b.setAttribute('aria-label',label);b.onclick=e=>{e.stopPropagation();step(g,dir);};nav.append(b);}
        if(g.dataset.galleryNav==='dots'||g.dataset.galleryNav==='both')items.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className='gallery-dot';b.textContent='•';b.setAttribute('aria-label','Go to slide '+(i+1));b.onclick=e=>{e.stopPropagation();show(g,i);};nav.append(b);});
        if(nav.children.length)g.append(nav);show(g,+g.dataset.galleryCurrent||0);
        if(g.dataset.galleryAutoplay==='true'&&g.dataset.galleryMode==='slideshow'&&items.length>1)timers.set(g,setInterval(()=>{const editing=document.body.classList.contains('debug-editing'),r=g.getBoundingClientRect();if(document.visibilityState==='visible'&&r.bottom>0&&r.top<innerHeight&&(!editing||g.dataset.galleryPreview==='true')&&!(g.dataset.galleryPauseHover==='true'&&g.matches(':hover')))step(g,1);},Math.max(.2,+g.dataset.galleryInterval||4)*1000));
      }
      if(!sizes.has(g)&&'ResizeObserver'in window){const observer=new ResizeObserver(()=>originalHeight(g));observer.observe(g);sizes.set(g,observer);}
      if(!bound.has(g)){
        bound.add(g);g.addEventListener('load',()=>originalHeight(g),true);
        g.addEventListener('click',e=>{if(g.dataset.galleryNav==='single'&&!document.body.classList.contains('debug-editing')&&!e.target.closest('button'))step(g,1);});
        g.addEventListener('dblclick',e=>{if(document.body.classList.contains('debug-editing')||g.dataset.galleryZoom==='true')return;const img=e.target.closest('img');img?.requestFullscreen?.().catch(()=>{});});
      }
    });
  }
  function add(){const g=document.createElement('section');init(g);const selected=api.selection(),owner=selected?.closest('main > *');if(!api.placeAdded?.(g))owner?owner.after(g):main.append(g);renderSettings();scan();refresh();select(g);api.tab('media');commit();sync();report('Gallery added. Choose multiple photos in Media → Photo gallery.');return g;}
  function sync(){const galleries=[...main.querySelectorAll('.editor-photo-gallery')],picker=$('#gallery-target');picker.replaceChildren(new Option('Select a gallery on the page',''));galleries.forEach((g,i)=>picker.add(new Option((g.dataset.layerName||'Gallery '+(i+1))+' · '+slides(g).length+' photos',String(i))));const g=active();picker.value=g?String(galleries.indexOf(g)):'';for(const[key]of specs)$('#gallery-'+key).disabled=!g;$('#gallery-summary').textContent=g?slides(g).length+' photos · '+g.dataset.galleryMode:'Select a photo gallery to adjust it.';if(!g)return;for(const[key,,type]of specs){const field=$('#gallery-'+key);if(type==='checkbox')field.checked=g.dataset['gallery'+cap(key)]==='true';else field.value=g.dataset['gallery'+cap(key)];}const list=$('#gallery-slides-list');list.replaceChildren();slides(g).forEach((s,i)=>{const row=document.createElement('div');row.className='debug-group';const label=document.createElement('label');label.textContent='Slide '+(i+1)+' caption';const input=document.createElement('input');input.type='text';input.value=s.querySelector('figcaption')?.textContent||'';input.onchange=()=>{let c=s.querySelector('figcaption');if(!c){c=document.createElement('figcaption');s.append(c);}c.textContent=input.value;commit();};label.append(input);row.append(label);for(const[delta,title]of [[-1,'Move up'],[1,'Move down'],[0,'Remove slide']]){const b=document.createElement('button');b.type='button';b.textContent=title;b.onclick=()=>{if(delta<0){const prev=s.previousElementSibling;if(prev?.classList.contains('gallery-slide'))prev.before(s);}else if(delta>0){const next=s.nextElementSibling;if(next?.classList.contains('gallery-slide'))next.after(s);}else s.remove();refresh();commit();sync();};row.append(b);}if(g.dataset.galleryMode==='freeform')freeformControls(row,s,i,g);list.append(row);});}
  addButton.onclick=add;$('#gallery-add').onclick=add;
  $('#gallery-convert').onclick=()=>{const el=api.selection(),g=el?.closest('.project-gallery')||el;if(!g?.matches('.project-gallery,.editor-photo-gallery'))return report('Select an existing project gallery first.');init(g);g.classList.remove('project-gallery');[...g.children].filter(n=>n.tagName==='FIGURE').forEach(n=>{n.classList.add('gallery-slide');n.style.removeProperty('grid-column');});refresh();select(g);commit();sync();};
  $('#gallery-columns').min='1';$('#gallery-columns').closest('label').insertAdjacentHTML('afterend','<p class="editor-note">Columns controls the grid, masonry columns, or number of photos visible together in Slideshow. Freeform uses each photo’s position and width.</p>');
  let changeTimer;for(const[key,,type]of specs){const field=$('#gallery-'+key);const update=(final=false)=>{const g=active();if(!g)return report('Select a gallery first.');if(type==='number'&&(!Number.isFinite(field.valueAsNumber)||field.valueAsNumber<(key==='columns'?1:0)))return;if(key==='columns'){g.dataset.galleryColumns=String(Math.max(1,Math.min(7,Math.round(field.valueAsNumber))));if(final)field.value=g.dataset.galleryColumns;}else g.dataset['gallery'+cap(key)]=String(type==='checkbox'?field.checked:field.value);refresh();clearTimeout(changeTimer);if(final){commit();sync();}else changeTimer=setTimeout(commit,450);};if(type==='number')field.addEventListener('input',()=>update());field.addEventListener('change',()=>update(true));}
  for(const[id,dir]of [['gallery-previous',-1],['gallery-next',1]])$('#'+id).onclick=()=>{const g=active();if(g)step(g,dir);};
  async function addFiles(files,target=api.selection()){
    if(!files.length)return;
    if(api.busy())return report('Wait for the current upload.');
    let g=target?.closest('.editor-photo-gallery')||target?.querySelector('.editor-photo-gallery');
    const controller=new AbortController(),assets=[];api.busy(controller);
    try{
      for(const file of files){
        report('Optimizing media '+(assets.length+1)+' / '+files.length+'…');
        const a=await M.optimize(file,$('#media-quality').value,controller.signal,()=>{});
        if(!['image','video'].includes(a.kind))throw Error('Choose images or videos.');
        a.id=crypto.randomUUID();await M.storage.put('assets',a.id,a);assets.push(a);
      }
      if(controller.signal.aborted)throw new DOMException('Upload cancelled.','AbortError');
      if(target&&!target.isConnected)throw Error('The selected column was removed.');
      if(!g){
        g=document.createElement('section');init(g);
        Object.assign(g.dataset,{galleryMode:'slideshow',galleryColumns:'1',galleryFrame:'original',galleryFit:'contain'});
        if(target?.classList.contains('editor-column')){
          const existing=[...target.querySelectorAll(':scope > img,:scope > video')];
          existing.forEach(m=>{const slide=document.createElement('figure');slide.className='gallery-slide';slide.append(m);g.append(slide);});
          target.querySelectorAll(':scope > .media-placeholder').forEach(n=>n.remove());
          target.classList.remove('editor-media-frame','editor-media-background');target.append(g);
        }else if(!api.placeAdded?.(g)){
          const owner=target?.closest('main > *');owner?owner.after(g):main.append(g);
        }
      }
      for(const a of assets){
        const slide=document.createElement('figure'),m=document.createElement(a.kind==='video'?'video':'img');
        slide.className='gallery-slide';m.dataset.assetId=a.id;m.dataset.filename=a.name;
        m.src=URL.createObjectURL(a.blob);api.cacheAsset(a,m.src);
        if(a.width){m.width=a.width;m.height=a.height;}
        if(a.kind==='video'){m.muted=true;m.setAttribute('muted','');m.loop=true;m.autoplay=true;m.playsInline=true;m.preload='metadata';}
        else{m.alt=a.name.replace(/\.[^.]+$/,'');m.loading='lazy';m.decoding='async';}
        slide.append(m);g.append(slide);
      }
      scan();refresh();select(target?.classList.contains('editor-column')?target:g);commit();await api.save(false);sync();
      report(assets.length+' media files added to this slideshow.');return g;
    }catch(error){report('Media upload: '+error.message,true);}
    finally{api.busy(null);}
  }
  $('#gallery-upload').onchange=async e=>{try{await addFiles([...e.target.files]);}finally{e.target.value='';}};
  return {refresh,sync,add,addFiles};
}
