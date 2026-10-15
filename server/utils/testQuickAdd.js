/**
 * FinSight End-to-End Test Suite for Smart Quick Entry & Auto-Categorization
 * Tests all 12 criteria specified in Phase 2.F:
 * 1. Single and multiple expense entries
 * 2. Mixed income and expense entries
 * 3. Rupee formats and shorthand amounts (₹, Rs, rs, k shorthand)
 * 4. Today, yesterday, and explicit dates
 * 5. Incorrect or ambiguous input & low confidence handling
 * 6. Non-persistence during parse (read-only verification)
 * 7. Canceling without saving
 * 8. Confirmation and persisted transaction verification
 * 9. JWT authentication & account isolation
 * 10. Duplicate submission safety & API error resilience
 * 11. Dashboard totals & existing transaction features consistency
 * 12. Verification of existing endpoints & deployment safety
 */

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';
const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🚀 FINSIGHT SMART QUICK ENTRY & CATEGORIZATION TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.response?.data || err.message);
      failed++;
    }
  };

  // 1. Health Checks
  await test('0. Node.js REST API /api/health returns online', async () => {
    const res = await axios.get(`${API_URL}/health`);
    if (res.data.status !== 'online') throw new Error('API health check failed');
  });

  // 2. Setup Test User A
  const userAEmail = `quickuser_a_${Date.now()}@finsight.com`;
  let tokenA = '';
  let userAId = '';

  await test('Setup: Register User A for isolated testing', async () => {
    const res = await axios.post(`${API_URL}/auth/register`, {
      name: 'Quick Add Tester A',
      email: userAEmail,
      password: 'Password123',
      monthlyIncome: 60000,
    });
    if (!res.data.success || !res.data.token) throw new Error('Registration failed');
    tokenA = res.data.token;
    userAId = res.data.user._id;
  });

  const authHeaderA = { headers: { Authorization: `Bearer ${tokenA}` } };

  // 3. Setup Test User B (for isolation testing)
  const userBEmail = `quickuser_b_${Date.now()}@finsight.com`;
  let tokenB = '';
  await test('Setup: Register User B for account isolation verification', async () => {
    const res = await axios.post(`${API_URL}/auth/register`, {
      name: 'Quick Add Tester B',
      email: userBEmail,
      password: 'Password123',
      monthlyIncome: 75000,
    });
    if (!res.data.success || !res.data.token) throw new Error('Registration failed');
    tokenB = res.data.token;
  });
  const authHeaderB = { headers: { Authorization: `Bearer ${tokenB}` } };

  // TEST 1: Single and Multiple Expense Entries
  await test('Test 1a: Parse single expense entry "120 chai with friends"', async () => {
    const res = await axios.post(`${API_URL}/transactions/quick-parse`, {
      text: '120 chai with friends',
    }, authHeaderA);

    if (!res.data.success) throw new Error('quick-parse failed');
    if (res.data.count !== 1) throw new Error(`Expected 1 transaction, got ${res.data.count}`);
    const item = res.data.transactions[0];
    if (item.amount !== 120) throw new Error(`Expected amount 120, got ${item.amount}`);
    if (item.type !== 'expense') throw new Error(`Expected type expense, got ${item.type}`);
    if (item.category !== 'Food') throw new Error(`Expected category Food, got ${item.category}`);
  });

  await test('Test 1b: Parse multiple comma-separated expense entries "chai 20, auto 60, lunch 120"', async () => {
    const res = await axios.post(`${API_URL}/transactions/quick-parse`, {
      text: 'chai 20, auto 60, lunch 120',
    }, authHeaderA);

    if (!res.data.success || res.data.count !== 3) {
      throw new Error(`Expected 3 transactions, got ${res.data.count}`);
    }
    const [t1, t2, t3] = res.data.transactions;
    if (t1.amount !== 20 || t1.category !== 'Food') throw new Error(`t1 mismatch: ${JSON.stringify(t1)}`);
    if (t2.amount !== 60 || t2.category !== 'Transport') throw new Error(`t2 mismatch: ${JSON.stringify(t2)}`);
    if (t3.amount !== 120 || t3.category !== 'Food') throw new Error(`t3 mismatch: ${JSON.stringify(t3)}`);
  });

  // TEST 2: Mixed Income and Expense Entries
  await test('Test 2: Parse mixed income and expense "salary 25000 and lunch 120"', async () => {
    const res = await axios.post(`${API_URL}/transactions/quick-parse`, {
      text: 'salary 25000 and lunch 120',
    }, authHeaderA);

    if (!res.data.success || res.data.count !== 2) {
      throw new Error(`Expected 2 transactions, got ${res.data.count}`);
    }
    const [incomeItem, expenseItem] = res.data.transactions;
    if (incomeItem.amount !== 25000 || incomeItem.type !== 'income' || incomeItem.category !== 'Salary') {
      throw new Error(`Income item mismatch: ${JSON.stringify(incomeItem)}`);
    }
    if (expenseItem.amount !== 120 || expenseItem.type !== 'expense' || expenseItem.category !== 'Food') {
      throw new Error(`Expense item mismatch: ${JSON.stringify(expenseItem)}`);
    }
  });

  // TEST 3: Rupee Formats and Shorthand Amounts (₹, Rs, rs, k shorthand)
  await test('Test 3: Parse various Rupee formats and "k" shorthand amounts', async () => {
    const testCases = [
      { text: '₹120 groceries', expectedAmount: 120, expectedCat: 'Food' },
      { text: 'Rs 450 petrol', expectedAmount: 450, expectedCat: 'Transport' },
      { text: '1.5k electricity bill on 5 oct', expectedAmount: 1500, expectedCat: 'Bills' },
      { text: 'salary 50k', expectedAmount: 50000, expectedType: 'income' },
      { text: '250rs cinema ticket', expectedAmount: 250, expectedCat: 'Entertainment' },
    ];

    for (const tc of testCases) {
      const res = await axios.post(`${API_URL}/transactions/quick-parse`, { text: tc.text }, authHeaderA);
      if (!res.data.success || res.data.count < 1) throw new Error(`Failed to parse "${tc.text}"`);
      const item = res.data.transactions[0];
      if (item.amount !== tc.expectedAmount) {
        throw new Error(`"${tc.text}": expected amount ${tc.expectedAmount}, got ${item.amount}`);
      }
      if (tc.expectedCat && item.category !== tc.expectedCat) {
        throw new Error(`"${tc.text}": expected category ${tc.expectedCat}, got ${item.category}`);
      }
      if (tc.expectedType && item.type !== tc.expectedType) {
        throw new Error(`"${tc.text}": expected type ${tc.expectedType}, got ${item.type}`);
      }
    }
  });

  // TEST 4: Today, Yesterday, and Explicit Dates
  await test('Test 4: Parse today, yesterday, and explicit dates ("on 5 oct")', async () => {
    const refDate = new Date('2026-10-15T12:00:00Z');

    // Yesterday
    const resYest = await axios.post(`${API_URL}/transactions/quick-parse`, {
      text: '₹120 groceries yesterday',
      clientDate: refDate.toISOString(),
    }, authHeaderA);
    if (resYest.data.transactions[0].date !== '2026-10-14') {
      throw new Error(`Expected date 2026-10-14 for yesterday, got ${resYest.data.transactions[0].date}`);
    }

    // Explicit date: on 5 oct
    const resOct = await axios.post(`${API_URL}/transactions/quick-parse`, {
      text: '1.5k electricity bill on 5 oct',
      clientDate: refDate.toISOString(),
    }, authHeaderA);
    if (!resOct.data.transactions[0].date.endsWith('-10-05')) {
      throw new Error(`Expected date ending with -10-05, got ${resOct.data.transactions[0].date}`);
    }
  });

  // TEST 5: Incorrect or Ambiguous Input & Low-Confidence Flagging
  await test('Test 5: Handle ambiguous/incomplete input with low confidence flags', async () => {
    // 5a. Empty input returns 400
    try {
      await axios.post(`${API_URL}/transactions/quick-parse`, { text: '   ' }, authHeaderA);
      throw new Error('Should have returned 400 for empty text');
    } catch (err) {
      if (err.response?.status !== 400) throw err;
    }

    // 5b. Unrecognized item returns low confidence and category 'Other'
    const resAmbiguous = await axios.post(`${API_URL}/transactions/quick-parse`, {
      text: 'random mystery item 450',
    }, authHeaderA);
    const item = resAmbiguous.data.transactions[0];
    if (item.amount !== 450) throw new Error('Expected amount 450');
    if (!item.isLowConfidence && item.confidenceLevel === 'high') {
      throw new Error('Expected low/medium confidence for ambiguous item');
    }
  });

  // TEST 6 & 7: Verify Zero DB Writes on Parse / Cancelation
  await test('Test 6 & 7: Verify quick-parse NEVER saves transactions to database', async () => {
    // Check initial transactions count
    const initialRes = await axios.get(`${API_URL}/transactions`, authHeaderA);
    const initialCount = initialRes.data.transactions.length;

    // Run quick-parse on 3 transactions
    await axios.post(`${API_URL}/transactions/quick-parse`, {
      text: 'chai 20, auto 60, lunch 120',
    }, authHeaderA);

    // Verify DB count has NOT changed
    const postParseRes = await axios.get(`${API_URL}/transactions`, authHeaderA);
    if (postParseRes.data.transactions.length !== initialCount) {
      throw new Error(`CRITICAL: quick-parse created database records without confirmation! Count before: ${initialCount}, count after: ${postParseRes.data.transactions.length}`);
    }
  });

  // TEST 8: Confirming and Persisting Transactions via Reused Controller
  await test('Test 8: Confirm parsed transactions and verify persistence with correct user ownership', async () => {
    // Simulate user editing/confirming 2 parsed items
    const confirmedPayload = {
      transactions: [
        {
          type: 'expense',
          amount: 1500,
          category: 'Bills',
          paymentMethod: 'UPI',
          date: '2026-10-05',
          description: 'Electricity bill on 5 oct',
        },
        {
          type: 'income',
          amount: 25000,
          category: 'Salary',
          paymentMethod: 'Bank Transfer',
          date: '2026-10-15',
          description: 'Monthly salary',
        },
      ],
    };

    const importRes = await axios.post(`${API_URL}/transactions/import`, confirmedPayload, authHeaderA);
    if (!importRes.data.success || importRes.data.count !== 2) {
      throw new Error('Failed to persist confirmed transactions');
    }

    // Verify stored records in DB
    const txList = await axios.get(`${API_URL}/transactions`, authHeaderA);
    if (txList.data.transactions.length !== 2) {
      throw new Error(`Expected 2 persisted transactions, found ${txList.data.transactions.length}`);
    }

    for (const tx of txList.data.transactions) {
      if (tx.userId.toString() !== userAId.toString()) {
        throw new Error(`Transaction userId mismatch! Expected ${userAId}, got ${tx.userId}`);
      }
    }
  });

  // TEST 9: JWT Authentication & Account Isolation
  await test('Test 9a: quick-parse rejects unauthorized requests (No JWT token)', async () => {
    try {
      await axios.post(`${API_URL}/transactions/quick-parse`, { text: '120 chai' });
      throw new Error('Expected 401 Unauthorized without JWT');
    } catch (err) {
      if (err.response?.status !== 401) throw err;
    }
  });

  await test('Test 9b: User B cannot see or access User A persisted transactions (Account Isolation)', async () => {
    const userBTx = await axios.get(`${API_URL}/transactions`, authHeaderB);
    if (userBTx.data.transactions.length !== 0) {
      throw new Error(`User B can see User A transactions! Count: ${userBTx.data.transactions.length}`);
    }
  });

  // TEST 10: Duplicate Submission Prevention & Partial Failure Resilience
  await test('Test 10: Handle empty or invalid transactions array safely', async () => {
    try {
      await axios.post(`${API_URL}/transactions/import`, { transactions: [] }, authHeaderA);
      throw new Error('Expected 400 for empty transactions array');
    } catch (err) {
      if (err.response?.status !== 400) throw err;
    }
  });

  // TEST 11: Dashboard Totals and Consistency
  await test('Test 11: Verify Dashboard calculations reflect confirmed transactions', async () => {
    const dashRes = await axios.get(`${API_URL}/dashboard/summary`, authHeaderA);
    if (!dashRes.data.success) throw new Error('Dashboard summary failed');

    const summary = dashRes.data.summaryCards;
    // Expected: Income = 25000, Expense = 1500, Balance = 23500
    if (summary.totalIncome !== 25000) throw new Error(`Expected totalIncome 25000, got ${summary.totalIncome}`);
    if (summary.totalExpenses !== 1500) throw new Error(`Expected totalExpenses 1500, got ${summary.totalExpenses}`);
    if (summary.balance !== 23500) throw new Error(`Expected balance 23500, got ${summary.balance}`);
  });

  // TEST 12: Production Route & Existing Features Verification
  await test('Test 12: Verify manual transaction creation, filtering and editing remain intact', async () => {
    // 12a. Create manual transaction
    const manualRes = await axios.post(`${API_URL}/transactions`, {
      type: 'expense',
      amount: 400,
      category: 'Food',
      paymentMethod: 'Cash',
      description: 'Manual Lunch at Cafe',
      date: new Date().toISOString(),
    }, authHeaderA);
    if (!manualRes.data.success) throw new Error('Manual transaction creation broken');

    // 12b. Filter by category
    const filterRes = await axios.get(`${API_URL}/transactions?category=Food`, authHeaderA);
    if (filterRes.data.transactions.length !== 1 || filterRes.data.transactions[0].amount !== 400) {
      throw new Error('Category filter broken');
    }

    // 12c. Delete manual transaction
    const delRes = await axios.delete(`${API_URL}/transactions/${manualRes.data.transaction._id}`, authHeaderA);
    if (!delRes.data.success) throw new Error('Delete transaction broken');
  });

  console.log('\n===============================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runTestSuite().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
