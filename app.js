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
const STUDY_GOAL = 8; 

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEntryScreen();
    startNotificationEngine();
    updateGreeting();
    
    setInterval(tickTimer, 1000);
    setInterval(syncSessionTimer, 60000);
});

// --- Entry Logic ---
function initEntryScreen() {
    updateLiveDateTime();
    setInterval(updateLiveDateTime, 1000);
    const quotes = ["Legacy begins with discipline.", "One hour today, one stripe tomorrow.", "Focus is the ultimate currency.", "Compete with who you were yesterday."];
    document.getElementById('quote').innerText = `"${quotes[Math.floor(Math.random()*quotes.length)]}"`;

    setTimeout(() => {
        const entry = document.getElementById('entry-screen');
        entry.style.transition = '1s cubic-bezier(1,0,0,1)';
        entry.style.opacity = '0';
        entry.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            entry.style.display = 'none';
            document.querySelector('.app-container').style.display = 'flex';
            loadData();
        }, 1000);
    }, 3000);
}

function updateLiveDateTime() {
    const now = new Date();
    const str = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
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
        const json = await res.json();
        return json.data || [];
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
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if(link) link.classList.add('active');
    
    window.scrollTo(0,0);
    if(window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }

// --- Dashboard & Timer ---
function tickTimer() {
    if(document.querySelector('.app-container').style.display !== 'none') {
        sessionSeconds++;
    }
}

async function syncSessionTimer() {
    if(sessionSeconds < 30) return; 
    const hrs = sessionSeconds / 3600;
    await api('/study_logs', 'POST', { subject: 'Active Focus', hours: hrs, date: new Date().toISOString().split('T')[0] });
    sessionSeconds = 0;
    fetchStudyLogs().then(renderDashboard);
}

function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Study Hours Metric
    const totalTodayHours = studyLogs.filter(l => l.date && l.date.includes(today)).reduce((a, b) => a + parseFloat(b.hours), 0);
    const studyDisplay = document.getElementById('today-study-total');
    if (studyDisplay) studyDisplay.innerText = totalTodayHours.toFixed(1);
    
    const studyBar = document.getElementById('study-progress-bar');
    if (studyBar) {
        const perc = Math.min((totalTodayHours / STUDY_GOAL) * 100, 100);
        studyBar.style.width = `${perc}%`;
    }

    // 2. Task Metrics (Now pulling from all synchronised tasks)
    const totalTasksEl = document.getElementById('today-tasks-total');
    if (totalTasksEl) totalTasksEl.innerText = tasks.length;

    const completedTasksEl = document.getElementById('today-tasks-completed');
    if (completedTasksEl) completedTasksEl.innerText = tasks.filter(t => t.status === 'Completed').length;

    const pendingTasksEl = document.getElementById('today-tasks-pending');
    if (pendingTasksEl) pendingTasksEl.innerText = tasks.filter(t => t.status === 'Pending').length;
}

// --- Notification & Alerts ---
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
                pushNotification(`Scheduled`, `Check: ${slot.subject}`);
                notifications.push(nid);
            }
        }
    }, 45000);
}

function pushNotification(title, msg) {
    const list = document.getElementById('notif-list');
    if(!list) return;
    const item = document.createElement('div');
    item.className = 'notif-item glass';
    item.innerHTML = `<strong>${title}</strong><p style="font-size:0.75rem;opacity:0.8;">${msg}</p>`;
    list.prepend(item);

    const count = document.getElementById('notif-count');
    if(count) {
        count.innerText = parseInt(count.innerText || 0) + 1;
        count.style.display = 'block';
    }
}

function toggleNotifPanel() {
    document.getElementById('notif-panel').classList.toggle('active');
    const count = document.getElementById('notif-count');
    if(count) {
        count.style.display = 'none';
        count.innerText = '0';
    }
}

// --- Specific Features: Resource ---
async function saveResource() {
    const name = document.getElementById('res-name').value;
    const link = document.getElementById('res-link').value;
    const sub = document.getElementById('res-sub').value;
    
    if(!name || !link) {
        alert("Enter Name and Link!");
        return;
    }
    
    await api('/resources', 'POST', { subject: sub, youtube_link: link });
    pushNotification("Vault", "Resource added!");
    closeModals();
    fetchResources().then(renderResources);
}

function renderResources() {
    const grid = document.getElementById('resources-grid');
    if(!grid) return;
    grid.innerHTML = resources.map(res => `
        <div class="glass stat-card" style="position:relative;">
            <i class="fas fa-trash" style="position:absolute;top:15px;right:15px;cursor:pointer;color:var(--danger);" onclick="deleteResource(${res.id})"></i>
            <h3 style="color:var(--primary);">${res.subject}</h3>
            ${res.youtube_link ? `<a href="${res.youtube_link}" target="_blank" style="display:inline-block; padding:10px; margin-top:10px; background:var(--primary-glow); border-radius:10px; text-decoration:none; color:var(--text-main); font-size:0.8rem;"><i class="fab fa-youtube" style="color:red;"></i> Watch</a>` : ''}
        </div>
    `).join('');
}

async function deleteResource(id) {
    if(confirm("Delete Resource?")) {
        await api(`/resources/${id}`, 'DELETE');
        fetchResources().then(renderResources);
    }
}

// --- Specific Features: Tasks ---
function renderTasks() {
    const lists = { 
        carried: document.getElementById('carried-forward-list'), 
        normal: document.getElementById('normal-tasks-list'), 
        completed: document.getElementById('completed-tasks-list') 
    };
    if(!lists.normal) return;
    
    lists.carried.innerHTML = tasks.filter(t => t.is_carried_forward && t.status === 'Pending').map(t => taskToHTML(t)).join('');
    lists.normal.innerHTML = tasks.filter(t => !t.is_carried_forward && t.status === 'Pending').map(t => taskToHTML(t)).join('');
    lists.completed.innerHTML = tasks.filter(t => t.status === 'Completed').map(t => taskToHTML(t)).join('');
}

function taskToHTML(t) {
    return `<div class="glass" style="display:flex;align-items:center;padding:15px;border-left:4px solid ${t.status==='Completed'?'var(--success)':'var(--primary)'}">
        <input type="checkbox" ${t.status==='Completed'?'checked':''} onclick="toggleTask(${t.id}, '${t.status}')" style="margin-right:15px;width:20px;height:20px;">
        <div style="flex:1;">
            <p style="${t.status==='Completed'?'text-decoration:line-through;opacity:0.6;':''} font-weight:600;">${t.task_name}</p>
            <p style="font-size:0.7rem;opacity:0.7;">${t.subject}</p>
        </div>
        <i class="fas fa-trash" style="color:var(--danger);cursor:pointer;" onclick="deleteTask(${t.id})"></i>
    </div>`;
}

async function toggleTask(id, current) {
    const status = current === 'Pending' ? 'Completed' : 'Pending';
    await api(`/tasks/${id}`, 'PUT', { status });
    fetchTasks().then(() => { renderTasks(); renderDashboard(); });
}

async function saveTask() {
    const name = document.getElementById('task-input').value;
    const sub = document.getElementById('task-subject').value;
    if(!name) return;
    await api('/tasks', 'POST', { task_name: name, subject: sub, date: new Date().toISOString().split('T')[0] });
    closeModals();
    fetchTasks().then(() => { renderTasks(); renderDashboard(); });
}

async function deleteTask(id) {
    await api(`/tasks/${id}`, 'DELETE');
    fetchTasks().then(() => { renderTasks(); renderDashboard(); });
}

// --- Specific Features: Syllabus ---
function renderSyllabusHierarchy() {
    const container = document.getElementById('syllabus-hierarchy');
    if(!container) return;
    const subjects = [...new Set(syllabus.map(s => s.subject))];
    container.innerHTML = subjects.map(sub => {
        const subT = syllabus.filter(s => s.subject === sub);
        const categories = [...new Set(subT.map(t => t.category))];
        return `
            <div class="glass" onclick="toggleHierarchy('sub-${sub}')" style="margin-bottom:10px; padding:15px; cursor:pointer; display:flex; justify-content:space-between;">
                <span style="font-weight:700;"><i class="fas fa-folder" style="margin-right:10px;color:var(--primary);"></i> ${sub}</span>
                <span style="font-size:0.8rem;opacity:0.7;">${subT.filter(t=>t.status==='completed').length}/${subT.length} Done</span>
            </div>
            <div id="sub-${sub}" style="display:none; padding-left:20px; margin-bottom:15px; border-left:2px solid var(--border-color);">
                ${categories.map(cat => `
                    <div onclick="toggleHierarchy('cat-${sub}-${cat.replace(/\s/g,'-')}')" style="padding:10px; font-weight:600; cursor:pointer; color:var(--accent);"><i class="fas fa-caret-right"></i> ${cat}</div>
                    <div id="cat-${sub}-${cat.replace(/\s/g,'-')}" style="display:none; padding-left:15px; margin-bottom:10px;">
                        ${subT.filter(t => t.category === cat).map(t => `
                            <div style="display:flex; gap:10px; align-items:center; padding:5px 0;">
                                <input type="checkbox" ${t.status==='completed'?'checked':''} onclick="toggleTopic(${t.id}, '${t.status}')">
                                <span style="${t.status==='completed'?'text-decoration:line-through;opacity:0.5;':''} font-size:0.9rem;">${t.topic}</span>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
}

function toggleHierarchy(id) { const el = document.getElementById(id); if(el) el.style.display = el.style.display === 'block' ? 'none' : 'block'; }

async function toggleTopic(id, current) {
    const status = current === 'completed' ? 'pending' : 'completed';
    await api(`/syllabus/${id}`, 'PUT', { status });
    fetchSyllabus().then(() => { renderSyllabusHierarchy(); renderAnalysis(); });
}

// --- Specific Features: Analysis ---
function renderAnalysis() {
    const container = document.getElementById('subject-analysis-container');
    if(!container) return;
    const subjects = [...new Set(syllabus.map(s => s.subject))];
    container.innerHTML = subjects.map(sub => {
        const subT = syllabus.filter(s => s.subject === sub);
        const comp = subT.filter(s => s.status === 'completed').length;
        const perc = Math.round((comp / (subT.length || 1)) * 100);
        return `<div class="glass stat-card" onclick="showSubjectDetail('${sub}')" style="cursor:pointer;">
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

    document.getElementById('detail-topic-list').innerHTML = pend.map(t => `<div style="padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; margin-bottom:5px; font-size:0.85rem;">• ${t.topic}</div>`).join('');
    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById('analysis-detail-modal').style.display = 'block';
}

// --- Timetable ---
function renderTimetable() {
    const header = document.getElementById('timetable-header');
    const body = document.getElementById('timetable-body');
    if(!header) return;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const slots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM', '10:00 PM'];
    
    header.innerHTML = '<th>TIME</th>' + days.map(d => `<th>${d}</th>`).join('');
    body.innerHTML = slots.map(slot => `
        <tr>
            <td style="font-weight:700; color:var(--primary);">${slot}</td>
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
}

// --- Modals ---
function closeModals() {
    document.querySelectorAll('.modal-content').forEach(m => m.style.display='none');
    document.getElementById('modal-overlay').style.display='none';
}
function openTaskModal() { document.getElementById('modal-overlay').style.display='block'; document.getElementById('task-modal').style.display='block'; }
function openResourceModal() { document.getElementById('modal-overlay').style.display='block'; document.getElementById('resource-modal').style.display='block'; }
