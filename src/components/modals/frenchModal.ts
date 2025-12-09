import { getOrGenerateDynamicContent } from "../../api/perplexity";
import { isContentReadyForPreview } from "../../core/time";
import { getUserId } from "../../lib/supabase";



export async function showFrenchModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive?: Date }
) {
    const modal = document.getElementById('frenchy-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const titleEl = modal.querySelector('#modal-frenchy-title') as HTMLElement;
    const tableBodyEl = modal.querySelector('#modal-frenchy-table-body') as HTMLElement;
    const date = mode === 'today' ? dates.active : mode === 'tomorrow' ? dates.preview : dates.archive;

    if (mode === 'archive' && !dates.archive) {
        console.error('Archive mode requested but archive data not available');
        if (tableBodyEl) {
            tableBodyEl.innerHTML = '<tr><td colspan="3" class="text-center p-4">Archive functionality not available.</td></tr>';
        }
        return;
    }

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
        const userId = await getUserId();
        const data = await getOrGenerateDynamicContent(userId, 'french-sound', date);

        if (!data || !data.phrase) {
            titleEl.textContent = `French: Error`;
            tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-center p-4">Could not load French lesson data.</td></tr>`;
        } else {
            titleEl.textContent = 'French: Daily Office Phrase';

            // Create "Deep Dive" search URL
            const searchUrl = `https://www.perplexity.ai/search?q=${encodeURIComponent(`How to use "${data.phrase}" in a french business context`)}`;

            tableBodyEl.innerHTML = `
                <tr>
                    <td colspan="5" class="p-6">
                        <div class="flex flex-col items-center space-y-4">
                            <h2 class="text-2xl font-bold text-center text-[var(--text-primary)]">"${data.phrase}"</h2>
                            <p class="text-lg italic text-[var(--accent-primary)] text-center">${data.pronunciation}</p>
                            <div class="w-full border-t border-[var(--border-subtle)] my-2"></div>
                            <p class="text-xl text-center text-[var(--text-secondary)]">${data.translation}</p>
                            <p class="text-sm text-center text-[var(--text-muted)] max-w-md mt-2">${data.context}</p>
                            
                            <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" 
                               class="mt-6 flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-full hover:opacity-90 transition-opacity font-medium text-sm">
                                🔍 Deep Dive on Perplexity
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }
    } catch (error: any) {
        console.error('Error showing French modal:', error);
        titleEl.textContent = 'French: Error';
        // Show specific error message to help debugging
        const errorMessage = error.message || 'Unknown error occurred';
        tableBodyEl.innerHTML = `
            <tr>
                <td colspan="5" class="text-center p-4">
                    <p class="text-red-500 font-bold mb-2">Could not load French lesson.</p>
                    <p class="text-sm text-[var(--text-muted)] font-mono bg-[var(--bg-secondary)] p-2 rounded">
                        Debug: ${errorMessage}
                    </p>
                    <p class="text-xs mt-2">Check .env.local for VITE_PERPLEXITY_API_KEY</p>
                </td>
            </tr>`;
    }
}
