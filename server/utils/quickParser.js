/**
 * FinSight Smart Quick Entry Parser
 * Parses natural language input into structured financial transactions.
 * Supports single/multiple entries, Indian currency formats (₹, Rs, rs, k shorthand),
 * relative & explicit dates, type detection, and intelligent category suggestions.
 */

const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Education',
  'Other',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Allowance',
  'Gift',
  'Other',
];

// Income detection keywords
const INCOME_KEYWORDS = [
  'salary',
  'payroll',
  'stipend',
  'credited',
  'freelance',
  'contract',
  'dividend',
  'interest',
  'bonus',
  'pocket money',
  'allowance',
  'cashback',
  'refund',
  'gift',
  'received',
  'earned',
  'inflow',
];

// Category keyword mappings for FinSight
const CATEGORY_RULES = {
  Food: [
    'chai', 'tea', 'coffee', 'cafe', 'starbucks', 'ccd',
    'lunch', 'dinner', 'breakfast', 'snack', 'snacks', 'food', 'meal',
    'swiggy', 'zomato', 'restaurant', 'dhaba', 'mcdonald', 'burger',
    'pizza', 'dominos', 'groceries', 'grocery', 'supermarket', 'zepto',
    'blinkit', 'instamart', 'vegetables', 'fruits', 'milk', 'bread',
    'biryani', 'roti', 'subzi', 'sweets', 'bakery', 'eatclub'
  ],
  Transport: [
    'auto', 'rickshaw', 'cab', 'taxi', 'uber', 'ola', 'rapido',
    'metro', 'bus', 'train', 'irctc', 'rail', 'railway', 'flight',
    'airline', 'bus ticket', 'train ticket', 'metro ticket', 'flight ticket',
    'petrol', 'diesel', 'fuel', 'cng', 'toll', 'fastag', 'parking', 'scooter',
    'bike service', 'car wash'
  ],
  Bills: [
    'electricity', 'electric bill', 'power bill', 'bijli', 'water bill',
    'gas', 'cylinder', 'indane', 'hp gas', 'wifi', 'broadband', 'internet',
    'fiber', 'airtel', 'jio', 'vi', 'vodafone', 'recharge', 'phone recharge',
    'mobile bill', 'maintenance', 'rent', 'house rent', 'bescom', 'tneb',
    'bill', 'utility', 'utilities'
  ],
  Shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'meesho',
    'clothes', 'clothing', 'shoes', 'dress', 'shirt', 'jeans', 'electronics',
    'gadget', 'mobile', 'laptop', 'shopping', 'mall', 'retail', 'market',
    'watch', 'apparel'
  ],
  Entertainment: [
    'movie', 'movies', 'cinema', 'pvr', 'inox', 'cinepolis', 'theater',
    'netflix', 'hotstar', 'prime video', 'spotify', 'youtube', 'subscription',
    'game', 'gaming', 'steam', 'playstation', 'concert', 'outing', 'party',
    'drinks', 'pub', 'club', 'movie ticket', 'cinema ticket'
  ],
  Healthcare: [
    'doctor', 'hospital', 'clinic', 'dentist', 'dental', 'medicine',
    'medicines', 'pharmacy', 'apollo', 'pharmeasy', '1mg', 'medplus',
    'test', 'lab', 'blood test', 'health', 'fitness', 'gym', 'workout',
    'protein', 'therapy'
  ],
  Education: [
    'course', 'udemy', 'coursera', 'book', 'books', 'tuition', 'coaching',
    'school', 'college', 'exam', 'fees', 'training', 'stationery',
    'notebook', 'pen', 'library'
  ],
  Salary: ['salary', 'payroll', 'stipend', 'wages'],
  Freelance: ['freelance', 'client', 'gig', 'upwork', 'fiverr', 'contract work'],
  Investment: ['dividend', 'mutual fund', 'sip', 'stock', 'shares', 'interest', 'fd', 'crypto'],
  Allowance: ['pocket money', 'allowance', 'parents'],
  Gift: ['gift', 'shagun', 'birthday gift', 'reward', 'cashback', 'prize']
};

/**
 * Normalizes input text and separates multi-transaction statements.
 * Splits on commas, newlines, and the word "and" ONLY when adjoining parts contain amounts.
 */
function splitIntoStatements(text) {
  if (!text || typeof text !== 'string') return [];

  // Replace explicit line breaks first
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const statements = [];

  // Helper regex to check if a substring contains a likely amount
  const hasAmount = (str) => /(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?\s*(?:k|rs|\/-)?/i.test(str);

  for (const line of rawLines) {
    // Check if line contains commas
    const commaParts = line.split(',').map(p => p.trim()).filter(Boolean);
    if (commaParts.length > 1 && commaParts.every(p => hasAmount(p))) {
      // All comma parts have amounts -> safe to split on commas
      for (const part of commaParts) {
        statements.push(...splitByAndIfMulti(part, hasAmount));
      }
    } else {
      statements.push(...splitByAndIfMulti(line, hasAmount));
    }
  }

  return statements.filter(s => s && s.trim().length > 0);
}

/**
 * Splits by "and" only if BOTH sides of "and" contain an amount or can form distinct transactions
 */
function splitByAndIfMulti(text, hasAmount) {
  // Regex to look for " and "
  const andParts = text.split(/\s+and\s+/i).map(p => p.trim()).filter(Boolean);
  if (andParts.length <= 1) return [text];

  // If both left and right contain an amount, split them
  // e.g. "salary 25000 and lunch 120" -> ["salary 25000", "lunch 120"]
  // e.g. "bread and butter 50" -> ["bread and butter 50"] (because "bread" has no amount)
  const results = [];
  let buffer = '';

  for (let i = 0; i < andParts.length; i++) {
    const part = andParts[i];
    if (buffer) {
      if (hasAmount(part)) {
        // flush buffer
        results.push(buffer);
        buffer = part;
      } else {
        buffer += ' and ' + part;
      }
    } else {
      buffer = part;
    }
  }
  if (buffer) results.push(buffer);

  return results.length > 0 ? results : [text];
}

/**
 * Extracts numeric amount handling:
 * - ₹120, Rs 120, Rs. 120, 120rs, 120/-
 * - Shorthand: 1.5k, 25k, 2.5K
 * Returns { amount: number | null, rawAmountStr: string, textWithoutAmount: string }
 */
function extractAmount(text) {
  // Patterns to match:
  // 1. Symbol/prefix with optional 'k': [₹|Rs|INR]\s*(\d+(?:\.\d+)?)\s*(k|K)?
  // 2. Suffix with optional 'k' or 'rs': (\d+(?:\.\d+)?)\s*(k|K|rs|\/-)
  // 3. Standalone numbers: (\d+(?:\.\d+)?)
  
  const patterns = [
    /(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(k)?/i,
    /(\d+(?:\.\d+)?)\s*(k)\b/i,
    /(\d+(?:\.\d+)?)\s*(?:rs|\/-)/i,
    /\b(\d+(?:\.\d+)?)\b/
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      const fullMatch = match[0];
      const numPart = parseFloat(match[1]);
      const isThousand = match[2] && match[2].toLowerCase() === 'k';
      
      let finalAmount = isThousand ? Math.round(numPart * 1000) : numPart;
      
      if (!isNaN(finalAmount) && finalAmount > 0) {
        // Remove amount from text cleanly
        const textWithout = text.replace(fullMatch, ' ').replace(/\s+/g, ' ').trim();
        return {
          amount: finalAmount,
          rawAmountStr: fullMatch,
          textWithoutAmount: textWithout
        };
      }
    }
  }

  return { amount: null, rawAmountStr: '', textWithoutAmount: text };
}

/**
 * Extracts date from text.
 * Supports 'today', 'yesterday', 'day before yesterday', 'on 5 oct', '5th october', '15-10-2026', etc.
 * Uses referenceDate (defaults to now) to resolve relative dates.
 */
function extractDate(text, referenceDate = new Date()) {
  const base = new Date(referenceDate);
  if (isNaN(base.getTime())) referenceDate = new Date();

  const lower = text.toLowerCase();
  let parsedDate = null;
  let dateTextMatch = '';

  // 1. Day before yesterday
  if (/\b(?:day before yesterday)\b/i.test(lower)) {
    const d = new Date(base);
    d.setDate(d.getDate() - 2);
    parsedDate = d;
    dateTextMatch = 'day before yesterday';
  }
  // 2. Yesterday
  else if (/\byesterday\b/i.test(lower)) {
    const d = new Date(base);
    d.setDate(d.getDate() - 1);
    parsedDate = d;
    dateTextMatch = 'yesterday';
  }
  // 3. Today
  else if (/\btoday\b/i.test(lower)) {
    parsedDate = new Date(base);
    dateTextMatch = 'today';
  }
  // 4. "on 5 oct", "5 oct", "5th october", "oct 5", "october 5"
  else {
    const months = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };

    const monthNames = Object.keys(months).join('|');
    // e.g. "on 5 oct", "on 5th oct", "5 oct", "5th october"
    const pattern1 = new RegExp(`(?:on\\s+)?\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})(?:\\s+(\\d{4}))?\\b`, 'i');
    // e.g. "on oct 5", "october 5th"
    const pattern2 = new RegExp(`(?:on\\s+)?\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?\\b`, 'i');

    const m1 = text.match(pattern1);
    const m2 = text.match(pattern2);

    if (m1) {
      const day = parseInt(m1[1], 10);
      const monthIdx = months[m1[2].toLowerCase()];
      const year = m1[3] ? parseInt(m1[3], 10) : base.getFullYear();
      parsedDate = new Date(year, monthIdx, day, 12, 0, 0);
      dateTextMatch = m1[0];
    } else if (m2) {
      const monthIdx = months[m2[1].toLowerCase()];
      const day = parseInt(m2[2], 10);
      const year = m2[3] ? parseInt(m2[3], 10) : base.getFullYear();
      parsedDate = new Date(year, monthIdx, day, 12, 0, 0);
      dateTextMatch = m2[0];
    }
  }

  // 5. Explicit ISO or DD-MM-YYYY dates
  if (!parsedDate) {
    const explicitIso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (explicitIso) {
      parsedDate = new Date(parseInt(explicitIso[1], 10), parseInt(explicitIso[2], 10) - 1, parseInt(explicitIso[3], 10), 12, 0, 0);
      dateTextMatch = explicitIso[0];
    } else {
      const explicitDmy = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
      if (explicitDmy) {
        parsedDate = new Date(parseInt(explicitDmy[3], 10), parseInt(explicitDmy[2], 10) - 1, parseInt(explicitDmy[1], 10), 12, 0, 0);
        dateTextMatch = explicitDmy[0];
      }
    }
  }

  // Default to today if no date found
  const finalDate = parsedDate || new Date(base);
  const formattedDate = finalDate.toISOString().split('T')[0];

  let cleanedText = text;
  if (dateTextMatch) {
    // Remove date text and optional leading "on"
    cleanedText = cleanedText.replace(new RegExp(`(?:\\bon\\s+)?${escapeRegExp(dateTextMatch)}`, 'gi'), ' ');
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
  }

  return {
    date: formattedDate,
    hasExplicitDate: Boolean(dateTextMatch),
    textWithoutDate: cleanedText
  };
}

/**
 * Escapes characters for safe RegExp generation
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects whether transaction is income or expense.
 * Default is always expense unless income indicators exist.
 */
function detectType(text) {
  const lower = text.toLowerCase();
  for (const kw of INCOME_KEYWORDS) {
    const regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
    if (regex.test(lower)) {
      return { type: 'income', matchedKeyword: kw };
    }
  }
  return { type: 'expense', matchedKeyword: null };
}

/**
 * Matches category based on keywords and computes confidence score.
 */
function detectCategory(text, type) {
  const lower = text.toLowerCase();
  let bestCategory = type === 'income' ? 'Salary' : 'Other';
  let bestScore = 0.45; // baseline confidence
  let matchedKeyword = null;
  let longestMatchLength = 0;

  // Choose relevant category pool
  const categoriesToCheck = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  for (const cat of categoriesToCheck) {
    const keywords = CATEGORY_RULES[cat] || [];
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (regex.test(lower)) {
        if (kw.length > longestMatchLength) {
          bestCategory = cat;
          matchedKeyword = kw;
          bestScore = 0.95;
          longestMatchLength = kw.length;
        }
      } else if (lower.includes(kw) && longestMatchLength === 0) {
        if (bestScore < 0.75) {
          bestCategory = cat;
          matchedKeyword = kw;
          bestScore = 0.75;
        }
      }
    }
  }

  // Fallbacks if nothing matched
  if (longestMatchLength === 0 && bestScore < 0.60) {
    bestCategory = type === 'income' ? 'Other' : 'Other';
    bestScore = 0.45; // Low confidence, user should verify
  }

  return {
    category: bestCategory,
    confidence: bestScore,
    matchedKeyword
  };
}


/**
 * Detects payment method based on description keywords.
 * Defaults to 'UPI' (India standard).
 */
function detectPaymentMethod(text) {
  const lower = text.toLowerCase();
  if (/\b(?:card|pos|visa|mastercard|credit|debit)\b/i.test(lower)) return 'Card';
  if (/\b(?:cash|atm)\b/i.test(lower)) return 'Cash';
  if (/\b(?:bank|neft|rtgs|imps|transfer|cheque)\b/i.test(lower)) return 'Bank Transfer';
  if (/\b(?:upi|gpay|phonepe|paytm|bhim)\b/i.test(lower)) return 'UPI';
  return 'UPI';
}

/**
 * Cleans residual description note:
 * Removes dangling prepositions like "for", "on", "at", "with", excess punctuation, etc.
 */
function cleanDescription(text, originalRaw) {
  let note = text
    .replace(/^(?:for|on|at|paid|bought|spent)\s+/i, '')
    .replace(/\s+(?:for|on|at)\s*$/i, '')
    .replace(/[,\-:;]+$/, '')
    .trim();

  if (!note || note.length < 2) {
    // If stripped to nothing, provide a clean fall-back based on category
    note = originalRaw.trim();
  }

  // Capitalize first letter
  return note.charAt(0).toUpperCase() + note.slice(1);
}

/**
 * Main parseEntry function
 * Takes a single natural language entry and returns structured transaction item
 */
function parseEntry(rawText, referenceDate = new Date()) {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  // 1. Extract Amount
  const { amount, rawAmountStr, textWithoutAmount } = extractAmount(trimmed);

  // 2. Extract Date
  const { date, hasExplicitDate, textWithoutDate } = extractDate(textWithoutAmount, referenceDate);

  // 3. Detect Type (Income vs Expense)
  const { type, matchedKeyword: incomeKeyword } = detectType(textWithoutDate);

  // 4. Detect Category and Confidence
  const { category, confidence, matchedKeyword: categoryKeyword } = detectCategory(textWithoutDate, type);

  // 5. Detect Payment Method
  const paymentMethod = detectPaymentMethod(trimmed);

  // 6. Clean Description Note
  const description = cleanDescription(textWithoutDate, trimmed);

  // Calibrate confidence label
  let confidenceLevel = 'high';
  let isLowConfidence = false;
  let reason = '';

  if (!amount || amount <= 0) {
    confidenceLevel = 'low';
    isLowConfidence = true;
    reason = 'No valid monetary amount detected.';
  } else if (confidence < 0.60) {
    confidenceLevel = 'low';
    isLowConfidence = true;
    reason = `Unrecognized category keyword; defaulted to "${category}". Please review.`;
  } else if (confidence < 0.85) {
    confidenceLevel = 'medium';
  }

  return {
    id: `parsed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    rawInput: trimmed,
    amount: amount || 0,
    type,
    category,
    paymentMethod,
    date,
    description: description || (type === 'income' ? 'Income' : 'Expense'),
    confidence: Number(confidence.toFixed(2)),
    confidenceLevel,
    isLowConfidence,
    reason,
    hasExplicitDate
  };
}

/**
 * Main exposed function: quickParse
 * Parses single or multi-line/comma-separated input into array of structured transaction candidates.
 */
function quickParse(inputText, referenceDate = new Date()) {
  if (!inputText || typeof inputText !== 'string' || !inputText.trim()) {
    return [];
  }

  const statements = splitIntoStatements(inputText);
  const parsedItems = [];

  for (const stmt of statements) {
    const item = parseEntry(stmt, referenceDate);
    if (item) {
      parsedItems.push(item);
    }
  }

  return parsedItems;
}

module.exports = {
  quickParse,
  parseEntry,
  splitIntoStatements,
  extractAmount,
  extractDate,
  detectType,
  detectCategory,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES
};
