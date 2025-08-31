import { getOrGenerateDynamicContent } from "../../api/gemini";
import { isContentReadyForPreview } from "../../core/time";

export async function showFrenchModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive: Date }
) {
    const modal = document.getElementById('frenchy-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const titleEl = modal.querySelector('#modal-frenchy-title') as HTMLElement;
    const tableBodyEl = modal.querySelector('#modal-frenchy-table-body') as HTMLElement;
    const date = mode === 'today' ? dates.active : mode === 'tomorrow' ? dates.preview : dates.archive;

    if (!titleEl || !tableBodyEl) return;

    // Gate for tomorrow's content, ensuring it's only shown after 5 PM the day before.
    if (mode === 'tomorrow' && !isContentReadyForPreview(date)) {
        titleEl.textContent = 'French';
        tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-center p-4">The lesson for tomorrow will be available after 5 PM.</td></tr>`;
        return;
    }

    titleEl.textContent = 'French';
    tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-center p-4">Loading French lesson...</td></tr>`;

    try {
        const soundData = await getOrGenerateDynamicContent('french-sound', date);

        if (!soundData || !soundData.sound || !soundData.words) {
             titleEl.textContent = `French: Error`;
             tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-center p-4">Could not load French lesson data.</td></tr>`;
        } else {
            titleEl.textContent = `French: " ${soundData.sound} "`;
            tableBodyEl.innerHTML = soundData.words.map((item: any, index: number) =>
                `<tr><td class="font-bold text-center">${index + 1}</td><td>${item.word}</td><td>${item.cue}</td><td>${item.meaning}</td><td class="text-center"><button class="play-btn" data-word="${item.word}">🔊</button></td></tr>`
            ).join('');
        }
    } catch (error) {
        console.error('Error showing French modal:', error);
        titleEl.textContent = 'French: Error';
        tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-center p-4">An error occurred while loading the lesson.</td></tr>`;
    }
}
