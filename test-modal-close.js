// Test script to verify modal close functionality
console.log('Testing World Order Modal Close Functionality...');

// Test 1: Check if modal elements exist
function testModalElements() {
    console.log('Test 1: Checking modal elements...');
    
    const modal = document.getElementById('geopolitics-modal');
    const closeButton = document.querySelector('.modal-close-btn');
    const contentContainer = document.getElementById('geopolitics-headlines-content');
    
    console.log('Modal element:', modal);
    console.log('Close button:', closeButton);
    console.log('Content container:', contentContainer);
    
    if (!modal) {
        console.error('❌ Modal element not found');
        return false;
    }
    
    if (!closeButton) {
        console.error('❌ Close button not found');
        return false;
    }
    
    if (!contentContainer) {
        console.error('❌ Content container not found');
        return false;
    }
    
    console.log('✅ All modal elements found');
    return true;
}

// Test 2: Check modal classes
function testModalClasses() {
    console.log('Test 2: Checking modal classes...');
    
    const modal = document.getElementById('geopolitics-modal');
    if (!modal) return false;
    
    const classes = modal.className;
    console.log('Modal classes:', classes);
    
    if (classes.includes('hidden')) {
        console.log('✅ Modal is hidden (correct initial state)');
    } else {
        console.log('⚠️ Modal is not hidden');
    }
    
    return true;
}

// Test 3: Test close button click
function testCloseButtonClick() {
    console.log('Test 3: Testing close button click...');
    
    const modal = document.getElementById('geopolitics-modal');
    const closeButton = document.querySelector('.modal-close-btn');
    
    if (!modal || !closeButton) {
        console.error('❌ Modal or close button not found');
        return false;
    }
    
    // Show modal first
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    console.log('Modal shown');
    
    // Test close button click
    closeButton.click();
    console.log('Close button clicked');
    
    // Check if modal is hidden
    if (modal.classList.contains('hidden')) {
        console.log('✅ Modal closed successfully');
        return true;
    } else {
        console.error('❌ Modal did not close');
        return false;
    }
}

// Test 4: Test backdrop click
function testBackdropClick() {
    console.log('Test 4: Testing backdrop click...');
    
    const modal = document.getElementById('geopolitics-modal');
    if (!modal) return false;
    
    // Show modal first
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    console.log('Modal shown');
    
    // Simulate backdrop click
    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        target: modal
    });
    modal.dispatchEvent(event);
    console.log('Backdrop click simulated');
    
    // Check if modal is hidden
    if (modal.classList.contains('hidden')) {
        console.log('✅ Modal closed on backdrop click');
        return true;
    } else {
        console.error('❌ Modal did not close on backdrop click');
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('🧪 Running World Order Modal Tests...');
    
    const test1 = testModalElements();
    const test2 = testModalClasses();
    const test3 = testCloseButtonClick();
    const test4 = testBackdropClick();
    
    console.log('\n📊 Test Results:');
    console.log('Modal elements:', test1 ? '✅' : '❌');
    console.log('Modal classes:', test2 ? '✅' : '❌');
    console.log('Close button click:', test3 ? '✅' : '❌');
    console.log('Backdrop click:', test4 ? '✅' : '❌');
    
    const allPassed = test1 && test2 && test3 && test4;
    console.log('\nOverall result:', allPassed ? '✅ All tests passed' : '❌ Some tests failed');
    
    return allPassed;
}

// Export for use in browser console
window.testWorldOrderModal = runAllTests;

console.log('Test functions loaded. Run testWorldOrderModal() in the browser console to test.');
