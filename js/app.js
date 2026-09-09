/* ============================================================
   الوظائف المشتركة لكل صفحات المنصة
   ============================================================ */

// ---------- أيقونات SVG (مجموعة موحدة، خط واحد، بلا تعبئة) ----------
const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a1 1 0 0 0 1 1H9.5v-6h5v6H17.5a1 1 0 0 0 1-1V10"/></svg>`,
  groups: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8" r="2.8"/><circle cx="16" cy="9" r="2.2"/><path d="M3.5 19c.5-3.2 2.5-5 5-5s4.5 1.8 5 5"/><path d="M14 14.5c2 .2 3.4 1.7 3.8 4.5"/></svg>`,
  market: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.2 10.2a1.5 1.5 0 0 1-1.5 1.3H6.7a1.5 1.5 0 0 1-1.5-1.3L4 8Z"/><path d="M8 8V6.5a4 4 0 0 1 8 0V8"/></svg>`,
  messages: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v10.5H9l-4 3.5V16H4Z"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="4.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19.5" cy="12" r="1.6"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z"/><path d="M10 18a2 2 0 0 0 4 0"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>`,
  like: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-9.3-9C1.2 7.8 3 4.5 6.5 4.5c2 0 3.4 1.1 5.5 3.4 2.1-2.3 3.5-3.4 5.5-3.4 3.5 0 5.3 3.3 3.8 6.5C19 15.6 12 20 12 20Z"/></svg>`,
  comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v10.5H9l-4 3.5V16H4Z"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v6.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12"/><path d="M12 15V4M8 8l4-4 4 4"/></svg>`,
  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4.5h12v15l-6-3.8-6 3.8v-15Z"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="9" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5h3l1.5-2h7l1.5 2h3v11H4v-11Z"/><circle cx="12" cy="14" r="3.3"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="14.5" r="3.2"/><path d="M10.3 12.2 18 4.5M15.5 7l2 2M18 4.5l1.8 1.8"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 5 6v6c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5V6l-7-2.5Z"/></svg>`,
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20c1-4 3.8-6 7.5-6s6.5 2 7.5 6"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4.5h12v15l-6-3.8-6 3.8v-15Z"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3M15 16l4-4-4-4M19 12H9"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3H9.8l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.6h4.4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/></svg>`,
};

function icon(name) { return ICONS[name] || ''; }

// ---------- الشريط العلوي ----------
function renderHeader(opts = {}) {
  const { title = null, back = false, page = '' } = opts;
  return `
  <header class="top-header">
    ${back
      ? `<button class="icon-btn" onclick="history.back()">${icon('back')}</button>`
      : `<div class="brand"><span class="dot"></span>${title || 'ميدان'}</div>`
    }
    <div class="header-actions">
      ${page !== 'search' ? `<a class="icon-btn" href="feed.html#search">${icon('search')}</a>` : ''}
      ${page !== 'notifications' ? `<a class="icon-btn" href="notifications.html">${icon('bell')}<span class="badge-dot"></span></a>` : ''}
      ${page !== 'settings' ? `<a class="icon-btn" href="settings.html">${icon('menu')}</a>` : ''}
    </div>
  </header>`;
}

// ---------- التنقل السفلي ----------
function renderNav(active) {
  const items = [
    { key: 'feed', href: 'feed.html', label: 'الرئيسية', icon: 'home' },
    { key: 'groups', href: 'groups.html', label: 'المجتمعات', icon: 'groups' },
    { key: 'market', href: 'marketplace.html', label: 'السوق', icon: 'market' },
    { key: 'messages', href: 'messages.html', label: 'الرسائل', icon: 'messages' },
    { key: 'profile', href: 'profile.html', label: 'حسابي', icon: 'user' },
  ];
  return `
  <nav class="bottom-nav">
    ${items.map(it => `
      <a class="nav-item ${it.key === active ? 'active' : ''}" href="${it.href}">
        ${icon(it.icon)}
        <span>${it.label}</span>
      </a>
    `).join('')}
  </nav>`;
}

function mountShell({ active = '', title = null, back = false, page = '' } = {}) {
  document.getElementById('header-mount').innerHTML = renderHeader({ title, back, page });
  const navMount = document.getElementById('nav-mount');
  if (navMount) navMount.innerHTML = renderNav(active);
}

// ---------- تفاعل الإعجاب ----------
function toggleLike(btn) {
  const isLiked = btn.classList.toggle('liked');
  const countEl = btn.querySelector('.count');
  let count = parseInt(countEl.dataset.count, 10);
  count = isLiked ? count + 1 : count - 1;
  countEl.dataset.count = count;
  countEl.textContent = formatCount(count);
}

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'ألف';
  return n;
}

// ---------- سويتشات الإعدادات ----------
function toggleSwitch(el) {
  el.classList.toggle('on');
}

// ---------- بيانات تجريبية للمنشورات ----------
const DEMO_POSTS = [
  {
    name: 'سارة العتيبي', handle: 'sara', verified: true, time: 'قبل ٢٤ دقيقة',
    text: 'أنهيت اليوم أول لوحة من سلسلة جديدة عن المدن القديمة. العمل على التفاصيل الصغيرة هو الجزء الذي يستهلك معظم الوقت لكنه الأهم.',
    media: true, likes: 342, comments: 41,
  },
  {
    name: 'مجتمع صُنّاع القهوة', handle: 'coffee.circle', verified: false, time: 'قبل ساعة',
    text: 'نقاش اليوم: هل التحميص الفاتح فعلاً يحافظ على نكهة الحبة أكثر، أم أن الأمر مبالغ فيه؟ شاركونا تجاربكم.',
    media: false, likes: 128, comments: 76,
  },
  {
    name: 'خالد المطيري', handle: 'khalid.m', verified: true, time: 'قبل ٣ ساعات',
    text: 'خمس ملاحظات تعلمتها بعد سنتين من الكتابة المستقلة، سأنشرها على شكل سلسلة قصيرة هنا بدل مقال طويل.',
    media: false, likes: 891, comments: 132,
  },
  {
    name: 'نور حسن', handle: 'noor.h', verified: false, time: 'أمس',
    text: 'صورة من رحلة الصباح. الهدوء في هذا الوقت من النهار لا يعادله شيء.',
    media: true, likes: 256, comments: 18,
  },
];

function renderPost(p, i) {
  return `
  <article class="post">
    <div class="post-head">
      <div class="avatar">${p.name.charAt(0)}</div>
      <div class="who">
        <div class="name">${p.name} ${p.verified ? `<span class="verified-mark">${icon('shield')}</span>` : ''}</div>
        <div class="meta">@${p.handle} · ${p.time}</div>
      </div>
    </div>
    <div class="post-body">${p.text}</div>
    ${p.media ? `<div class="post-media"><div style="aspect-ratio:16/10;background:linear-gradient(135deg,var(--surface-2),var(--bg))"></div></div>` : ''}
    <div class="post-actions">
      <button class="action-btn" onclick="toggleLike(this)">
        ${icon('like')}<span class="count" data-count="${p.likes}">${formatCount(p.likes)}</span>
      </button>
      <button class="action-btn">${icon('comment')}<span>${formatCount(p.comments)}</span></button>
      <button class="action-btn">${icon('share')}<span>مشاركة</span></button>
      <div style="flex:1"></div>
      <button class="action-btn">${icon('save')}</button>
    </div>
  </article>`;
}

function renderFeed(mountId) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML = DEMO_POSTS.map(renderPost).join('');
}
