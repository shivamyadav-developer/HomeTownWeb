// The login response shape is not specified in the API documentation, so profile
// data is read defensively from the most likely field names.
const first = (obj, ...names) => {
  for (const n of names) {
    const v = obj?.[n];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

export function extractToken(resp) {
  const d = resp?.data ?? resp ?? {};
  return first(d, 'token', 'accessToken', 'access_token', 'jwt') ?? first(resp, 'token', 'accessToken', 'access_token', 'jwt') ?? null;
}

export function normalizeUser(resp, fallbackEmployeeId) {
  const d = resp?.data ?? resp ?? {};
  const u = d.user ?? d.employee ?? d.profile ?? d;
  const manager = u.reportingManager ?? u.manager ?? {};
  const store = typeof u.store === 'object' && u.store ? u.store : {};

  return {
    _id: first(u, '_id', 'id', 'userId'),
    employeeId: String(first(u, 'employeeNumber', 'employeeId', 'empNo', 'employeeCode', 'username') ?? fallbackEmployeeId),
    name: first(u, 'name', 'employeeName', 'fullName', 'displayName'),
    role: first(u, 'role', 'roleName', 'userRole', 'designation'),
    // Same as the mobile app's Profile: DESIGNATION = jobTitle (e.g. PRODUCT EXPERT)
    designation: first(u, 'jobTitle', 'designation', 'role', 'roleName'),
    active: first(u, 'isActive', 'active') ?? (u.status ? String(u.status).toLowerCase() === 'active' : true),
    // The login API sends the store as siteId (6036) / siteCode ("6036") — same field the app uses.
    storeId: first(u, 'siteId', 'siteCode', 'storeId', 'storeCode', 'locationCode') ?? first(store, 'id', 'storeId', 'code'),
    storeName:
      first(u, 'storeName', 'location', 'employeeLocationSAP', 'locationName') ??
      (typeof u.store === 'string' ? u.store : first(store, 'name', 'storeName')),
    // The app shows "STORE CODE · REGION" as siteCode · city
    region: first(u, 'region', 'regionName', 'city'),
    city: first(u, 'city'),
    state: first(u, 'state'),
    managerName: first(u, 'reportingTo', 'reportingManagerName', 'managerName') ?? first(manager, 'name'),
    managerId:
      first(u, 'reportingManagerEmployeeNumber', 'reportingManagerEmpNo', 'managerEmployeeNumber', 'managerEmpNo', 'managerId') ??
      first(manager, 'employeeNumber', 'employeeId'),
    mobile: first(u, 'mobile', 'phone', 'mobileNumber', 'phoneNumber'),
    email: first(u, 'email', 'emailId'),
    department: first(u, 'department'),
    departmentCategory: first(u, 'departmentCategory', 'deptCategory'),
    joiningDate: first(u, 'dateJoined', 'joiningDate', 'dateOfJoining', 'doj'),
    // Profile → "Additional Information" (same fields as the mobile app)
    location: first(u, 'employeeLocationSAP', 'location'),
    band: first(u, 'band'),
    workerType: first(u, 'workerType'),
    employmentStatus: first(u, 'employmentStatus'),
    format: first(u, 'format'),
    subFormat: first(u, 'subFormat'),
    functions: first(u, 'functions'),
    subFunction: first(u, 'subFunction'),
    employeeZone: first(u, 'employeeZone'),
    costCenterNo: first(u, 'costCenterNo'),
    costCenterDescription: first(u, 'costCenterDescription'),
    profitCentre: first(u, 'profitCentre'),
    exitDate: first(u, 'exitDate'),
    storeLat: Number(first(u, 'storeLat', 'storeLatitude', 'latitude')) || null,
    storeLng: Number(first(u, 'storeLng', 'storeLongitude', 'longitude')) || null,
  };
}

/** Fill gaps from other documented endpoints (leaderboard row / attendance employeeInfo). Never overwrites known values. */
export function mergeMissing(user, extra) {
  const out = { ...user };
  Object.entries(extra).forEach(([k, v]) => {
    if ((out[k] === undefined || out[k] === null || out[k] === '') && v !== undefined && v !== null && v !== '') out[k] = v;
  });
  return out;
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
