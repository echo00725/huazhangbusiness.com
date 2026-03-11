let data={}, autoSave=true, timer=null, imageKey='';
const $ = s => document.querySelector(s);
const msg = s => $('#msg').textContent=s;

function debounceSave(){ if(!autoSave) return; clearTimeout(timer); timer=setTimeout(()=>saveAll(true),3000); }
function openPage(path){ $('#live').src=(path||'/')+'?_v='+Date.now(); }
function stableId(el,doc){ const parts=[]; let cur=el; while(cur&&cur!==doc.body){ const p=cur.parentElement; if(!p) break; parts.unshift(`${cur.tagName.toLowerCase()}:${[...p.children].indexOf(cur)}`); cur=p;} return parts.join('>'); }

function addPanel(doc,host,key,label){
  if(!host||host.dataset.ocPanel==='1') return; host.dataset.ocPanel='1';
  if(getComputedStyle(host).position==='static') host.style.position='relative';
  const box=doc.createElement('div'); box.style.cssText='position:absolute;right:8px;top:8px;z-index:9999;display:flex;gap:6px';
  const up=doc.createElement('button'); up.textContent=label; up.style.cssText='border:0;border-radius:6px;padding:4px 8px;font-size:12px;background:#16a34a;color:#fff';
  up.onclick=(e)=>{e.preventDefault();e.stopPropagation();imageKey=key;$('#pick').click();msg('选择图片：'+key)};
  const del=doc.createElement('button'); del.textContent='清除图片'; del.style.cssText='border:0;border-radius:6px;padding:4px 8px;font-size:12px;background:#ef4444;color:#fff';
  del.onclick=(e)=>{e.preventDefault();e.stopPropagation();clearImage(key)};
  box.append(up,del); host.appendChild(box);
}

function clearImage(key){
  data[key]='';
  const d=$('#live').contentDocument; if(!d) return;
  d.querySelectorAll(`[data-key-src="${key}"]`).forEach(el=>{el.removeAttribute('src');el.style.display='none';});
  d.querySelectorAll(`[data-bg-key="${key}"]`).forEach(el=>el.style.backgroundImage='');
  const ph=d.getElementById('wechatQrPlaceholder'); if(ph && key==='contactWeChatQr') ph.style.display='flex';
  msg('已清除：'+key); debounceSave();
}

function bindEditable(){
  const d=$('#live').contentDocument; if(!d) return;
  if(!data.customText) data.customText={};

  d.addEventListener('click',function(e){
    var t=e.target;
    var a=(t && t.closest)?t.closest('a'):null;
    if(a){e.preventDefault();e.stopPropagation();}
  }, true);

  d.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,li,a,label,strong,em,b,small,button').forEach(el=>{
    if(el.closest('script,style')) return;
    const t=(el.textContent||'').trim(); if(!t) return;
    const id=stableId(el,d); if(data.customText[id]!==undefined) el.textContent=data.customText[id];
    el.contentEditable='true'; el.style.cursor='text';
    el.onfocus=()=>{el.style.outline='2px dashed #2563eb';};
    el.onblur=()=>{el.style.outline=''; data.customText[id]=el.textContent.trim(); debounceSave();};
    el.oninput=()=>{data.customText[id]=el.textContent.trim(); debounceSave();};
  });

  d.querySelectorAll('[data-key-src]').forEach(el=>{ const k=el.getAttribute('data-key-src'); el.style.outline='2px dashed rgba(22,163,74,.45)'; addPanel(d, el.parentElement||el, k, '请上传该图片'); });
  d.querySelectorAll('[data-bg-key]').forEach(el=>{ const k=el.getAttribute('data-bg-key'); el.style.outline='2px dashed rgba(245,158,11,.45)'; addPanel(d, el, k, '请上传该区域图片'); });
}

function pickImage(file){ if(!file||!imageKey) return; const r=new FileReader(); r.onload=()=>{ data[imageKey]=r.result; const d=$('#live').contentDocument; if(d){ d.querySelectorAll(`[data-key-src="${imageKey}"]`).forEach(el=>{el.src=r.result;el.style.display='block';}); d.querySelectorAll(`[data-bg-key="${imageKey}"]`).forEach(el=>el.style.backgroundImage=`linear-gradient(rgba(10,56,136,.56),rgba(10,56,136,.62)),url(${r.result})`); const ph=d.getElementById('wechatQrPlaceholder'); if(ph&&imageKey==='contactWeChatQr') ph.style.display='none'; } msg('已更新图片：'+imageKey); debounceSave(); }; r.readAsDataURL(file); }

function openMapSettings(){
  var e=prompt('请输入地图链接（高德分享链接/iframe地址）', data.contactMapEmbed||'');
  var t=prompt('无地图时提示文案', data.contactMapTip||'请在后台设置地图链接（支持高德分享链接/iframe地址）');
  if(e===null) e=data.contactMapEmbed||'';
  if(t===null) t=data.contactMapTip||'';
  data.contactMapEmbed=String(e).trim();
  data.contactMapTip=String(t).trim();
  msg('地图设置已更新'); debounceSave();
}

async function saveAll(silent){
  const payload={...data}; const pwd=localStorage.getItem('admin_pwd')||''; if(pwd) payload.password=pwd;
  let r=await fetch('/api/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  let res=await r.json();
  if(r.status===401){ const p=prompt('请输入后台保存密码'); if(p){localStorage.setItem('admin_pwd',p); payload.password=p; r=await fetch('/api/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); res=await r.json();}}
  msg(res.ok?(silent?'✅ 已自动保存':'✅ 保存成功'):'❌ 保存失败：'+(res.error||'未知错误'));
}

async function init(){
  document.body.dataset.adminReady='0';
  data=await fetch('/api/content').then(r=>r.json());
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>openPage(b.dataset.go)));
  $('#saveBtn').addEventListener('click',()=>saveAll(false));
  $('#autoBtn').addEventListener('click',()=>{autoSave=!autoSave; $('#autoBtn').textContent='自动保存：'+(autoSave?'开':'关');});
  $('#mapBtn').addEventListener('click',openMapSettings);
  $('#pick').addEventListener('change',e=>{pickImage(e.target.files[0]); e.target.value='';});
  $('#live').addEventListener('load',()=>setTimeout(()=>{ bindEditable(); msg('✅ 后台已就绪：可直接改文字，图片用上传/清除按钮'); },180));
  document.body.dataset.adminReady='1';
  openPage('/');
}
init().catch(e=>{ msg('❌ 后台初始化失败：'+String(e)); console.error(e); });