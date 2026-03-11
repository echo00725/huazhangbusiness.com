function pageKey(){ return document.body.dataset.page || 'home'; }
function q(name){ return new URLSearchParams(location.search).get(name); }
function stableId(el){
  const parts=[];
  let cur=el;
  while(cur && cur!==document.body){
    const p=cur.parentElement; if(!p) break;
    const i=[...p.children].indexOf(cur);
    parts.unshift(`${cur.tagName.toLowerCase()}:${i}`);
    cur=p;
  }
  return parts.join('>');
}
function applyTextOverrides(map){
  if(!map) return;
  const sel='h1,h2,h3,h4,h5,h6,p,a,li,span,button,label,strong,em,b,small';
  document.querySelectorAll(sel).forEach(el=>{
    if(el.closest('script,style')) return;
    const id=stableId(el);
    if(map[id]!==undefined) el.textContent = map[id];
  });
}

async function applyContent(){
  try{
    const data = await fetch('/api/content').then(r=>r.json());
    const p = pageKey();

    const t = data[`seo_${p}_title`] || data.siteTitle;
    if(t) document.title = t;
    const d = data[`seo_${p}_desc`];
    const md = document.querySelector('meta[name="description"]');
    if(md && d) md.setAttribute('content', d);

    document.querySelectorAll('[data-key]').forEach(el=>{
      const k = el.dataset.key;
      if(data[k] !== undefined) el.textContent = data[k];
    });

    document.querySelectorAll('[data-key-src]').forEach(el=>{
      const k = el.dataset.keySrc;
      if(data[k]) el.src = data[k];
    });

    const qrEls = [...document.querySelectorAll('[data-key-src="contactWeChatQr"],[data-key-src="contactWeChatQr2"]')];
    const qrPlaceholder = document.getElementById('wechatQrPlaceholder');
    let shown = 0;
    qrEls.forEach(el=>{
      const k = el.dataset.keySrc;
      const has = !!data[k];
      el.style.display = has ? 'block' : 'none';
      if(has) shown++;
    });
    if(qrPlaceholder) qrPlaceholder.style.display = shown>0 ? 'none' : 'flex';

    const mapFrame = document.getElementById('contactMapFrame');
    const mapPlaceholder = document.getElementById('contactMapPlaceholder');
    const mapOpenBtn = document.getElementById('contactMapOpenBtn');
    if(mapFrame){
      const mapUrl = data.contactMapEmbed || '';
      const hasMap = /^https?:\/\//.test(mapUrl);
      const isShortAmap = /surl\.amap\.com/.test(mapUrl);
      if(hasMap && !isShortAmap){
        mapFrame.src = mapUrl;
        mapFrame.style.display = 'block';
        if(mapPlaceholder) mapPlaceholder.style.display = 'none';
        if(mapOpenBtn) mapOpenBtn.style.display = 'none';
      }else if(hasMap && isShortAmap){
        mapFrame.removeAttribute('src');
        mapFrame.style.display = 'none';
        if(mapPlaceholder){
          mapPlaceholder.style.display = 'flex';
          const tipEl = mapPlaceholder.querySelector('p');
          if(tipEl) tipEl.textContent = '当前为高德分享短链，点击下方按钮打开地图';
        }
        if(mapOpenBtn){
          mapOpenBtn.href = mapUrl;
          mapOpenBtn.style.display = 'inline-block';
        }
      }else{
        mapFrame.removeAttribute('src');
        mapFrame.style.display = 'none';
        if(mapPlaceholder){
          mapPlaceholder.style.display = 'flex';
          const tipEl = mapPlaceholder.querySelector('p');
          if(tipEl) tipEl.textContent = data.contactMapTip || '请在后台设置地图链接（支持高德分享链接/iframe地址）';
        }
        if(mapOpenBtn) mapOpenBtn.style.display = 'none';
      }
    }

    document.querySelectorAll('[data-bg-key]').forEach(el=>{
      const k = el.dataset.bgKey;
      const url = data[k];
      if(url){
        el.style.backgroundImage = `linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25)), url('${url}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      }
    });

    if(data.bgPage){
      document.body.style.backgroundImage = `url('${data.bgPage}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
    }

    const newsList = document.getElementById('newsList');
    if(newsList && Array.isArray(data.newsItems)){
      newsList.innerHTML = data.newsItems.map((n,i) => {
        const tag = (n.meta || '').split('｜')[0] || '新闻';
        return `
        <article class="news-item">
          <span class="tag">${tag}</span>
          ${n.image ? `<img src="${n.image}" class="news-thumb" alt="news"/>` : ''}
          <h3>${n.title || ''}</h3>
          <p>${n.text || ''}</p>
          <p class="news-meta">${n.meta || ''}</p>
          <p><a href="/news-detail.html?id=${i}">查看详情</a></p>
        </article>`}).join('');
    }

    const detail = document.getElementById('newsDetail');
    if(detail && Array.isArray(data.newsItems)){
      const i = Number(q('id') || 0);
      const n = data.newsItems[i];
      if(!n){ detail.innerHTML = '<p>未找到新闻内容</p>'; }
      else {
        const prev = i > 0 ? `<a href="/news-detail.html?id=${i-1}">← 上一条</a>` : `<span></span>`;
        const next = i < data.newsItems.length - 1 ? `<a href="/news-detail.html?id=${i+1}">下一条 →</a>` : `<span></span>`;
        detail.innerHTML = `
          ${n.image ? `<img src="${n.image}" class="news-thumb" alt="news"/>` : ''}
          <h1>${n.title || ''}</h1>
          <p class="news-meta">${n.meta || ''}</p>
          <p>${(n.content || n.text || '').replace(/\n/g,'<br>')}</p>
          <div class="news-nav">${prev}${next}</div>`;
        if(md) md.setAttribute('content', n.text || d || '新闻详情');
        document.title = `${n.title || '新闻详情'} - 华章商贸`;
      }
    }

    applyTextOverrides(data.customText);

    const y = document.getElementById('year');
    if(y) y.textContent = new Date().getFullYear();
  }catch(e){ console.warn('content load fail', e); }
}
applyContent();