const axios = require('axios');
const Transaction = require('../models/Transaction');
const { quickParse } = require('../utils/quickParser');

// @desc    Get all transactions for logged in user (with filters)
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, search, limit = 100, page = 1 } = req.query;

    const query = { userId: req.user._id };

    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 100;
    const skip = (pageNum - 1) * limitNum;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
    }

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, description, paymentMethod, date } = req.body;

    if (!type || amount === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type, amount, and category.',
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number greater than 0.',
      });
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount: parsedAmount,
      category: category.trim(),
      description: description ? description.trim() : '',
      paymentMethod: paymentMethod || 'UPI',
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully.',
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, description, paymentMethod, date } = req.body;

    let transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
    }

    if (type) transaction.type = type;
    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
      }
      transaction.amount = parsedAmount;
    }
    if (category) transaction.category = category.trim();
    if (description !== undefined) transaction.description = description.trim();
    if (paymentMethod) transaction.paymentMethod = paymentMethod;
    if (date) transaction.date = new Date(date);

    const updatedTransaction = await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully.',
      transaction: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk import transactions
// @route   POST /api/transactions/import
// @access  Private
const bulkImportTransactions = async (req, res, next) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid list of transactions to import.',
      });
    }

    const userId = req.user._id;

    // Validate and sanitize records
    const recordsToInsert = transactions
      .map((t) => ({
        userId,
        amount: Math.abs(Number(t.amount)) || 0,
        type: t.type === 'income' ? 'income' : 'expense',
        category: t.category?.trim() || (t.type === 'income' ? 'Salary' : 'Other'),
        paymentMethod: t.paymentMethod?.trim() || 'UPI',
        date: t.date ? new Date(t.date) : new Date(),
        description: t.description ? t.description.trim() : (t.category || 'Imported Transaction'),
      }))
      .filter((t) => t.amount > 0);

    if (recordsToInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid transactions with an amount greater than 0 found.',
      });
    }

    const inserted = await Transaction.insertMany(recordsToInsert);

    res.status(201).json({
      success: true,
      count: inserted.length,
      message: `Successfully imported ${inserted.length} transactions.`,
      transactions: inserted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick parse natural language transactions into preview candidates (read-only, does NOT save to DB)
// @route   POST /api/transactions/quick-parse
// @access  Private
const quickParseTransactions = async (req, res, next) => {
  try {
    const { text, clientDate } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide transaction text to parse.',
        transactions: [],
      });
    }

    const refDate = clientDate ? new Date(clientDate) : new Date();
    const parsedCandidates = quickParse(text, isNaN(refDate.getTime()) ? new Date() : refDate);

    if (!parsedCandidates || parsedCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        transactions: [],
        message: 'No transaction entries could be identified from the input.',
      });
    }

    // Optional FastAPI enrichment for items with lower confidence
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
    const enrichedCandidates = await Promise.all(
      parsedCandidates.map(async (item) => {
        if (item.confidence >= 0.85) return item;

        try {
          const mlRes = await axios.post(
            `${mlServiceUrl}/categorize`,
            { text: item.rawInput },
            { timeout: 1500 }
          );

          if (mlRes.data && mlRes.data.category && mlRes.data.confidence > item.confidence) {
            return {
              ...item,
              category: mlRes.data.category,
              type: mlRes.data.transaction_type || item.type,
              confidence: mlRes.data.confidence,
              confidenceLevel: mlRes.data.confidence >= 0.85 ? 'high' : (mlRes.data.confidence >= 0.60 ? 'medium' : 'low'),
              isLowConfidence: mlRes.data.confidence < 0.60,
              reason: mlRes.data.confidence < 0.60 ? item.reason : '',
            };
          }
        } catch (mlErr) {
          // Graceful fallback to rule-based parser without failing
        }

        return item;
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedCandidates.length,
      transactions: enrichedCandidates,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkImportTransactions,
  quickParseTransactions,
};

