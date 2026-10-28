// Store locations for automatic attendance — a copy of the mobile app's list
// (HTAttendanceApp/utils/location.js). Keep the two in sync when a store is
// added or a pin is corrected.
export const STORES = [
  {
    name: "Aurangabad",
    latitude: 19.877505,
    longitude: 75.372084,
  },
  {
    name: "Bhubaneswar",
    latitude: 20.281865,
    longitude: 85.844351,
  },
  {
    name: "Guwahati",
    latitude: 26.173189,
    longitude: 91.760528,
  },
  {
    name: "Kolkata Diamond Plaza",
    latitude: 22.615512,
    longitude: 88.412296,
  },
  {
    name: "Kolkata Bhawanipore",
    latitude: 22.536275,
    longitude: 88.346016,
  },
  {
    name: "Lucknow",
    latitude: 26.872824,
    longitude: 81.002094,
  },
  {
    name: "Nagpur",
    latitude: 21.138178,
    longitude: 79.078813,
  },
  {
    name: "Nashik",
    latitude: 19.990630,
    longitude: 73.762138,
  },
  {
    name: "Patna",
    latitude: 25.612423,
    longitude: 85.056307,
  },
  {
    name: "Pune",
    latitude: 18.519592,
    longitude: 73.929693,
  },
  {
    name: "Raipur",
    latitude: 21.238356,
    longitude: 81.679026,
  },
  {
    name: "Siliguri",
    latitude: 26.728275,
    longitude: 88.431698,
  },
  {
    name: "Visakhapatnam",
    latitude: 17.734062,
    longitude: 83.318297,
  },
  {
    name: "Mumbai Head Office, Jogeshwari",
    latitude: 19.137031,
    longitude: 72.862710,
  },
];

// Same radius as the app: inside → check in, outside → check out
export const MAX_DISTANCE = Number(import.meta.env.VITE_GEOFENCE_METERS) || 100;
