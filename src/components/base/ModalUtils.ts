/**
 * Utility functions for common modal operations
 */

import { createSafeHtml } from '../../utils/escapeHtml';
import { ErrorHandler } from '../../utils/errorHandling';

export interface ContentModalData {
    title: string;
    content: string;
    isHtml?: boolean;
    maxHeight?: string;
}

/**
 * Shows a content modal with the given data
 */
export function showContentModal(
    modalId: string,
    data: ContentModalData,
    onError?: (error: any) => void
): void {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with ID ${modalId} not found`);
        return;
    }

    const titleEl = modal.querySelector('[id$="-title"]') as HTMLElement;
    const contentEl = modal.querySelector('[id$="-content"]') as HTMLElement;

    if (!titleEl || !contentEl) {
        console.error(`Required elements not found in modal ${modalId}`);
        return;
    }

    try {
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Set title
        titleEl.textContent = data.title;

        // Set content
        if (data.isHtml) {
            contentEl.innerHTML = createSafeHtml(data.content, { maxLength: 5000 });
        } else {
            contentEl.textContent = data.content;
        }

        // Set max height if specified
        if (data.maxHeight) {
            contentEl.style.maxHeight = data.maxHeight;
            contentEl.style.overflowY = 'auto';
        }

    } catch (error) {
        const appError = ErrorHandler.handleUnknownError(error, `Content modal ${modalId}`);
        ErrorHandler.logError(appError);
        if (onError) {
            onError(appError);
        } else {
            ErrorHandler.showUserError(appError);
        }
    }
}

/**
 * Shows a loading modal
 */
export function showLoadingModal(modalId: string, message: string = 'Loading...'): void {
    showContentModal(modalId, {
        title: 'Loading',
        content: message,
        isHtml: false
    });
}

/**
 * Shows an error modal
 */
export function showErrorModal(modalId: string, error: any, context?: string): void {
    const appError = ErrorHandler.handleUnknownError(error, context || 'Modal error');
    ErrorHandler.logError(appError);
    
    showContentModal(modalId, {
        title: 'Error',
        content: appError.message,
        isHtml: false
    });
}

/**
 * Creates a table row for French modal content
 */
export function createFrenchTableRow(word: string, cue: string, meaning: string): string {
    return `
        <tr>
            <td class="p-3 border-b">${createSafeHtml(word)}</td>
            <td class="p-3 border-b">${createSafeHtml(cue)}</td>
            <td class="p-3 border-b">${createSafeHtml(meaning)}</td>
        </tr>
    `;
}

/**
 * Creates a table for French modal content
 */
export function createFrenchTable(words: Array<{ word: string; cue: string; meaning: string }>): string {
    const rows = words.map(word => createFrenchTableRow(word.word, word.cue, word.meaning)).join('');
    return `
        <div class="rounded-lg border border-gray-300 overflow-x-auto">
            <table class="w-full min-w-max frenchy-table">
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

/**
 * Creates a formatted content section
 */
export function createContentSection(title: string, content: string, isHtml: boolean = true): string {
    const safeContent = isHtml ? createSafeHtml(content, { maxLength: 5000 }) : content;
    return `
        <div class="p-4">
            <h4 class="font-bold mb-2">${createSafeHtml(title)}</h4>
            <div class="text-sm">${safeContent}</div>
        </div>
    `;
}

/**
 * Sets up modal close functionality
 */
export function setupModalClose(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Close button
    const closeButtons = modal.querySelectorAll('.modal-close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });
    });

    // Backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });
}

/**
 * Generic modal opener that can be used for simple content modals
 */
export function createGenericModalOpener(
    modalId: string,
    getTitle: () => string,
    getContent: () => Promise<string>,
    options: { isHtml?: boolean; maxHeight?: string } = {}
): () => Promise<void> {
    return async () => {
        try {
            showLoadingModal(modalId, 'Loading content...');
            
            const content = await getContent();
            
            showContentModal(modalId, {
                title: getTitle(),
                content,
                isHtml: options.isHtml ?? true,
                maxHeight: options.maxHeight
            });
        } catch (error) {
            showErrorModal(modalId, error, `Generic modal ${modalId}`);
        }
    };
}
