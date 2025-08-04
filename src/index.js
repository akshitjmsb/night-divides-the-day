// Full JavaScript version of the app
// This includes all the main functionality without TypeScript

document.addEventListener('DOMContentLoaded', () => {
    console.log('App loaded successfully!');
    
    // --- DATA ---
    const lifePointers = [
        "Just be there like a tree", "30 minute work quantums", "Director or Actor ?", "Try first", "Don't take your mind seriously", "It's not about me!", "Never steal the thunder", "Night divides the day", "Only person that can help you is YOU", "All IN", "It is happening now", "Enjoy imperfections", "Be a role model not a teacher", "Listen to your body", "Transform your company (Take actions 5 years ahead)", "Wait and Absorb - Everything is human mind made!", "No substitute to hardwork", "Sleep over it", "Dance in the Dance of Strangers", "Beyond thoughts - You are more than your thoughts", "Respond to change vs Following a plan", "Energy optimization instead of Time optimization", "Break - fast, Break it well!", "Slowly is the only fastest way to success", "Only Dare required is Dare to try", "SPEAK UP - ASK!", "Be courageous to listen to the voice in your head", "Rather than love, than money, than faith, than fame, than fairness, give me truth!!"
    ];
    
    // --- STATE ---
    let tasks = [];
    let quantumTimerId = null;
    let quantumSecondsLeft = 30 * 60;
    let isQuantumActive = false;
    
    // --- UTILITY FUNCTIONS ---
    function getCanonicalTime() {
        const canonicalTimeZone = 'America/Los_Angeles';
        
        const formatter = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hourCycle: 'h23',
            timeZone: canonicalTimeZone,
        });
        
        const parts = formatter.formatToParts(new Date());
        const partMap = {};
        for (const part of parts) {
            if (part.type !== 'literal') {
                partMap[part.type] = part.value;
            }
        }

        const year = parseInt(partMap.year);
        const month = parseInt(partMap.month);
        const day = parseInt(partMap.day);
        const hour = parseInt(partMap.hour);
        const minute = parseInt(partMap.minute);
        const second = parseInt(partMap.second);

        const canonicalNow = new Date(year, month - 1, day, hour, minute, second);
        return { now: canonicalNow, hour: hour };
    }

    function getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    function updateDateDerivedData() {
        const { now, hour } = getCanonicalTime();
        
        let activeContentDate;
        if (hour < 8) {
            activeContentDate = new Date(now);
            activeContentDate.setDate(now.getDate() - 1);
        } else {
            activeContentDate = new Date(now);
        }

        const dayOfYear = getDayOfYear(activeContentDate);
        const todaysLifePointer = lifePointers[(dayOfYear - 1) % lifePointers.length];
        
        return { activeContentDate, todaysLifePointer, hour };
    }

    // --- QUANTUM TIMER ---
    function updateQuantumTimerDisplay() {
        const quantumTimerDisplay = document.getElementById('quantum-timer-display');
        if (!quantumTimerDisplay) return;
        
        const minutes = Math.floor(quantumSecondsLeft / 60);
        const seconds = quantumSecondsLeft % 60;
        quantumTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function stopQuantumTimer(reset = true) {
        if (quantumTimerId) clearInterval(quantumTimerId);
        quantumTimerId = null;
        isQuantumActive = false;
        
        const quantumTimerBtn = document.getElementById('quantum-timer-btn');
        if (quantumTimerBtn) quantumTimerBtn.textContent = 'Start Quantum';
        
        if (reset) {
            quantumSecondsLeft = 30 * 60;
        }
        updateQuantumTimerDisplay();
    }

    function startQuantumTimer() {
        if (isQuantumActive) return;
        
        const quantumTimerBtn = document.getElementById('quantum-timer-btn');
        if (!quantumTimerBtn) return;
        
        isQuantumActive = true;
        quantumTimerBtn.textContent = 'Stop Quantum';

        quantumTimerId = window.setInterval(() => {
            quantumSecondsLeft--;
            updateQuantumTimerDisplay();

            if (quantumSecondsLeft <= 0) {
                clearInterval(quantumTimerId);
                quantumTimerId = null;
                
                const quantumTimerDisplay = document.getElementById('quantum-timer-display');
                if (quantumTimerDisplay) {
                    quantumTimerDisplay.textContent = "Break!";
                    quantumTimerDisplay.classList.add('text-red-500', 'animate-pulse');
                }
                if (quantumTimerBtn) quantumTimerBtn.style.display = 'none';

                try {
                    const synth = window.speechSynthesis;
                    if (synth.speaking) {
                        synth.cancel();
                    }
                    const utterance = new SpeechSynthesisUtterance("Break time Akki boyyyyy");
                    utterance.lang = 'en-US';
                    synth.speak(utterance);
                } catch (e) {
                    console.error("Could not play text-to-speech audio.", e);
                }

                setTimeout(() => {
                    if (quantumTimerDisplay) {
                        quantumTimerDisplay.classList.remove('text-red-500', 'animate-pulse');
                    }
                    if (quantumTimerBtn) quantumTimerBtn.style.display = 'inline-block';
                    stopQuantumTimer(true);
                }, 10000);
            }
        }, 1000);
    }

    // --- TASK MANAGEMENT ---
    function loadTasks() {
        const storedTasksRaw = localStorage.getItem('persistentTasks');
        if (!storedTasksRaw) {
            tasks = [];
            return;
        }
        try {
            const parsedTasks = JSON.parse(storedTasksRaw);
            if (Array.isArray(parsedTasks)) {
                tasks = parsedTasks.filter(t => typeof t === 'object' && t !== null && 'text' in t && 'completed' in t);
            } else {
                tasks = [];
            }
        } catch (error) {
            console.error("Error parsing tasks from localStorage.", error);
            tasks = [];
        }
    }

    function saveTasks() {
        localStorage.setItem('persistentTasks', JSON.stringify(tasks));
    }

    function renderTasks(listId) {
        const listEl = document.getElementById(listId);
        if(!listEl) return;
        listEl.innerHTML = tasks.map((task, index) => `
            <div class="task-item">
                <input type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''}>
                <label class="${task.completed ? 'completed' : ''}">${task.text}</label>
                <button class="delete-btn" data-index="${index}">&times;</button>
            </div>
        `).join('');
    }

    // --- RENDER FUNCTIONS ---
    function renderDayModule() {
        const { todaysLifePointer } = updateDateDerivedData();
        
        const lifePointerEl = document.getElementById('life-pointer-display-day');
        if (lifePointerEl) lifePointerEl.textContent = todaysLifePointer;
        
        renderTasks('tasks-list-day');
    }

    function renderCrossoverModule() {
        const { todaysLifePointer } = updateDateDerivedData();
        
        const lifePointerEl = document.getElementById('life-pointer-display-crossover');
        if (lifePointerEl) lifePointerEl.textContent = todaysLifePointer;

        renderTasks('tasks-list-crossover');
    }

    function renderNightModule() {
        const { activeContentDate } = updateDateDerivedData();
        const previewContentDate = new Date(activeContentDate);
        previewContentDate.setDate(activeContentDate.getDate() + 1);
        
        const dayOfYear = getDayOfYear(previewContentDate);
        const tomorrowsLifePointer = lifePointers[(dayOfYear - 1) % lifePointers.length];
        
        const lifePointerEl = document.getElementById('life-pointer-display-night');
        if (lifePointerEl) lifePointerEl.textContent = tomorrowsLifePointer;
        
        renderTasks('tasks-list-night');
    }

    function mainRender() {
        const { hour } = updateDateDerivedData();

        loadTasks();

        const sunIcon = document.getElementById('sun-icon');
        const sunsetIcon = document.getElementById('sunset-icon');
        const moonIcon = document.getElementById('moon-icon');
        const dayModule = document.getElementById('day-module');
        const crossoverModule = document.getElementById('crossover-module');
        const nightModule = document.getElementById('night-module');
        
        [sunIcon, sunsetIcon, moonIcon].forEach(icon => {
            if (icon) icon.style.display = 'none';
        });
        [dayModule, crossoverModule, nightModule].forEach(m => {
            if(m) m.classList.remove('active');
        });

        if (hour >= 8 && hour < 17) {
            if(sunIcon) sunIcon.style.display = 'inline-block';
            if(dayModule) dayModule.classList.add('active');
            renderDayModule();
        } else if (hour >= 17 && hour < 18) {
            if (sunsetIcon) sunsetIcon.style.display = 'inline-block';
            if(crossoverModule) crossoverModule.classList.add('active');
            renderCrossoverModule();
        } else {
            if (moonIcon) moonIcon.style.display = 'inline-block';
            if(nightModule) nightModule.classList.add('active');
            renderNightModule();
        }
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;

        // Delegated click listener for the entire app
        appContainer.addEventListener('click', e => {
            const target = e.target;
            
            // Quantum Timer
            if (target.closest('#quantum-timer-btn')) {
                if (isQuantumActive) {
                    stopQuantumTimer();
                } else {
                    startQuantumTimer();
                }
                return;
            }

            // Modal Closers
            const activeModal = target.closest('.fixed.flex');
            if (activeModal && (target.closest('.modal-close-btn') || target === activeModal)) {
                activeModal.classList.add('hidden');
                activeModal.classList.remove('flex');
                return;
            }

            // Task List Interactions
            if (target.matches('.delete-btn')) {
                const index = parseInt(target.dataset.index || '-1');
                if (index > -1) {
                    tasks.splice(index, 1);
                    saveTasks();
                    mainRender();
                }
                return;
            }
            
            if (target.matches('input[type="checkbox"]')) {
                const index = parseInt(target.dataset.index || '-1');
                if (index > -1) {
                    tasks[index].completed = !tasks[index].completed;
                    saveTasks();
                    mainRender();
                }
                return;
            }

            // Archive and Chat buttons
            const archiveModal = document.getElementById('archive-modal');
            if (target.closest('#archive-open-btn') && archiveModal) {
                archiveModal.classList.remove('hidden');
                archiveModal.classList.add('flex');
                return;
            }

            const chatModal = document.getElementById('chat-modal');
            if (target.closest('#chat-open-btn') && chatModal) {
                chatModal.classList.remove('hidden');
                chatModal.classList.add('flex');
                return;
            }

            // Learning module click handlers
            if (target.closest('#geopolitics-clickable')) {
                showMessage('World Order content requires API key. Please check your environment variables.');
                return;
            }
            
            if (target.closest('#tennis-clickable')) {
                showMessage('Tennis updates require API key. Please check your environment variables.');
                return;
            }
            
            if (target.closest('#coffee-clickable')) {
                showMessage('Coffee lessons require API key. Please check your environment variables.');
                return;
            }
            
            if (target.closest('#history-clickable')) {
                showMessage('History recommendations require API key. Please check your environment variables.');
                return;
            }

            // French, Food, Analytics, Hood modules
            if (target.closest('#frenchy-clickable-day') || target.closest('#frenchy-preview-clickable-crossover') || target.closest('#frenchy-preview-clickable-night')) {
                showMessage('French lessons require API key. Please check your environment variables.');
                return;
            }
            
            if (target.closest('#food-clickable-day') || target.closest('#food-preview-clickable-crossover') || target.closest('#food-preview-clickable-night')) {
                showMessage('Food plans require API key. Please check your environment variables.');
                return;
            }
            
            if (target.closest('#analytics-clickable-day') || target.closest('#analytics-preview-clickable-crossover') || target.closest('#analytics-preview-clickable-night')) {
                showMessage('Analytics topics require API key. Please check your environment variables.');
                return;
            }
            
            if (target.closest('#hood-clickable-day') || target.closest('#hood-preview-clickable-crossover') || target.closest('#hood-preview-clickable-night')) {
                showMessage('Under the Hood content requires API key. Please check your environment variables.');
                return;
            }

            // Reflection button
            if (target.closest('#reflection-btn-day')) {
                showMessage('Reflection prompts require API key. Please check your environment variables.');
                return;
            }
        });

        // Form submissions
        function handleTaskSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const input = form.querySelector('input[type="text"]');
            const taskText = input.value.trim();
            
            if (!taskText) {
                return;
            }
            
            // Basic sanitization
            const sanitizedText = taskText.substring(0, 200);
            
            if (sanitizedText) {
                tasks.push({ text: sanitizedText, completed: false });
                input.value = '';
                saveTasks();
                mainRender();
            }
        }
        
        document.getElementById('add-task-form-day')?.addEventListener('submit', handleTaskSubmit);
        document.getElementById('add-task-form-night')?.addEventListener('submit', handleTaskSubmit);
    }

    // --- UTILITY FUNCTIONS ---
    function showMessage(message) {
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            statusEl.innerHTML = `⚠️ ${message}`;
            statusEl.classList.remove('hidden');
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 5000);
        }
    }

    // --- INITIALIZATION ---
    function initializeApp() {
        updateQuantumTimerDisplay();

        function updateTime() {
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
            const el = document.getElementById('current-datetime');
            if (el) el.textContent = new Date().toLocaleString('en-CA', options);
        }
        updateTime();
        
        mainRender();
        setupEventListeners();

        setInterval(updateTime, 1000);
        setInterval(() => {
            mainRender();
        }, 60000 * 5); // every 5 minutes
    }

    // Start the app
    initializeApp();
}); 