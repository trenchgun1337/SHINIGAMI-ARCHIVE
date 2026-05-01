(function(){
  var canvas=document.getElementById('cursor-layer');
  if(!canvas||window.matchMedia&&window.matchMedia('(pointer:coarse)').matches) return;
  var ctx=canvas.getContext('2d',{alpha:true}); if(!ctx) return;
  var dpr=Math.min(window.devicePixelRatio||1,2),w=0,h=0;
  var ptr={x:innerWidth*.5,y:innerHeight*.5,px:innerWidth*.5,py:innerHeight*.5,vis:false};

  var ghosts=[];
  var ribbon=[];
  var RIBBON_AGE=820;
  var ls=0;

  function resize(){
    w=innerWidth;h=innerHeight;
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.floor(w*dpr));
    canvas.height=Math.max(1,Math.floor(h*dpr));
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function on(){if(!ptr.vis){ptr.vis=true;canvas.classList.add('active');}}
  function off(){
    ptr.vis=false;ghosts.length=0;ribbon.length=0;
    canvas.classList.remove('active');ctx.clearRect(0,0,w,h);
  }

  function sg(x,y,str,dx,dy,sp){
    ghosts.push({x,y,dx,dy,life:1.1,ttl:.06+str*.03,size:8.1+str*9.4+sp,spread:sp});
    if(ghosts.length>14) ghosts.shift();
  }

  function mv(e){
    on();
    var now=performance.now();
    ptr.px=ptr.x;ptr.py=ptr.y;
    ptr.x=e.clientX;ptr.y=e.clientY;
    var dx=ptr.x-ptr.px,dy=ptr.y-ptr.py,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<1.5) return;

    ribbon.push({x:ptr.x,y:ptr.y,t:now});
    if(ribbon.length>90) ribbon.shift();

    var dirX=dx/dist,dirY=dy/dist,str=Math.min(1,dist/18);
    if(now-ls<6&&dist<7) return; ls=now;

    sg(ptr.x-dirX*Math.min(4,dist*.22), ptr.y-dirY*Math.min(4,dist*.22), str,dx,dy,0);
    if(dist>7)  sg(ptr.x-dirX*Math.min(7,dist*.38),  ptr.y-dirY*Math.min(7,dist*.38),  str*.92,dx,dy,.45);
    if(dist>11) sg(ptr.x-dirX*Math.min(10,dist*.52), ptr.y-dirY*Math.min(10,dist*.52), str*.78,dx,dy,.9);
    if(dist>16) sg(ptr.x-dirX*Math.min(13,dist*.72), ptr.y-dirY*Math.min(13,dist*.72), str*.58,dx,dy,1.35);
  }

  function dg(g){
    var a=g.life*.62,sz=g.size*g.life;
    var d=Math.sqrt(g.dx*g.dx+g.dy*g.dy)||1,dX=g.dx/d,dY=g.dy/d;
    var tl=Math.min(24,7+d*.42+g.spread*1.8),tx=g.x-dX*tl,ty=g.y-dY*tl,sw=Math.max(2.1,sz*.42);
    var tg=ctx.createLinearGradient(tx,ty,g.x,g.y);
    tg.addColorStop(0,'rgba(255,0,0,0)');
    tg.addColorStop(.24,'rgba(255,0,0,'+(a*.08)+')');
    tg.addColorStop(.64,'rgba(255,0,0,'+(a*.3)+')');
    tg.addColorStop(1,'rgba(255,0,0,'+(a*.96)+')');
    ctx.strokeStyle=tg;ctx.lineWidth=sw;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(g.x,g.y);ctx.stroke();
    var gl=ctx.createRadialGradient(g.x,g.y,0,g.x,g.y,Math.max(4.5,sz*.88));
    gl.addColorStop(0,'rgba(255,0,0,'+(a*.92)+')');
    gl.addColorStop(.28,'rgba(255,0,0,'+(a*.18)+')');
    gl.addColorStop(.62,'rgba(255,0,0,'+(a*.06)+')');
    gl.addColorStop(1,'rgba(255,0,0,0)');
    ctx.fillStyle=gl;ctx.beginPath();ctx.arc(g.x,g.y,Math.max(4.5,sz*.88),0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,0,0,'+(a*.9)+')';
    ctx.beginPath();ctx.arc(g.x,g.y,Math.max(1.1,sz*.14),0,Math.PI*2);ctx.fill();
  }

  function drawRibbon(now){
    while(ribbon.length>0 && now-ribbon[0].t>RIBBON_AGE) ribbon.shift();
    var live=ribbon;
    if(live.length<3) return;

    var mids=[];
    for(var i=0;i<live.length-1;i++){
      mids.push({x:(live[i].x+live[i+1].x)*0.5, y:(live[i].y+live[i+1].y)*0.5});
    }

    ctx.save();
    ctx.globalCompositeOperation='screen';
    ctx.lineCap='round';
    ctx.lineJoin='round';

    var n=live.length;
    for(var i=1;i<n-1;i++){
      var frac=i/(n-1);
      var age_t=1-(now-live[i].t)/RIBBON_AGE;
      var a=age_t*age_t*frac*0.28;
      if(a<0.004) continue;
      var lw=1.0+frac*frac*11;
      var rv=Math.floor(140+frac*100);
      ctx.strokeStyle='rgba('+rv+',0,8,'+a+')';
      ctx.lineWidth=lw;
      ctx.beginPath();
      ctx.moveTo(mids[i-1].x, mids[i-1].y);
      ctx.quadraticCurveTo(live[i].x, live[i].y, mids[i].x, mids[i].y);
      ctx.stroke();
    }

    ctx.globalCompositeOperation='screen';
    for(var i=Math.floor(n*0.5);i<n-1;i++){
      var frac=i/(n-1);
      var age_t=1-(now-live[i].t)/RIBBON_AGE;
      var a=age_t*age_t*frac*0.14;
      if(a<0.006) continue;
      ctx.strokeStyle='rgba(255,80,80,'+a+')';
      ctx.lineWidth=Math.max(0.5,(frac*frac*3.5));
      ctx.beginPath();
      ctx.moveTo(mids[i-1].x, mids[i-1].y);
      ctx.quadraticCurveTo(live[i].x, live[i].y, mids[i].x, mids[i].y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw(dt,now){
    ctx.clearRect(0,0,w,h);
    if(!ptr.vis) return;
    drawRibbon(now);
    for(var j=ghosts.length-1;j>=0;j--){
      var g=ghosts[j];
      g.life-=dt/g.ttl;
      if(g.life<=0){ghosts.splice(j,1);continue;}
      g.x-=g.dx*.0068*g.life; g.y-=g.dy*.0068*g.life;
      g.dx*=.88; g.dy*=.88;
      dg(g);
    }
  }

  var prev=performance.now();
  function tick(){
    var now=performance.now(),dt=Math.min(.032,(now-prev)/1000);
    prev=now; draw(dt,now); requestAnimationFrame(tick);
  }
  resize();tick();
  window.addEventListener('resize',resize);
  window.addEventListener('mousemove',mv,{passive:true});
  window.addEventListener('mouseenter',on,{passive:true});
  window.addEventListener('mouseleave',off,{passive:true});
  window.addEventListener('mouseout',function(e){if(!e.relatedTarget)off();},{passive:true});
  window.addEventListener('blur',off);
  document.addEventListener('visibilitychange',function(){if(document.hidden)off();});
})();