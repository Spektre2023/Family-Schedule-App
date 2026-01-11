function effectiveTodayKey(){
  const d=new Date();
  const dow=d.getDay();
  // 0=Sun,6=Sat. App is Mon–Fri; weekend -> show next Monday.
  if(dow===0||dow===6) return 'mon';
  return ['sun','mon','tue','wed','thu','fri','sat'][dow];
}

function effectiveTodayLabel(){
  const d=new Date();
  const dow=d.getDay();
  if(dow===0||dow===6) return "Weekend: Next Monday";
  return dayObjByKey(effectiveTodayKey()).label;
}


// Family Schedule — Option A (Trips per Day)
const DAYS=[{key:"mon",label:"Monday",tint:"mon"},{key:"tue",label:"Tuesday",tint:"tue"},{key:"wed",label:"Wednesday",tint:"wed"},{key:"thu",label:"Thursday",tint:"thu"},{key:"fri",label:"Friday",tint:"fri"}];
const PICKUP_OPTIONS=["Lincoln","Evelyn","Both"];
const YESNO=["Yes","No"];
const DEFAULT_LOCATIONS=["School","Homebush Home","Swimming","Soccer Training","Soccer Academy","Edu Kingdom","Home"];
const LS={data:"fs_optionA_data_v1",settings:"fs_optionA_settings_v1",lastSync:"fs_optionA_lastSync_v1"};
const DEFAULT_SETTINGS={dadFont:"large",editPin:"",ghOwner:"",ghRepo:"",ghBranch:"main",ghPath:"data/schedule.json",ghToken:""};
const el=(id)=>document.getElementById(id);
function safeParse(s,f){try{return JSON.parse(s)}catch{return f}}
function pad2(n){return String(n).padStart(2,"0")}
function formatTime(h24,m){const ampm=h24>=12?"pm":"am";let h=h24%12;if(h===0)h=12;return `${h}:${pad2(m)}${ampm}`}
function buildTimeOptions(){const out=[];let h=8,m=0;while(true){out.push(formatTime(h,m));if(h===20&&m===0)break;m+=30;if(m>=60){m=0;h+=1}}return out}
const TIME_OPTIONS=buildTimeOptions();
function cryptoId(){return "t_"+Math.random().toString(16).slice(2)+"_"+Date.now().toString(16)}
function dedupeCaseInsensitive(arr){const seen=new Set();const out=[];for(const x of arr){const k=x.toLowerCase();if(seen.has(k))continue;seen.add(k);out.push(x)}return out}
function defaultData(){const schedule={};for(const d of DAYS)schedule[d.key]=[];return{version:1,updatedAt:"",locations:[...DEFAULT_LOCATIONS],schedule}}
function normalizeTrip(t){if(!t||typeof t!=="object")return null;return{id:typeof t.id==="string"?t.id:cryptoId(),pickup:typeof t.pickup==="string"?t.pickup:"",from:typeof t.from==="string"?t.from:"",time:typeof t.time==="string"?t.time:"",keepHome:typeof t.keepHome==="string"?t.keepHome:"",feed:typeof t.feed==="string"?t.feed:"",dropoff:typeof t.dropoff==="string"?t.dropoff:"",dropoffTime:typeof t.dropoffTime==="string"?t.dropoffTime:""}}
function normalizeData(d){const base=defaultData();if(!d||typeof d!=="object")return base;let loc=Array.isArray(d.locations)?d.locations:base.locations;loc=loc.filter(x=>typeof x==="string").map(x=>x.trim()).filter(Boolean);loc=dedupeCaseInsensitive(loc);for(const x of DEFAULT_LOCATIONS)if(!loc.some(v=>v.toLowerCase()===x.toLowerCase()))loc.unshift(x);loc=dedupeCaseInsensitive(loc);const schedule={};const src=(d.schedule&&typeof d.schedule==="object")?d.schedule:{};for(const day of DAYS){const arr=Array.isArray(src[day.key])?src[day.key]:[];schedule[day.key]=arr.map(t=>normalizeTrip(t)).filter(Boolean)}return{version:1,updatedAt:typeof d.updatedAt==="string"?d.updatedAt:"",locations:loc,schedule}}
let settings=loadSettings();
let data=loadData();
let isDadMode=true;
let isEditUnlocked=false;

function loadSettings(){const s=safeParse(localStorage.getItem(LS.settings),null);return{...DEFAULT_SETTINGS,...(s||{})}}
function saveSettings(next){settings={...settings,...next};localStorage.setItem(LS.settings,JSON.stringify(settings))}
function loadData(){const d=safeParse(localStorage.getItem(LS.data),null);return normalizeData(d)}
function saveData(){data.updatedAt=new Date().toISOString();localStorage.setItem(LS.data,JSON.stringify(data))}
function applyDadFont(){document.body.classList.toggle("dad-large",settings.dadFont==="large");document.body.classList.toggle("dad-xlarge",settings.dadFont==="xlarge")}
function setStatus(line1,line2,kind="ok"){el("statusLine1").textContent=line1||"";el("statusLine2").innerHTML=line2||"";const dot=el("statusDot");if(kind==="ok"){dot.style.background="var(--accent2)";dot.style.boxShadow="0 0 0 4px rgba(62,209,154,.18)"}else if(kind==="warn"){dot.style.background="var(--warn)";dot.style.boxShadow="0 0 0 4px rgba(255,199,90,.18)"}else{dot.style.background="var(--danger)";dot.style.boxShadow="0 0 0 4px rgba(255,90,106,.18)"}}
function showView(which){el("viewToday").classList.toggle("hidden",which!=="today");el("viewWeek").classList.toggle("hidden",which!=="week");el("viewEdit").classList.toggle("hidden",which!=="edit")}
function todayDayKey(){const day=new Date().getDay();const map={1:"mon",2:"tue",3:"wed",4:"thu",5:"fri"};return map[day]||"mon"}
function dayObjByKey(k){return DAYS.find(d=>d.key===k)||DAYS[0]}
function escapeHtml(s){return String(s).replace(/[&<>\"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function kv(k,v){const val=(v||"").trim()||"—";return `<div><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(val)}</div></div>`}
function shortTripLine(trip){const t=trip.time||"—";const who=trip.pickup||"—";const to=trip.dropoff||"—";return `${t} • ${who} → ${to}`}
function makeSelect(options,value,disabled){const s=document.createElement("select");s.className="select";s.disabled=!!disabled;const blank=document.createElement("option");blank.value="";blank.textContent="—";s.appendChild(blank);for(const opt of options){const o=document.createElement("option");o.value=opt;o.textContent=opt;s.appendChild(o)}s.value=value||"";return s}
function openMapForLocation(loc){const q=(loc||"").trim();if(!q)return;const url=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;window.open(url,"_blank","noopener,noreferrer")}
function updateLastSync(){const elx=el("lastSync"); if(!elx) return; elx.textContent=localStorage.getItem(LS.lastSync)||"Never"}
function updateModeButtons(){el("btnMode").textContent=isDadMode?"Dad (Read)":"Edit";el("btnUnlock").disabled=false;el("btnUnlock").textContent=isEditUnlocked?"Editing On":"Unlock Edit"}

function renderToday(){const dk=todayDayKey();const dobj=dayObjByKey(dk);el("todayTitle").textContent = `Today: ${effectiveTodayLabel()}`;const trips=data.schedule[dk]||[];el("todaySubtitle").textContent=trips.length?`${trips.length} trip(s)`:"No trips today.";const wrap=el("todayTrips");wrap.innerHTML="";if(trips.length===0){const empty=document.createElement("div");empty.className="muted";empty.textContent="Nothing scheduled.";wrap.appendChild(empty);return}
trips.forEach((trip,idx)=>{const card=document.createElement("div");card.className="tripCard";card.innerHTML=`<div class="tripTop"><div><div class="tripTitle">Trip ${idx+1}</div><div class="muted">${escapeHtml(shortTripLine(trip))}</div></div><span class="badge">${isDadMode?"READ":(isEditUnlocked?"EDIT":"LOCKED")}</span></div>
<div class="kv">${kv("Pick up",trip.pickup)}${kv("From",trip.from)}${kv("Time",trip.time)}${kv("Keep at your home",trip.keepHome)}${kv("Feed",trip.feed)}${kv("Drop off",trip.dropoff)}${kv("Drop off time",trip.dropoffTime)}</div>
<div class="row"><button class="btn btn-primary" type="button" ${trip.dropoff?"":"disabled"}>Map</button></div>`;
card.querySelector("button").addEventListener("click",()=>openMapForLocation(trip.dropoff));wrap.appendChild(card)})}

function showDayInToday(dayKey){const dobj=dayObjByKey(dayKey);el("todayTitle").textContent=dobj.label;const trips=data.schedule[dayKey]||[];el("todaySubtitle").textContent=trips.length?`${trips.length} trip(s)`:"No trips.";const wrap=el("todayTrips");wrap.innerHTML="";if(trips.length===0){const empty=document.createElement("div");empty.className="muted";empty.textContent="Nothing scheduled.";wrap.appendChild(empty)}else{trips.forEach((trip,idx)=>{const card=document.createElement("div");card.className="tripCard";card.innerHTML=`<div class="tripTop"><div><div class="tripTitle">Trip ${idx+1}</div><div class="muted">${escapeHtml(shortTripLine(trip))}</div></div><span class="badge">${isDadMode?"READ":(isEditUnlocked?"EDIT":"LOCKED")}</span></div>
<div class="kv">${kv("Pick up",trip.pickup)}${kv("From",trip.from)}${kv("Time",trip.time)}${kv("Keep at your home",trip.keepHome)}${kv("Feed",trip.feed)}${kv("Drop off",trip.dropoff)}${kv("Drop off time",trip.dropoffTime)}</div>
<div class="row"><button class="btn btn-primary" type="button" ${trip.dropoff?"":"disabled"}>Map</button></div>`;
card.querySelector("button").addEventListener("click",()=>openMapForLocation(trip.dropoff));wrap.appendChild(card)})}
showView("today")}

function renderWeekSummary(){const wrap=el("weekSummary");wrap.innerHTML="";for(const d of DAYS){const dayCard=document.createElement("div");dayCard.className="daySummary";const trips=data.schedule[d.key]||[];const lines=trips.slice(0,4).map(t=>`<div class="it">${escapeHtml(shortTripLine(t))}</div>`).join("");const more=trips.length>4?`<div class="muted small">+ ${trips.length-4} more…</div>`:"";dayCard.innerHTML=`<div class="d">${d.label}</div><div class="items">${trips.length?lines+more:`<div class="none">No trips</div>`}</div>`;dayCard.addEventListener("click",()=>showDayInToday(d.key));wrap.appendChild(dayCard)}}

function newTrip(){return{id:cryptoId(),pickup:"",from:"",time:"",keepHome:"",feed:"",dropoff:"",dropoffTime:""}}

function renderTripEditor(dayKey,trip,idx,count){
  const disabled=isDadMode||!isEditUnlocked;
  const root=document.createElement("div");
  root.innerHTML=`<div class="tripEditHeader"><div class="left"><div class="t">Trip ${idx+1}</div><div class="s">${escapeHtml(shortTripLine(trip))}</div></div>
  <div class="tripEditActions">
    <button class="btnSm" type="button" ${disabled||idx===0?"disabled":""}>↑</button>
    <button class="btnSm" type="button" ${disabled||idx===count-1?"disabled":""}>↓</button>
    <button class="btnSm" type="button" ${trip.dropoff?"":"disabled"}>Map</button>
    <button class="btnSm" type="button" ${disabled?"disabled":""}>Delete</button>
  </div></div>
  <div class="grid2">
    <div class="field"><div class="label">Time</div><div class="slot" data-k="time"></div></div>
    <div class="field"><div class="label">Pick up</div><div class="slot" data-k="pickup"></div></div>
    <div class="field"><div class="label">From</div><div class="slot" data-k="from"></div></div>
    <div class="field"><div class="label">Keep at your home</div><div class="slot" data-k="keepHome"></div></div>
    <div class="field"><div class="label">Feed</div><div class="slot" data-k="feed"></div></div>
    <div class="field"><div class="label">Drop off</div><div class="slot" data-k="dropoff"></div></div>
    <div class="field"><div class="label">Drop off time</div><div class="slot" data-k="dropoffTime"></div></div>
  </div>`;
  const [btnUp,btnDown,btnMap,btnDel]=root.querySelectorAll(".btnSm");
  btnMap.addEventListener("click",()=>openMapForLocation(trip.dropoff));
  btnUp.addEventListener("click",()=>{if(idx<=0)return;const arr=data.schedule[dayKey];arr.splice(idx-1,0,arr.splice(idx,1)[0]);saveData();renderAll()});
  btnDown.addEventListener("click",()=>{const arr=data.schedule[dayKey];if(idx>=arr.length-1)return;arr.splice(idx+1,0,arr.splice(idx,1)[0]);saveData();renderAll()});
  btnDel.addEventListener("click",()=>{if(!confirm("Delete this trip?"))return;const arr=data.schedule[dayKey];const i=arr.findIndex(x=>x.id===trip.id);if(i>=0)arr.splice(i,1);saveData();renderAll();setStatus("Trip deleted.","Saved on this device.","ok")});
  const slots=root.querySelectorAll(".slot");
  const locations=data.locations;
  for(const slot of slots){
    const key=slot.dataset.k;
    let options=[];
    if(key==="pickup")options=PICKUP_OPTIONS;
    else if(key==="from"||key==="dropoff")options=locations;
    else if(key==="time"||key==="dropoffTime")options=TIME_OPTIONS;
    else if(key==="keepHome"||key==="feed")options=YESNO;
    const sel=makeSelect(options,trip[key],disabled);
    sel.addEventListener("change",()=>{
      trip[key]=sel.value;
      saveData();
      setStatus("Saved on this device.","To share: Sync → Save to GitHub.","ok");
      renderToday();renderWeekSummary();renderEdit();showView("edit");
    });
    slot.appendChild(sel);
  }
  return root;
}

function renderEdit(){
  const wrap=el("editDays");wrap.innerHTML="";
  for(const d of DAYS){
    const block=document.createElement("div");
    block.className=`dayBlock dayTint ${d.tint}`;
    const trips=data.schedule[d.key]||[];
    const addDisabled=isDadMode||!isEditUnlocked;
    block.innerHTML=`<div class="dayHead"><div class="dayName">${d.label}</div><button class="btn btn-primary" type="button" ${addDisabled?"disabled":""}>+ Add Trip</button></div><div class="dayBody"></div>`;
    const dayBody=block.querySelector(".dayBody");
    const addBtn=block.querySelector("button");
    addBtn.addEventListener("click",()=>{
      const t=newTrip();
      data.schedule[d.key].push(t);
      saveData();renderAll();
      setStatus("Trip added.","Changes save on this device automatically.","ok");
    });
    if(trips.length===0){
      const empty=document.createElement("div");empty.className="muted";empty.textContent="No trips yet.";dayBody.appendChild(empty);
    }else{
      trips.forEach((trip,idx)=>{
        const te=document.createElement("div");te.className="tripEdit";
        te.appendChild(renderTripEditor(d.key,trip,idx,trips.length));
        dayBody.appendChild(te);
      });
    }
    wrap.appendChild(block);
  }
  renderLocations();
}

function renderLocations(){
  const list=el("locationList");list.innerHTML="";
  const disabled=isDadMode||!isEditUnlocked;
  const defaultsLower=new Set(DEFAULT_LOCATIONS.map(x=>x.toLowerCase()));
  data.locations.forEach((name)=>{
    const item=document.createElement("div");item.className="locItem";
    const isDefault=defaultsLower.has(name.toLowerCase());
    item.innerHTML=`<div class="locName">${escapeHtml(name)} ${isDefault?`<span class="badge">preset</span>`:""}</div>
    <button class="btnSm" type="button" ${disabled||isDefault?"disabled":""}>Rename</button>
    <button class="btnSm" type="button" ${disabled||isDefault?"disabled":""}>Delete</button>`;
    const [btnRename,btnDelete]=item.querySelectorAll(".btnSm");
    btnRename.addEventListener("click",()=>{
      const next=prompt("Rename location:",name);if(!next)return;const trimmed=next.trim();if(!trimmed)return;
      data.locations=data.locations.map(x=>(x.toLowerCase()===name.toLowerCase()?trimmed:x));
      data.locations=dedupeCaseInsensitive(data.locations);
      for(const d of DAYS){for(const t of data.schedule[d.key]){if((t.from||"").toLowerCase()===name.toLowerCase())t.from=trimmed;if((t.dropoff||"").toLowerCase()===name.toLowerCase())t.dropoff=trimmed}}
      saveData();renderAll();setStatus("Location renamed.","Saved on this device.","ok");
    });
    btnDelete.addEventListener("click",()=>{
      if(!confirm(`Delete "${name}"?\n\nIt will also clear any trip using it.`))return;
      data.locations=data.locations.filter(x=>x.toLowerCase()!==name.toLowerCase());
      for(const d of DAYS){for(const t of data.schedule[d.key]){if((t.from||"").toLowerCase()===name.toLowerCase())t.from="";if((t.dropoff||"").toLowerCase()===name.toLowerCase())t.dropoff=""}}
      saveData();renderAll();setStatus("Location deleted.","Saved on this device.","ok");
    });
    list.appendChild(item);
  });
}
function addLocation(name){
  const v=(name||"").trim();if(!v)return;
  const lower=v.toLowerCase();
  if(data.locations.some(x=>x.toLowerCase()===lower)){setStatus("Location already exists.","Pick it from the dropdown.","warn");return}
  data.locations.push(v);data.locations=dedupeCaseInsensitive(data.locations);saveData();renderAll();
  setStatus("Location added.","Now available in From and Drop off.","ok");
}

// GitHub Sync helpers
function hasGitHubConfig(){return settings.ghOwner&&settings.ghRepo&&settings.ghBranch&&settings.ghPath&&settings.ghToken}
function ghHeaders(){return{"Accept":"application/vnd.github+json","Authorization":`Bearer ${settings.ghToken}`,"X-GitHub-Api-Version":"2022-11-28"}}
async function githubGetFile(){
  const url=`https://api.github.com/repos/${encodeURIComponent(settings.ghOwner)}/${encodeURIComponent(settings.ghRepo)}/contents/${settings.ghPath}?ref=${encodeURIComponent(settings.ghBranch)}`;
  const res=await fetch(url,{headers:ghHeaders(),cache:"no-store"});
  const body=await res.json();
  if(!res.ok) throw new Error(body?.message||`HTTP ${res.status}`);
  return body;
}
function b64ToUtf8(b64){const bin=atob((b64||"").replace(/\n/g,""));const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function utf8ToB64(str){const bytes=new TextEncoder().encode(str);let bin="";bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin)}
async function githubPutFile(contentStr,shaOrNull){
  const url=`https://api.github.com/repos/${encodeURIComponent(settings.ghOwner)}/${encodeURIComponent(settings.ghRepo)}/contents/${settings.ghPath}`;
  const payload={message:`Update schedule (${new Date().toLocaleString()})`,content:utf8ToB64(contentStr),branch:settings.ghBranch};
  if(shaOrNull) payload.sha=shaOrNull;
  const res=await fetch(url,{method:"PUT",headers:{...ghHeaders(),"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
  const body=await res.json();
  if(!res.ok) throw new Error(body?.message||`HTTP ${res.status}`);
  return body;
}
function exportPayload(){
  return JSON.stringify({version:1,updatedAt:new Date().toISOString(),locations:data.locations,schedule:data.schedule},null,2);
}
function importPayload(obj){data=normalizeData(obj);saveData();}
async function testGitHub(){
  if(!hasGitHubConfig()){setStatus("GitHub not configured.","Open Settings and fill owner/repo/branch/path/token.","warn");return false}
  try{await githubGetFile();setStatus("GitHub test OK.","Use Sync → Load / Save.","ok");return true}
  catch(e){
  const msg=String(e.message||e);
  let nice=msg;
  if(/Bad credentials/i.test(msg) || /Requires authentication/i.test(msg)) nice="Token rejected. Paste the fine‑grained token again.";
  else if(/Not Found/i.test(msg)) nice="Not Found. Check owner/repo/branch/path AND ensure data/schedule.json exists in the repo.";
  else if(/rate limit/i.test(msg)) nice="GitHub rate limit hit. Try again in a few minutes.";
  setStatus("GitHub test failed.",escapeHtml(nice),"err");
  return false;
}
}
async function saveToGitHub(){
  setStatus("Saving to GitHub…","", "warn");
  const payload = normalizeData(loadData());
  const s = ghSettings();
  if(!s.owner || !s.repo || !s.path){
    setStatus("Save failed.","Missing GitHub settings (owner/repo/path).", "err");
    return false;
  }
  if(!s.token){
    setStatus("Save failed.","Token missing. Open Settings and paste your GitHub token.", "err");
    return false;
  }

  async function getLatestSha(){
    const encPath = encodeURIComponent(s.path).replaceAll("%2F","/");
    const got = await ghApi(`/repos/${s.owner}/${s.repo}/contents/${encPath}?ref=${encodeURIComponent(s.branch)}`, s.token);
    if(!got.res.ok) throw new Error(`GitHub file lookup failed (${got.res.status})`);
    return got.json.sha;
  }

  async function putWithSha(sha){
    const encPath = encodeURIComponent(s.path).replaceAll("%2F","/");
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
    const put = await ghApi(`/repos/${s.owner}/${s.repo}/contents/${encPath}`, s.token, "PUT", {
      message: "Update family schedule",
      content: b64,
      sha,
      branch: s.branch
    });
    return put;
  }

  try{
    const sha1 = await getLatestSha();
    let put = await putWithSha(sha1);

    // If someone else saved a moment ago, GitHub will reject with a conflict.
    if(!put.res.ok && (put.res.status===409 || put.res.status===422)){
      const sha2 = await getLatestSha();
      put = await putWithSha(sha2);
    }

    if(!put.res.ok){
      const msg = (put.json && put.json.message) ? put.json.message : `PUT failed (${put.res.status})`;
      throw new Error(msg);
    }

    localStorage.setItem("lastSync", String(Date.now()));
    updateLastSync();
    const sha = put.json && put.json.commit && put.json.commit.sha ? put.json.commit.sha.slice(0,7) : "";
    setStatus("Saved to GitHub ✅", sha ? ("Commit: "+sha) : "Saved.", "ok");

    // Pull latest back (avoids GitHub Pages caching confusion) and re-render
    await loadLatestFromGitHub();
    data = loadData();
    safe(()=>renderAll());

    return true;
  }catch(e){
    setStatus("Save failed.", e && e.message ? e.message : String(e), "err");
    return false;
  }
}

function renderAll(){
  applyDadFont();updateModeButtons();
  
  // If running on GitHub Pages (https), pull latest schedule.json so Dad sees updates.
  if(location.protocol.startsWith("http")){fetchPublishedSchedule().then(()=>{try{renderToday();renderWeekSummary();if(!isDadMode) renderEdit();}catch(e){console.error(e)}}).catch(()=>{});}
renderToday();renderWeekSummary();
  if(!isDadMode) renderEdit();
  updateLastSync();
}


async function fetchPublishedSchedule(){
  // Loads the schedule from the published GitHub Pages site (no token required).
  // Cache-bust to avoid stale results.
  const url = `data/schedule.json?ts=${Date.now()}`;
  const res = await fetch(url,{cache:"no-store"});
  if(!res.ok) throw new Error(`Published schedule not reachable (${res.status})`);
  return await res.json();
}

function wireUI(){
  showView("today");
  el("btnBackFromToday").addEventListener("click",()=>{if(isDadMode)showView("week");else showView("edit")});
  el("btnToday").addEventListener("click",()=>{renderToday();showView("today")});
  el("btnWeek").addEventListener("click",()=>{renderWeekSummary();showView("week")});
  el("btnMode").addEventListener("click",()=>{
    isDadMode=!isDadMode;
    if(isDadMode){isEditUnlocked=false;setStatus("Dad (Read) mode.","Read-only to avoid mistakes.","ok");showView("today")}
    else{isEditUnlocked=settings.editPin?false:true;setStatus("Edit mode.",settings.editPin?"Tap Unlock Edit and enter PIN.":"Editing enabled (no PIN set).","ok");renderEdit();showView("edit")}
    renderAll();
  });
  el("btnUnlock").addEventListener("click",async()=>{
  // Single-button edit mode toggle.
  if(isDadMode){
    // Enter Edit Mode
    isDadMode=false;
    // If a PIN is set, prompt now.
    if(settings.editPin){
      const pin=prompt("Enter PIN to edit:");
      if(pin===null) { isDadMode=true; renderAll(); return; }
      if(String(pin).trim()!==String(settings.editPin).trim()){
        isDadMode=true;
        setStatus("Wrong PIN.","Editing stays locked.","err");
        renderAll();
        return;
      }
    }
    isEditUnlocked=true;
    setStatus("Editing ON","Make changes, then press Sync.","ok");
    showView("edit");
    renderEdit();
    renderAll();
  } else {
    // Exit Edit Mode back to Dad (Read)
    isEditUnlocked=false;
    isDadMode=true;
    setStatus("Editing OFF","View mode for Dad.","ok");
    showView("today");
    renderAll();
  }
});
  el("btnPinOk").addEventListener("click",()=>{
    const entered=(el("pinInput").value||"").trim();
    const want=(settings.editPin||"").trim();
    isEditUnlocked=(entered&&entered===want);
    el("dlgPin").close();
    renderAll();
    setStatus(isEditUnlocked?"Editing enabled.":"Wrong PIN.",isEditUnlocked?"You can edit now.":"Try again or remove PIN in Settings.",isEditUnlocked?"ok":"err");
  });
  el("btnSettings").addEventListener("click",()=>{
    el("setDadFont").value=settings.dadFont;
    el("setPin").value=settings.editPin;
    el("ghOwner").value=settings.ghOwner;
    el("ghRepo").value=settings.ghRepo;
    el("ghBranch").value=settings.ghBranch;
    el("ghPath").value=settings.ghPath;
    el("ghToken").value=settings.ghToken;
    el("dlgSettings").showModal();
  });
  el("btnSaveSettings").addEventListener("click",()=>{
    const next={dadFont:el("setDadFont").value,editPin:(el("setPin").value||"").trim(),
      ghOwner:(el("ghOwner").value||"").trim(),ghRepo:(el("ghRepo").value||"").trim(),
      ghBranch:(el("ghBranch").value||"").trim()||"main",ghPath:(el("ghPath").value||"").trim()||"data/schedule.json",
      ghToken:(el("ghToken").value||"").trim()};
    saveSettings(next);
    if(!isDadMode&&!settings.editPin) isEditUnlocked=true;
    el("dlgSettings").close();
    renderAll();
    setStatus("Settings saved.","Tip: Dad doesn't need token. Only the editing device needs it.","ok");
  });
  el("btnResetLocal").addEventListener("click",()=>{
    if(!confirm("Reset local data on THIS device?\n\nGitHub file is not changed."))return;
    localStorage.removeItem(LS.data);
    data=loadData();saveData();renderAll();
    setStatus("Local reset complete.","Now back to defaults.","warn");
  });
  el("btnAddLocation").addEventListener("click",()=>{
    if(isDadMode||!isEditUnlocked){setStatus("Editing is locked.","Tap Edit → Unlock Edit.","warn");return}
    addLocation(el("newLocation").value);el("newLocation").value="";
  });
  el("newLocation").addEventListener("keydown",(e)=>{if(e.key==="Enter"){e.preventDefault();el("btnAddLocation").click()}});
  el("btnSync").addEventListener("click",async()=>{ await saveToGitHub(); });
    el("btnTestGitHub").addEventListener("click",testGitHub);
}

function bootstrap(){
  applyDadFont();
  isDadMode=true;isEditUnlocked=false;
  setStatus("Dad (Read) mode.","Tap Today to focus. Tap Week for a simple overview.","ok");
  wireUI();renderAll();
}
bootstrap();


async function saveToGitHubQuick(){
  if(!hasGitHubConfig()){
    setStatus("GitHub not configured.","Open Settings → enter owner/repo/token.","warn");
    return false;
  }
  setStatus("Saving to GitHub…","", "warn");
  try{
    // Always re-fetch sha to avoid mismatch, retry once on conflict
    const {sha}=await githubGetFile();
    try{
      await githubPutFile(exportPayload(), sha);
    }catch(e){
      const msg=String(e.message||e);
      if(/409|sha/i.test(msg)){
        const again=await githubGetFile();
        await githubPutFile(exportPayload(), again.sha);
      }else{
        throw e;
      }
    }
    localStorage.setItem(LS.lastSync, new Date().toLocaleString());
    updateLastSync();
    setStatus("Saved to GitHub ✅","Dad will see it after refresh.","ok");
    return true;
  }catch(e){
    const msg=String(e.message||e);
    setStatus("Save failed.", msg, "err");
    return false;
  }
}
