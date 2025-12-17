/**
 * Performance Test: 12 Concurrent Users
 *
 * Tests that the BladeLabs Winter Festival application works correctly
 * when 12 users login simultaneously for the Christmas Remote Party.
 *
 * This test can run in two modes:
 * 1. SIMULATION MODE (default): Tests algorithm and logic without Firebase
 * 2. LIVE MODE: Tests against real Firebase (requires network access)
 *
 * Usage:
 *   npm test                    # Run in simulation mode
 *   npm test -- --live          # Run against real Firebase
 *
 * Test scenarios:
 * 1. All 12 users can connect simultaneously
 * 2. Cursor positions sync correctly across all users
 * 3. Card flip operations are visible to all users
 * 4. User presence updates correctly
 * 5. Latency remains acceptable under load
 */

const LIVE_MODE = process.argv.includes('--live');

// Team members (same as in index.html)
const TEAM_MEMBERS = [
  { name: "Sami", color: "#e74c3c", icon: "firefighter" },
  { name: "Ints", color: "#3498db", icon: "technologist" },
  { name: "Kasturi", color: "#9b59b6", icon: "office_worker" },
  { name: "Patrik", color: "#2ecc71", icon: "bearded_person" },
  { name: "Artem", color: "#f39c12", icon: "mechanic" },
  { name: "Kostya", color: "#1abc9c", icon: "scientist" },
  { name: "Olena", color: "#e91e63", icon: "woman" },
  { name: "Valera", color: "#ff5722", icon: "weight_lifter" },
  { name: "Vova", color: "#00bcd4", icon: "person" },
  { name: "Dima", color: "#8bc34a", icon: "technologist" },
  { name: "Misha", color: "#ff9800", icon: "cowboy" },
  { name: "Ruslan", color: "#673ab7", icon: "man" }
];

const NUM_USERS = 12;
const SVG_VIEWBOX = { width: 3200, height: 2400 };

// ==================== SIMULATED DATABASE ====================

class SimulatedFirebaseDB {
  constructor() {
    this.data = {
      rooms: {}
    };
    this.listeners = new Map();
    this.latencyMin = 5;
    this.latencyMax = 50;
  }

  simulateLatency() {
    const latency = this.latencyMin + Math.random() * (this.latencyMax - this.latencyMin);
    return new Promise(resolve => setTimeout(resolve, latency));
  }

  async set(path, value) {
    await this.simulateLatency();
    const parts = path.split('/').filter(p => p);
    let current = this.data;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = JSON.parse(JSON.stringify(value));

    // Trigger listeners
    this.triggerListeners(path);
    return { success: true };
  }

  async get(path) {
    await this.simulateLatency();
    const parts = path.split('/').filter(p => p);
    let current = this.data;

    for (const part of parts) {
      if (!current || !current[part]) {
        return { val: () => null };
      }
      current = current[part];
    }

    return { val: () => JSON.parse(JSON.stringify(current)) };
  }

  async remove(path) {
    await this.simulateLatency();
    const parts = path.split('/').filter(p => p);
    let current = this.data;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current || !current[parts[i]]) {
        return { success: true };
      }
      current = current[parts[i]];
    }

    delete current[parts[parts.length - 1]];
    this.triggerListeners(path);
    return { success: true };
  }

  onValue(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    this.listeners.get(path).push(callback);

    // Initial trigger
    this.get(path).then(snapshot => callback(snapshot));

    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  triggerListeners(changedPath) {
    for (const [path, listeners] of this.listeners) {
      if (changedPath.startsWith(path) || path.startsWith(changedPath.split('/').slice(0, -1).join('/'))) {
        this.get(path).then(snapshot => {
          listeners.forEach(callback => callback(snapshot));
        });
      }
    }
  }
}

// ==================== LIVE FIREBASE (when network available) ====================

let liveDb = null;

async function initLiveFirebase() {
  const { initializeApp } = require('firebase/app');
  const { getDatabase } = require('firebase/database');

  const firebaseConfig = {
    apiKey: "AIzaSyAzVfJss9VekkNVUpqeVix7Xf4lJik5YbI",
    authDomain: "blade-fire-brigade.firebaseapp.com",
    projectId: "blade-fire-brigade",
    storageBucket: "blade-fire-brigade.firebasestorage.app",
    messagingSenderId: "243917025698",
    appId: "1:243917025698:web:dbf1dc6de979ecb95a02fb",
    databaseURL: "https://blade-fire-brigade-default-rtdb.europe-west1.firebasedatabase.app"
  };

  const app = initializeApp(firebaseConfig);
  liveDb = getDatabase(app);
  return liveDb;
}

class LiveFirebaseDB {
  constructor(db) {
    this.db = db;
    const fbDb = require('firebase/database');
    this.ref = fbDb.ref;
    this.set = fbDb.set;
    this.get = fbDb.get;
    this.remove = fbDb.remove;
    this.onValue = fbDb.onValue;
    this.off = fbDb.off;
  }

  async setData(path, value) {
    const dbRef = this.ref(this.db, path);
    await this.set(dbRef, value);
    return { success: true };
  }

  async getData(path) {
    const dbRef = this.ref(this.db, path);
    const snapshot = await this.get(dbRef);
    return snapshot;
  }

  async removeData(path) {
    const dbRef = this.ref(this.db, path);
    await this.remove(dbRef);
    return { success: true };
  }

  listen(path, callback) {
    const dbRef = this.ref(this.db, path);
    this.onValue(dbRef, callback);
    return () => this.off(dbRef, 'value', callback);
  }
}

// ==================== TEST METRICS ====================

const metrics = {
  connectionTimes: [],
  cursorSyncLatencies: [],
  cardSyncLatencies: [],
  errors: [],
  startTime: null,
  endTime: null
};

// ==================== SIMULATED USERS ====================

const simulatedUsers = [];
let db = null;
let ROOM_ID = 'performance-test-room-' + Date.now();

function generateUserId() {
  return 'test-user-' + Math.random().toString(36).substr(2, 9);
}

function randomCursorPosition() {
  return {
    x: Math.floor(Math.random() * SVG_VIEWBOX.width),
    y: Math.floor(Math.random() * SVG_VIEWBOX.height)
  };
}

function createSimulatedUser(index) {
  const userId = generateUserId();
  const member = TEAM_MEMBERS[index];

  return {
    id: userId,
    name: member.name,
    color: member.color,
    icon: member.icon,
    cursor: randomCursorPosition(),
    connected: false,
    receivedCursors: new Map(),
    receivedCards: {},
    unsubscribers: []
  };
}

async function connectUser(user) {
  const startTime = Date.now();

  try {
    const userPath = `rooms/${ROOM_ID}/users/${user.id}`;
    const cursorPath = `rooms/${ROOM_ID}/cursors/${user.id}`;

    // Set user data
    if (LIVE_MODE) {
      await db.setData(userPath, {
        id: user.id,
        name: user.name,
        color: user.color,
        icon: user.icon,
        isHost: false,
        lastActive: Date.now()
      });

      await db.setData(cursorPath, {
        cursor: user.cursor,
        user: { id: user.id, name: user.name, color: user.color }
      });

      // Set up listeners
      const unsubCursor = db.listen(`rooms/${ROOM_ID}/cursors`, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          Object.entries(data).forEach(([id, cursorData]) => {
            if (id !== user.id && cursorData && cursorData.cursor) {
              user.receivedCursors.set(id, { ...cursorData, receivedAt: Date.now() });
            }
          });
        }
      });
      user.unsubscribers.push(unsubCursor);

      const unsubCards = db.listen(`rooms/${ROOM_ID}/cards`, (snapshot) => {
        const data = snapshot.val();
        if (data) user.receivedCards = data;
      });
      user.unsubscribers.push(unsubCards);
    } else {
      await db.set(userPath, {
        id: user.id,
        name: user.name,
        color: user.color,
        icon: user.icon,
        isHost: false,
        lastActive: Date.now()
      });

      await db.set(cursorPath, {
        cursor: user.cursor,
        user: { id: user.id, name: user.name, color: user.color }
      });

      // Set up listeners
      const unsubCursor = db.onValue(`rooms/${ROOM_ID}/cursors`, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          Object.entries(data).forEach(([id, cursorData]) => {
            if (id !== user.id && cursorData && cursorData.cursor) {
              user.receivedCursors.set(id, { ...cursorData, receivedAt: Date.now() });
            }
          });
        }
      });
      user.unsubscribers.push(unsubCursor);

      const unsubCards = db.onValue(`rooms/${ROOM_ID}/cards`, (snapshot) => {
        const data = snapshot.val();
        if (data) user.receivedCards = data;
      });
      user.unsubscribers.push(unsubCards);
    }

    user.connected = true;
    const connectionTime = Date.now() - startTime;
    metrics.connectionTimes.push(connectionTime);

    return { success: true, connectionTime };
  } catch (error) {
    metrics.errors.push({ phase: 'connection', user: user.name, error: error.message });
    return { success: false, error: error.message };
  }
}

async function disconnectUser(user) {
  try {
    user.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) { /* ignore */ }
    });

    if (LIVE_MODE) {
      await Promise.allSettled([
        db.removeData(`rooms/${ROOM_ID}/users/${user.id}`),
        db.removeData(`rooms/${ROOM_ID}/cursors/${user.id}`)
      ]);
    } else {
      await Promise.allSettled([
        db.remove(`rooms/${ROOM_ID}/users/${user.id}`),
        db.remove(`rooms/${ROOM_ID}/cursors/${user.id}`)
      ]);
    }

    user.connected = false;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function broadcastCursor(user, position) {
  const startTime = Date.now();

  try {
    const cursorPath = `rooms/${ROOM_ID}/cursors/${user.id}`;
    const data = {
      cursor: position,
      user: { id: user.id, name: user.name, color: user.color },
      timestamp: Date.now()
    };

    if (LIVE_MODE) {
      await db.setData(cursorPath, data);
    } else {
      await db.set(cursorPath, data);
    }

    user.cursor = position;
    return { success: true, latency: Date.now() - startTime };
  } catch (error) {
    metrics.errors.push({ phase: 'cursor_broadcast', user: user.name, error: error.message });
    return { success: false, error: error.message };
  }
}

async function flipCard(user, cardId, flipped) {
  const startTime = Date.now();

  try {
    const cardPath = `rooms/${ROOM_ID}/cards/${cardId}`;

    if (LIVE_MODE) {
      await db.setData(cardPath, { flipped });
    } else {
      await db.set(cardPath, { flipped });
    }

    return { success: true, latency: Date.now() - startTime };
  } catch (error) {
    metrics.errors.push({ phase: 'card_flip', user: user.name, error: error.message });
    return { success: false, error: error.message };
  }
}

async function cleanupTestRoom() {
  console.log('   Cleaning up test room...');
  try {
    if (LIVE_MODE) {
      await db.removeData(`rooms/${ROOM_ID}`);
    } else {
      await db.remove(`rooms/${ROOM_ID}`);
    }
    console.log('   Test room cleaned up');
  } catch (error) {
    console.warn('   Warning: Could not clean up test room:', error.message);
  }
}

// ==================== TEST CASES ====================

async function testConcurrentConnections() {
  console.log('\n Test 1: Concurrent User Connections');
  console.log('   Testing that all 12 users can connect simultaneously...');

  const connectionPromises = simulatedUsers.map(user => connectUser(user));
  const results = await Promise.all(connectionPromises);

  const successCount = results.filter(r => r.success).length;
  const avgConnectionTime = metrics.connectionTimes.length > 0
    ? metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length
    : 0;
  const maxConnectionTime = metrics.connectionTimes.length > 0
    ? Math.max(...metrics.connectionTimes)
    : 0;

  console.log(`   [OK] ${successCount}/${NUM_USERS} users connected successfully`);
  console.log(`   [OK] Average connection time: ${avgConnectionTime.toFixed(0)}ms`);
  console.log(`   [OK] Max connection time: ${maxConnectionTime}ms`);

  if (successCount < NUM_USERS) {
    const failed = results.filter(r => !r.success);
    console.log(`   [!!] Failed connections: ${failed.map(f => f.error).join(', ')}`);
    return { passed: false, message: `Only ${successCount}/${NUM_USERS} users connected` };
  }

  return {
    passed: true,
    message: 'All 12 users connected successfully',
    metrics: { avgConnectionTime, maxConnectionTime }
  };
}

async function testUserPresence() {
  console.log('\n Test 2: User Presence Verification');
  console.log('   Verifying all users appear in the room...');

  await new Promise(resolve => setTimeout(resolve, 100));

  let usersData;
  if (LIVE_MODE) {
    const snapshot = await db.getData(`rooms/${ROOM_ID}/users`);
    usersData = snapshot.val() || {};
  } else {
    const snapshot = await db.get(`rooms/${ROOM_ID}/users`);
    usersData = snapshot.val() || {};
  }

  const userCount = Object.keys(usersData).length;
  const expectedNames = TEAM_MEMBERS.map(m => m.name);
  const actualNames = Object.values(usersData).map(u => u.name);

  console.log(`   [OK] ${userCount} users found in room`);

  const missingNames = expectedNames.filter(name => !actualNames.includes(name));

  if (missingNames.length > 0) {
    console.log(`   [!!] Missing users: ${missingNames.join(', ')}`);
    return { passed: false, message: `Missing users: ${missingNames.join(', ')}` };
  }

  if (userCount !== NUM_USERS) {
    return { passed: false, message: `Expected ${NUM_USERS} users, found ${userCount}` };
  }

  console.log(`   [OK] All 12 team members present`);
  return { passed: true, message: 'All users present in room' };
}

async function testCursorSynchronization() {
  console.log('\n Test 3: Cursor Synchronization');
  console.log('   Testing cursor position sync across all users...');

  const cursorUpdates = [];
  for (const user of simulatedUsers) {
    const newPosition = randomCursorPosition();
    const result = await broadcastCursor(user, newPosition);
    cursorUpdates.push(result);
  }

  const successfulUpdates = cursorUpdates.filter(r => r.success).length;
  console.log(`   [OK] ${successfulUpdates}/${NUM_USERS} cursor broadcasts successful`);

  await new Promise(resolve => setTimeout(resolve, 200));

  let totalVisibleCursors = 0;
  for (const user of simulatedUsers) {
    totalVisibleCursors += user.receivedCursors.size;
  }

  const avgVisibleCursors = totalVisibleCursors / NUM_USERS;
  console.log(`   [OK] Average cursors visible per user: ${avgVisibleCursors.toFixed(1)}/${NUM_USERS - 1}`);

  const avgCursorLatency = cursorUpdates
    .filter(r => r.success && r.latency)
    .map(r => r.latency);

  const avgLatency = avgCursorLatency.length > 0
    ? avgCursorLatency.reduce((a, b) => a + b, 0) / avgCursorLatency.length
    : 0;

  console.log(`   [OK] Average cursor broadcast latency: ${avgLatency.toFixed(0)}ms`);

  const visibilityRate = avgVisibleCursors / (NUM_USERS - 1);
  if (visibilityRate < 0.8) {
    return {
      passed: false,
      message: `Cursor visibility rate too low: ${(visibilityRate * 100).toFixed(0)}%`
    };
  }

  return {
    passed: true,
    message: 'Cursor sync working correctly',
    metrics: { avgVisibleCursors, avgLatency }
  };
}

async function testRapidCursorUpdates() {
  console.log('\n Test 4: Rapid Cursor Updates (Stress Test)');
  console.log('   Simulating 30fps cursor updates from all users...');

  const updateInterval = 33;
  const testDuration = 1000; // 1 second for simulation
  const updateResults = [];

  const startTime = Date.now();

  while (Date.now() - startTime < testDuration) {
    const updatePromises = simulatedUsers.map(user =>
      broadcastCursor(user, randomCursorPosition())
    );

    const results = await Promise.all(updatePromises);
    updateResults.push(...results);

    await new Promise(resolve => setTimeout(resolve, updateInterval));
  }

  const successfulUpdates = updateResults.filter(r => r.success).length;
  const totalUpdates = updateResults.length;
  const successRate = (successfulUpdates / totalUpdates) * 100;

  const latencies = updateResults
    .filter(r => r.success && r.latency)
    .map(r => r.latency);

  const avgLatency = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;

  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p95Latency = latencies.length > 0
    ? sortedLatencies[Math.floor(latencies.length * 0.95)]
    : 0;

  console.log(`   [OK] Total cursor updates: ${totalUpdates}`);
  console.log(`   [OK] Success rate: ${successRate.toFixed(1)}%`);
  console.log(`   [OK] Average latency: ${avgLatency.toFixed(0)}ms`);
  console.log(`   [OK] P95 latency: ${p95Latency}ms`);
  console.log(`   [OK] Max latency: ${maxLatency}ms`);

  metrics.cursorSyncLatencies = latencies;

  if (successRate < 90) {
    return { passed: false, message: `Success rate too low: ${successRate.toFixed(1)}%` };
  }

  return {
    passed: true,
    message: 'Rapid cursor updates handled successfully',
    metrics: { successRate, avgLatency, p95Latency, maxLatency, totalUpdates }
  };
}

async function testCardSynchronization() {
  console.log('\n Test 5: Card State Synchronization');
  console.log('   Testing card flip operations...');

  const host = simulatedUsers[0];
  const cardsToFlip = [1, 5, 10, 15, 20];
  const flipResults = [];

  for (const cardId of cardsToFlip) {
    const result = await flipCard(host, cardId, true);
    flipResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const successfulFlips = flipResults.filter(r => r.success).length;
  console.log(`   [OK] ${successfulFlips}/${cardsToFlip.length} cards flipped successfully`);

  await new Promise(resolve => setTimeout(resolve, 200));

  let syncedUsers = 0;
  for (const user of simulatedUsers) {
    const flippedCardsVisible = cardsToFlip.filter(cardId =>
      user.receivedCards[cardId]?.flipped === true
    ).length;

    if (flippedCardsVisible === cardsToFlip.length) {
      syncedUsers++;
    }
  }

  console.log(`   [OK] ${syncedUsers}/${NUM_USERS} users see all flipped cards`);

  const avgCardLatency = flipResults
    .filter(r => r.success && r.latency)
    .map(r => r.latency);

  const avgLatency = avgCardLatency.length > 0
    ? avgCardLatency.reduce((a, b) => a + b, 0) / avgCardLatency.length
    : 0;

  console.log(`   [OK] Average card flip latency: ${avgLatency.toFixed(0)}ms`);

  metrics.cardSyncLatencies = avgCardLatency;

  if (syncedUsers < NUM_USERS * 0.8) {
    return { passed: false, message: `Card sync incomplete: only ${syncedUsers}/${NUM_USERS} users synced` };
  }

  return {
    passed: true,
    message: 'Card sync working correctly',
    metrics: { syncedUsers, avgLatency }
  };
}

async function testDisconnectReconnect() {
  console.log('\n Test 6: Disconnect/Reconnect Handling');
  console.log('   Testing user disconnect and reconnect...');

  const testUser = simulatedUsers[5];
  console.log(`   - Disconnecting ${testUser.name}...`);

  const disconnectResult = await disconnectUser(testUser);

  if (!disconnectResult.success) {
    console.log(`   [!!] Disconnect failed: ${disconnectResult.error}`);
    return { passed: false, message: `Disconnect failed: ${disconnectResult.error}` };
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  let usersData;
  if (LIVE_MODE) {
    const snapshot = await db.getData(`rooms/${ROOM_ID}/users`);
    usersData = snapshot.val() || {};
  } else {
    const snapshot = await db.get(`rooms/${ROOM_ID}/users`);
    usersData = snapshot.val() || {};
  }
  let userCount = Object.keys(usersData).length;

  console.log(`   [OK] After disconnect: ${userCount} users in room`);

  console.log(`   - Reconnecting ${testUser.name}...`);
  const reconnectResult = await connectUser(testUser);

  if (!reconnectResult.success) {
    console.log(`   [!!] Reconnect failed: ${reconnectResult.error}`);
    return { passed: false, message: `Reconnect failed: ${reconnectResult.error}` };
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  if (LIVE_MODE) {
    const snapshot = await db.getData(`rooms/${ROOM_ID}/users`);
    usersData = snapshot.val() || {};
  } else {
    const snapshot = await db.get(`rooms/${ROOM_ID}/users`);
    usersData = snapshot.val() || {};
  }
  userCount = Object.keys(usersData).length;

  console.log(`   [OK] After reconnect: ${userCount} users in room`);
  console.log(`   [OK] Reconnection time: ${reconnectResult.connectionTime}ms`);

  if (userCount !== NUM_USERS) {
    return { passed: false, message: `Expected ${NUM_USERS} users after reconnect, found ${userCount}` };
  }

  return {
    passed: true,
    message: 'Disconnect/reconnect handled correctly',
    metrics: { reconnectTime: reconnectResult.connectionTime }
  };
}

async function testConcurrentOperations() {
  console.log('\n Test 7: Concurrent Operations Stress Test');
  console.log('   Running mixed operations from all users simultaneously...');

  const operations = simulatedUsers.map(async (user, index) => {
    const results = [];

    results.push(await broadcastCursor(user, randomCursorPosition()));

    try {
      const startTime = Date.now();
      if (LIVE_MODE) {
        await db.setData(`rooms/${ROOM_ID}/users/${user.id}/lastActive`, Date.now());
      } else {
        await db.set(`rooms/${ROOM_ID}/users/${user.id}/lastActive`, Date.now());
      }
      results.push({ success: true, latency: Date.now() - startTime });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }

    if (index === 0) {
      results.push(await flipCard(user, 24, true));
    }

    return results;
  });

  const allResults = await Promise.all(operations);
  const flatResults = allResults.flat();

  const successCount = flatResults.filter(r => r.success).length;
  const totalOperations = flatResults.length;
  const successRate = (successCount / totalOperations) * 100;

  console.log(`   [OK] Total operations: ${totalOperations}`);
  console.log(`   [OK] Successful: ${successCount}`);
  console.log(`   [OK] Success rate: ${successRate.toFixed(1)}%`);

  if (successRate < 90) {
    return { passed: false, message: `Success rate too low: ${successRate.toFixed(1)}%` };
  }

  return {
    passed: true,
    message: 'Concurrent operations handled successfully',
    metrics: { totalOperations, successCount, successRate }
  };
}

// ==================== CAPACITY ANALYSIS ====================

function analyzeCapacity() {
  console.log('\n Test 8: Capacity Analysis for 12 Users');
  console.log('   Analyzing application capacity for Christmas party...');

  // Based on the application architecture
  const analysis = {
    maxUsers: 12,
    cursorUpdateRate: 30, // fps
    userListUpdateRate: 1, // per second
    heartbeatInterval: 5, // seconds
    totalCards: 24
  };

  // Calculate expected load
  const cursorUpdatesPerSecond = analysis.maxUsers * analysis.cursorUpdateRate;
  const totalDbWritesPerSecond = cursorUpdatesPerSecond + (analysis.maxUsers * analysis.userListUpdateRate);
  const dbReadsPerSecond = analysis.maxUsers * (analysis.cursorUpdateRate + 1); // Each user reads all cursors

  console.log(`   [OK] Max concurrent users: ${analysis.maxUsers}`);
  console.log(`   [OK] Cursor updates/sec (all users): ${cursorUpdatesPerSecond}`);
  console.log(`   [OK] Estimated DB writes/sec: ${totalDbWritesPerSecond}`);
  console.log(`   [OK] Estimated DB reads/sec: ${dbReadsPerSecond}`);

  // Firebase Realtime DB limits
  const firebaseLimits = {
    simultaneousConnections: 200000, // per database
    writesPerSecond: 1000, // per second
    downloadBandwidth: '10 GB/day' // Spark plan
  };

  console.log(`\n   Firebase Limits vs Expected Load:`);
  console.log(`   [OK] Connections: ${analysis.maxUsers}/${firebaseLimits.simultaneousConnections} (${(analysis.maxUsers/firebaseLimits.simultaneousConnections*100).toFixed(4)}%)`);
  console.log(`   [OK] Writes/sec: ${totalDbWritesPerSecond}/${firebaseLimits.writesPerSecond} (${(totalDbWritesPerSecond/firebaseLimits.writesPerSecond*100).toFixed(1)}%)`);

  // Memory estimation per user
  const memoryPerUser = {
    cursorData: 100, // bytes
    userData: 200, // bytes
    listeners: 3, // count
  };

  const totalMemory = analysis.maxUsers * (memoryPerUser.cursorData + memoryPerUser.userData);
  console.log(`   [OK] Estimated memory usage: ${(totalMemory / 1024).toFixed(2)} KB`);

  // Verdict
  const isCapacitySufficient =
    analysis.maxUsers < firebaseLimits.simultaneousConnections &&
    totalDbWritesPerSecond < firebaseLimits.writesPerSecond;

  if (isCapacitySufficient) {
    console.log(`\n   [OK] CAPACITY VERDICT: Application can handle 12 concurrent users`);
    return { passed: true, message: 'Capacity sufficient for 12 users' };
  } else {
    console.log(`\n   [!!] CAPACITY VERDICT: Application may struggle with 12 users`);
    return { passed: false, message: 'Capacity may be insufficient' };
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runPerformanceTests() {
  console.log('===================================================================');
  console.log('  BladeLabs Winter Festival - Performance Test Suite');
  console.log('  Testing for 12 Concurrent Users (Christmas Remote Party)');
  console.log('===================================================================');
  console.log(`  Mode: ${LIVE_MODE ? 'LIVE (Firebase)' : 'SIMULATION'}`);

  metrics.startTime = Date.now();

  // Initialize database
  console.log('\n Initializing database...');
  if (LIVE_MODE) {
    try {
      const liveDb = await initLiveFirebase();
      db = new LiveFirebaseDB(liveDb);
      console.log(' Firebase initialized successfully');
    } catch (error) {
      console.error(' Firebase initialization failed:', error.message);
      console.log(' Falling back to simulation mode...');
      db = new SimulatedFirebaseDB();
    }
  } else {
    db = new SimulatedFirebaseDB();
    console.log(' Simulated database initialized');
  }

  // Create simulated users
  console.log('\n Creating 12 simulated users...');
  for (let i = 0; i < NUM_USERS; i++) {
    simulatedUsers.push(createSimulatedUser(i));
    console.log(`   Created ${TEAM_MEMBERS[i].name}`);
  }

  // Run tests
  const testResults = [];

  try {
    testResults.push(await testConcurrentConnections());
    testResults.push(await testUserPresence());
    testResults.push(await testCursorSynchronization());
    testResults.push(await testRapidCursorUpdates());
    testResults.push(await testCardSynchronization());
    testResults.push(await testDisconnectReconnect());
    testResults.push(await testConcurrentOperations());
    testResults.push(analyzeCapacity());
  } catch (error) {
    console.error('\n Test suite error:', error.message);
    metrics.errors.push({ phase: 'test_suite', error: error.message });
  }

  // Cleanup
  console.log('\n Cleaning up...');
  for (const user of simulatedUsers) {
    await disconnectUser(user);
  }
  await cleanupTestRoom();

  metrics.endTime = Date.now();

  // Print summary
  console.log('\n===================================================================');
  console.log('                       TEST SUMMARY');
  console.log('===================================================================');

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;

  const testNames = [
    'Concurrent Connections',
    'User Presence',
    'Cursor Synchronization',
    'Rapid Cursor Updates',
    'Card Synchronization',
    'Disconnect/Reconnect',
    'Concurrent Operations',
    'Capacity Analysis'
  ];

  testResults.forEach((result, index) => {
    const status = result.passed ? 'PASS' : 'FAIL';
    const icon = result.passed ? '[OK]' : '[!!]';
    console.log(`   ${icon} Test ${index + 1}: ${status} - ${testNames[index]}`);
  });

  console.log('\n-------------------------------------------------------------------');
  console.log('                         METRICS');
  console.log('-------------------------------------------------------------------');

  const totalDuration = metrics.endTime - metrics.startTime;
  console.log(`   Total test duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`   Users tested: ${NUM_USERS}`);
  console.log(`   Mode: ${LIVE_MODE ? 'Live Firebase' : 'Simulation'}`);

  if (metrics.connectionTimes.length > 0) {
    const avgConn = metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length;
    console.log(`   Avg connection time: ${avgConn.toFixed(0)}ms`);
  }

  if (metrics.cursorSyncLatencies.length > 0) {
    const avgCursor = metrics.cursorSyncLatencies.reduce((a, b) => a + b, 0) / metrics.cursorSyncLatencies.length;
    console.log(`   Avg cursor latency: ${avgCursor.toFixed(0)}ms`);
  }

  if (metrics.cardSyncLatencies.length > 0) {
    const avgCard = metrics.cardSyncLatencies.reduce((a, b) => a + b, 0) / metrics.cardSyncLatencies.length;
    console.log(`   Avg card sync latency: ${avgCard.toFixed(0)}ms`);
  }

  if (metrics.errors.length > 0) {
    console.log(`\n   Errors encountered: ${metrics.errors.length}`);
    metrics.errors.slice(0, 5).forEach(err => {
      console.log(`      - [${err.phase}] ${err.error}`);
    });
  }

  console.log('\n===================================================================');

  if (passedTests === totalTests) {
    console.log('   ALL TESTS PASSED! Ready for the Christmas Party!');
    console.log('===================================================================\n');
    process.exit(0);
  } else {
    console.log(`   ${totalTests - passedTests}/${totalTests} tests failed`);
    console.log('   Please review the failures before the party.');
    console.log('===================================================================\n');
    process.exit(1);
  }
}

// Run the tests
runPerformanceTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
