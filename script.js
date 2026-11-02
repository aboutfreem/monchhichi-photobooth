const video=document.querySelector('#video'),startBtn=document.querySelector('#startCamera'),captureBtn=document.querySelector('#capture'),retakeBtn=document.querySelector('#retake'),downloadBtn=document.querySelector('#download'),canvas=document.querySelector('#strip'),ctx=canvas.getContext('2d'),message=document.querySelector('#message'),countdown=document.querySelector('#countdown'),placeholder=document.querySelector('#cameraPlaceholder'),statusEl=document.querySelector('#cameraStatus');
let stream=null,photos=[],busy=false,photoFilter='mocha';
const frameImage=new Image();frameImage.src='assets/images/monchhichi-final-frame.png';frameImage.onload=()=>render();
const filterCSS={mocha:'sepia(.38) saturate(.78) contrast(1.06) brightness(1.03)',caramel:'sepia(.58) saturate(1.15) contrast(1.03) brightness(1.07)',sepia:'sepia(.92) contrast(1.12)',bw:'grayscale(1) contrast(1.17)',original:'none',soft:'sepia(.14) saturate(.8) brightness(1.12) contrast(.88)'};
const filterSelect=document.querySelector('#photoFilter');
function updateLiveFilter(){video.style.filter=filterCSS[photoFilter]||'none'}
filterSelect.addEventListener('change',()=>{photoFilter=filterSelect.value;updateLiveFilter();render()});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function say(s){message.textContent=s}function setBusy(v){busy=v;captureBtn.disabled=v||!stream;startBtn.disabled=v;retakeBtn.disabled=v;downloadBtn.disabled=v||photos.length!==4}
async function openCamera(){try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('เบราว์เซอร์นี้ไม่รองรับกล้อง หรือยังไม่ได้เปิดผ่าน HTTPS / localhost');if(stream)stream.getTracks().forEach(t=>t.stop());stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:960}},audio:false});video.srcObject=stream;await video.play();video.style.display='block';placeholder.style.display='none';statusEl.textContent='● camera is ready';statusEl.classList.add('active');captureBtn.disabled=false;say('พร้อมแล้ว! กดถ่ายภาพ 4 ช็อตได้เลย ♡')}catch(e){say('เปิดกล้องไม่สำเร็จ: '+(e.name==='NotAllowedError'?'กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์':e.message));}}
// Apply the same filter directly to pixel data. Safari on iPhone may ignore
// CanvasRenderingContext2D.filter even while CSS video filters preview correctly.
const pixelFilterSteps={
 mocha:[['sepia',.38],['saturate',.78],['contrast',1.06],['brightness',1.03]],
 caramel:[['sepia',.58],['saturate',1.15],['contrast',1.03],['brightness',1.07]],
 sepia:[['sepia',.92],['contrast',1.12]],
 bw:[['grayscale',1],['contrast',1.17]],
 original:[],
 soft:[['sepia',.14],['saturate',.8],['brightness',1.12],['contrast',.88]]
};
function bakePhotoFilter(canvas,filterName){
 const steps=pixelFilterSteps[filterName]||[];
 if(!steps.length)return;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 const image=context.getImageData(0,0,canvas.width,canvas.height);
 const data=image.data;
 const clamp=v=>Math.max(0,Math.min(255,v));
 for(let i=0;i<data.length;i+=4){
  let r=data[i],g=data[i+1],b=data[i+2];
  for(const [type,amount] of steps){
   if(type==='sepia'){
    const nr=.393*r+.769*g+.189*b,ng=.349*r+.686*g+.168*b,nb=.272*r+.534*g+.131*b;
    r=clamp(r*(1-amount)+nr*amount);g=clamp(g*(1-amount)+ng*amount);b=clamp(b*(1-amount)+nb*amount);
   }else if(type==='grayscale'){
    const gray=.2126*r+.7152*g+.0722*b;
    r=clamp(r*(1-amount)+gray*amount);g=clamp(g*(1-amount)+gray*amount);b=clamp(b*(1-amount)+gray*amount);
   }else if(type==='saturate'){
    const nr=(.213+.787*amount)*r+(.715-.715*amount)*g+(.072-.072*amount)*b;
    const ng=(.213-.213*amount)*r+(.715+.285*amount)*g+(.072-.072*amount)*b;
    const nb=(.213-.213*amount)*r+(.715-.715*amount)*g+(.072+.928*amount)*b;
    r=clamp(nr);g=clamp(ng);b=clamp(nb);
   }else if(type==='contrast'){
    r=clamp((r-127.5)*amount+127.5);g=clamp((g-127.5)*amount+127.5);b=clamp((b-127.5)*amount+127.5);
   }else if(type==='brightness'){
    r=clamp(r*amount);g=clamp(g*amount);b=clamp(b*amount);
   }
  }
  data[i]=r;data[i+1]=g;data[i+2]=b;
 }
 context.putImageData(image,0,0);
}
function snap(){
 const c=document.createElement('canvas');c.width=900;c.height=675;
 const g=c.getContext('2d',{willReadFrequently:true});
 const vw=video.videoWidth,vh=video.videoHeight;
 if(!vw||!vh)throw new Error('กล้องยังไม่พร้อม');
 const ratio=Math.max(c.width/vw,c.height/vh),sw=c.width/ratio,sh=c.height/ratio;
 g.save();g.translate(c.width,0);g.scale(-1,1);
 // Draw unfiltered camera frame, then bake pixels for cross-browser support.
 g.drawImage(video,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,c.width,c.height);
 g.restore();
 bakePhotoFilter(c,photoFilter);
 return c;
}
async function capture(){if(busy||!stream)return;photos=[];setBusy(true);updateTracker();try{for(let i=0;i<4;i++){say(`เตรียมถ่ายภาพที่ ${i+1} / 4`);for(let n=3;n>=1;n--){countdown.hidden=false;countdown.textContent=n;await sleep(850)}countdown.textContent='✦';photos.push(snap());updateTracker();render();await sleep(400);countdown.hidden=true;if(i<3)await sleep(450)}say('เสร็จแล้ว! รูปของคุณกำลังออกจากตู้ปริ้น ♡'); await startPrinting()}catch(e){say('เกิดข้อผิดพลาด: '+e.message)}finally{countdown.hidden=true;setBusy(false)}}
function updateTracker(){document.querySelectorAll('#shotTracker span').forEach((s,i)=>s.classList.toggle('done',i<photos.length))}
function reset(){if(busy)return;photos=[];updateTracker();render();say('เริ่มใหม่ได้เลย กดถ่ายภาพอีกครั้ง ♡')}
// The reference artwork is used unchanged. Only the four inner photo rectangles are replaced.
// Coordinates are in the ORIGINAL 793 × 1983 image, not CSS preview pixels.
const PHOTO_SLOTS=[
 {x:150,y:432,w:237,h:356},
 {x:405,y:432,w:238,h:356},
 {x:150,y:809,w:237,h:372},
 {x:405,y:809,w:238,h:372}
];
function drawCover(img,x,y,w,h){
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 // Filter is baked into each photo at capture time.
 const iw=img.width,ih=img.height,scale=Math.max(w/iw,h/ih);
 const dw=iw*scale,dh=ih*scale;
 ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
 ctx.restore();
}
function render(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 if(frameImage.complete&&frameImage.naturalWidth){
  ctx.drawImage(frameImage,0,0,canvas.width,canvas.height);
 }else{
  ctx.fillStyle='#fff9e7';ctx.fillRect(0,0,canvas.width,canvas.height);
 }
 // Unfilled slots remain exactly as shown in the reference artwork.
 photos.forEach((photo,i)=>{
  if(photo){const s=PHOTO_SLOTS[i];drawCover(photo,s.x,s.y,s.w,s.h)}
 });
}
function download(){if(photos.length!==4)return;const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=`monchhichi-photo-booth-${Date.now()}.png`;document.body.appendChild(a);a.click();a.remove()}
startBtn.addEventListener('click',openCamera);captureBtn.addEventListener('click',capture);retakeBtn.addEventListener('click',reset);downloadBtn.addEventListener('click',download);window.addEventListener('pagehide',()=>{if(stream)stream.getTracks().forEach(t=>t.stop())});render();

// V5: printing animation uses the same composed canvas as PNG download.
const printingOverlay=document.querySelector('#printingOverlay');
const printPhoto=document.querySelector('#printPhoto');
const printPaper=document.querySelector('#printPaper');
const printBar=document.querySelector('#printBar');
const printPercent=document.querySelector('#printPercent');
const printMessage=document.querySelector('#printMessage');
const printFinish=document.querySelector('#printFinish');
const printSkip=document.querySelector('#printSkip');
let printingTimer=null,printingResolve=null;
// Original gentle photo-printer SFX bundled locally (no external download).
const printerSfx=new Audio('assets/sounds/monchhichi-printer.wav');
const finishSfx=new Audio('assets/sounds/monchhichi-ding.wav');
printerSfx.preload='auto';printerSfx.volume=0.48;
finishSfx.preload='auto';finishSfx.volume=0.32;
let printAudioContext=null,printerBuffer=null,dingBuffer=null,printerSource=null;
// Unlock WebAudio from the user's camera/capture tap, before the 4-photo countdown.
async function preparePrinterAudio(){
 if(!document.querySelector('#printSound')?.checked)return;
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  if(!printAudioContext)printAudioContext=new AC();
  await printAudioContext.resume();
  if(!printerBuffer||!dingBuffer){
   const [p,d]=await Promise.all([
    fetch('assets/sounds/monchhichi-printer.wav').then(r=>r.arrayBuffer()),
    fetch('assets/sounds/monchhichi-ding.wav').then(r=>r.arrayBuffer())
   ]);
   [printerBuffer,dingBuffer]=await Promise.all([printAudioContext.decodeAudioData(p),printAudioContext.decodeAudioData(d)]);
  }
 }catch(e){console.warn('Printer sound initialization:',e)}
}
// Called synchronously on capture button click to satisfy mobile autoplay policies.
captureBtn.addEventListener('click',()=>{void preparePrinterAudio()});
function stopPrintAudio(){
 if(printerSource){try{printerSource.stop()}catch(e){}printerSource=null}
 printerSfx.pause();printerSfx.currentTime=0;
}
function playSoundBuffer(buffer,volume){
 if(!printAudioContext||printAudioContext.state!=='running'||!buffer)return null;
 const src=printAudioContext.createBufferSource(),gain=printAudioContext.createGain();
 src.buffer=buffer;gain.gain.value=volume;src.connect(gain);gain.connect(printAudioContext.destination);src.start();return src;
}
function startPrintAudio(){
 if(!document.querySelector('#printSound')?.checked)return;
 stopPrintAudio();
 printerSource=playSoundBuffer(printerBuffer,0.48);
 if(!printerSource){printerSfx.currentTime=0;printerSfx.play().catch(()=>{})}
}
function playFinishAudio(){
 if(!document.querySelector('#printSound')?.checked)return;
 if(!playSoundBuffer(dingBuffer,0.32)){finishSfx.currentTime=0;finishSfx.play().catch(()=>{})}
}
function finishPrinting(){const wasPrinting=!!printingTimer;if(printingTimer){clearInterval(printingTimer);printingTimer=null}stopPrintAudio();if(wasPrinting)playFinishAudio();printBar.style.width='100%';printPercent.textContent='100%';printMessage.textContent='Your memories are ready ♡';printPaper.classList.remove('printing');printPaper.classList.add('finished');printPaper.style.setProperty('clip-path','inset(0 0 0% 0)','important');printFinish.hidden=false;printSkip.hidden=true;if(printingResolve){printingResolve();printingResolve=null}}
function closePrinting(){finishPrinting();printingOverlay.hidden=true;say('รูปพร้อมแล้ว! เปลี่ยนฟิลเตอร์หรือดาวน์โหลด PNG ได้เลย ♡')}
function startPrinting(){return new Promise(resolve=>{render();printPhoto.src=canvas.toDataURL('image/png');printingResolve=resolve;printingOverlay.hidden=false;printFinish.hidden=true;printSkip.hidden=false;printBar.style.width='0%';printPercent.textContent='0%';printMessage.textContent='Printing your sweet memories...';printPaper.classList.remove('printing','finished');printPaper.style.setProperty('clip-path','inset(0 0 100% 0)','important');void printPaper.offsetWidth;printPaper.classList.add('printing');startPrintAudio();const begin=performance.now(),duration=7000;printingTimer=setInterval(()=>{const pct=Math.min(100,Math.round((performance.now()-begin)/duration*100));printBar.style.width=pct+'%';printPercent.textContent=pct+'%';printPaper.style.setProperty('clip-path',`inset(0 0 ${100-pct}% 0)`,'important');if(pct===100)finishPrinting()},90)})}
document.querySelector('#printSound').addEventListener('change',e=>{if(!e.target.checked){stopPrintAudio();finishSfx.pause()}else{void preparePrinterAudio()}});
printSkip.addEventListener('click',closePrinting);printFinish.addEventListener('click',closePrinting);
