// Support and app details — the same values as the mobile app
// (HTAttendanceApp/app/(shared)/contact.jsx, about.jsx). Keep in sync.
export const SUPPORT_PHONE = '7208726671';
export const SUPPORT_EMAIL = 'jay.jadhav@praxisretail.in';
export const SUPPORT_HOURS = '10 AM - 6 PM';
export const OFFICE_ADDRESS = 'HomeTown Head Office, Mumbai, Maharashtra';
export const WEBSITE_URL = 'https://www.hometown.in/';
export const PRIVACY_POLICY_URL = 'https://www.hometown.in/pages/app-policy';

// Set from package.json at build time (vite.config.js → define)
// eslint-disable-next-line no-undef
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
