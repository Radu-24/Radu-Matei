/* DataLink Rover without WebGL: the same views as pictures.
   Some browsers can't draw WebGL at all (switched off, blocked by a policy, no usable GPU, an AI agent's headless browser).
   For them datalink-3d.js loads this file instead of three.js and it takes over the same API (window.DL3D), so the page
   doesn't know the difference: the project card, the pick screen with its hover and labels, the fly between them and both
   stories, scrubbed by the scroll, with the part labels on the taken-apart models.
   The pictures are frames of the real 3D view, rendered ahead of time by tools/bake_stills.py into assets/stills/ for a wide
   and a tall screen; stills.js says where each one sits in its frame and where its labels go. A frame is fitted into the
   view the way the 3D camera fits the scene, and where the 3D view moves its camera, the pictures cross-fade (with a slight
   push, so it still reads as movement). Only opacity and transform change from frame to frame. */
(function(){'use strict';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),lerp=(a,b,t)=>a+(b-a)*t,
  ss=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)},s5=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10)},
  easeIO=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
const BASE='assets/stills/',reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const SELECT=['floor','padM','padR','remote','link','rover'],STORY=['hero','explode','p0','p1','p2','p3','p4','p5','p6','p7'];

function script(src,glob,ev){return new Promise((res,rej)=>{if(window[glob])return res(window[glob]);
  addEventListener(ev,()=>res(window[glob]),{once:true});
  const sc=document.createElement('script');sc.src=src;sc.async=true;sc.onerror=()=>rej(new Error(src+' did not load'));document.head.appendChild(sc)})}

const CSS=`.dl-still{position:relative;overflow:visible;pointer-events:none;contain:layout style}
.dl-still .st-l{position:absolute;left:0;top:0;opacity:0;visibility:hidden;transform-origin:50% 50%;will-change:transform,opacity}
.dl-still .st-l img{display:block;width:100%;height:100%;user-select:none;-webkit-user-drag:none}
.dl-still .st-card{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform,opacity}
.dl-still .st-card img{display:block;width:100%;height:100%;object-fit:contain}
.dl-still .fl img{animation:stFloat 7s ease-in-out infinite}
.dl-still .fl.f2 img{animation-duration:8.5s;animation-delay:-3s}
.dl-still .st-card img{animation:stFloat 6s ease-in-out infinite}
.dl-still .lk img{animation:stLink 2.6s ease-in-out infinite}
@keyframes stFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.1%)}}
@keyframes stLink{0%,100%{opacity:.72}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.dl-still img{animation:none!important}}`;

window.DL3D_STILLS=(api,{frameSubs})=>script(BASE+'stills.js','DL_STILLS','dl-stills').then(meta=>{
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const root=document.createElement('div');root.className='dl-still dl3d';root.setAttribute('aria-hidden','true');
  /* the card: the whole frame, fitted like the live card camera fits the model (object-fit: contain) */
  const card=document.createElement('div');card.className='st-card';
  const cim=new Image();cim.alt='';cim.decoding='async';cim.draggable=false;
  cim.srcset=meta.card.sizes.map(s=>`${BASE}card-${s}.webp ${s}w`).join(', ');cim.sizes='(max-width: 600px) 92vw, 824px';cim.src=`${BASE}card-${meta.card.sizes[meta.card.sizes.length-1]}.webp`;
  card.appendChild(cim);root.appendChild(card);
  const cardReady=(cim.decode?cim.decode():new Promise(r=>{cim.onload=r})).catch(()=>{});

  let W=1,H=1,lay=null,F=null,slot=null,ro=null,mode='card',shown=false,raf=0,last=0,tw=null,dirty=true,fly=null,pre=false;
  const story={type:'hero',k:0,t:0},hv={rover:0,remote:0,link:0},hvT={rover:0,remote:0,link:0},ch={x:0,y:0,on:0},chT={x:0,y:0,on:0};
  const layers={};let shownW={},drawnQ=[];
  /* which set of pictures fits this view, and where its frame sits in it */
  /* the set follows the screen's shape (not the slot's: the card's window is wide even on a phone), so the pictures of the
     pick screen are already there when the card flies to it */
  function fit(){const want=innerWidth/innerHeight<.9?'tall':'wide',L=meta[want]?want:(meta.wide?'wide':'tall');
    if(L!==lay){for(const k in layers){layers[k].el.remove();delete layers[k]}lay=L}
    const M=meta[lay],s=Math.min(W/M.w,H/M.h);F={s,w:M.w*s,h:M.h*s,x:(W-M.w*s)/2,y:(H-M.h*s)/2,M};
    for(const k in layers)placeLayer(layers[k]);dirty=true}
  function placeLayer(L){const r=F.M.img[L.key];if(!r)return;L.box={x:F.x+r[0]*F.w,y:F.y+r[1]*F.h,w:r[2]*F.w,h:r[3]*F.h};
    Object.assign(L.el.style,{left:L.box.x+'px',top:L.box.y+'px',width:L.box.w+'px',height:L.box.h+'px'});L.css={}}
  /* a picture is created the first time a mode needs it; until it has loaded it simply isn't there */
  function layer(key){if(layers[key])return layers[key];if(!F||!F.M.img[key])return null;
    const el=document.createElement('div');el.className='st-l'+(key==='link'?' lk':/^(remote|rover)$|hero$/.test(key)?' fl'+(key.startsWith('remote')?' f2':''):'');
    const im=new Image();im.alt='';im.decoding='async';im.draggable=false;im.src=`${BASE}${lay}/${key}.webp`;el.appendChild(im);
    const L={key,el,im,css:{}};layers[key]=L;
    /* draw order: floor and pads under the models, the link over them, the story pictures in story order */
    const order=[...SELECT,...['rover','remote'].flatMap(m=>STORY.map(s=>`${m}-${s}`))];
    const i=order.indexOf(key),next=Object.values(layers).filter(o=>o!==L&&order.indexOf(o.key)>i).sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key))[0];
    root.insertBefore(el,next?next.el:null);placeLayer(L);return L}
  const need=m=>{if(!F)return;(m==='select'||m==='link'?SELECT:m==='rover'||m==='remote'?STORY.map(s=>`${m}-${s}`):[]).forEach(layer)};

  /* ---------- what each mode shows: a weight (opacity) per picture, a scale and a shift (fractions of the frame) ---------- */
  function storyW(pre,s,out){const put=(k,o,sc=1,x=0,y=0)=>{if(o>.001)out[`${pre}-${k}`]={o,s:sc,x,y}};
    /* the camera moved between two pictures: the old one stays up while the new one comes in over it (no dip in the middle),
       and both drift a little, as if pushed through */
    const cross=(a,b,e)=>{put(a,clamp((1-e)/.6),lerp(1,.975,e));put(b,clamp(e/.6),lerp(1.035,1,e))};
    switch(s.type){
      case'hero':put('hero',1);break;
      case'explode':cross('hero','explode',s5(s.t));break;
      case'part':{const k=s.k;cross(k===0?'explode':'p'+(k-1),'p'+k,s5(ss(0,.42,s.t)));break}
      case'rebuild':cross('p7','hero',s5(ss(0,.85,s.t)));break;
      /* the rover turns and drives off into the distance, the controller flies away up and to the side */
      case'action':if(pre==='rover'){const d=Math.pow(ss(.52,1,s.t),1.35);put('hero',1-ss(.8,1,s.t),1-.5*d,0,-.06*d)}
        else{const a=ss(.58,1,s.t);put('hero',1-ss(.8,1,s.t),1-.45*a,-.14*a,-.1*a)}break}}
  function target(){const out={},m=mode;
    if(m==='select'||(m==='link'&&(story.type==='finale'||story.type==='after'))){
      const e=m==='select'?1:story.type==='after'?1:ss(.25,.9,story.t);
      out.floor={o:e,s:1};out.remote={o:e,s:1+.035*hv.remote};out.rover={o:e,s:1+.03*hv.rover};out.link={o:e,s:1+.015*hv.link};
      if(m==='select'){out.padM={o:.42+.58*hv.remote,s:1};out.padR={o:.42+.58*hv.rover,s:1}}}
    else if(m==='rover'||m==='remote')storyW(m,story,out);
    return out}
  /* during a transition: from what was on screen to what the new mode shows */
  function blend(from,to,e){const out={};
    for(const k of new Set([...Object.keys(from),...Object.keys(to)])){const a=from[k],b=to[k];
      if(a&&b)out[k]={o:lerp(a.o,b.o,e),s:lerp(a.s,b.s,e),x:lerp(a.x||0,b.x||0,e),y:lerp(a.y||0,b.y||0,e)};
      else if(a)out[k]={...a,o:a.o*clamp((1-e)/.6)};else out[k]={...b,o:b.o*clamp(e/.6)}}
    return out}

  /* ---------- the fly between the project card and the pick screen ----------
     The card picture sits on the card's window, the pick screen's rover on its place in the scene. Both move together from
     one to the other (matched on the rover's outline), and the card picture hands over to the rover picture on the way; the
     controller, the link and the floor only come in at the end, as they do in 3D */
  function cardBox(r){const M=meta.card,s=Math.min(r.width/M.w,r.height/M.h),w=M.w*s,h=M.h*s,x=r.left+(r.width-w)/2,y=r.top+(r.height-h)/2,b=M.box||[0,0,1,1];
    return{frame:{x,y,w,h},rov:{x:x+b[0]*w,y:y+b[1]*h,w:b[2]*w,h:b[3]*h}}}
  const lerpBox=(A,B,e)=>({x:lerp(A.x,B.x,e),y:lerp(A.y,B.y,e),w:lerp(A.w,B.w,e),h:lerp(A.h,B.h,e)}),
    grow=(A,k)=>({x:A.x-A.w*(k-1)/2,y:A.y-A.h*(k-1)/2,w:A.w*k,h:A.h*k});
  /* the transform that puts box A (inside an element whose top left corner is at L) onto box R */
  const onto=(A,R,L)=>{const k=R.w/A.w,cx=R.x+R.w/2,cy=R.y+R.h/2,ax=A.x+A.w/2,ay=A.y+A.h/2;return`translate(${(cx-L.x-k*(ax-L.x)).toFixed(2)}px,${(cy-L.y-k*(ay-L.y)).toFixed(2)}px) scale(${k.toFixed(4)})`};
  function local(r){const o=root.getBoundingClientRect();return{left:r.left-o.left,top:r.top-o.top,width:r.width,height:r.height}}

  /* ---------- drawing: styles are written only when they change ---------- */
  const css=(L,k,v)=>{if(L.css[k]===v)return;L.css[k]=v;L.el.style[k]=v};
  function draw(){
    const goal=target(),e=tw?tw.ease(tw.k):1,C={el:card,css:card._css||(card._css={})};let show=goal;
    if(fly&&tw){
      /* the fly: the card picture and the pick screen's rover travel together between the card's window and the scene */
      const cb=cardBox(fly.rect),R=layers.rover,B=R&&R.box&&fly.sel?R.box:grow(cb.rov,1.25),path=fly.dir==='in'?lerpBox(cb.rov,B,e):lerpBox(B,cb.rov,e);
      css(C,'left',cb.frame.x+'px');css(C,'top',cb.frame.y+'px');css(C,'width',cb.frame.w+'px');css(C,'height',cb.frame.h+'px');
      css(C,'transform',onto(cb.rov,path,cb.frame));
      css(C,'opacity',(fly.dir==='in'?1-ss(.35,.75,e):fly.sel?ss(.25,.65,e):ss(0,.6,e)).toFixed(3));
      const src=fly.dir==='in'?goal:fly.last,mine=fly.dir==='in'?ss(.3,.7,e):1-ss(.3,.7,e),rest=fly.dir==='in'?ss(.55,1,e):1-ss(0,.45,e);show={};
      for(const k in layers){const L=layers[k],g=src[k];
        if(!g||g.o<.002){css(L,'opacity','0');css(L,'visibility','hidden');continue}css(L,'visibility','visible');
        if(k==='rover'&&fly.sel&&L.box){css(L,'opacity',(g.o*mine).toFixed(3));css(L,'transform',onto(L.box,path,L.box))}
        else{css(L,'opacity',(g.o*rest).toFixed(3));css(L,'transform','none')}}}
    else{
      if(tw)show=blend(tw.from,goal,e);
      const inCard=mode==='card';
      css(C,'left','0px');css(C,'top','0px');css(C,'width',W+'px');css(C,'height',H+'px');
      css(C,'opacity',inCard?'1':'0');
      css(C,'transform',inCard&&ch.on>.001?`translate(${(ch.x*7*ch.on).toFixed(2)}px,${(ch.y*5*ch.on-3*ch.on).toFixed(2)}px) scale(${(1+.025*ch.on).toFixed(4)})`:'none');
      for(const k in layers){const L=layers[k],g=show[k];
        if(!g||g.o<.002){css(L,'opacity','0');css(L,'visibility','hidden');continue}css(L,'visibility','visible');
        css(L,'opacity',g.o.toFixed(3));
        const tx=(g.x||0)*F.w,ty=(g.y||0)*F.h;
        css(L,'transform',Math.abs(g.s-1)<1e-4&&!tx&&!ty?'none':`translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${g.s.toFixed(4)})`)}}
    shownW=show;for(const f of frameSubs)f();
    if(drawnQ.length)drawnQ.splice(0).forEach(f=>f())}
  function frame(ts){raf=0;const dt=last?Math.min(.05,(ts-last)/1000):0;last=ts;let moving=false;
    const kh=1-Math.exp(-dt*9);for(const k in hv){hv[k]+=(hvT[k]-hv[k])*kh;if(Math.abs(hv[k]-hvT[k])>.002)moving=true;else hv[k]=hvT[k]}
    for(const k of ['x','y','on']){ch[k]+=(chT[k]-ch[k])*kh;if(Math.abs(ch[k]-chT[k])>.002)moving=true;else ch[k]=chT[k]}
    if(tw){if(tw.clock){const v=tw.clock();tw.k=Math.max(tw.k,v==null?1:clamp(v/tw.dur))}else tw.k=clamp(tw.k+dt*1000/tw.dur);moving=true}
    if(moving||dirty){draw();dirty=false}
    if(tw&&tw.k>=1){const r=tw.res;tw=null;fly=null;dirty=true;r&&r()}
    if(moving||dirty||tw)raf=requestAnimationFrame(frame);else last=0}
  const wake=()=>{if(!raf)raf=requestAnimationFrame(frame)};
  function setSize(w,h){w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));if(w===W&&h===H&&F)return;W=w;H=h;root.style.width=w+'px';root.style.height=h+'px';fit();need(mode);wake()}

  /* the pick screen's pictures are fetched once the card is up, so the fly to the pick screen has them ready */
  const idle=f=>('requestIdleCallback' in window)?requestIdleCallback(f,{timeout:3000}):setTimeout(f,600);
  const preload=()=>{if(pre||!F)return;pre=true;cardReady.then(()=>idle(()=>SELECT.forEach(layer)))};

  const A={init:()=>Promise.resolve(true),kind:'stills',
    drawn:()=>cardReady.then(()=>new Promise(r=>{drawnQ.push(r);dirty=true;wake()})),
    get ok(){return true},get canvas(){return root},get mode(){return mode},get size(){return[W,H]},get remoteReady(){return true},
    mount(el){slot=el;if(root.parentNode!==el)el.appendChild(root);
      if(!ro)ro=new ResizeObserver(es=>{for(const e of es)if(e.target===slot&&root.parentNode===slot){const r=e.contentRect;if(r.width&&r.height)setSize(r.width,r.height)}});
      ro.disconnect();ro.observe(el);const r=el.getBoundingClientRect();if(r.width&&r.height)setSize(r.width,r.height);preload();dirty=true;wake()},
    setSize,setVis(v){shown=!!v;if(shown)wake()},keep(){wake()},lowRes(){},
    /* to a mode; with dur the pictures cross-fade there (following the page's animation clock when it gives one). A card
       rectangle in from/goal (cardPose) means the fly between the card and the pick screen */
    go(m,{dur=900,ease=easeIO,from,goal,clock}={}){const prev=shownW;
      if(tw&&tw.res){const r=tw.res;tw.res=null;r()}
      const onlySel=Object.keys(prev).length>0&&!Object.keys(prev).some(k=>k.includes('-'));
      fly=from&&from.rect&&m==='select'?{dir:'in',rect:local(from.rect),sel:true}:goal&&goal.rect&&m==='card'?{dir:'out',rect:local(goal.rect),last:prev,sel:onlySel&&!!prev.rover}:null;
      mode=m;need(m);if(fly)need('select');
      if(!dur){fly=null;tw=null;dirty=true;wake();return Promise.resolve()}
      return new Promise(res=>{tw={from:prev,k:0,dur,ease,clock,res};dirty=true;wake()})},
    cardPose:r=>({rect:{left:r.left,top:r.top,width:r.width,height:r.height}}),pose:()=>({}),snap:()=>({}),
    release(){dirty=true;wake()},
    story(s){Object.assign(story,s);dirty=true;wake()},
    hover(which){for(const k in hvT)hvT[k]=k===which?1:0;wake()},
    cardHover(on,x=0,y=0){chT.on=on?1:0;chT.x=on?x:0;chT.y=on?y:0;wake()},
    /* screen positions for the page's labels, from the positions saved with each picture */
    anchor(name){if(!F)return null;const m=name.match(/^(rover|remote):/);
      if(m&&(mode!==m[1]||!(story.type==='explode'||story.type==='part')))return null;
      if(!m&&mode!=='select')return null;
      const a=F.M.at[name];if(!a)return null;return{x:F.x+a[0]*F.w,y:F.y+a[1]*F.h,z:0,ok:true}},
    stops(which){const M=meta[lay]||meta.wide;return Object.keys(M.at).filter(k=>k.startsWith(which+':')).map(k=>k.slice(which.length+1))},
    cardTops(){},onFrame(f){frameSubs.push(f)},setTier(){},get lod(){return'stills'},loadHi:()=>Promise.resolve(),setTimeScale(){},_advance(){wake()},
    _dbg:()=>({mode,story,layers,F,lay,tw,fly,shownW,hv}),_perf:()=>({})};
  Object.defineProperties(api,Object.getOwnPropertyDescriptors(A));
  return true});
dispatchEvent(new Event('dl-stills-js'));
})();
