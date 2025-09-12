import { getOrGenerateDynamicContent } from "../../api/gemini";
import { isContentReadyForPreview } from "../../core/time";
import { ErrorHandler, ErrorType } from "../../utils/errorHandling";
import { createSafeHtml } from "../../utils/escapeHtml";

// Exercise modal with 4-day workout schedule and swipable cards
// Deployed to Vercel from base-app-development branch

export async function showExerciseModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive?: Date }
) {
    const modal = document.getElementById('exercise-modal');
    if (!modal) return;

    const titleEl = modal.querySelector('#exercise-modal-title') as HTMLElement;
    const contentEl = modal.querySelector('#exercise-content') as HTMLElement;

    if (!titleEl || !contentEl) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const date = mode === 'today' ? dates.active : mode === 'tomorrow' ? dates.preview : dates.archive;
    
    if (mode === 'archive' && !dates.archive) {
        console.error('Archive mode requested but archive data not available');
        contentEl.innerHTML = '<div class="p-4">Archive functionality not available.</div>';
        return;
    }

    if (mode === 'tomorrow' && !isContentReadyForPreview(date)) {
        titleEl.textContent = 'Exercise Plan';
        contentEl.innerHTML = '<p>The exercise plan for tomorrow will be available after 5 PM.</p>';
        return;
    }

    titleEl.textContent = mode === 'today' ? "Today's Workout" : mode === 'tomorrow' ? "Tomorrow's Workout" : "Previous Workout";
    contentEl.innerHTML = '<p>Loading exercise plan...</p>';

    try {
        const exerciseData = await getOrGenerateDynamicContent('exercise-plan', date);
        if (!exerciseData) {
            contentEl.innerHTML = '<p>Exercise plan not available. Please try again later.</p>';
            return;
        }

        renderExerciseContent(contentEl, exerciseData, date);
        setupExerciseEventListeners();

    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, `Exercise modal (${mode})`);
        ErrorHandler.logError(appError);
        ErrorHandler.showUserError(appError);
        contentEl.innerHTML = '<p>Could not load the exercise plan.</p>';
    }
}

function setupExerciseEventListeners() {
    // Initialize Swiper for exercise cards
    const swiperContainer = document.querySelector('.swiper-container');
    if (swiperContainer) {
        // Add Swiper CSS and JS dynamically
        if (!document.querySelector('link[href*="swiper"]')) {
            const swiperCSS = document.createElement('link');
            swiperCSS.rel = 'stylesheet';
            swiperCSS.href = 'https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css';
            document.head.appendChild(swiperCSS);
        }
        
        if (!window.Swiper) {
            const swiperJS = document.createElement('script');
            swiperJS.src = 'https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js';
            swiperJS.onload = () => {
                initializeSwiper();
            };
            document.head.appendChild(swiperJS);
        } else {
            initializeSwiper();
        }
    }
}

function initializeSwiper() {
    new window.Swiper('.swiper-container', {
        slidesPerView: 1,
        spaceBetween: 0,
        centeredSlides: true,
        loop: true,
        effect: 'cards',
        cardsEffect: {
            perSlideOffset: 8,
            perSlideRotate: 2,
            rotate: true,
            slideShadows: true,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });
}

function renderExerciseContent(container: HTMLElement, data: any, date: Date) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    
    // Determine workout type based on day of week
    const workoutType = getWorkoutType(dayOfWeek);
    const workoutData = data[workoutType.toLowerCase()] || data;

    container.innerHTML = `
        <div class="exercise-container">
            <div class="exercise-header">
                <h3 class="text-lg font-bold mb-2">${weekDay} - ${workoutType} Day</h3>
                <div class="workout-type-badge ${workoutType.toLowerCase()}-badge">
                    ${workoutType}
                </div>
            </div>
            
            <div class="exercise-content">
                ${renderWorkoutSection(workoutData)}
                ${renderWeeklySchedule(data)}
            </div>
        </div>
    `;
}

function getWorkoutType(dayOfWeek: number): string {
    // 4-day schedule: Monday, Wednesday, Friday, Saturday
    // Monday: Push, Wednesday: Pull, Friday: Legs, Saturday: Upper Body
    // Tuesday, Thursday, Sunday: Rest days
    const schedule = ['Rest', 'Push', 'Rest', 'Pull', 'Rest', 'Legs', 'Upper'];
    return schedule[dayOfWeek];
}

function renderWorkoutSection(workoutData: any): string {
    if (!workoutData) {
        return '<p>No workout data available for today.</p>';
    }

    return `
        <div class="workout-section">
            <h4 class="font-semibold mb-3 text-gray-800">Today's Exercises</h4>
            <div class="exercise-list swiper-container">
                <div class="swiper-wrapper">
                    ${workoutData.exercises ? workoutData.exercises.map((exercise: any, index: number) => 
                        `<div class="swiper-slide">${renderExercise(exercise, index + 1)}</div>`
                    ).join('') : '<p>No exercises planned for today.</p>'}
                </div>
                <div class="swiper-button-prev"></div>
                <div class="swiper-button-next"></div>
                <div class="swiper-pagination"></div>
            </div>
        </div>
    `;
}

function renderExercise(exercise: any, number: number): string {
    const exerciseName = exercise.name || 'Exercise';
    const muscleWikiUrl = getMuscleWikiUrl(exerciseName);
    
    return `
        <div class="exercise-card">
            <div class="exercise-header">
                <h5 class="exercise-title">${number}. ${createSafeHtml(exerciseName)}</h5>
                <span class="muscle-group">${exercise.muscleGroup || 'Full Body'}</span>
            </div>
            
            <div class="exercise-details">
                <div class="detail-item">
                    <span class="detail-label">Sets</span>
                    <span class="detail-value">${exercise.sets || '3-4'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Reps</span>
                    <span class="detail-value">${exercise.reps || '8-12'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Rest</span>
                    <span class="detail-value">${exercise.rest || '60-90s'}</span>
                </div>
            </div>
            
            <div class="exercise-actions">
                <a href="${muscleWikiUrl}" target="_blank" rel="noopener noreferrer" 
                   class="musclewiki-link">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                    MuscleWiki
                </a>
            </div>
        </div>
    `;
}


function getMuscleWikiUrl(exerciseName: string): string {
    // Convert exercise name to MuscleWiki format
    const exerciseMap: { [key: string]: string } = {
        'bench press': 'bench-press',
        'squat': 'squat',
        'deadlift': 'deadlift',
        'overhead press': 'overhead-press',
        'barbell row': 'bent-over-row',
        'pull-up': 'pull-up',
        'push-up': 'push-up',
        'dumbbell press': 'dumbbell-press',
        'dumbbell row': 'dumbbell-row',
        'lateral raise': 'lateral-raise',
        'bicep curl': 'bicep-curl',
        'tricep dip': 'tricep-dip',
        'leg press': 'leg-press',
        'lunges': 'lunges',
        'calf raise': 'calf-raise',
        'plank': 'plank',
        'sit-up': 'sit-up',
        'crunch': 'crunch',
        'mountain climber': 'mountain-climber',
        'burpee': 'burpee'
    };
    
    const normalizedName = exerciseName.toLowerCase().trim();
    const muscleWikiSlug = exerciseMap[normalizedName] || normalizedName.replace(/\s+/g, '-');
    
    return `https://musclewiki.com/exercises/${muscleWikiSlug}`;
}

function renderWeeklySchedule(data: any): string {
    return `
        <div class="weekly-schedule mt-6">
            <h4 class="font-semibold mb-3 text-gray-800">4-Day Workout Schedule</h4>
            <div class="schedule-grid grid grid-cols-2 md:grid-cols-4 gap-2">
                <div class="schedule-day workout-day p-3 rounded text-center border-2 border-black">
                    <div class="font-medium text-sm">Monday</div>
                    <div class="text-xs font-semibold">Push</div>
                    <div class="text-xs text-gray-600 mt-1">Chest, Shoulders, Triceps</div>
                </div>
                <div class="schedule-day rest-day p-3 rounded text-center border border-gray-300">
                    <div class="font-medium text-sm">Tuesday</div>
                    <div class="text-xs text-gray-500">Rest</div>
                </div>
                <div class="schedule-day workout-day p-3 rounded text-center border-2 border-black">
                    <div class="font-medium text-sm">Wednesday</div>
                    <div class="text-xs font-semibold">Pull</div>
                    <div class="text-xs text-gray-600 mt-1">Back, Biceps</div>
                </div>
                <div class="schedule-day rest-day p-3 rounded text-center border border-gray-300">
                    <div class="font-medium text-sm">Thursday</div>
                    <div class="text-xs text-gray-500">Rest</div>
                </div>
                <div class="schedule-day workout-day p-3 rounded text-center border-2 border-black">
                    <div class="font-medium text-sm">Friday</div>
                    <div class="text-xs font-semibold">Legs</div>
                    <div class="text-xs text-gray-600 mt-1">Quads, Hamstrings, Glutes</div>
                </div>
                <div class="schedule-day workout-day p-3 rounded text-center border-2 border-black">
                    <div class="font-medium text-sm">Saturday</div>
                    <div class="text-xs font-semibold">Upper</div>
                    <div class="text-xs text-gray-600 mt-1">Full Upper Body</div>
                </div>
                <div class="schedule-day rest-day p-3 rounded text-center border border-gray-300">
                    <div class="font-medium text-sm">Sunday</div>
                    <div class="text-xs text-gray-500">Rest</div>
                </div>
            </div>
        </div>
    `;
}
