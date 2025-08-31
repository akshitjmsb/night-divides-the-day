import { ai } from "../../api/gemini";
import { Chat, GenerateContentResponse } from "@google/genai";
import { saveChatHistory } from "../../core/persistence";
import { ChatMessage } from "../../types";

let chatHistory: ChatMessage[] = [];
let mainChatHistory: ChatMessage[] = [];
let chat: Chat;
let mainChat: Chat;
let lastApiCall = 0;
const API_RATE_LIMIT = 1000;

function renderChatHistory() {
    const chatHistoryDisplay = document.getElementById('chat-history');
    if (!chatHistoryDisplay) return;
    chatHistoryDisplay.innerHTML = chatHistory.map(msg =>
        `<div class="chat-message ${msg.role === 'user' ? 'user-message' : 'gemini-message'}">${msg.text}</div>`
    ).join('');
    chatHistoryDisplay.scrollTop = chatHistoryDisplay.scrollHeight;
}

export async function askGemini(prompt: string) {
    const chatHistoryDisplay = document.getElementById('chat-history');
    if (!chatHistoryDisplay) return;

    const now = Date.now();
    if (now - lastApiCall < API_RATE_LIMIT) {
        chatHistory.push({ role: "model", text: "Please wait a moment before sending another message." });
        renderChatHistory();
        return;
    }
    lastApiCall = now;

    chatHistory.push({ role: "user", text: prompt });
    renderChatHistory();

    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'chat-message gemini-message';
    thinkingEl.textContent = '...';
    chatHistoryDisplay.appendChild(thinkingEl);
    chatHistoryDisplay.scrollTop = chatHistoryDisplay.scrollHeight;

    try {
        const response: GenerateContentResponse = await chat.sendMessage({ message: prompt });
        thinkingEl.remove();

        const geminiResponse = response.text.replace(/\*/g, '');
        if (geminiResponse) {
            chatHistory.push({ role: "model", text: geminiResponse });
        } else {
             chatHistory.push({ role: "model", text: "I'm sorry, I couldn't process that." });
        }

        if (chat === mainChat) {
            mainChatHistory = [...chatHistory];
            await saveChatHistory(mainChatHistory);
        }

    } catch (error) {
         console.error("Gemini API Error:", error);
         thinkingEl.remove();

         let errorMessage = "There was an error. Please try again.";
         if (error instanceof Error) {
             if (error.message.includes('API_KEY')) {
                 errorMessage = "API key not configured. Please check your environment variables.";
             } else if (error.message.includes('quota')) {
                 errorMessage = "API quota exceeded. Please try again later.";
             } else if (error.message.includes('network')) {
                 errorMessage = "Network error. Please check your connection.";
             }
         }

         chatHistory.push({ role: "model", text: errorMessage });
    }
    renderChatHistory();
}

export function initializeChat(
    loadedMainChatHistory: ChatMessage[],
    dependencies: {
        mainChat: Chat;
        chat: Chat;
    }
) {
    mainChatHistory = loadedMainChatHistory;
    mainChat = dependencies.mainChat;
    chat = dependencies.chat;

    document.getElementById('chat-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const chatInput = document.getElementById('chat-input') as HTMLInputElement;
        const prompt = chatInput.value.trim();
        if (prompt) {
            askGemini(prompt);
            chatInput.value = '';
        }
    });

    // This is a simplified version of the contextual chat logic
    // A full implementation would require more state management
    document.getElementById('chat-open-btn')?.addEventListener('click', () => {
        const chatModal = document.getElementById('chat-modal');
        if (chatModal) {
            chat = mainChat;
            chatHistory = [...mainChatHistory];
            renderChatHistory();
            chatModal.classList.remove('hidden');
            chatModal.classList.add('flex');
        }
    });
}
