#!/usr/bin/env node

/**
 * Simple test runner for the Night Divides the Day application
 * 
 * This is a basic test runner that can be used without external dependencies.
 * For production use, consider using Jest, Vitest, or another testing framework.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_DIR = './src';
const TEST_PATTERN = /\.test\.ts$/;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function findTestFiles(dir) {
    const files = [];
    
    function traverse(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                traverse(fullPath);
            } else if (TEST_PATTERN.test(item)) {
                files.push(fullPath);
            }
        }
    }
    
    traverse(dir);
    return files;
}

function runTestFile(filePath) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`Running tests in: ${filePath}`, 'blue');
    log(`${'='.repeat(60)}`, 'cyan');
    
    try {
        // Clear the require cache to ensure fresh imports
        delete require.cache[require.resolve(path.resolve(filePath))];
        
        // Run the test file
        require(path.resolve(filePath));
        
    } catch (error) {
        log(`Error running test file ${filePath}:`, 'red');
        log(error.message, 'red');
        failedTests++;
    }
}

function runAllTests() {
    log('🧪 Night Divides the Day - Test Runner', 'magenta');
    log('=====================================', 'magenta');
    
    const testFiles = findTestFiles(TEST_DIR);
    
    if (testFiles.length === 0) {
        log('No test files found.', 'yellow');
        return;
    }
    
    log(`Found ${testFiles.length} test file(s)`, 'blue');
    
    for (const testFile of testFiles) {
        runTestFile(testFile);
    }
    
    // Print summary
    log('\n' + '='.repeat(60), 'cyan');
    log('TEST SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`Total tests: ${totalTests}`, 'blue');
    log(`Passed: ${passedTests}`, 'green');
    log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
    
    if (failedTests === 0) {
        log('\n🎉 All tests passed!', 'green');
        process.exit(0);
    } else {
        log('\n❌ Some tests failed.', 'red');
        process.exit(1);
    }
}

// Override console.log to capture test results
const originalLog = console.log;
console.log = function(...args) {
    const message = args.join(' ');
    
    if (message.includes('✅ PASS')) {
        passedTests++;
        totalTests++;
    } else if (message.includes('❌ FAIL')) {
        failedTests++;
        totalTests++;
    }
    
    originalLog.apply(console, args);
};

// Run the tests
runAllTests();
