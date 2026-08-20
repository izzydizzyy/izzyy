const USER_ID='1313630076809510975';
const $=selector=>document.querySelector(selector);
const statusText={online:'online',idle:'idle',dnd:'do not disturb',offline:'offline'};

addEventListener('load',()=>document.body.classList.add('loaded'));
document.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.scroll).scrollIntoView({behavior:'smooth'})));

const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('visible')}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(element=>revealObserver.observe(element));

const sections=[...document.querySelectorAll('section[id]')];
const menuLinks=[...document.querySelectorAll('.menu-item')];
const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){menuLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')===`#${entry.target.id}`))}}),{rootMargin:'-35% 0px -55%'});
sections.forEach(section=>sectionObserver.observe(section));

if(matchMedia('(pointer:fine)').matches){
  document.querySelectorAll('.tilt').forEach(card=>{
    card.addEventListener('pointermove',event=>{const rect=card.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width-.5;const y=(event.clientY-rect.top)/rect.height-.5;card.style.transform=`perspective(1100px) rotateX(${-y*3}deg) rotateY(${x*4}deg)`});
    card.addEventListener('pointerleave',()=>card.style.transform='');
  });
  document.querySelectorAll('.magnetic').forEach(element=>{
    element.addEventListener('pointermove',event=>{const rect=element.getBoundingClientRect();element.style.transform=`translate(${(event.clientX-rect.left-rect.width/2)*.1}px,${(event.clientY-rect.top-rect.height/2)*.1}px)`});
    element.addEventListener('pointerleave',()=>element.style.transform='');
  });
}

// Lightweight animated perspective scene for the hero.
const canvas=$('#scene');
const context=canvas.getContext('2d');
let width=0,height=0,dpr=1,pointerX=.5,pointerY=.45;
const stars=Array.from({length:85},()=>({x:Math.random(),y:Math.random()*.65,size:Math.random()*1.3+.2,phase:Math.random()*6.28}));
function resizeScene(){dpr=Math.min(devicePixelRatio||1,2);width=canvas.clientWidth;height=canvas.clientHeight;canvas.width=width*dpr;canvas.height=height*dpr;context.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resizeScene);resizeScene();
addEventListener('pointermove',event=>{pointerX=event.clientX/innerWidth;pointerY=event.clientY/innerHeight},{passive:true});
const reduceMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
function renderScene(time){
  context.clearRect(0,0,width,height);
  const base=context.createLinearGradient(0,0,0,height);base.addColorStop(0,'#10131c');base.addColorStop(.55,'#151821');base.addColorStop(1,'#19191e');context.fillStyle=base;context.fillRect(0,0,width,height);
  const glow=context.createRadialGradient(width*(.58+(pointerX-.5)*.08),height*(.39+(pointerY-.5)*.05),0,width*.55,height*.4,width*.58);glow.addColorStop(0,'rgba(80,116,202,.24)');glow.addColorStop(.35,'rgba(49,66,117,.1)');glow.addColorStop(1,'rgba(10,12,18,0)');context.fillStyle=glow;context.fillRect(0,0,width,height);
  stars.forEach(star=>{const alpha=.12+(Math.sin(time*.001+star.phase)+1)*.12;context.fillStyle=`rgba(214,226,255,${alpha})`;context.fillRect(star.x*width+(pointerX-.5)*star.size*8,star.y*height+(pointerY-.5)*star.size*5,star.size,star.size)});
  const horizon=height*.57;context.strokeStyle='rgba(148,174,230,.075)';context.lineWidth=1;
  for(let i=-9;i<=9;i++){context.beginPath();context.moveTo(width/2+(pointerX-.5)*26,horizon);context.lineTo(width/2+i*width*.14+(pointerX-.5)*55,height);context.stroke()}
  for(let row=0;row<13;row++){const t=row/12;const eased=t*t;const y=horizon+eased*(height-horizon);context.beginPath();context.moveTo(0,y+Math.sin(time*.00045+row)*2);context.lineTo(width,y+Math.sin(time*.00045+row)*2);context.stroke()}
  context.beginPath();context.moveTo(0,horizon+55);for(let x=0;x<=width;x+=24){const wave=Math.sin(x*.012+time*.0003)*12+Math.sin(x*.025-time*.00022)*7;context.lineTo(x,horizon+54+wave+(pointerX-.5)*8)}context.lineTo(width,height);context.lineTo(0,height);context.closePath();const land=context.createLinearGradient(0,horizon,0,height);land.addColorStop(0,'rgba(22,25,34,.75)');land.addColorStop(1,'rgba(13,14,19,.92)');context.fillStyle=land;context.fill();
  if(!reduceMotion)requestAnimationFrame(renderScene)
}
if(reduceMotion)renderScene(0);else requestAnimationFrame(renderScene);

function avatarUrl(user){if(!user.avatar)return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id)>>22n)%6}.png`;return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_')?'gif':'webp'}?size=256`}
function applyPresence(data){
  const user=data.discord_user||{};const status=data.discord_status||'offline';
  $('#avatar').src=avatarUrl(user);$('#displayName').textContent=user.global_name||user.display_name||user.username||'Izzy';$('#username').textContent=`@${user.username||'izzy.js'}`;
  $('#statusDot').className=status;$('#navDot').className=status==='offline'?'':'online';$('#navStatus').textContent=statusText[status]||status;
  const decoration=user.avatar_decoration_data?.asset;if(decoration){$('#decoration').src=`https://cdn.discordapp.com/avatar-decoration-presets/${decoration}.png?size=240&passthrough=true`;$('#decoration').style.display='block'}else $('#decoration').style.display='none';
  const plate=user.collectibles?.nameplate?.asset;if(plate){const path=plate.replace(/^\/+|\/+$/g,'');$('#nameplate').src=`https://cdn.discordapp.com/assets/collectibles/${path}asset.webm`;$('#nameplate').style.display='block'}
  const activity=data.activities?.find(item=>item.type!==4);
  $('#activityName').textContent=activity?.name||(status==='offline'?'Away from Discord':'Just vibing');
  $('#activityDetails').textContent=activity?.details||activity?.state||(status==='offline'?'Currently offline':`Status: ${statusText[status]}`);
}
async function fetchPresence(){try{const response=await fetch(`https://api.lanyard.rest/v1/users/${USER_ID}`,{cache:'no-store'});const payload=await response.json();if(payload.success)applyPresence(payload.data)}catch{$('#navStatus').textContent='unavailable';$('#activityName').textContent='Presence unavailable';$('#activityDetails').textContent='Lanyard could not be reached'}}
fetchPresence();setInterval(fetchPresence,30000);

$('#copyDiscord').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('izzy.js');$('#copyDiscord b').textContent='COPIED';setTimeout(()=>$('#copyDiscord b').textContent='COPY',1500)}catch{$('#copyDiscord b').textContent='IZZY.JS'}});
function updateClock(){const value=new Date().toLocaleTimeString('en-US',{timeZone:'America/New_York',hour12:false});$('#clock').textContent=`${value} EST`}updateClock();setInterval(updateClock,1000);$('#year').textContent=new Date().getFullYear();
