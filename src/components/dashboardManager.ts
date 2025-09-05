/**
 * Dashboard Manager - Handles drag-and-drop functionality for the customizable dashboard
 */

export interface DashboardItem {
    id: string;
    modalType: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

export interface DashboardLayout {
    items: DashboardItem[];
    lastUpdated: string;
}

export class DashboardManager {
    private dashboardGrid: HTMLElement;
    private modalPool: HTMLElement;
    private homeTab: HTMLElement;
    private poolTab: HTMLElement;
    private homeScreen: HTMLElement;
    private modalPoolSection: HTMLElement;
    private emptyDashboard: HTMLElement;
    private goToPoolBtn: HTMLElement;
    private showDragDemoBtn: HTMLElement;
    private dragDemoModal: HTMLElement;
    private closeDemoModalBtn: HTMLElement;
    private closeDemoModalBtn2: HTMLElement;
    
    private currentLayout: DashboardLayout = { items: [], lastUpdated: new Date().toISOString() };

    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadDashboardLayout();
        this.renderDashboard();
    }

    private initializeElements(): void {
        this.dashboardGrid = document.getElementById('dashboard-grid')!;
        this.modalPool = document.querySelector('.modal-pool-grid')!;
        this.homeTab = document.getElementById('home-tab')!;
        this.poolTab = document.getElementById('pool-tab')!;
        this.homeScreen = document.getElementById('home-screen')!;
        this.modalPoolSection = document.getElementById('modal-pool')!;
        this.emptyDashboard = document.getElementById('empty-dashboard')!;
        this.goToPoolBtn = document.getElementById('go-to-pool-btn')!;
        this.showDragDemoBtn = document.getElementById('show-drag-demo')!;
        this.dragDemoModal = document.getElementById('drag-demo-modal')!;
        this.closeDemoModalBtn = document.getElementById('close-demo-modal')!;
        this.closeDemoModalBtn2 = document.getElementById('close-demo-modal-2')!;
    }

    private setupEventListeners(): void {
        // Tab navigation
        this.homeTab.addEventListener('click', () => this.switchTab('home'));
        this.poolTab.addEventListener('click', () => this.switchTab('pool'));
        this.goToPoolBtn.addEventListener('click', () => this.switchTab('pool'));
        this.showDragDemoBtn.addEventListener('click', () => this.showDragDemo());
        this.closeDemoModalBtn.addEventListener('click', () => this.hideDragDemo());
        this.closeDemoModalBtn2.addEventListener('click', () => this.hideDragDemo());

        // Plus button clicks for modal pool items
        this.setupModalPoolPlusButtons();

        // Click handlers for dashboard items (to open modals)
        this.dashboardGrid.addEventListener('click', (e) => this.handleDashboardItemClick(e));
    }

    private setupModalPoolPlusButtons(): void {
        const plusButtons = this.modalPool.querySelectorAll('.add-to-basecamp-btn');
        
        plusButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handlePlusButtonClick(e));
        });
    }

    private handlePlusButtonClick(e: Event): void {
        e.stopPropagation();
        const target = e.target as HTMLElement;
        const modalType = target.getAttribute('data-modal');
        
        console.log('Plus button clicked:', modalType); // Debug log
        
        if (modalType) {
            this.addModalToDashboard(modalType);
        }
    }

    private addModalToDashboard(modalType: string): void {
        // Check if modal already exists in BaseCamp
        const existingItem = this.currentLayout.items.find(item => item.modalType === modalType);
        if (existingItem) {
            this.showNotification('This tool is already in your BaseCamp!', 'warning');
            return;
        }

        // Create new dashboard item
        const newItem: DashboardItem = {
            id: `${modalType}-${Date.now()}`,
            modalType,
            position: { x: 0, y: 0 },
            size: { width: 1, height: 1 }
        };

        this.currentLayout.items.push(newItem);
        this.currentLayout.lastUpdated = new Date().toISOString();
        
        this.saveDashboardLayout();
        this.renderDashboard();
        this.showNotification(`${this.getModalDisplayName(modalType)} added to BaseCamp!`, 'success');
    }

    private removeModalFromDashboard(itemId: string): void {
        this.currentLayout.items = this.currentLayout.items.filter(item => item.id !== itemId);
        this.currentLayout.lastUpdated = new Date().toISOString();
        
        this.saveDashboardLayout();
        this.renderDashboard();
    }

    private renderDashboard(): void {
        this.dashboardGrid.innerHTML = '';
        
        if (this.currentLayout.items.length === 0) {
            this.showEmptyDashboard();
            // Add a drop zone indicator when empty
            this.addDropZoneIndicator();
            return;
        }

        this.hideEmptyDashboard();
        
        // Create grid items for each dashboard item
        this.currentLayout.items.forEach(item => {
            const dashboardItem = this.createDashboardItem(item);
            this.dashboardGrid.appendChild(dashboardItem);
        });
    }

    private addDropZoneIndicator(): void {
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.innerHTML = `
            <div class="text-center">
                <div class="text-4xl mb-2">🏕️</div>
                <p class="text-sm text-gray-500">Add tools from Explorer to build your BaseCamp</p>
            </div>
        `;
        this.dashboardGrid.appendChild(dropZone);
    }

    private createDashboardItem(item: DashboardItem): HTMLElement {
        const dashboardItem = document.createElement('div');
        dashboardItem.className = 'dashboard-item';
        dashboardItem.setAttribute('data-modal', item.modalType);
        dashboardItem.setAttribute('data-item-id', item.id);
        
        const modalDisplayName = this.getModalDisplayName(item.modalType);
        const modalIcon = this.getModalIcon(item.modalType);
        
        dashboardItem.innerHTML = `
            <div class="text-center">
                <div class="text-2xl mb-2">${modalIcon}</div>
                <h3 class="font-bold text-sm">${modalDisplayName}</h3>
            </div>
            <button class="remove-btn" data-item-id="${item.id}">×</button>
        `;
        
        // Add remove button functionality
        const removeBtn = dashboardItem.querySelector('.remove-btn') as HTMLElement;
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeModalFromDashboard(item.id);
        });
        
        return dashboardItem;
    }

    private handleDashboardItemClick(e: Event): void {
        const target = e.target as HTMLElement;
        const dashboardItem = target.closest('.dashboard-item') as HTMLElement;
        
        if (dashboardItem) {
            const modalType = dashboardItem.getAttribute('data-modal');
            if (modalType) {
                this.openModal(modalType);
            }
        }
    }

    private openModal(modalType: string): void {
        // Map modal types to their corresponding click handlers
        const modalHandlers: { [key: string]: string } = {
            'tennis': 'tennis-clickable',
            'analytics': 'analytics-clickable-day',
            'coffee': 'coffee-clickable',
            'guitar': 'guitar-clickable',
            'poetry': 'poetry-clickable',
            'food': 'food-clickable-day',
            'french': 'frenchy-clickable-day',
            'hood': 'hood-clickable-day',
            'geopolitics': 'geopolitics-clickable',
            'history': 'history-clickable',
            'chat': 'chat-open-btn',
            'archive': 'archive-open-btn'
        };

        const clickableId = modalHandlers[modalType];
        if (clickableId) {
            const element = document.getElementById(clickableId);
            if (element) {
                console.log('Triggering modal for:', modalType, 'using element:', clickableId);
                element.click();
            } else {
                console.error('Could not find element with ID:', clickableId);
            }
        } else {
            console.error('No handler found for modal type:', modalType);
        }
    }

    private switchTab(tab: 'home' | 'pool'): void {
        // Update tab states
        this.homeTab.classList.toggle('active', tab === 'home');
        this.poolTab.classList.toggle('active', tab === 'pool');
        
        // Update section visibility
        this.homeScreen.classList.toggle('active', tab === 'home');
        this.modalPoolSection.classList.toggle('active', tab === 'pool');
    }

    private showEmptyDashboard(): void {
        this.emptyDashboard.style.display = 'block';
    }

    private hideEmptyDashboard(): void {
        this.emptyDashboard.style.display = 'none';
    }

    private getModalDisplayName(modalType: string): string {
        const displayNames: { [key: string]: string } = {
            'tennis': 'Tennis',
            'analytics': 'Analytics',
            'coffee': 'Coffee',
            'guitar': 'Guitar',
            'poetry': 'Poetry',
            'food': 'Food',
            'french': 'French',
            'hood': 'Under the Hood',
            'geopolitics': 'World Order',
            'history': 'History',
            'chat': 'Chat',
            'archive': 'Archive'
        };
        
        return displayNames[modalType] || modalType;
    }

    private getModalIcon(modalType: string): string {
        const icons: { [key: string]: string } = {
            'tennis': '🎾',
            'analytics': '📊',
            'coffee': '☕',
            'guitar': '🎸',
            'poetry': '📝',
            'food': '🍽️',
            'french': '🇫🇷',
            'hood': '🔧',
            'geopolitics': '🌍',
            'history': '📚',
            'chat': '💬',
            'archive': '📦'
        };
        
        return icons[modalType] || '📄';
    }

    private saveDashboardLayout(): void {
        try {
            localStorage.setItem('dashboard-layout', JSON.stringify(this.currentLayout));
        } catch (error) {
            console.error('Failed to save dashboard layout:', error);
        }
    }

    private loadDashboardLayout(): void {
        try {
            const saved = localStorage.getItem('dashboard-layout');
            if (saved) {
                this.currentLayout = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load dashboard layout:', error);
            this.currentLayout = { items: [], lastUpdated: new Date().toISOString() };
        }
    }

    private showNotification(message: string, type: 'success' | 'warning' | 'error' = 'success'): void {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-red-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Public methods for external access
    public getCurrentLayout(): DashboardLayout {
        return { ...this.currentLayout };
    }

    public resetDashboard(): void {
        this.currentLayout = { items: [], lastUpdated: new Date().toISOString() };
        this.saveDashboardLayout();
        this.renderDashboard();
        this.showNotification('BaseCamp reset successfully!', 'success');
    }

    private showDragDemo(): void {
        this.dragDemoModal.classList.remove('hidden');
        this.dragDemoModal.classList.add('flex');
    }

    private hideDragDemo(): void {
        this.dragDemoModal.classList.add('hidden');
        this.dragDemoModal.classList.remove('flex');
    }
}

// Export for use in main application
export function initializeDashboardManager(): DashboardManager {
    return new DashboardManager();
}
