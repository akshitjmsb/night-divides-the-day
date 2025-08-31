import { getOrGenerateDynamicContent } from "../../api/gemini";
import { isContentReadyForPreview } from "../../core/time";
import { escapeHtml } from "../../utils/escapeHtml";

export async function showHoodModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive: Date }
) {
    const modal = document.getElementById('hood-modal');
    if (!modal) return;
    const titleEl = modal.querySelector('#hood-modal-title') as HTMLElement;
    const contentEl = modal.querySelector('#hood-explanation-content') as HTMLElement;

    if (!titleEl || !contentEl) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const date = mode === 'today' ? dates.active : mode === 'tomorrow' ? dates.preview : dates.archive;

    if (mode === 'tomorrow' && !isContentReadyForPreview(date)) {
        titleEl.textContent = 'Under the Hood';
        contentEl.innerHTML = '<p>The topic for tomorrow will be available after 5 PM.</p>';
        return;
    }

    titleEl.textContent = 'Under the Hood';
    contentEl.innerHTML = '<p>Loading topic...</p>';

    try {
        const data = await getOrGenerateDynamicContent('transportation-physics', date);
        if (!data || !data.title || !data.explanation) {
            titleEl.textContent = 'Error';
            contentEl.innerHTML = '<p>Content is not available. Please try again later.</p>';
            return;
        }

        titleEl.textContent = `Under the Hood: ${escapeHtml(data.title)}`;
        contentEl.innerHTML = data.explanation.replace(/\n/g, '<br>');
    } catch (error) {
        console.error("Error showing under the hood modal:", error);
        titleEl.textContent = 'Error';
        contentEl.innerHTML = '<p>An error occurred while fetching content.</p>';
    }
}
