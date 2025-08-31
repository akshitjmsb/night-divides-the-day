// Global variable for testing time zones
export let testTimeOverride: Date | null = null;

/**
 * Gets the current date and hour based on a canonical timezone ('America/New_York')
 * to ensure the app's state is consistent for all users, regardless of their location.
 * @returns An object with the canonical Date object and the hour (0-23).
 */
export function getCanonicalTime(): { now: Date, hour: number } {
    const canonicalTimeZone = 'America/New_York';

    // Use test override if set (for time zone testing)
    const baseDate = testTimeOverride || new Date();

    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hourCycle: 'h23', // Ensures hour is 00-23, avoiding potential '24'
        timeZone: canonicalTimeZone,
    });

    const parts = formatter.formatToParts(baseDate);
    const partMap: { [key: string]: string } = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            partMap[part.type] = part.value;
        }
    }

    const year = parseInt(partMap.year);
    const month = parseInt(partMap.month); // 1-12
    const day = parseInt(partMap.day);
    const hour = parseInt(partMap.hour);
    const minute = parseInt(partMap.minute);
    const second = parseInt(partMap.second);

    // This creates a new Date object using the browser's local timezone, but seeding
    // it with the wall-clock values from our canonical timezone. This makes all
    // subsequent date logic work consistently for every user.
    const canonicalNow = new Date(year, month - 1, day, hour, minute, second);

    // Enhanced logging for time zone testing
    if (testTimeOverride) {
        console.log('🕐 TESTING MODE - Canonical Time:', {
            original: testTimeOverride.toISOString(),
            canonical: canonicalNow.toISOString(),
            hour: hour,
            module: hour >= 8 && hour < 17 ? 'DAY' : hour >= 17 && hour < 18 ? 'CROSSOVER' : 'NIGHT'
        });
    }

    return { now: canonicalNow, hour: hour };
}

/**
 * Time zone testing utilities (available in browser console)
 */
(window as any).testTimeZone = {
    // Test CrossOver Module (5 PM - 6 PM)
    testCrossOver: () => {
        testTimeOverride = new Date('2024-01-15T17:30:00.000-05:00'); // EST
        console.log('🧪 Testing CrossOver Module (5:30 PM Eastern Time)');
        location.reload();
    },

    // Test Night Module (6 PM - 8 AM)
    testNight: () => {
        testTimeOverride = new Date('2024-01-15T19:00:00.000-05:00'); // EST
        console.log('🧪 Testing Night Module (7:00 PM Eastern Time)');
        location.reload();
    },

    // Test Day Module (8 AM - 5 PM)
    testDay: () => {
        testTimeOverride = new Date('2024-01-15T10:00:00.000-05:00'); // EST
        console.log('🧪 Testing Day Module (10:00 AM Eastern Time)');
        location.reload();
    },

    // Test specific time
    testTime: (isoString: string) => {
        testTimeOverride = new Date(isoString);
        console.log('🧪 Testing Custom Time:', isoString);
        location.reload();
    },

    // Reset to real time
    reset: () => {
        testTimeOverride = null;
        console.log('🔄 Reset to real time');
        location.reload();
    },

    // Show current test status
    status: () => {
        console.log('📊 Test Status:', {
            testTimeOverride: testTimeOverride?.toISOString(),
            canonicalTime: getCanonicalTime(),
            isTesting: !!testTimeOverride
        });
    }
};

/**
 * Checks if content for a future date (preview) is ready to be generated or viewed.
 * Content is considered ready after 5 PM (17:00) on the day before the content's date.
 * @param {Date} previewDate The date of the content to be previewed.
 * @returns {boolean} True if the content is ready.
 */
export function isContentReadyForPreview(previewDate: Date): boolean {
    const { now } = getCanonicalTime(); // Use canonical "now" for comparison
    const generationUnlockTime = new Date(previewDate);
    generationUnlockTime.setDate(previewDate.getDate() - 1); // Day before
    generationUnlockTime.setHours(17, 0, 0, 0); // At 5 PM

    return now.getTime() >= generationUnlockTime.getTime();
}
