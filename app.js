// @ts-nocheck
// ضع Project URL وPublishable key من إعدادات مشروع Supabase.
// لا تستخدم أبدًا مفتاح service_role في كود المتصفح.
const SUPABASE_URL = "https://qqgqwfuxnlssnhctggfr.supabase.co";
const SUPABASE_KEY = "sb_publishable_NDG_iDQ4ruLxjOyYBW3mpA_Sx0mpEgL";
const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "1";
const supabaseClient = window.supabase && SUPABASE_URL && SUPABASE_KEY
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const defaultSpecialists = [
  {
    id: "sara",
    name: "د. سارة منصور",
    title: "أخصائية نفسية إكلينيكية",
    tags: ["القلق والتوتر", "العلاقات"],
    bio: "أساعدك على فهم مشاعرك والتعامل مع القلق وبناء علاقات أكثر توازنًا.",
    price: "٤٥٠",
    initials: "س",
    tone: 1
  },
  {
    id: "omar",
    name: "د. عمر ناصر",
    title: "معالج نفسي",
    tags: ["المزاج والاكتئاب", "تطوير الذات"],
    bio: "مساحة داعمة لاستكشاف التحديات اليومية ووضع خطوات تناسب إيقاعك.",
    price: "٥٠٠",
    initials: "ع",
    tone: 2
  },
  {
    id: "nour",
    name: "أ. نور إبراهيم",
    title: "أخصائية إرشاد أسري",
    tags: ["العلاقات", "القلق والتوتر"],
    bio: "أرافق الأفراد والأزواج في تحسين التواصل وفهم الاحتياجات المتبادلة.",
    price: "٤٠٠",
    initials: "ن",
    tone: 3
  }
];

const quizSets = {
  المزاج: ["كيف كان شعورك العام خلال الأيام الماضية؟", "هل وجدت صعوبة في الاستمتاع بأشياء تحبها؟", "هل أثّر مزاجك على روتينك اليومي؟"],
  التوتر: ["كم مرة شعرت أن المسؤوليات أكبر من طاقتك؟", "هل وجدت صعوبة في الاسترخاء مؤخرًا؟", "هل أثر الضغط على نومك أو تركيزك؟"],
  العلاقات: ["هل تشعر أن احتياجاتك مسموعة في علاقاتك؟", "هل يسهل عليك التعبير عن حدودك؟", "هل تجد مساحة للراحة في علاقاتك؟"]
};

const dialog = document.querySelector("#appDialog");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogEyebrow = document.querySelector("#dialogEyebrow");
const dialogContent = document.querySelector("#dialogContent");
const toast = document.querySelector("#toast");
const specialistGrid = document.querySelector("#specialistGrid");
let activeFilter = "الكل";
let activeQuiz = null;
let quizIndex = 0;
let quizScore = 0;
let toastTimer;
let dbSpecialists = [];
let currentUser = null;
let currentSpecialistProfile = null;

async function loadSpecialists() {
  renderSpecialists();
  if (isDemoMode) {
    document.querySelector("#demoBanner").hidden = false;
    setDatabaseStatus("معروضون أخصائيون ببيانات تجريبية. يمكنك استعراض نموذج الحجز دون إرسال أو حفظ بيانات.");
    return;
  }
  if (!supabaseClient) {
    setDatabaseStatus("يعرض الموقع ملفات تجريبية فقط. أضف إعدادات Supabase لتفعيل التسجيل والحجز.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("specialists")
    .select("id,name,title,bio,price,tags,mode")
    .eq("is_approved", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("تعذر تحميل الأخصائيين من Supabase.", error);
    setDatabaseStatus("تعذر الاتصال بقاعدة البيانات. المعروض ملفات تجريبية فقط، والتسجيل والحجز غير متاحين حاليًا.");
    showToast(`تعذر تحميل الأخصائيين: ${error.message}`);
    return;
  }
  dbSpecialists = data.map((s) => ({
    id: s.id,
    name: s.name,
    title: s.title,
    bio: s.bio,
    price: s.price,
    tags: s.tags || [],
    mode: s.mode,
    initials: s.name?.trim().charAt(0) || "م",
    tone: 3,
    isFromDb: true
  }));
  renderSpecialists();
  setDatabaseStatus(dbSpecialists.length
    ? "الملفات التجريبية ظاهرة للتوضيح فقط؛ الحجز متاح مع الأخصائيين المنشورين."
    : "لا توجد ملفات منشورة بعد؛ المعروض ملفات تجريبية للتوضيح فقط.");
}

function setDatabaseStatus(message) {
  const status = document.querySelector("#databaseStatus");
  status.textContent = message;
  status.hidden = !message;
}

function requireDatabase() {
  if (supabaseClient) return true;
  showToast("أضف Project URL وPublishable key في app.js أولًا.");
  return false;
}

function allSpecialists() {
  if (isDemoMode) return defaultSpecialists.map((person) => ({ ...person, isDemo: true }));
  return [...dbSpecialists, ...defaultSpecialists];
}

function renderSpecialists() {
  const query = document.querySelector("#specialistSearch").value.trim().toLocaleLowerCase("ar");
  const matches = allSpecialists().filter((person) => {
    const matchesFilter = activeFilter === "الكل" || person.tags?.includes(activeFilter);
    const searchable = `${person.name} ${person.title} ${person.tags?.join(" ") || ""} ${person.bio}`.toLocaleLowerCase("ar");
    return matchesFilter && searchable.includes(query);
  });
  specialistGrid.innerHTML = matches.map((person, index) => `
    <article class="specialist-card">
      <div class="specialist-top">
        <span class="profile-avatar tone-${person.tone || index % 4}" aria-hidden="true">${escapeHtml(person.initials || person.name?.trim().charAt(0) || "م")}</span>
        <div class="profile-info"><h3>${escapeHtml(person.name)}</h3><p>${escapeHtml(person.title)}</p></div>
        <span class="online-dot" title="متاح للتواصل"></span>
      </div>
      <p class="specialist-bio">${escapeHtml(person.bio)}</p>
      <div class="specialty-tags">${(person.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="card-bottom"><span class="session-price"><strong>${escapeHtml(person.price || "تواصل")}</strong> ج.م / جلسة</span><div class="card-actions"><button class="card-link" data-profile="${escapeHtml(person.id)}">الملف</button>${person.isFromDb || isDemoMode ? `<button class="card-book" data-book="${escapeHtml(person.id)}">${isDemoMode ? "جرّب الحجز" : "احجز"}</button>` : `<button class="card-book" type="button" disabled title="ملف تجريبي">تجريبي</button>`}</div></div>
    </article>`).join("");
  document.querySelector("#emptySpecialists").hidden = matches.length > 0;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function openDialog(title, eyebrow, content) {
  dialogTitle.textContent = title;
  dialogEyebrow.textContent = eyebrow;
  dialogContent.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function profileForm(profile = {}) {
  const topics = ["القلق والتوتر", "العلاقات", "المزاج والاكتئاب", "تطوير الذات"];
  return `
    <form id="${profile.id ? "profileEditForm" : "profileForm"}">
      <div class="form-grid">
        <div class="field"><label for="practitionerName">الاسم المهني</label><input id="practitionerName" name="name" required maxlength="70" value="${escapeHtml(profile.name || "")}" placeholder="الاسم الذي يظهر للزوار"></div>
        <div class="field"><label for="practitionerTitle">المسمى المهني</label><input id="practitionerTitle" name="title" required maxlength="80" value="${escapeHtml(profile.title || "")}" placeholder="مثال: أخصائي نفسي"></div>
        <div class="field"><label for="practitionerPrice">سعر الجلسة بالجنيه</label><input id="practitionerPrice" name="price" inputmode="numeric" maxlength="8" value="${escapeHtml(profile.price || "")}" placeholder="مثال: ٤٥٠"></div>
        <div class="field full"><label for="practitionerBio">نبذة عنك</label><textarea id="practitionerBio" name="bio" required maxlength="320" placeholder="عرّف الزوار بخبرتك وطريقة عملك...">${escapeHtml(profile.bio || "")}</textarea></div>
        <div class="field full"><label for="practitionerTags">التخصصات (افصل بينها بفاصلة)</label><input id="practitionerTags" name="tags" maxlength="180" value="${escapeHtml((profile.tags || []).join("، "))}" placeholder="${topics.join("، ")}"></div>
        <div class="field full"><label for="practitionerMode">طريقة الجلسات</label><select id="practitionerMode" name="mode"><option ${profile.mode === "عن بُعد" ? "selected" : ""}>عن بُعد</option><option ${profile.mode === "في العيادة" ? "selected" : ""}>في العيادة</option><option ${profile.mode === "عن بُعد أو في العيادة" ? "selected" : ""}>عن بُعد أو في العيادة</option></select></div>
      </div>
      <p class="privacy-note">سيظل ملفك قيد المراجعة ولن يظهر للزوار قبل الموافقة. لا تضع بيانات مرضى أو معلومات صحية حساسة.</p>
      <div class="form-actions"><button class="button button-primary" type="submit">حفظ الملف</button><button class="button button-quiet" type="button" data-close-dialog>إغلاق</button></div>
    </form>`;
}

function authForm(mode = "login") {
  const isSignup = mode === "signup";
  const fields = isSignup ? `
    <div class="field"><label for="practitionerName">الاسم المهني</label><input id="practitionerName" name="name" required maxlength="70"></div>
    <div class="field"><label for="practitionerTitle">المسمى المهني</label><input id="practitionerTitle" name="title" required maxlength="80"></div>
    <div class="field"><label for="practitionerPrice">سعر الجلسة بالجنيه</label><input id="practitionerPrice" name="price" maxlength="8" placeholder="مثال: ٤٥٠"></div>
    <div class="field"><label for="practitionerMode">طريقة الجلسات</label><select id="practitionerMode" name="mode"><option>عن بُعد</option><option>في العيادة</option><option>عن بُعد أو في العيادة</option></select></div>
    <div class="field full"><label for="practitionerBio">نبذة مهنية</label><textarea id="practitionerBio" name="bio" required maxlength="320"></textarea></div>
    <div class="field full"><label for="practitionerTags">التخصصات (افصل بينها بفاصلة)</label><input id="practitionerTags" name="tags" maxlength="180" placeholder="القلق والتوتر، العلاقات"></div>` : "";
  return `<div class="dashboard-tabs"><button class="dashboard-tab ${isSignup ? "" : "active"}" data-auth-mode="login">دخول</button><button class="dashboard-tab ${isSignup ? "active" : ""}" data-auth-mode="signup">حساب جديد</button></div>
    <form id="authForm" data-mode="${mode}">
      <div class="form-grid">${fields}
        <div class="field full"><label for="authEmail">البريد الإلكتروني</label><input id="authEmail" name="email" type="email" autocomplete="email" required></div>
        <div class="field full"><label for="authPassword">كلمة المرور</label><input id="authPassword" name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" ${isSignup ? 'minlength="8"' : ""} required></div>
      </div>
      ${isSignup ? `<p class="privacy-note">بعد إنشاء الحساب سيُراجع ملفك قبل نشره. قد تحتاج إلى تأكيد بريدك الإلكتروني أولًا.</p>` : ""}
      <div class="form-actions"><button class="button button-primary" type="submit">${isSignup ? "إنشاء حساب ومتابعة" : "دخول"}</button></div>
    </form>`;
}

async function openDashboard(mode = "login") {
  if (isDemoMode) {
    openDemoDashboard(mode);
    return;
  }
  if (!requireDatabase()) return;
  openDialog("مساحة الأخصائي", "للمختصين", `<div class="booking-summary">جارٍ التحقق من الحساب...</div>`);
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("تعذر التحقق من جلسة الأخصائي.", error);
    openDialog("مساحة الأخصائي", "للمختصين", authForm(mode));
    showToast(`تعذر التحقق من الحساب: ${error.message}`);
    return;
  }
  if (!session?.user) {
    currentUser = null;
    currentSpecialistProfile = null;
    openDialog("مساحة الأخصائي", "للمختصين", authForm(mode));
    return;
  }
  await renderDashboard(session.user);
}

function openDemoDashboard(mode) {
  const heading = mode === "signup" ? "معاينة الانضمام كأخصائي" : "معاينة مساحة الأخصائي";
  const intro = mode === "signup"
    ? "إنشاء الحساب غير متاح في نسخة العرض. استعرض لوحة الأخصائي باستخدام بيانات توضيحية."
    : "تسجيل الدخول غير متاح في نسخة العرض. يمكنك استعراض لوحة الأخصائي التجريبية.";
  openDialog(heading, "نسخة عرض تجريبي", `
    <div class="booking-summary">${intro}<br>لا تُدخل بريدك أو كلمة مرورك الحقيقية.</div>
    ${renderDemoDashboard("profile")}
  `);
}

function renderDemoDashboard(tab) {
  const isAppointmentsTab = tab === "appointments";
  const tabs = `<div class="dashboard-tabs"><button class="dashboard-tab ${isAppointmentsTab ? "" : "active"}" data-demo-tab="profile">ملفي المهني</button><button class="dashboard-tab ${isAppointmentsTab ? "active" : ""}" data-demo-tab="appointments">طلبات الحجز</button></div>`;
  const panel = isAppointmentsTab
    ? `<div class="appointment-list"><article class="appointment-item"><strong>طلب تجريبي</strong><p>موعد مبدئي: الأحد، ٥:٠٠ مساءً · عن بُعد</p><p>وسيلة التواصل: بيانات غير حقيقية</p><small>الحالة: جديد — عنصر توضيحي</small></article></div>`
    : `<div class="profile-preview"><span class="profile-avatar">م</span><div><strong>د. مثال توضيحي</strong><small>ملف تجريبي — غير منشور</small></div></div><p class="privacy-note">في النسخة الفعلية، يستطيع الأخصائي إكمال ملفه ومتابعة طلبات الحجز بعد إنشاء حسابه وموافقة الإدارة.</p>`;
  return `${tabs}<div id="demoDashboardPanel">${panel}</div><p class="disclaimer">هذه معاينة ببيانات وهمية؛ لا توجد حسابات أو طلبات حقيقية.</p>`;
}

function profileValues(source = {}) {
  const metadata = source.user_metadata || {};
  const tags = Array.isArray(metadata.tags) ? metadata.tags : String(metadata.tags || "").split(/[،,]/);
  return {
    name: source.name || metadata.name || "",
    title: source.title || metadata.title || "",
    bio: source.bio || metadata.bio || "",
    price: source.price || metadata.price || "",
    tags: source.tags || tags.map((tag) => tag.trim()).filter(Boolean),
    mode: source.mode || metadata.mode || "عن بُعد"
  };
}

async function ensureSpecialistProfile(user) {
  const { data, error } = await supabaseClient
    .from("specialists")
    .select("id,name,title,bio,price,tags,mode,is_approved")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const profile = profileValues(user);
  if (!profile.name || !profile.title || !profile.bio) return null;
  const { data: created, error: insertError } = await supabaseClient
    .from("specialists")
    .insert({
      user_id: user.id,
      name: profile.name,
      title: profile.title,
      bio: profile.bio,
      price: profile.price || "تواصل",
      tags: profile.tags.length ? profile.tags : ["تطوير الذات"],
      mode: profile.mode
    })
    .select("id,name,title,bio,price,tags,mode,is_approved")
    .single();
  if (insertError) throw insertError;
  return created;
}

async function renderDashboard(user) {
  currentUser = user;
  try {
    currentSpecialistProfile = await ensureSpecialistProfile(user);
  } catch (error) {
    console.error("تعذر تحميل ملف الأخصائي.", error);
    openDialog("مساحة الأخصائي", "للمختصين", authForm("login"));
    showToast(`تعذر تحميل الملف: ${error.message}`);
    return;
  }

  if (!currentSpecialistProfile) {
    openDialog("أكمل ملفك المهني", escapeHtml(user.email), profileForm(profileValues(user)));
    return;
  }
  const profile = currentSpecialistProfile;
  const status = profile.is_approved ? "ملفك منشور ويمكن للزوار الحجز معك." : "ملفك قيد المراجعة ولن يظهر للزوار قبل الموافقة.";
  const preview = `<div class="profile-preview"><span class="profile-avatar">${escapeHtml(profile.name.charAt(0))}</span><div><strong>${escapeHtml(profile.name)}</strong><small>${status}</small></div></div>`;
  const tabs = `<div class="dashboard-tabs"><button class="dashboard-tab active" data-dashboard-tab="profile">ملفي المهني</button><button class="dashboard-tab" data-dashboard-tab="appointments">طلبات الحجز</button></div>`;
  const profilePanel = profile.is_approved
    ? `<p class="privacy-note">للتعديل على ملف منشور، تواصل مع إدارة الموقع حتى تراجع التغييرات.</p>`
    : profileForm(profile);
  openDialog("مساحة الأخصائي", "للمختصين", `${preview}${tabs}<div id="dashboardPanel">${profilePanel}</div><div class="form-actions"><button class="button button-quiet" data-sign-out>تسجيل الخروج</button></div>`);
}

async function dashboardAppointments() {
  if (!currentSpecialistProfile) return `<div class="empty-appointments">أكمل ملفك المهني أولًا.</div>`;
  const { data, error } = await supabaseClient
    .from("appointments")
    .select("client_name,contact,date,mode,note,status,created_at")
    .eq("specialist_id", currentSpecialistProfile.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("تعذر تحميل حجوزات الأخصائي.", error);
    showToast(`تعذر تحميل الحجوزات: ${error.message}`);
    return `<div class="empty-appointments">تعذر تحميل الحجوزات. حاول مرة أخرى.</div>`;
  }
  if (!data.length) return `<div class="empty-appointments">لا توجد طلبات حجز حتى الآن.</div>`;
  return `<div class="appointment-list">${data.map((item) => `<article class="appointment-item"><strong>${escapeHtml(item.client_name)}</strong><p>${escapeHtml(item.date)} · ${escapeHtml(item.mode)}</p><p>${escapeHtml(item.contact)}</p>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}<small>الحالة: ${escapeHtml(item.status || "جديد")} · ${escapeHtml(item.created_at)}</small></article>`).join("")}</div>`;
}

function bookingForm(person) {
  return `<div class="booking-summary"><strong>${escapeHtml(person.name)}</strong> · ${escapeHtml(person.title)}<br>الجلسة: ${escapeHtml(person.price || "يُحدد بالتواصل")} ج.م</div>
    <form id="bookingForm" data-specialist="${escapeHtml(person.id)}">
      <div class="form-grid">
        <div class="field"><label for="clientName">الاسم</label><input id="clientName" name="client" required maxlength="70" autocomplete="name" placeholder="اسمك أو اسم مستعار"></div>
        <div class="field"><label for="clientContact">وسيلة التواصل</label><input id="clientContact" name="contact" required maxlength="100" placeholder="هاتف أو بريد إلكتروني"></div>
        <div class="field"><label for="bookingDate">موعد مناسب مبدئيًا</label><input id="bookingDate" name="date" type="datetime-local" required></div>
        <div class="field"><label for="bookingMode">طريقة الجلسة</label><select id="bookingMode" name="mode"><option>عن بُعد</option><option>في العيادة (بالتنسيق)</option><option>نتفق لاحقًا</option></select></div>
        <div class="field full"><label for="bookingNote">ملاحظة (اختياري)</label><textarea id="bookingNote" name="note" maxlength="300" placeholder="أي تفاصيل تود مشاركتها قبل التواصل"></textarea></div>
      </div>
      <p class="privacy-note">${isDemoMode ? "نموذج تجريبي: استخدم بيانات وهمية فقط. لن يتم إرسال طلبك أو حفظه." : "طلبك يُحفظ في قاعدة البيانات، لكن لن يصل إشعار للأخصائي حتى إضافة هذه الميزة. لا تكتب معلومات طبية حساسة."}</p>
      <div class="form-actions"><button class="button button-primary" type="submit">${isDemoMode ? "معاينة تأكيد الحجز" : "إرسال طلب الحجز"}</button></div>
    </form>`;
}

function showProfile(person) {
  const bookingAction = person.isFromDb || isDemoMode
    ? `<button class="button button-primary" data-book="${escapeHtml(person.id)}">${isDemoMode ? "جرّب الحجز" : "اطلب حجزًا"}</button>`
    : `<p class="privacy-note">هذا ملف تجريبي؛ الحجز متاح مع الأخصائيين المنشورين من قاعدة البيانات فقط.</p>`;
  openDialog(person.name, "الملف المهني", `<div class="profile-preview"><span class="profile-avatar">${escapeHtml(person.initials || person.name.charAt(0))}</span><div><strong>${escapeHtml(person.title)}</strong><small>${escapeHtml(person.mode || "جلسات بالتنسيق المباشر")}</small></div></div><p class="specialist-bio">${escapeHtml(person.bio)}</p><div class="specialty-tags">${(person.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div><p class="booking-summary">سعر الجلسة: <strong>${escapeHtml(person.price || "يُحدد بالتواصل")} ج.م</strong></p>${bookingAction}<p class="privacy-note">الأخصائيون ملفات تعريف مستقلة. تحقّق من المؤهلات والتفاصيل المهنية قبل بدء أي خدمة.</p>`);
}

function startQuiz(type) {
  activeQuiz = type;
  quizIndex = 0;
  quizScore = 0;
  renderQuiz();
}

function renderQuiz() {
  const questions = quizSets[activeQuiz];
  if (quizIndex >= questions.length) {
    const level = quizScore <= 1 ? "قد يكون من المفيد أن تواصل ملاحظة مشاعرك واحتياجاتك." : "قد تساعدك مساحة للحديث مع شخص متخصص على استكشاف ما تشعر به.";
    openDialog("اكتمل التأمل", `اختبار ${activeQuiz}`, `<div class="booking-summary"><strong>شكرًا لمشاركتك.</strong><br>${level}</div><p class="privacy-note">هذه النتيجة ليست تشخيصًا ولا تقييمًا طبيًا. الاختبار قصير وغير معتمد سريريًا، والنتيجة لا تحدد حالتك النفسية.</p><div class="form-actions"><button class="button button-primary" data-close-dialog>تم</button><a class="button button-quiet" href="#specialists" data-close-dialog>تصفّح الأخصائيين</a></div>`);
    return;
  }
  openDialog(`سؤال ${quizIndex + 1} من ${questions.length}`, `اختبار ${activeQuiz}`, `<div class="quiz-progress"><span style="width:${(quizIndex / questions.length) * 100}%"></span></div><h3 class="quiz-question">${questions[quizIndex]}</h3><div class="quiz-options"><button class="quiz-option" data-answer="0">أبدًا أو نادرًا</button><button class="quiz-option" data-answer="1">أحيانًا</button><button class="quiz-option" data-answer="2">غالبًا</button></div><p class="privacy-note">لا يتم حفظ إجاباتك. هذا نشاط للتأمل فقط وليس اختبارًا تشخيصيًا.</p>`);
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button, a, summary");
  if (!target) return;
  if (target.matches("[data-close-dialog]")) dialog.close();
  if (target.matches("[data-open-dashboard]")) openDashboard(target.dataset.openDashboard || "login");
  if (target.matches("[data-auth-mode]")) {
    dialogContent.innerHTML = authForm(target.dataset.authMode);
  }
  if (target.matches("[data-sign-out]")) {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error("تعذر تسجيل خروج الأخصائي.", error);
      showToast(`تعذر تسجيل الخروج: ${error.message}`);
      return;
    }
    currentUser = null;
    currentSpecialistProfile = null;
    openDialog("مساحة الأخصائي", "للمختصين", authForm("login"));
  }
  if (target.matches("[data-filter]")) {
    activeFilter = target.dataset.filter;
    document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip === target));
    renderSpecialists();
  }
  if (target.matches("[data-profile]")) {
    const person = allSpecialists().find((item) => String(item.id) === target.dataset.profile);
    if (person) showProfile(person);
  }
  if (target.matches("[data-book]")) {
    const person = allSpecialists().find((item) => String(item.id) === target.dataset.book);
    if (person && (person.isFromDb || isDemoMode)) openDialog("طلب حجز", isDemoMode ? "معاينة تجريبية" : "خطوتك الأولى", bookingForm(person));
  }
  if (target.matches("[data-quiz]")) startQuiz(target.dataset.quiz);
  if (target.matches("[data-answer]")) {
    quizScore += Number(target.dataset.answer);
    quizIndex += 1;
    renderQuiz();
  }
  if (target.matches("[data-dashboard-tab]")) {
    document.querySelectorAll(".dashboard-tab").forEach((tab) => tab.classList.toggle("active", tab === target));
    const panel = document.querySelector("#dashboardPanel");
    if (target.dataset.dashboardTab === "appointments") {
      panel.innerHTML = "جارٍ تحميل الطلبات...";
      panel.innerHTML = await dashboardAppointments();
    } else {
      await renderDashboard(currentUser);
    }
  }
  if (target.matches("[data-demo-tab]")) {
    dialogContent.innerHTML = renderDemoDashboard(target.dataset.demoTab);
  }
  if (target.id === "storyPrev" || target.id === "storyNext") {
    const cards = [...document.querySelectorAll(".story-card")];
    if (cards.length > 1) {
      const first = cards[0];
      const parent = first.parentElement;
      if (target.id === "storyNext") parent.append(first);
      else parent.insertBefore(cards[cards.length - 1], first);
    }
  }
});

document.addEventListener("submit", async (event) => {
  if (event.target.id === "authForm") {
    event.preventDefault();
    if (!requireDatabase()) return;
    const form = event.target;
    const data = new FormData(form);
    const email = data.get("email").trim();
    const password = data.get("password");
    if (form.dataset.mode === "signup") {
      const tags = data.get("tags").split(/[،,]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
      const { data: result, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: data.get("name").trim(),
            title: data.get("title").trim(),
            bio: data.get("bio").trim(),
            price: data.get("price").trim() || "تواصل",
            tags: tags.length ? tags : ["تطوير الذات"],
            mode: data.get("mode")
          }
        }
      });
      if (error) {
        console.error("تعذر إنشاء حساب الأخصائي.", error);
        showToast(`تعذر إنشاء الحساب: ${error.message}`);
        return;
      }
      if (result.session && result.user) {
        await renderDashboard(result.user);
      } else {
        openDialog("تأكيد البريد الإلكتروني", "خطوة أخيرة", `<div class="booking-summary">أرسلنا رسالة تأكيد إلى <strong>${escapeHtml(email)}</strong>. افتحها لتأكيد الحساب، ثم سجّل الدخول من هنا لإكمال ملفك.</div><div class="form-actions"><button class="button button-primary" data-auth-mode="login">العودة لتسجيل الدخول</button></div>`);
      }
    } else {
      const { data: result, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("تعذر تسجيل دخول الأخصائي.", error);
        showToast(`تعذر تسجيل الدخول: ${error.message}`);
        return;
      }
      await renderDashboard(result.user);
    }
  }

  if (event.target.id === "profileForm") {
    event.preventDefault();
    if (!currentUser || !requireDatabase()) return;
    const data = new FormData(event.target);
    const tags = data.get("tags").split(/[،,]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
    const { data: profile, error } = await supabaseClient
      .from("specialists")
      .insert({
        user_id: currentUser.id,
        name: data.get("name").trim(),
        title: data.get("title").trim(),
        bio: data.get("bio").trim(),
        price: data.get("price").trim() || "تواصل",
        tags: tags.length ? tags : ["تطوير الذات"],
        mode: data.get("mode")
      })
      .select("id,name,title,bio,price,tags,mode,is_approved")
      .single();
    if (error) {
      console.error("تعذر حفظ ملف الأخصائي.", error);
      showToast(`تعذر حفظ الملف: ${error.message}`);
      return;
    }
    currentSpecialistProfile = profile;
    showToast("تم حفظ ملفك، وسيظهر بعد مراجعته والموافقة عليه.");
    await renderDashboard(currentUser);
  }
  if (event.target.id === "profileEditForm") {
    event.preventDefault();
    if (!currentUser || !currentSpecialistProfile || !requireDatabase()) return;
    const data = new FormData(event.target);
    const tags = data.get("tags").split(/[،,]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
    const { error } = await supabaseClient
      .from("specialists")
      .update({
        name: data.get("name").trim(),
        title: data.get("title").trim(),
        bio: data.get("bio").trim(),
        price: data.get("price").trim() || "تواصل",
        tags: tags.length ? tags : ["تطوير الذات"],
        mode: data.get("mode")
      })
      .eq("id", currentSpecialistProfile.id);
    if (error) {
      console.error("تعذر تحديث ملف الأخصائي.", error);
      showToast(`تعذر تحديث الملف: ${error.message}`);
      return;
    }
    showToast("تم تحديث ملفك. سيبقى قيد المراجعة.");
    await renderDashboard(currentUser);
  }
  if (event.target.id === "bookingForm") {
    event.preventDefault();
    const data = new FormData(event.target);
    const person = allSpecialists().find((item) => String(item.id) === event.target.dataset.specialist);
    if (isDemoMode) {
      if (!person?.isDemo) {
        showToast("تعذر العثور على الأخصائي التجريبي.");
        return;
      }
      openDialog("اكتملت المعاينة", "طلب تجريبي فقط", `
        <div class="booking-summary"><strong>تم استعراض تأكيد الحجز بنجاح.</strong><br>لم يُرسل طلب ولم تُحفظ أي بيانات.</div>
        <p class="privacy-note">الأخصائي: ${escapeHtml(person.name)} · الموعد: ${escapeHtml(data.get("date"))} · طريقة الجلسة: ${escapeHtml(data.get("mode"))}</p>
        <div class="form-actions"><button class="button button-primary" data-close-dialog>تم</button></div>
      `);
      return;
    }
    if (!requireDatabase()) return;
    if (!person?.isFromDb) {
      showToast("الحجز متاح مع الأخصائيين المسجلين والمعتمدين فقط.");
      return;
    }
    const { error } = await supabaseClient.from("appointments").insert({
      specialist_id: person.id,
      specialist_name: person?.name || "أخصائي",
      client_name: data.get("client").trim(),
      contact: data.get("contact").trim(),
      date: data.get("date"),
      mode: data.get("mode"),
      note: data.get("note").trim()
    });
    if (error) {
      console.error("تعذر حفظ طلب الحجز في Supabase.", error);
      showToast(`تعذر حفظ الحجز: ${error.message}`);
      return;
    }
    openDialog("تم حفظ طلبك", "شكرًا لثقتك", `<div class="booking-summary"><strong>تم حفظ الطلب في قاعدة البيانات.</strong><br>هذه النسخة لا ترسل إشعارًا للأخصائي حتى الآن.</div><p class="privacy-note">احتفظ بوسيلة تواصل آمنة عند تنسيق أي موعد، ولا تشارك معلومات حساسة هنا.</p><div class="form-actions"><button class="button button-primary" data-close-dialog>حسنًا</button></div>`);
  }
});

document.querySelector("#specialistSearch").addEventListener("input", renderSpecialists);
document.querySelector("#menuToggle").addEventListener("click", (event) => {
  const menu = document.querySelector("#mainNav");
  const expanded = menu.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(expanded));
});
document.querySelectorAll("#mainNav a").forEach((link) => link.addEventListener("click", () => {
  document.querySelector("#mainNav").classList.remove("open");
  document.querySelector("#menuToggle").setAttribute("aria-expanded", "false");
}));
document.querySelector("[data-close-dialog]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
if (!supabaseClient && !isDemoMode) {
  showToast("قاعدة البيانات غير مهيأة بعد؛ أضف بيانات مشروع Supabase في app.js.");
}
loadSpecialists();