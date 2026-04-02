const API_BASE = '/api';

// --- Theme Engine ---
function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    updateThemeIcon(target);
}

function updateThemeIcon(theme) {
    const suns = document.querySelectorAll('.fa-sun');
    const moons = document.querySelectorAll('.fa-moon');
    if(theme === 'light') {
        suns.forEach(s => s.style.display = 'block');
        moons.forEach(m => m.style.display = 'none');
    } else {
        suns.forEach(s => s.style.display = 'none');
        moons.forEach(m => m.style.display = 'block');
    }
}

// --- Global State ---
let currentSection = 'dashboard';
let tasks = [], syllabus = [], studyLogs = [], resources = [], timetable = [];
let sessionSeconds = 0;
const STUDY_GOAL = 8; // 8 hours goal

const phases = [
    { name: "Syllabus Orientation", date: new Date("2026-06-15") },
    { name: "Deep Practice", date: new Date("2026-07-20") },
    { name: "Final Mock Sprint", date: new Date("2026-08-25") }
];

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEntryScreen();
    startNotificationEngine();
    updateGreeting();
    
    // Core Background Logic
    setInterval(tickTimer, 1000);
    setInterval(syncSessionTimer, 60000);
});

// --- Entry Logic ---
function initEntryScreen() {
    updateLiveDateTime();
    setInterval(updateLiveDateTime, 1000);

    // Random Quote
    const quotes = ["Legacy begins with discipline.", "One hour today, one stripe tomorrow.", "Focus is the ultimate currency.", "Compete with who you were yesterday."];
    document.getElementById('quote').innerText = `"${quotes[Math.floor(Math.random()*quotes.length)]}"`;

    setTimeout(() => {
        const entry = document.getElementById('entry-screen');
        entry.style.transition = '1.2s cubic-bezier(1,0,0,1)';
        entry.style.opacity = '0';
        entry.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            entry.style.display = 'none';
            document.querySelector('.app-container').style.display = 'flex';
            loadData();
        }, 1200);
    }, 4000);
}

function updateLiveDateTime() {
    const now = new Date();
    const str = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
    if(document.getElementById('current-datetime')) document.getElementById('current-datetime').innerText = str;
    if(document.getElementById('header-date')) document.getElementById('header-date').innerText = str;
}

function updateGreeting() {
    const h = new Date().getHours();
    let g = "Good Day";
    if(h < 12) g = "Good Morning"; else if(h < 17) g = "Good Afternoon"; else if(h < 21) g = "Good Evening"; else g = "Good Night";
    const el = document.getElementById('greeting-txt');
    if(el) el.innerHTML = `${g}, <span style="color:var(--primary);">Shanmukh</span>`;
}

// --- Data & API ---
async function api(path, method = 'GET', body = null) {
    const opt = { method, headers: { 'Content-Type': 'application/json' } };
    if(body) opt.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_BASE}${path}`, opt);
        return (await res.json()).data || [];
    } catch(e) { console.error(e); return []; }
}

async function loadData() {
    await Promise.all([fetchSyllabus(), fetchTasks(), fetchStudyLogs(), fetchResources(), fetchTimetable()]);
    renderDashboard();
    renderTasks();
    renderSyllabusHierarchy();
    renderAnalysis();
    renderResources();
    renderTimetable();
}

const fetchSyllabus = async () => syllabus = await api('/syllabus');
const fetchTasks = async () => tasks = await api('/tasks');
const fetchStudyLogs = async () => studyLogs = await api('/study_logs');
const fetchResources = async () => resources = await api('/resources');
const fetchTimetable = async () => timetable = await api('/timetable');

// --- Navigation ---
function showSection(id) {
    // Staggered Exit Animation Placeholder (optional)
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const target = document.getElementById(id);
    target.classList.add('active');
    document.querySelector(`.nav-link[href="#${id}"]`).classList.add('active');
    
    // Auto-scroll to top and close mobile sidebar
    window.scrollTo(0,0);
    if(window.innerWidth <= 768) toggleSidebar();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }

// --- Dashboard Visuals ---
function tickTimer() {
    if(document.querySelector('.app-container').style.display !== 'none') {
        sessionSeconds++;
        const h = Math.floor(sessionSeconds / 3600);
        const m = Math.floor((sessionSeconds % 3600) / 60);
        const s = sessionSeconds % 60;
        document.getElementById('session-timer').innerText = [h,m,s].map(v => v.toString().padStart(2,'0')).join(':');
    }
}

async function syncSessionTimer() {
    if(sessionSeconds < 10) return; // Ignore very short blips
    const hrs = sessionSeconds / 3600;
    await api('/study_logs', 'POST', { subject: 'Automated Tracker', hours: hrs, date: new Date().toISOString().split('T')[0] });
    sessionSeconds = 0;
    document.getElementById('timer-sync-status').style.opacity = '1';
    setTimeout(() => document.getElementById('timer-sync-status').style.opacity = '0', 3000);
    fetchStudyLogs().then(renderDashboard);
}

function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const totalToday = studyLogs.filter(l => l.date.includes(today)).reduce((a, b) => a + parseFloat(b.hours), 0);
    document.getElementById('today-study-total').innerText = totalToday.toFixed(1);
    
    // Circular Progress
    const circle = document.getElementById('study-progress-ring');
    const radius = circle.r.baseVal.value;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (Math.min(totalToday, STUDY_GOAL) / STUDY_GOAL) * circ;
    circle.style.strokeDashoffset = offset;

    // Recent Summary
    const recent = document.getElementById('recent-study-logs');
    const uniqDates = [...new Set(studyLogs.map(l => l.date.split('T')[0]))].slice(0, 3);
    recent.innerHTML = uniqDates.map(d => {
        const h = studyLogs.filter(l => l.date.includes(d)).reduce((a, b) => a + parseFloat(b.hours), 0);
        return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);"><span>${d}</span><strong>${h.toFixed(1)}h</strong></div>`;
    }).join('');

    // Phase
    const now = new Date();
    let ph = phases[0]; for(let p of phases) if(now < p.date) { ph = p; break; }
    document.getElementById('phase-badge').innerText = ph.name;
    const diff = Math.ceil((ph.date - now) / (1000*60*60*24));
    document.getElementById('days-remaining').innerText = diff;
    const totalComp = syllabus.filter(s => s.status === 'completed').length;
    document.getElementById('phase-progress').style.width = `${Math.round((totalComp / (syllabus.length || 1)) * 100)}%`;
}

// --- Notification Engine ---
let notifications = [];
function startNotificationEngine() {
    setInterval(() => {
        const now = new Date();
        const curDay = now.toLocaleDateString('en-US', { weekday: 'short' });
        const curTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const slot = timetable.find(t => t.day_of_week === curDay && t.time_slot === curTime);
        if(slot && slot.subject && slot.subject !== '-') {
            const nid = `${curDay}-${curTime}-${slot.subject}`;
            if(!notifications.includes(nid)) {
                pushNotification(`Scheduled Task`, `Time for ${slot.subject}!`);
                notifications.push(nid);
            }
        }
    }, 45000);
}

function pushNotification(title, msg) {
    const list = document.getElementById('notif-list');
    const item = document.createElement('div');
    item.className = 'notif-item unread glass';
    item.innerHTML = `<strong>${title}</strong><p style="font-size:0.75rem;margin-top:5px;opacity:0.8;">${msg}</p>`;
    list.prepend(item);

    const count = document.getElementById('notif-count');
    count.innerText = parseInt(count.innerText) + 1;
    count.style.display = 'block';

    const miniList = document.getElementById('mini-notif-list');
    miniList.prepend(item.cloneNode(true));
}

function toggleNotifPanel() {
    document.getElementById('notif-panel').classList.toggle('active');
    if(!document.getElementById('notif-panel').classList.contains('active')) {
        document.getElementById('notif-count').style.display = 'none';
        document.getElementById('notif-count').innerText = 0;
    }
}

// --- Analysis Drill-down ---
function renderAnalysis() {
    const container = document.getElementById('subject-analysis-container');
    const subjects = [...new Set(syllabus.map(s => s.subject))];
    container.innerHTML = subjects.map((sub, idx) => {
        const subT = syllabus.filter(s => s.subject === sub);
        const comp = subT.filter(s => s.status === 'completed').length;
        const perc = Math.round((comp / (subT.length || 1)) * 100);
        return `<div class="glass stat-card" style="cursor:pointer; transition-delay: ${idx*0.1}s;" onclick="showSubjectDetail('${sub}')">
            <h3>${sub}</h3>
            <div class="value">${perc}%</div>
            <div class="progress-container"><div class="progress-bar" style="width:${perc}%"></div></div>
        </div>`;
    }).join('');
}

function showSubjectDetail(subject) {
    const subT = syllabus.filter(s => s.subject === subject);
    const comp = subT.filter(t => t.status === 'completed');
    const pend = subT.filter(t => t.status !== 'completed');

    document.getElementById('modal-subject-name').innerText = subject;
    document.getElementById('detail-completed').innerText = comp.length;
    document.getElementById('detail-pending').innerText = pend.length;
    document.getElementById('detail-total').innerText = subT.length;

    document.getElementById('detail-topic-list').innerHTML = `
        <h4 style="margin-bottom:12px;font-size:0.85rem;color:var(--warning);letter-spacing:1px;">PENDING TOPICS</h4>
        ${pend.map(t => `<div style="padding:10px; background:rgba(255,165,0,0.05); border-radius:8px; margin-bottom:5px; font-size:0.85rem;">• ${t.topic}</div>`).join('')}
    `;

    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById('analysis-detail-modal').style.display = 'block';
}

// --- Timetable & Resources ---
function renderTimetable() {
    const header = document.getElementById('timetable-header');
    const body = document.getElementById('timetable-body');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const slots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM', '10:00 PM'];

    header.innerHTML = '<th>TIME</th>' + days.map(d => `<th>${d}</th>`).join('');
    body.innerHTML = slots.map(slot => `
        <tr>
            <td style="font-weight:700;color:var(--primary);">${slot}</td>
            ${days.map(day => {
                const entry = timetable.find(t => t.time_slot === slot && t.day_of_week === day);
                return `<td contenteditable="true" onblur="handleTimetableEdit('${slot}', '${day}', this)">${entry ? entry.subject : '-'}</td>`;
            }).join('')}
        </tr>
    `).join('');
}

async function handleTimetableEdit(slot, day, cell) {
    const val = cell.innerText.trim();
    await api('/timetable', 'PUT', { time_slot: slot, day_of_week: day, subject: val });
    fetchTimetable();
}

function renderResources() {
    const grid = document.getElementById('resources-grid');
    grid.innerHTML = resources.map(res => `
        <div class="glass stat-card" style="position:relative; padding:1.5rem;">
            <i class="fas fa-trash-alt" style="position:absolute;top:15px;right:15px;cursor:pointer;color:var(--danger);font-size:0.85rem;" onclick="deleteResource(${res.id})"></i>
            <h3 style="color:var(--primary); font-size:1.1rem; margin-bottom:1rem;">${res.subject}</h3>
            ${res.youtube_link ? `<a href="${res.youtube_link}" target="_blank" style="display:inline-block; padding:8px 12px; background:var(--primary-glow); border-radius:8px; color:var(--text-main); text-decoration:none; font-size:0.8rem; font-weight:700;"><i class="fab fa-youtube" style="color:red; margin-right:8px;"></i> WATCH LESSON</a>` : ''}
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:15px;">Added: ${res.date.split('T')[0]}</p>
        </div>
    `).join('');
}

async function saveResource() {
    const name = document.getElementById('res-name').value;
    const link = document.getElementById('res-link').value;
    const sub = document.getElementById('res-sub').value;
    if(!name) return;
    await api('/resources', 'POST', { subject: sub, youtube_link: link });
    closeModals(); fetchResources().then(renderResources);
}

async function deleteResource(id) { 
    if(confirm("Confirm deletion?")) { 
        await api(`/resources/${id}`, 'DELETE'); fetchResources().then(renderResources); 
    }
}

// --- Tasks ---
function renderTasks() {
    const lists = { carried: document.getElementById('carried-forward-list'), normal: document.getElementById('normal-tasks-list'), completed: document.getElementById('completed-tasks-list') };
    lists.carried.innerHTML = tasks.filter(t => t.is_carried_forward && t.status==='Pending').map(t => taskToHTML(t)).join('');
    lists.normal.innerHTML = tasks.filter(t => !t.is_carried_forward && t.status==='Pending').map(t => taskToHTML(t)).join('');
    lists.completed.innerHTML = tasks.filter(t => t.status==='Completed').map(t => taskToHTML(t)).join('');
}

function taskToHTML(t) {
    return `<div class="glass task-item" style="display:flex;align-items:center;padding:15px;margin-bottom:10px;border-left:5px solid ${t.status==='Completed'?'var(--success)':'var(--primary)'}">
        <input type="checkbox" ${t.status==='Completed'?'checked':''} onclick="toggleTask(${t.id}, '${t.status}')" style="width:20px;height:20px;margin-right:15px;">
        <div style="flex:1;">
            <p style="font-weight:700; ${t.status==='Completed'?'text-decoration:line-through;opacity:0.6;':''}">${t.task_name}</p>
            <p style="font-size:0.75rem;color:var(--text-muted);">${t.subject}</p>
        </div>
        <i class="fas fa-trash" style="color:var(--danger);cursor:pointer;" onclick="deleteTask(${t.id})"></i>
    </div>`;
}

// --- Syllabus ---
function renderSyllabusHierarchy() {
    const container = document.getElementById('syllabus-hierarchy');
    const subjects = [...new Set(syllabus.map(s => s.subject))];
    container.innerHTML = subjects.map(sub => {
        const subT = syllabus.filter(s => s.subject === sub);
        const categories = [...new Set(subT.map(t => t.category))];
        return `
            <div class="glass subject-card" onclick="toggleHierarchy('sub-${sub}')" style="margin-bottom:8px; padding:15px 20px;">
                <span style="font-weight:800; display:flex; align-items:center; gap:12px;">
                    <i class="fas fa-layer-group" style="color:var(--primary);"></i> ${sub}
                </span>
                <span style="font-size:0.75rem; font-weight:700; background:var(--primary-glow); padding:4px 10px; border-radius:8px;">${subT.filter(t=>t.status==='completed').length}/${subT.length}</span>
            </div>
            <div id="sub-${sub}" class="category-list" style="display:none; padding-left:25px; border-left:2px solid var(--border-color); margin-bottom:15px;">
                ${categories.map(cat => `
                    <p class="category-card" onclick="toggleHierarchy('cat-${sub}-${cat.replace(/\s/g,'-')}')" style="padding:8px 0; font-weight:700; cursor:pointer;">
                        <i class="fas fa-caret-right"></i> ${cat}
                    </p>
                    <div id="cat-${sub}-${cat.replace(/\s/g,'-')}" style="display:none; margin-bottom:10px;">
                        ${subT.filter(t => t.category === cat).map(t => `
                            <div style="display:flex; align-items:center; gap:12px; padding:6px 0; font-size:0.9rem;">
                                <input type="checkbox" ${t.status==='completed'?'checked':''} onclick="toggleTopic(${t.id}, '${t.status}')">
                                <span style="${t.status==='completed'?'text-decoration:line-through;opacity:0.5;':''}">${t.topic}</span>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
}

function toggleHierarchy(id) { const el = document.getElementById(id); el.style.display = el.style.display === 'block' ? 'none' : 'block'; }

async function toggleTopic(id, current) {
    const status = current === 'completed' ? 'pending' : 'completed';
    await api(`/syllabus/${id}`, 'PUT', { status }); loadData();
}

// --- Modals ---
function openTaskModal() { document.getElementById('modal-overlay').style.display='block'; document.getElementById('task-modal').style.display='block'; }
function openResourceModal() { document.getElementById('modal-overlay').style.display='block'; document.getElementById('resource-modal').style.display='block'; }
function closeModals() { 
    document.querySelectorAll('.modal-content').forEach(m => m.style.display='none'); 
    document.getElementById('modal-overlay').style.display='none'; 
}

async function saveTask() {
    const name = document.getElementById('task-input').value;
    const sub = document.getElementById('task-subject').value;
    if(!name) return;
    await api('/tasks', 'POST', { task_name: name, subject: sub });
    closeModals(); fetchTasks().then(renderTasks);
}

async function toggleTask(id, current) {
    const status = current === 'Pending' ? 'Completed' : 'Pending';
    await api(`/tasks/${id}`, 'PUT', { status }); fetchTasks().then(renderTasks);
}

async function deleteTask(id) { await api(`/tasks/${id}`, 'DELETE'); fetchTasks().then(renderTasks); }
