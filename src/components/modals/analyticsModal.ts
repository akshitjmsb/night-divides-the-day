import { getOrGenerateDynamicContent } from "../../api/gemini";
import { isContentReadyForPreview } from "../../core/time";
import { getSolutionExplanation } from "./solutionExplanation";
import { escapeHtml } from "../../utils/escapeHtml";

export async function showAnalyticsModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive: Date }
) {
    const modal = document.getElementById('analytics-engineer-modal');
    const contentEl = document.getElementById('analytics-engineer-content');
    if (!modal || !contentEl) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const date = mode === 'today' ? dates.active : mode === 'tomorrow' ? dates.preview : dates.archive;

    if (mode === 'tomorrow' && !isContentReadyForPreview(date)) {
        contentEl.innerHTML = '<p>Topics for tomorrow will be available after 5 PM.</p>';
        return;
    }

    contentEl.innerHTML = '<p>Loading topics...</p>';

    try {
        const data = await getOrGenerateDynamicContent('analytics', date);
        if (!data) {
            contentEl.innerHTML = '<p>Content is not available. Please try again later.</p>';
            return;
        }

        const topics = [
            { type: 'SQL', data: data.sql, isQuestion: true },
            { type: 'DAX', data: data.dax, isQuestion: true },
            { type: 'Snowflake', data: data.snowflake, isQuestion: true },
            { type: 'dbt', data: data.dbt, isQuestion: true },
            { type: 'Data Management', data: data.dataManagement },
            { type: 'Data Quality', data: data.dataQuality }
        ];

        contentEl.innerHTML = topics.map(topic => {
            if (!topic.data) return '';

            if (topic.isQuestion) {
                const encodedPrompt = btoa(topic.data.prompt);
                const encodedSolution = btoa(topic.data.solution);

                 return `
                    <div class="topic-section border-b last:border-b-0 pb-4 mb-4">
                        <h4 class="font-bold text-md">${escapeHtml(topic.type)}: ${escapeHtml(topic.data.title)}</h4>
                        <p class="text-sm mt-1">${topic.data.prompt.replace(/\n/g, '<br>')}</p>
                        <div class="text-center mt-3">
                            <button class="solution-btn gemini-btn" data-prompt="${encodedPrompt}" data-solution="${encodedSolution}">Show Solution</button>
                        </div>
                        <div class="solution-content text-sm mt-4 p-4 border-l-4 border-gray-200 bg-gray-50" style="display: none;"></div>
                    </div>
                `;
            } else if (topic.data.explanation) {
                const formattedExplanation = topic.data.explanation.replace(/\n/g, '<br>');
                return `
                    <div class="topic-section border-b last:border-b-0 pb-4 mb-4">
                        <h4 class="font-bold text-md">${escapeHtml(topic.type)}: ${escapeHtml(topic.data.title)}</h4>
                        <div class="text-sm mt-2">${formattedExplanation}</div>
                    </div>
                `;
            } else if (topic.data.issues) {
                return `
                    <div class="topic-section border-b last:border-b-0 pb-4 mb-4">
                        <h4 class="font-bold text-md">${escapeHtml(topic.type)}: ${escapeHtml(topic.data.title)}</h4>
                        <div class="text-sm mt-2">
                            <p class="mb-2"><strong>Data Type:</strong> ${escapeHtml(topic.data.dataType)}</p>
                            <h5 class="font-semibold mt-3 mb-1">Potential Issues:</h5>
                            <ul class="list-disc pl-5 space-y-1">
                                ${topic.data.issues.map((issue: string) => `<li>${escapeHtml(issue).replace(/\n/g, '<br>')}</li>`).join('')}
                            </ul>
                            <h5 class="font-semibold mt-3 mb-1">Corrective Transformations:</h5>
                            <ul class="list-disc pl-5 space-y-1">
                                ${topic.data.transformations.map((t: string) => `<li>${escapeHtml(t).replace(/\n/g, '<br>')}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            }
            return '';
        }).join('');
    } catch (error) {
        console.error("Error showing analytics modal:", error);
        contentEl.innerHTML = '<p>An error occurred while fetching analytics content.</p>';
    }
}
