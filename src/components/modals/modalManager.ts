import { showFoodModal } from './foodModal';
import { showFrenchModal } from './frenchModal';
import { showAnalyticsModal } from './analyticsModal';
import { showHoodModal } from './hoodModal';
import { fetchAndShowWorldOrder } from './worldOrderModal';
import { fetchAndShowTennisMatches } from './tennisModal';
import { fetchAndShowCoffeeTip } from './coffeeModal';
import { fetchAndShowGuitarTab } from './guitarModal';
import { fetchAndShowHistory } from './historyModal';
import { fetchAndShowPoetry } from './poetryModal';
import { renderArchive } from './archiveModal';
import { Chat } from '@google/genai';
import { ChatMessage } from '../../types';

type ModalDependencies = {
    dates: {
        active: Date;
        preview: Date;
        archive: Date;
    };
    keys: {
        today: string;
        tomorrow: string;
        archive: string;
    };
    chatState: {
        chat: Chat | null;
        mainChat: Chat | null;
        chatHistory: ChatMessage[];
        mainChatHistory: ChatMessage[];
    };
    renderChatHistory: () => void;
};

export function initializeModalManager(
    appContainer: HTMLElement,
    dependencies: ModalDependencies
) {
    appContainer.addEventListener('click', e => {
        const target = e.target as HTMLElement;

        // Modal Closers
        const activeModal = target.closest('.fixed.flex');
        if (activeModal && (target.closest('.modal-close-btn') || target === activeModal)) {
            activeModal.classList.add('hidden');
            activeModal.classList.remove('flex');
            return;
        }

        // Modal Openers
        const { dates, keys, chatState, renderChatHistory } = dependencies;

        if (target.closest('#food-clickable-day')) return showFoodModal('today', dates, keys);
        if (target.closest('#food-preview-clickable-crossover') || target.closest('#food-preview-clickable-night')) return showFoodModal('tomorrow', dates, keys);

        if (target.closest('#frenchy-clickable-day')) return showFrenchModal('today', dates);
        if (target.closest('#frenchy-preview-clickable-crossover') || target.closest('#frenchy-preview-clickable-night')) return showFrenchModal('tomorrow', dates);

        if (target.closest('#analytics-clickable-day')) return showAnalyticsModal('today', dates);
        if (target.closest('#analytics-preview-clickable-crossover') || target.closest('#analytics-preview-clickable-night')) return showAnalyticsModal('tomorrow', dates);

        if (target.closest('#hood-clickable-day')) return showHoodModal('today', dates);
        if (target.closest('#hood-preview-clickable-crossover') || target.closest('#hood-preview-clickable-night')) return showHoodModal('tomorrow', dates);

        if (target.closest('#geopolitics-clickable') || target.closest('#geopolitics-clickable-crossover') || target.closest('#geopolitics-clickable-night')) return fetchAndShowWorldOrder();
        if (target.closest('#tennis-clickable') || target.closest('#tennis-clickable-crossover') || target.closest('#tennis-clickable-night')) return fetchAndShowTennisMatches();
        if (target.closest('#coffee-clickable') || target.closest('#coffee-clickable-crossover') || target.closest('#coffee-clickable-night')) return fetchAndShowCoffeeTip(dates.active);
        if (target.closest('#guitar-clickable') || target.closest('#guitar-clickable-crossover') || target.closest('#guitar-clickable-night')) return fetchAndShowGuitarTab(dates.active);
        if (target.closest('#history-clickable') || target.closest('#history-clickable-crossover') || target.closest('#history-clickable-night')) return fetchAndShowHistory();
        if (target.closest('#poetry-clickable') || target.closest('#poetry-clickable-crossover') || target.closest('#poetry-clickable-night')) return fetchAndShowPoetry(dates.active);

        const archiveModal = document.getElementById('archive-modal');
        if (target.closest('#archive-open-btn') && archiveModal) {
             renderArchive(keys.archive);
             archiveModal.classList.remove('hidden');
             archiveModal.classList.add('flex');
             return;
        }

        const chatModal = document.getElementById('chat-modal');
        if (target.closest('#chat-open-btn') && chatModal) {
            if (chatState.mainChat) {
                chatState.chat = chatState.mainChat;
                chatState.chatHistory = [...chatState.mainChatHistory];
                renderChatHistory();
                chatModal.classList.remove('hidden');
                chatModal.classList.add('flex');
            } else {
                alert("Chat functionality is not available without an API key. Please set VITE_GEMINI_API_KEY in your .env file.");
            }
            return;
        }
    });
}
