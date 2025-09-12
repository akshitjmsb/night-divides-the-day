let quantumTimerId: number | null = null;
let quantumSecondsLeft = 30 * 60;
let isQuantumActive = false;
let quantumTimerBtn: HTMLElement | null;
let quantumTimerDisplay: HTMLElement | null;

function updateQuantumTimerDisplay() {
    if (!quantumTimerDisplay) return;
    const minutes = Math.floor(quantumSecondsLeft / 60);
    const seconds = quantumSecondsLeft % 60;
    quantumTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function stopQuantumTimer(reset: boolean = true) {
    if (quantumTimerId) clearInterval(quantumTimerId);
    quantumTimerId = null;
    isQuantumActive = false;
    if (quantumTimerBtn) quantumTimerBtn.textContent = 'Start Quantum';
    if (reset) {
        quantumSecondsLeft = 30 * 60;
    }
    updateQuantumTimerDisplay();
}

function startQuantumTimer() {
    if (isQuantumActive || !quantumTimerBtn) return;

    isQuantumActive = true;
    quantumTimerBtn.textContent = 'Stop Quantum';

    quantumTimerId = window.setInterval(() => {
        quantumSecondsLeft--;
        updateQuantumTimerDisplay();

        if (quantumSecondsLeft <= 0) {
            clearInterval(quantumTimerId as number);
            quantumTimerId = null;

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
                stopQuantumTimer(true); // Fully reset
            }, 10000); // 10s break message
        }
    }, 1000);
}

export function initializeQuantumTimer() {
    quantumTimerBtn = document.getElementById('quantum-timer-btn');
    quantumTimerDisplay = document.getElementById('quantum-timer-display');

    if (quantumTimerBtn) {
        quantumTimerBtn.addEventListener('click', () => {
            if (isQuantumActive) {
                stopQuantumTimer();
            } else {
                startQuantumTimer();
            }
        });
    }

    updateQuantumTimerDisplay(); // Set the initial timer text
}
