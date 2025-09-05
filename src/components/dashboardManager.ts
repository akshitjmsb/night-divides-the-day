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
    
    private currentLayout: DashboardLayout = { items: [], lastUpdated: new Date().toISOString() };
    private draggedElement: HTMLElement | null = null;
    private dragOverElement: HTMLElement | null = null;

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
    }

    private setupEventListeners(): void {
        // Tab navigation
        this.homeTab.addEventListener('click', () => this.switchTab('home'));
        this.poolTab.addEventListener('click', () => this.switchTab('pool'));
        this.goToPoolBtn.addEventListener('click', () => this.switchTab('pool'));

        // Drag and drop for modal pool items
        this.setupModalPoolDragAndDrop();
        
        // Drag and drop for dashboard grid
        this.setupDashboardDragAndDrop();

        // Click handlers for dashboard items (to open modals)
        this.dashboardGrid.addEventListener('click', (e) => this.handleDashboardItemClick(e));
    }

    private setupModalPoolDragAndDrop(): void {
        const modalPoolItems = this.modalPool.querySelectorAll('.modal-pool-item');
        
        modalPoolItems.forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    }

    private setupDashboardDragAndDrop(): void {
        this.dashboardGrid.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dashboardGrid.addEventListener('drop', (e) => this.handleDrop(e));
        this.dashboardGrid.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        this.dashboardGrid.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    }

    private handleDragStart(e: DragEvent): void {
        const target = e.target as HTMLElement;
        const modalPoolItem = target.closest('.modal-pool-item') as HTMLElement;
        
        if (modalPoolItem) {
            this.draggedElement = modalPoolItem;
            modalPoolItem.classList.add('dragging');
            
            const modalType = modalPoolItem.getAttribute('data-modal');
            if (e.dataTransfer) {
                e.dataTransfer.setData('text/plain', modalType || '');
                e.dataTransfer.effectAllowed = 'copy';
            }
        }
    }

    private handleDragEnd(e: DragEvent): void {
        const target = e.target as HTMLElement;
        const modalPoolItem = target.closest('.modal-pool-item') as HTMLElement;
        
        if (modalPoolItem) {
            modalPoolItem.classList.remove('dragging');
        }
        
        this.draggedElement = null;
        this.dashboardGrid.classList.remove('drag-over');
    }

    private handleDragOver(e: DragEvent): void {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }

    private handleDragEnter(e: DragEvent): void {
        e.preventDefault();
        this.dashboardGrid.classList.add('drag-over');
    }

    private handleDragLeave(e: DragEvent): void {
        // Only remove drag-over if we're leaving the dashboard grid entirely
        if (!this.dashboardGrid.contains(e.relatedTarget as Node)) {
            this.dashboardGrid.classList.remove('drag-over');
        }
    }

    private handleDrop(e: DragEvent): void {
        e.preventDefault();
        this.dashboardGrid.classList.remove('drag-over');
        
        const modalType = e.dataTransfer?.getData('text/plain');
        if (modalType) {
            this.addModalToDashboard(modalType);
        }
    }

    private addModalToDashboard(modalType: string): void {
        // Check if modal already exists in dashboard
        const existingItem = this.currentLayout.items.find(item => item.modalType === modalType);
        if (existingItem) {
            this.showNotification('This modal is already in your dashboard!', 'warning');
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
        this.showNotification(`${this.getModalDisplayName(modalType)} added to dashboard!`, 'success');
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
            return;
        }

        this.hideEmptyDashboard();
        
        // Create grid items for each dashboard item
        this.currentLayout.items.forEach(item => {
            const dashboardItem = this.createDashboardItem(item);
            this.dashboardGrid.appendChild(dashboardItem);
        });
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
            'analytics': 'analytics-clickable',
            'coffee': 'coffee-clickable',
            'guitar': 'guitar-clickable',
            'poetry': 'poetry-clickable',
            'food': 'food-clickable',
            'french': 'frenchy-clickable',
            'hood': 'hood-clickable',
            'geopolitics': 'geopolitics-clickable',
            'history': 'history-clickable',
            'chat': 'chat-open-btn',
            'archive': 'archive-open-btn'
        };

        const clickableId = modalHandlers[modalType];
        if (clickableId) {
            const element = document.getElementById(clickableId);
            if (element) {
                element.click();
            }
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
        this.showNotification('Dashboard reset successfully!', 'success');
    }
}

// Export for use in main application
export function initializeDashboardManager(): DashboardManager {
    return new DashboardManager();
}
