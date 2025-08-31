import { getOrGeneratePlanForDate } from "../../api/gemini";
import { isContentReadyForPreview } from "../../core/time";

export async function showFoodModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive: Date },
    keys: { today: string, tomorrow: string, archive: string }
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
        const plan = await getOrGeneratePlanForDate(date, key);
        contentEl.innerHTML = plan.replace(/\n/g, '<br>');
    } catch (error) {
        console.error('Error fetching food plan for modal', error);
        contentEl.innerHTML = '<p>Could not load the food plan.</p>';
    }
}
