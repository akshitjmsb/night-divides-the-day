import { getOrGenerateDynamicContent } from "../../api/gemini";
import { isContentReadyForPreview } from "../../core/time";
import { ErrorHandler, ErrorType } from "../../utils/errorHandling";
import { createSafeHtml } from "../../utils/escapeHtml";

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

    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, `Exercise modal (${mode})`);
        ErrorHandler.logError(appError);
        ErrorHandler.showUserError(appError);
        contentEl.innerHTML = '<p>Could not load the exercise plan.</p>';
    }
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
    // 4-day schedule: Push, Pull, Legs, Rest
    // Monday: Push, Tuesday: Pull, Wednesday: Legs, Thursday: Rest, Friday: Push, Saturday: Pull, Sunday: Legs
    const schedule = ['Legs', 'Push', 'Pull', 'Legs', 'Rest', 'Push', 'Pull'];
    return schedule[dayOfWeek];
}

function renderWorkoutSection(workoutData: any): string {
    if (!workoutData) {
        return '<p>No workout data available for today.</p>';
    }

    return `
        <div class="workout-section">
            <h4 class="font-semibold mb-3 text-gray-800">Today's Exercises</h4>
            <div class="exercise-list">
                ${workoutData.exercises ? workoutData.exercises.map((exercise: any, index: number) => 
                    renderExercise(exercise, index + 1)
                ).join('') : '<p>No exercises planned for today.</p>'}
            </div>
            
            ${workoutData.notes ? `
                <div class="workout-notes mt-4 p-3 bg-blue-50 rounded-lg">
                    <h5 class="font-medium text-blue-800 mb-2">Notes:</h5>
                    <p class="text-blue-700 text-sm">${createSafeHtml(workoutData.notes)}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function renderExercise(exercise: any, number: number): string {
    return `
        <div class="exercise-item mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div class="exercise-header flex justify-between items-start mb-2">
                <h5 class="font-medium text-gray-800">${number}. ${createSafeHtml(exercise.name || 'Exercise')}</h5>
                <span class="text-sm text-gray-500">${exercise.muscleGroup || 'Full Body'}</span>
            </div>
            
            <div class="exercise-details grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div class="detail-item">
                    <span class="font-medium text-gray-600">Sets:</span>
                    <span class="ml-1">${exercise.sets || '3-4'}</span>
                </div>
                <div class="detail-item">
                    <span class="font-medium text-gray-600">Reps:</span>
                    <span class="ml-1">${exercise.reps || '8-12'}</span>
                </div>
                <div class="detail-item">
                    <span class="font-medium text-gray-600">Rest:</span>
                    <span class="ml-1">${exercise.rest || '60-90s'}</span>
                </div>
            </div>
            
            ${exercise.instructions ? `
                <div class="exercise-instructions mt-2 text-sm text-gray-600">
                    <span class="font-medium">Instructions:</span>
                    <p class="mt-1">${createSafeHtml(exercise.instructions)}</p>
                </div>
            ` : ''}
            
            ${exercise.tips ? `
                <div class="exercise-tips mt-2 p-2 bg-yellow-50 rounded text-sm">
                    <span class="font-medium text-yellow-800">💡 Tip:</span>
                    <span class="text-yellow-700 ml-1">${createSafeHtml(exercise.tips)}</span>
                </div>
            ` : ''}
        </div>
    `;
}

function renderWeeklySchedule(data: any): string {
    return `
        <div class="weekly-schedule mt-6">
            <h4 class="font-semibold mb-3 text-gray-800">Weekly Schedule</h4>
            <div class="schedule-grid grid grid-cols-2 md:grid-cols-4 gap-2">
                <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                    <div class="font-medium text-sm">Monday</div>
                    <div class="text-xs text-gray-600">Push</div>
                </div>
                <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                    <div class="font-medium text-sm">Tuesday</div>
                    <div class="text-xs text-gray-600">Pull</div>
                </div>
                <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                    <div class="font-medium text-sm">Wednesday</div>
                    <div class="text-xs text-gray-600">Legs</div>
                </div>
                <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                    <div class="font-medium text-sm">Thursday</div>
                    <div class="text-xs text-gray-600">Rest</div>
                </div>
                <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                    <div class="font-medium text-sm">Friday</div>
                    <div class="text-xs text-gray-600">Push</div>
                </div>
                <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                    <div class="font-medium text-sm">Saturday</div>
                    <div class="text-xs text-gray-600">Pull</div>
                </div>
                <div class="schedule-day p-3 bg-gray-100 rounded text-center">
                    <div class="font-medium text-sm">Sunday</div>
                    <div class="text-xs text-gray-600">Legs</div>
                </div>
            </div>
        </div>
    `;
}
