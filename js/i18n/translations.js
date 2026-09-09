// js/i18n/translations.js
const LANG_KEY = "dm_lang";

export const dict = {
  en: {
    app_name: "DecentraMarket",
    welcome_title: "A marketplace that answers to no one",
    welcome_sub: "Buy and sell freely. Your identity, your data, your keys — nobody else's servers.",
    get_started: "Create your account",
    restore_account: "I already have an account",
    create_identity_title: "Create your identity",
    create_identity_sub: "This generates a private key on your device. Nobody — including us — can recover it for you, so save it somewhere safe.",
    display_name: "Display name",
    display_name_ph: "How sellers and buyers will see you",
    generate_key: "Generate my keys",
    your_recovery_key: "Your recovery key",
    recovery_warning: "Save this now. It's the only way back into your account if you lose access to this device.",
    ive_saved_it: "I've saved it, continue",
    restore_title: "Restore your account",
    restore_sub: "Paste your recovery key (starts with nsec1...)",
    restore_action: "Restore account",
    explore: "Explore",
    my_stores: "My stores",
    messages: "Messages",
    notifications: "Notifications",
    account: "Account",
    sell_something: "Sell something",
    search_ph: "Search listings…",
    all_categories: "All categories",
    no_listings_title: "Nothing here yet",
    no_listings_sub: "Be the first to list something in this category.",
  },
  ar: {
    app_name: "ديسنترا ماركت",
    welcome_title: "سوق لا يخضع لأي جهة",
    welcome_sub: "بيع وشراء بحرية تامة. هويتك وبياناتك ومفاتيحك ملكك وحدك.",
    get_started: "أنشئ حسابك",
    restore_account: "لدي حساب بالفعل",
    create_identity_title: "أنشئ هويتك",
    create_identity_sub: "سيتم توليد مفتاح خاص على جهازك. لا أحد — ولا حتى نحن — يقدر يستعيده لك، فاحفظه بمكان آمن.",
    display_name: "الاسم الظاهر",
    display_name_ph: "كيف سيراك البائعون والمشترون",
    generate_key: "توليد مفاتيحي",
    your_recovery_key: "مفتاح الاستعادة الخاص بك",
    recovery_warning: "احفظه الآن. هذه هي الطريقة الوحيدة للرجوع لحسابك إذا فقدت هذا الجهاز.",
    ive_saved_it: "حفظته، متابعة",
    restore_title: "استعادة حسابك",
    restore_sub: "الصق مفتاح الاستعادة (يبدأ بـ nsec1...)",
    restore_action: "استعادة الحساب",
    explore: "تصفح",
    my_stores: "متاجري",
    messages: "الرسائل",
    notifications: "الإشعارات",
    account: "حسابي",
    sell_something: "أضف إعلان",
    search_ph: "ابحث عن إعلانات…",
    all_categories: "كل الفئات",
    no_listings_title: "لا يوجد شيء هنا بعد",
    no_listings_sub: "كن أول من ينشر إعلانًا في هذه الفئة.",
  },
};

export function getLang() {
  return localStorage.getItem(LANG_KEY) || "ar";
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  applyLangAttributes(lang);
}

export function applyLangAttributes(lang) {
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
}

/** Walks the DOM applying translations to any element with [data-i18n]. */
export function applyTranslations(lang = getLang()) {
  applyLangAttributes(lang);
  const strings = dict[lang] || dict.ar;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (strings[key] != null) el.textContent = strings[key];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const key = el.getAttribute("data-i18n-ph");
    if (strings[key] != null) el.setAttribute("placeholder", strings[key]);
  });
}

export function t(key, lang = getLang()) {
  return (dict[lang] || dict.ar)[key] || key;
}
