import { getOrGeneratePlanForDate } from "../../api/perplexity";
import { isContentReadyForPreview } from "../../core/time";
import { ErrorHandler, ErrorType } from "../../utils/errorHandling";
import { DEFAULT_USER_ID } from "../../core/default-user";

export async function showFoodModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive?: Date },
    keys: { today: string, tomorrow: string, archive?: string }
) {
    const modal = document.getElementById('food-modal');
    if (!modal) return;

    const contentEl = modal.querySelector('#food-plan-content') as HTMLElement;
    const titleEl = modal.querySelector('#food-modal-title') as HTMLElement;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    let date: Date, title: string, key: string;

    if (mode === 'today') {
        date = dates.active;
        title = "Today's Food";
        key = keys.today;
    } else if (mode === 'tomorrow') {
        date = dates.preview;
        title = "Tomorrow's Food";
        key = keys.tomorrow;
    } else { // archive
        if (!dates.archive || !keys.archive) {
            console.error('Archive mode requested but archive data not available');
            contentEl.innerHTML = '<p>Archive functionality not available.</p>';
            return;
        }
        date = dates.archive;
        title = "Previous Day's Food";
        key = keys.archive;
    }

    if (!titleEl || !contentEl) return;

    titleEl.textContent = title;

    if (mode === 'tomorrow' && !isContentReadyForPreview(dates.preview)) {
        contentEl.innerHTML = "<p>The plan for tomorrow will be available after 5 PM.</p>";
        return;
    }

    contentEl.innerHTML = '<p>Loading food plan...</p>';

    try {
        const userId = await getUserId();
        const plan = await getOrGeneratePlanForDate(userId, date, key);
        contentEl.innerHTML = plan.replace(/\n/g, '<br>');
    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, `Food modal (${mode})`);
        ErrorHandler.logError(appError);
        ErrorHandler.showUserError(appError);
        contentEl.innerHTML = '<p>Could not load the food plan.</p>';
    }
}
