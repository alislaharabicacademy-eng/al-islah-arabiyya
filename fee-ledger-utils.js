/* Pure helpers: consistent calculations in the Admin fee register and private Student Dashboard.
   Only an authenticated, admin-approved student's own studentAccess record may be read. */
const MONTHS=Object.freeze(['January','February','March','April','May','June','July','August','September','October','November','December']);
export const feeMonthNames=MONTHS;
export function indiaFeeClock(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(now);
 const n=key=>Number(parts.find(p=>p.type===key)?.value||0);
 return {year:n('year'),month:n('month')};
}
export function validFeeLedger(ledger){
 if(!ledger||typeof ledger!=='object'||Array.isArray(ledger))return {};
 const clean={};
 for(const [year,months] of Object.entries(ledger)){
  if(!/^20\d\d$/.test(year)||!months||typeof months!=='object'||Array.isArray(months))continue;
  clean[year]={};
  for(const [month,entry] of Object.entries(months)){
   if(!/^(?:[1-9]|1[0-2])$/.test(month)||!entry||typeof entry!=='object')continue;
   if(entry.status!=='Paid')continue;
   const n=Number(entry.amount);
   if(!Number.isFinite(n)||n<0)continue;
   clean[year][month]={
    status:'Paid',amount:n,paidAt:typeof entry.paidAt==='string'?entry.paidAt.slice(0,30):'',
    receiptId:typeof entry.receiptId==='string'?entry.receiptId.slice(0,100):''
   };
  }
 }
 return clean;
}
export function summarizeFees({ledger={},year,rate=0,asOf=indiaFeeClock(),enrolledAt='',state='Active'}={}){
 const yy=Number(year),nowY=Number(asOf.year),nowM=Number(asOf.month);
 const records=validFeeLedger(ledger)[String(yy)]||{};
 const monthlyRate=Math.max(0,Number(rate)||0);
 const start=typeof enrolledAt==='string'&&/^20\d\d-\d\d/.test(enrolledAt)?enrolledAt.slice(0,7):'';
 const enrolledYear=start?Number(start.slice(0,4)):0,enrolledMonth=start?Number(start.slice(5,7)):0;
 let received=0,paid=0,pending=0,notDue=0,beforeEnrollment=0;
 const months=MONTHS.map((monthName,index)=>{
  const m=index+1,e=records[String(m)],isPaid=!!e;
  const beforeStart=enrolledYear>0&&(yy<enrolledYear||(yy===enrolledYear&&m<enrolledMonth));
  const due=yy<nowY||(yy===nowY&&m<=nowM);
  const dueAndEnrolled=due&&!beforeStart;
  const status=isPaid?'Paid':beforeStart?'Before enrollment':dueAndEnrolled?'Pending':'Not due';
  if(isPaid){paid++;received+=e.amount}
  else if(beforeStart)beforeEnrollment++;
  else if(dueAndEnrolled)pending++;
  else notDue++;
  return {month:m,name:monthName,year:yy,status,amount:isPaid?e.amount:0,paidAt:e?.paidAt||'',receiptId:e?.receiptId||''};
 });
 // The calendar-year register always contains twelve slots. "Pending"
 // covers months already due; upcoming months must not be shown as overdue.
 const totalMonths=months.length;
 const remaining=totalMonths-paid-beforeEnrollment;
 return {year:yy,monthlyRate,months,totalMonths,remaining,paid,pending,notDue,beforeEnrollment,
  fullYearReferenceAmount:monthlyRate?monthlyRate*totalMonths:null,
  collected:received,pendingAmount:monthlyRate?pending*monthlyRate:null,
  enrolledDate:enrolledAt||'',startDateKnown:!!start,
  note:!start?'Pending months are counted from January of the selected year because an enrollment date is not recorded.':'Pending months begin from the recorded enrollment month.',
  state:String(state||'Active')};
}
export function allRecordedPayments(ledger){
 const valid=validFeeLedger(ledger),out=[];
 for(const [year,months] of Object.entries(valid))
  for(const [month,e] of Object.entries(months))out.push({year:Number(year),month:Number(month),monthName:MONTHS[Number(month)-1],...e});
 return out.sort((a,b)=>b.year-a.year||b.month-a.month);
}
