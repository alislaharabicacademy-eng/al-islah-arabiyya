/* Academy Official Letterhead Studio.
 * Only verified Academy admins can enter. Nothing is written to Firestore:
 * unsent letter text remains solely in the browser tab.
 * Principal signature is the exact published image from Website Settings.
 */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {getFirestore,doc,getDoc} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {loadSiteSettings} from './site-settings.js';
import {isVerifiedAcademyAdmin} from './academy-admin-access.js';

const LANGUAGES={
  "en": {
    "locale": "en-GB-u-ca-gregory",
    "headerDesc": "Al Islah Arabic Academy · Admin-only letters with principal signature",
    "createHeading": "Create a Letter",
    "editorDesc": "Enter the date, subject and content. The A4 preview updates automatically.",
    "languageLabel": "Letter Language",
    "languageHint": "Language changes the form, date, greeting and page direction. Your own writing is not automatically translated.",
    "dateLabel": "Date *",
    "referenceLabel": "Reference No.",
    "referencePlaceholder": "Optional",
    "recipientLabel": "To / Recipient",
    "recipientPlaceholder": "Parents / Students / Staff",
    "subjectLabel": "Subject / Topic *",
    "subjectPlaceholder": "Enter letter topic",
    "greetingLabel": "Greeting",
    "bodyLabel": "Letter Content *",
    "bodyPlaceholder": "Type your letter here. Paragraphs and line breaks are preserved.",
    "draftHint": "Not saved automatically. Copy your draft elsewhere if needed.",
    "closingLabel": "Closing",
    "signatureChoiceLabel": "Include Principal Signature",
    "signatureChoiceHint": "Tick to show the uploaded signature in the preview and PDF. Untick for Principal title only.",
    "printButton": "🖨 Print / Save PDF",
    "sampleButton": "Fill Sample",
    "clearButton": "Clear",
    "previewHeading": "Live A4 Preview",
    "previewHint": "Official letterhead · A4 portrait",
    "refOnPaper": "Ref: ",
    "dateOnPaper": "Date: ",
    "subjectOnPaper": "Subject: ",
    "toOnPaper": "To,",
    "footerNotice": "OFFICIAL ACADEMY COMMUNICATION",
    "emptySubject": "[Enter subject]",
    "emptyBody": "Your letter content will appear here.",
    "emptyDate": "[Enter date]",
    "principalRole": "Principal",
    "signatureMissing": "Principal signature not uploaded",
    "statusSignature": "Upload a principal signature in Admin → Website Settings & Principal before printing.",
    "statusPrincipal": "Add the principal’s name in Website Settings before printing.",
    "statusRequired": "Enter date, subject and content to enable the signed PDF.",
    "statusLong": "Long letter: please inspect the A4 print preview for page breaks before saving.",
    "statusReady": "✓ Signed letter ready. Select Print / Save PDF, then choose “Save as PDF”.",
    "statusUnsignedReady": "✓ Ready without signature. The preview and PDF will show only Principal.",
    "statusPrintError": "Could not prepare the logo or signature. Check Website Settings and try again.",
    "confirmSample": "Loading a sample will replace the recipient, subject and content in this editor. Continue?",
    "defaults": {
      "letterGreeting": "Assalamu Alaikum wa Rahmatullahi wa Barakatuh,",
      "letterClosing": "JazakAllahu Khairan."
    },
    "sample": {
      "letterTo": "Parents and Guardians",
      "letterSubject": "Notice Regarding the Monthly Parent Meeting",
      "letterBody": "We are pleased to inform you that our Academy will conduct its monthly parent meeting to review students’ learning progress and discuss upcoming academic activities.\n\nAll parents and guardians are kindly requested to attend. The meeting schedule and joining details will be shared through the official class group.\n\nThank you for your continued cooperation and support."
    }
  },
  "ta": {
    "locale": "ta-IN-u-ca-gregory",
    "headerDesc": "அல் இஸ்லாஹ் அரபிக் அகாடமி · முதல்வர் கையொப்பத்துடன் அதிகாரப்பூர்வக் கடிதங்கள்",
    "createHeading": "அதிகாரப்பூர்வக் கடிதம் உருவாக்கு",
    "editorDesc": "தேதி, தலைப்பு, கடித விவரங்களை உள்ளிடுங்கள். A4 முன்பார்வை உடனே புதுப்பிக்கப்படும்.",
    "languageLabel": "கடிதத்தின் மொழி",
    "languageHint": "மொழியை மாற்றினால் படிவம், தேதி, தொடக்கம், கடித அமைப்பு மாறும். நீங்கள் எழுதிய உரை தானாக மொழிபெயர்க்கப்படாது.",
    "dateLabel": "தேதி *",
    "referenceLabel": "கடித எண்",
    "referencePlaceholder": "தேவையென்றால் மட்டும்",
    "recipientLabel": "பெறுநர் / யாருக்கு",
    "recipientPlaceholder": "பெற்றோர்கள் / மாணவர்கள் / ஆசிரியர்கள்",
    "subjectLabel": "தலைப்பு *",
    "subjectPlaceholder": "கடிதத்தின் தலைப்பை எழுதவும்",
    "greetingLabel": "தொடக்க வாழ்த்து",
    "bodyLabel": "கடிதத்தின் விவரம் *",
    "bodyPlaceholder": "இங்கே தமிழில் கடிதத்தை எழுதுங்கள். பத்திகளும் வரி இடைவெளிகளும் அப்படியே இருக்கும்.",
    "draftHint": "இந்தக் கடிதம் தானாகச் சேமிக்கப்படாது. தேவைப்பட்டால் உரையை நகலெடுத்துக் கொள்ளுங்கள்.",
    "closingLabel": "முடிவு வாசகம்",
    "signatureChoiceLabel": "முதல்வரின் கையொப்பம் சேர்க்கவும்",
    "signatureChoiceHint": "டிக் செய்தால் Preview மற்றும் PDF-ல் கையொப்பம் வரும். டிக் செய்யாவிட்டால் முதல்வர் என்று மட்டும் வரும்.",
    "printButton": "🖨 PDF சேமிக்க / அச்சிட",
    "sampleButton": "மாதிரி கடிதம்",
    "clearButton": "அழி",
    "previewHeading": "A4 கடித முன்பார்வை",
    "previewHint": "அதிகாரப்பூர்வ கடிதம் · A4 அளவு",
    "refOnPaper": "கடித எண்: ",
    "dateOnPaper": "தேதி: ",
    "subjectOnPaper": "பொருள்: ",
    "toOnPaper": "பெறுநர்:",
    "footerNotice": "அகாடமியின் அதிகாரப்பூர்வ அறிவிப்பு",
    "emptySubject": "[தலைப்பை எழுதவும்]",
    "emptyBody": "உங்கள் கடிதத்தின் விவரங்கள் இங்கே வரும்.",
    "emptyDate": "[தேதி கொடுக்கவும்]",
    "principalRole": "முதல்வர்",
    "signatureMissing": "முதல்வரின் கையொப்பம் பதிவேற்றப்படவில்லை",
    "statusSignature": "Admin → Website Settings & Principal பகுதியில் முதல்வரின் கையொப்பத்தைப் பதிவேற்றுங்கள்.",
    "statusPrincipal": "Website Settings பகுதியில் முதல்வரின் பெயரைச் சேர்க்கவும்.",
    "statusRequired": "தேதி, தலைப்பு, கடித விவரங்களை உள்ளிடுங்கள்.",
    "statusLong": "நீண்ட கடிதம்: PDF சேமிக்கும் முன் A4 Print Preview-வில் பக்கங்களைச் சரிபார்க்கவும்.",
    "statusReady": "✓ கையொப்பத்துடன் தயார். PDF சேமிக்க / அச்சிட என்பதைத் தேர்ந்தெடுக்கவும்.",
    "statusUnsignedReady": "✓ கையொப்பமின்றி தயார். Preview மற்றும் PDF-ல் முதல்வர் என்று மட்டும் வரும்.",
    "statusPrintError": "லோகோ அல்லது கையொப்பத்தை PDF-க்குத் தயாரிக்க முடியவில்லை. Settings-ஐச் சரிபார்க்கவும்.",
    "confirmSample": "மாதிரி கடிதத்தைத் தேர்ந்தெடுத்தால் இப்போது எழுதிய பெறுநர், தலைப்பு, விவரம் மாற்றப்படும். தொடரலாமா?",
    "defaults": {
      "letterGreeting": "அஸ்ஸலாமு அலைக்கும் வரஹ்மதுல்லாஹி வபரகாத்துஹு,",
      "letterClosing": "ஜஸாக்கல்லாஹு கைரன்."
    },
    "sample": {
      "letterTo": "அன்பிற்குரிய பெற்றோர்கள் மற்றும் பாதுகாவலர்கள்",
      "letterSubject": "மாதாந்திர பெற்றோர் கூட்டம் குறித்த அறிவிப்பு",
      "letterBody": "நமது அகாடமியில் பயிலும் மாணவ, மாணவியரின் கல்வி முன்னேற்றம் மற்றும் வரவிருக்கும் கல்வி நிகழ்ச்சிகள் குறித்து கலந்துரையாட மாதாந்திர பெற்றோர் கூட்டம் நடைபெற உள்ளது.\n\nஅனைத்துப் பெற்றோர்களும் இக்கூட்டத்தில் கலந்து கொள்ளுமாறு அன்புடன் கேட்டுக்கொள்கிறோம். கூட்டத்தின் நாள், நேரம் மற்றும் இணையும் விவரங்கள் அதிகாரப்பூர்வ வகுப்புக் குழுவில் அறிவிக்கப்படும்.\n\nஉங்களின் தொடர்ந்த ஒத்துழைப்பிற்கும் ஆதரவிற்கும் நன்றி."
    }
  },
  "ar": {
    "locale": "ar-EG-u-ca-gregory",
    "headerDesc": "أكاديمية الإصلاح العربية · خطابات رسمية بتوقيع المديرة",
    "createHeading": "إنشاء خطاب رسمي",
    "editorDesc": "أدخل التاريخ والموضوع ونص الخطاب. ستُحدَّث معاينة A4 تلقائيًا.",
    "languageLabel": "لغة الخطاب",
    "languageHint": "يغيّر اختيار اللغة عناوين الخطاب والتحية واتجاه الكتابة والتاريخ، ولا يترجم النص الذي كتبته تلقائيًا.",
    "dateLabel": "التاريخ *",
    "referenceLabel": "الرقم المرجعي",
    "referencePlaceholder": "اختياري",
    "recipientLabel": "المرسل إليه",
    "recipientPlaceholder": "أولياء الأمور / الطلاب / المعلمون",
    "subjectLabel": "الموضوع *",
    "subjectPlaceholder": "اكتب موضوع الخطاب",
    "greetingLabel": "التحية",
    "bodyLabel": "نص الخطاب *",
    "bodyPlaceholder": "اكتب نص الخطاب بالعربية هنا. ستُحفَظ الفقرات وفواصل الأسطر.",
    "draftHint": "لا يُحفَظ النص تلقائيًا. يُرجى نسخه إذا رغبت في الاحتفاظ بالمسودة.",
    "closingLabel": "عبارة الختام",
    "signatureChoiceLabel": "إضافة توقيع المديرة",
    "signatureChoiceHint": "ضع علامة لإظهار التوقيع في المعاينة وPDF. بدون علامة سيظهر منصب المديرة فقط.",
    "printButton": "🖨 طباعة / حفظ PDF",
    "sampleButton": "نموذج خطاب",
    "clearButton": "مسح",
    "previewHeading": "معاينة الخطاب بحجم A4",
    "previewHint": "ورق رسمي · مقاس A4",
    "refOnPaper": "المرجع: ",
    "dateOnPaper": "التاريخ: ",
    "subjectOnPaper": "الموضوع: ",
    "toOnPaper": "إلى:",
    "footerNotice": "مراسلة رسمية من الأكاديمية",
    "emptySubject": "[اكتب الموضوع]",
    "emptyBody": "سيظهر نص خطابك هنا.",
    "emptyDate": "[أدخل التاريخ]",
    "principalRole": "المديرة",
    "signatureMissing": "لم يُرفع توقيع المديرة",
    "statusSignature": "يُرجى رفع توقيع المديرة من Admin → Website Settings & Principal قبل الطباعة.",
    "statusPrincipal": "يُرجى إضافة اسم المديرة في إعدادات الموقع.",
    "statusRequired": "أدخل التاريخ والموضوع ونص الخطاب لتفعيل حفظ PDF.",
    "statusLong": "خطاب طويل: تحقّق من فواصل الصفحات في معاينة الطباعة قبل الحفظ.",
    "statusReady": "✓ الخطاب الموقّع جاهز للطباعة أو الحفظ بصيغة PDF.",
    "statusUnsignedReady": "✓ الخطاب جاهز دون توقيع. سيظهر منصب المديرة فقط في المعاينة وPDF.",
    "statusPrintError": "تعذّر تجهيز الشعار أو التوقيع. تحقّق من إعدادات الموقع ثم حاول مجددًا.",
    "confirmSample": "سيؤدي إدراج النموذج إلى استبدال المرسل إليه والموضوع ونص الخطاب الحالي. هل تريد المتابعة؟",
    "defaults": {
      "letterGreeting": "السلام عليكم ورحمة الله وبركاته،",
      "letterClosing": "جزاكم الله خيرًا على تعاونكم."
    },
    "sample": {
      "letterTo": "السادة أولياء الأمور الكرام",
      "letterSubject": "إشعار بشأن اجتماع أولياء الأمور الشهري",
      "letterBody": "يسرّ إدارة الأكاديمية أن تُعلمكم بأنه سيُعقد اجتماع شهري لأولياء الأمور لمتابعة تقدّم الطلاب والطالبات ومناقشة الأنشطة التعليمية القادمة.\n\nنرجو من جميع أولياء الأمور المشاركة في الاجتماع، وسيتم الإعلان عن الموعد وتفاصيل الانضمام عبر المجموعة الرسمية للفصل.\n\nنشكر لكم تعاونكم المستمر وحرصكم على متابعة تعليم أبنائكم وبناتكم."
    }
  }
};
const $=id=>document.getElementById(id);
const fields=['letterDate','letterRef','letterTo','letterSubject','letterGreeting','letterBody','letterClosing'];
const form=Object.fromEntries(fields.map(id=>[id,$(id)]));
const defaults={letterRef:'',letterTo:'',letterSubject:'',letterBody:''};
const languageSelect=$('letterLanguage');
let letterLang='en';
let isAuthorized=false;
let hasSignature=false;
let signatureData="";
let settings=null;

const todayInIndia=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
form.letterDate.value=todayInIndia();
const val=id=>form[id].value.trim();

function current(){return LANGUAGES[letterLang];}
function displayDate(dateValue){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dateValue))return current().emptyDate;
 const parsed=new Date(dateValue+'T12:00:00');
 return Number.isFinite(parsed.getTime())
  ? new Intl.DateTimeFormat(current().locale,{day:'2-digit',month:'long',year:'numeric'}).format(parsed)
  : current().emptyDate;
}
function text(id,value){$(id).textContent=value;}
function refresh(){
 const t=current();
 text('pvDate',displayDate(val('letterDate')));
 $('refRow').hidden=!val('letterRef');
 text('pvRef',val('letterRef'));
 $('pvTo').hidden=!val('letterTo');
 text('pvTo',val('letterTo')?t.toOnPaper+'\n'+val('letterTo'):'');
 text('pvSubject',val('letterSubject')||t.emptySubject);
 text('pvGreeting',val('letterGreeting'));
 $('pvGreeting').hidden=!val('letterGreeting');
 text('pvBody',val('letterBody')||t.emptyBody);
 $('pvBody').classList.toggle('empty',!val('letterBody'));
 text('pvClosing',val('letterClosing'));
 $('pvClosing').hidden=!val('letterClosing');
 $('signatureMissing').textContent=t.signatureMissing;
 // A signature must never appear in either print or preview without an explicit tick.
 const includeSignature=$('includePrincipalSignature').checked;
 const showSignature=includeSignature&&hasSignature;
 const img=$('pvSignature');
 img.hidden=!showSignature;
 if(showSignature)img.src=signatureData;
 else img.removeAttribute('src');
 $('signatureMissing').hidden=!includeSignature||hasSignature;
 $('signRule').hidden=!includeSignature;
 $('pvPrincipal').hidden=!includeSignature;
 $('letterSignoff').classList.toggle('with-signature',includeSignature);
 $('letterSignoff').classList.toggle('without-signature',!includeSignature);
 if(settings){
  text('pvPrincipal',settings.principal?.name||'Principal name not set');
  const actualRole=settings.principal?.designation||'Principal';
  text('pvRole',includeSignature&&actualRole!=='Principal'?actualRole:t.principalRole);
 }else text('pvRole',t.principalRole);
 const required=!!val('letterDate')&&!!val('letterSubject')&&!!val('letterBody');
 const ready=isAuthorized&&required&&(!includeSignature||(hasSignature&&!!settings?.principal?.name));
 $('printLetter').disabled=!ready;
 if(!required)text('status',t.statusRequired);
 else if(includeSignature&&!hasSignature)text('status',t.statusSignature);
 else if(includeSignature&&!settings?.principal?.name)text('status',t.statusPrincipal);
 else if(val('letterBody').length>2200)text('status',t.statusLong);
 else text('status',includeSignature?t.statusReady:t.statusUnsignedReady);
}
function changeLanguage(next){
 if(!LANGUAGES[next])return;
 const previous=LANGUAGES[letterLang],upcoming=LANGUAGES[next];
 for(const id of ['letterGreeting','letterClosing']){
  if(!form[id].value.trim()||form[id].value===previous.defaults[id])form[id].value=upcoming.defaults[id];
 }
 // Change an inserted sample to the new language, but never silently translate the user's own text.
 for(const id of ['letterTo','letterSubject','letterBody']){
  if(form[id].value===previous.sample[id])form[id].value=upcoming.sample[id];
 }
 letterLang=next;
 languageSelect.value=letterLang;
 document.documentElement.lang=next;
 const paper=$('paper');paper.dataset.language=next;paper.lang=next;
 for(const id of ['letterTo','letterSubject','letterGreeting','letterBody','letterClosing']){
  form[id].dir=next==='ar'?'rtl':'ltr';
  form[id].lang=next;
 }
 for(const el of document.querySelectorAll('[data-i18n]')){
  const key=el.dataset.i18n;
  if(typeof upcoming[key]==='string')el.textContent=upcoming[key];
 }
 for(const el of document.querySelectorAll('[data-i18n-placeholder]')){
  const key=el.dataset.i18nPlaceholder;
  if(typeof upcoming[key]==='string')el.placeholder=upcoming[key];
 }
 refresh();
}
function useSettings(s){
 settings=s;
 text('brandName',s.instituteName);
 text('brandSubtitle',s.instituteSubtitle);
 text('brandContact',[s.phone,s.email].filter(Boolean).join('   •   '));
 text('footerName',s.instituteName);
 text('pvPrincipal',s.principal?.name||'Principal name not set');
 text('pvRole',s.principal?.designation||'Principal');
 signatureData=s.principal?.signatureData||'';
 hasSignature=/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(signatureData);
 refresh();
}

for(const id of fields)form[id].addEventListener('input',refresh);
languageSelect.addEventListener('change',()=>changeLanguage(languageSelect.value));
$('includePrincipalSignature').addEventListener('change',refresh);
$('sampleLetter').addEventListener('click',()=>{
 if((val('letterTo')||val('letterSubject')||val('letterBody'))&&!confirm(current().confirmSample))return;
 const sample=current().sample;
 for(const [id,value] of Object.entries(sample))form[id].value=value;
 form.letterGreeting.value=current().defaults.letterGreeting;
 form.letterClosing.value=current().defaults.letterClosing;
 form.letterRef.value='';
 refresh();
});
$('clearLetter').addEventListener('click',()=>{
 for(const [id,value] of Object.entries(defaults))form[id].value=value;
 form.letterGreeting.value=current().defaults.letterGreeting;
 form.letterClosing.value=current().defaults.letterClosing;
 form.letterDate.value=todayInIndia();
 $('includePrincipalSignature').checked=false;
 refresh();
});
async function waitForImage(image){
 if(!image||image.hidden)return;
 if(typeof image.decode==='function')await image.decode();
 else if(!image.complete)await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});
}
$('printLetter').addEventListener('click',async()=>{
 refresh();
 if($('printLetter').disabled)return;
 $('printLetter').disabled=true;
 try{
  await Promise.all([waitForImage($('pvSignature')),waitForImage(document.querySelector('.masthead img')),document.fonts?.ready||Promise.resolve()]);
  const previousTitle=document.title;
  document.title='Official Letter - '+val('letterSubject').slice(0,65).replace(/[\\/:*?"<>|]/g,'');
  window.print();
  setTimeout(()=>{document.title=previousTitle;refresh();},1000);
 }catch(error){
  text('status',current().statusPrintError);
  $('printLetter').disabled=false;
 }
});
const permittedAdmin=(db,user)=>isVerifiedAcademyAdmin(db,user);
function showGate(message){
 $('gate').hidden=false;$('workspace').hidden=true;$('notice').hidden=true;
 $('gate').querySelector('h2').textContent=message;
}
async function start(){
 try{
  const response=await fetch('./firebase-config.json',{cache:'no-store'});
  if(!response.ok)throw Error('Firebase config unavailable');
  const config=await response.json();
  const app=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp(config);
  const auth=getAuth(app),db=getFirestore(app);
  onAuthStateChanged(auth,async user=>{
   isAuthorized=false;
   $('workspace').hidden=true;
   if(!user){showGate('Administrator sign-in required');return;}
   if(!await permittedAdmin(db,user)){showGate('This account does not have administrator access');return;}
   isAuthorized=true;
   showGate('Loading Academy letterhead settings…');
   try{
    const s=await loadSiteSettings({fresh:true});
    if(!isAuthorized)return;
    useSettings(s);
    $('gate').hidden=true;$('workspace').hidden=false;$('notice').hidden=false;
   }catch(error){showGate('Could not load Academy Settings. Please retry from Admin Dashboard.');}
  },()=>showGate('Authentication could not be verified'));
 }catch(error){showGate('Cannot connect to the Academy. Check your internet connection.');}
}
changeLanguage(languageSelect.value);
start();
