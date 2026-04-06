/**
 * RCO Metrics Dashboard — Role-Based Access Control
 * Defines user roles and dashboard permissions.
 */

const RCO_ROLES = {
  // Role definitions and what dashboards they can see
  roles: {
    'IT Admin': {
      level: 0,
      dashboards: ['all'],
      canSeeRevenue: true,
      description: 'Full access to all dashboards and admin panel',
    },
    'C-Suite': {
      level: 1,
      dashboards: ['fulfillment', 'shipping', 'orders', 'international', 'daily-metrics', 'sales', 'top-products', 'unfulfilled', 'fulfillment-dashboard', 'skip-the-line'],
      canSeeRevenue: true,
      description: 'All operational dashboards',
    },
    'Director': {
      level: 2,
      dashboards: ['fulfillment', 'shipping', 'orders', 'international', 'daily-metrics', 'sales', 'top-products', 'unfulfilled', 'fulfillment-dashboard', 'skip-the-line'],
      canSeeRevenue: false,
      description: 'All operational dashboards (no revenue/AOV)',
    },
    'Supervisor': {
      level: 3,
      dashboards: ['fulfillment', 'shipping', 'orders', 'international', 'daily-metrics', 'sales', 'top-products', 'unfulfilled', 'fulfillment-dashboard', 'skip-the-line'],
      canSeeRevenue: false,
      description: 'All operational dashboards (no revenue/AOV)',
    },
    'Employee': {
      level: 4,
      dashboards: ['shipping', 'international'],
      canSeeRevenue: false,
      description: 'Shipping leaderboards and international orders',
    },
  },

  // User-to-role assignments (by email)
  users: {
    // IT Admin
    'hayden.howell@rowecasaorganics.com': 'IT Admin',
    'kasey.tomasek@rowecasaorganics.com': 'IT Admin',
    'chase.parrish@rowecasaorganics.com': 'IT Admin',
    'andrew.neidley@rowecasaorganics.com': 'IT Admin',
    'philip@rowecasaorganics.com': 'IT Admin',

    // C-Suite
    'mike@rowecasaorganics.com': 'C-Suite',
    'jacob@rowecasaorganics.com': 'C-Suite',
    'chris.paulene@rowecasaorganics.com': 'C-Suite',
    'grant@rowecasaorganics.com': 'C-Suite',
    'ivan.gonzalez@rowecasaorganics.com': 'C-Suite',
    'michael@rowecasaorganics.com': 'C-Suite',
    // Philip is IT Admin (listed above), not C-Suite for access purposes

    // Directors
    'lisa@rowecasaorganics.com': 'Director',
    'celina.bianco@rowecasaorganics.com': 'Director',
    'carissa@rowecasaorganics.com': 'Director',
    'rachel.neidley@rowecasaorganics.com': 'Director',
    'amanda@rowecasaorganics.com': 'Director',
    'heidi.partlow@rowecasaorganics.com': 'Director',
    'reylia@rowecasaorganics.com': 'Director',
    'krystle@rowecasaorganics.com': 'Director',
    'courtneyd@rowecasaorganics.com': 'Director',
    'darcie.snyder@rowecasaorganics.com': 'Director',
    'carly@rowecasaorganics.com': 'Director',
    'laura@rowecasaorganics.com': 'Director',
    'kristen@rowecasaorganics.com': 'Director',

    // Supervisors
    'alisha.wilson@rowecasaorganics.com': 'Supervisor',
    'tonia@rowecasaorganics.com': 'Supervisor',
    'mark@rowecasaorganics.com': 'Supervisor',
    'casey@rowecasaorganics.com': 'Supervisor',
    'brandi@rowecasaorganics.com': 'Supervisor',
    'courtney@rowecasaorganics.com': 'Supervisor',
    'emma.parrish@rowecasaorganics.com': 'Supervisor',
    'kelsea.berry@rowecasaorganics.com': 'Supervisor',
    'lara@rowecasaorganics.com': 'Supervisor',
    'cassandra.oberembt@rowecasaorganics.com': 'Supervisor',
    'amanda.preddy@rowecasaorganics.com': 'Supervisor',
    'ashley.roberson@rowecasaorganics.com': 'Supervisor',
    'katie@rowecasaorganics.com': 'Supervisor',
    'lexie@rowecasaorganics.com': 'Supervisor',
    'kaylee@rowecasaorganics.com': 'Supervisor',
    'latasha.harris@rowecasaorganics.com': 'Supervisor',
    'kacie@rowecasaorganics.com': 'Supervisor',
    'charity.haworth@rowecasaorganics.com': 'Supervisor',
    'jennifer.stewart@rowecasaorganics.com': 'Supervisor',
  },

  // Get role for an email (defaults to Employee)
  getRole(email) {
    if (!email) return 'Employee';
    const e = email.toLowerCase().trim();
    // IT Admin check first (highest priority)
    if (this.users[e] === 'IT Admin') return 'IT Admin';
    return this.users[e] || 'Employee';
  },

  // Check if user can access a specific dashboard
  canAccess(email, dashboardId) {
    const role = this.getRole(email);
    const config = this.roles[role];
    if (!config) return false;
    if (config.dashboards.includes('all')) return true;
    return config.dashboards.includes(dashboardId);
  },

  // Check if user can see revenue/AOV data
  canSeeRevenue(email) {
    const role = this.getRole(email);
    const config = this.roles[role];
    return config ? config.canSeeRevenue === true : false;
  },

  // Check if user is IT Admin
  isAdmin(email) {
    return this.getRole(email) === 'IT Admin';
  },

  // Get all users grouped by role
  getUsersByRole() {
    const grouped = {};
    for (const [email, role] of Object.entries(this.users)) {
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push(email);
    }
    return grouped;
  },
};
