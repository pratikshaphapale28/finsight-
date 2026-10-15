import React, { useState } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Info,
} from 'lucide-react';

const expenseCategories = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Education',
  'Other',
];

const incomeCategories = [
  'Salary',
  'Freelance',
  'Investment',
  'Allowance',
  'Gift',
  'Other',
];

const paymentMethods = ['UPI', 'Card', 'Cash', 'Bank Transfer', 'Other'];

const SAMPLE_PROMPTS = [
  '120 chai with friends',
  'chai 20, auto 60, lunch 120',
  'salary 25000 and lunch 120',
  '₹120 groceries yesterday',
  '1.5k electricity bill on 5 oct',
];

const SmartQuickAddModal = ({ isOpen, onClose, onSuccess, initialText = '' }) => {
  const toast = useToast();
  const [inputText, setInputText] = useState(initialText);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedItems, setParsedItems] = useState([]);
  const [hasParsed, setHasParsed] = useState(false);

  // Sync initialText when modal opens or initialText changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialText) {
        setInputText(initialText);
        // Automatically trigger parse if initialText was provided
        handleParse(initialText);
      }
    } else {
      // Reset state on close
      setInputText('');
      setParsedItems([]);
      setHasParsed(false);
      setIsParsing(false);
      setIsSaving(false);
    }
  }, [isOpen, initialText]);

  const handleParse = async (textToParse = inputText) => {
    const text = (textToParse || '').trim();
    if (!text) {
      toast.error('Please enter transaction text to parse.');
      return;
    }

    setIsParsing(true);
    try {
      const res = await api.post('/transactions/quick-parse', {
        text,
        clientDate: new Date().toISOString(),
      });

      if (res.data.success) {
        if (!res.data.transactions || res.data.transactions.length === 0) {
          toast.error('No transactions could be parsed from the input. Please check the format.');
          setParsedItems([]);
        } else {
          setParsedItems(res.data.transactions);
          setHasParsed(true);
          toast.success(`Successfully parsed ${res.data.transactions.length} transaction item${res.data.transactions.length > 1 ? 's' : ''}!`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse transactions.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // If type changed, reset category to appropriate default if invalid
      if (field === 'type') {
        const allowed = value === 'income' ? incomeCategories : expenseCategories;
        if (!allowed.includes(item.category)) {
          item.category = value === 'income' ? 'Salary' : 'Other';
        }
      }

      // If user manually edited category or amount, clear low-confidence warning
      if (field === 'category' || field === 'amount') {
        item.isLowConfidence = false;
        item.confidenceLevel = 'high';
        item.reason = '';
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
    toast.info('Item removed from preview.');
  };

  const handleConfirmSave = async () => {
    if (parsedItems.length === 0) {
      toast.error('No transactions to save.');
      return;
    }

    // Validate that every item has a valid positive amount
    const invalidItems = parsedItems.filter((item) => isNaN(Number(item.amount)) || Number(item.amount) <= 0);
    if (invalidItems.length > 0) {
      toast.error('All transactions must have an amount greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      // Reuse the existing transaction batch import API (guarantees JWT verification, schema validation, user ownership)
      const payload = {
        transactions: parsedItems.map((item) => ({
          type: item.type,
          amount: Number(item.amount),
          category: item.category,
          paymentMethod: item.paymentMethod || 'UPI',
          date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
          description: (item.description || '').trim(),
        })),
      };

      const res = await api.post('/transactions/import', payload);
      if (res.data.success) {
        toast.success(`🎉 ${parsedItems.length} transaction${parsedItems.length > 1 ? 's' : ''} recorded successfully!`);
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record transactions.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalExpense = parsedItems
    .filter((i) => i.type === 'expense')
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const totalIncome = parsedItems
    .filter((i) => i.type === 'income')
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(63, 191, 159, 0.2)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} />
          </div>
          <span>Smart Quick Entry</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={isSaving || isParsing}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {hasParsed && parsedItems.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setHasParsed(false);
                  setParsedItems([]);
                }}
                disabled={isSaving || isParsing}
              >
                Clear & Re-enter
              </button>
            )}

            {!hasParsed || parsedItems.length === 0 ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleParse()}
                disabled={isParsing || !inputText.trim()}
              >
                {isParsing ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Parsing Input...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Parse & Preview</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmSave}
                disabled={isSaving || parsedItems.length === 0}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                }}
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Saving to FinSight...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm & Save ({parsedItems.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Input Box Section */}
        <div>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span>Type or paste natural language entries:</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Multi-entry supported (commas, "and", newlines)</span>
          </label>

          <div style={{ position: 'relative' }}>
            <textarea
              rows={hasParsed ? 2 : 3}
              className="form-textarea"
              placeholder="e.g. 120 chai with friends, auto 60, lunch 120&#10;salary 25000 and ₹120 groceries yesterday&#10;1.5k electricity bill on 5 oct"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleParse();
                }
              }}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.925rem',
                lineHeight: '1.45',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Sample quick pills */}
          {!hasParsed && (
            <div style={{ marginTop: '0.65rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Try quick examples:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {SAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setInputText(prompt);
                      handleParse(prompt);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Parsed Preview Section */}
        {hasParsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(63, 191, 159, 0.08)',
                border: '1px solid rgba(63, 191, 159, 0.25)',
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle2 size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                  {parsedItems.length} Transaction{parsedItems.length > 1 ? 's' : ''} Ready to Review
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                {totalExpense > 0 && (
                  <span style={{ color: '#fb7185' }}>
                    Expense: <strong>₹{totalExpense.toLocaleString('en-IN')}</strong>
                  </span>
                )}
                {totalIncome > 0 && (
                  <span style={{ color: '#34d399' }}>
                    Income: <strong>₹{totalIncome.toLocaleString('en-IN')}</strong>
                  </span>
                )}
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Review or adjust any fields below. Transactions will only be saved when you click <strong>Confirm & Save</strong>.
            </p>

            {/* List of Parsed Cards */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                maxHeight: '340px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {parsedItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="card"
                  style={{
                    padding: '0.9rem',
                    background: item.isLowConfidence
                      ? 'rgba(230, 167, 60, 0.08)'
                      : 'rgba(16, 36, 31, 0.65)',
                    border: item.isLowConfidence
                      ? '1px solid rgba(230, 167, 60, 0.4)'
                      : '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  {/* Top Bar: Type, Confidence Badge & Delete Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Type Toggle */}
                      <button
                        type="button"
                        onClick={() => handleItemChange(index, 'type', item.type === 'expense' ? 'income' : 'expense')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: item.type === 'expense' ? 'var(--danger-bg)' : 'var(--success-bg)',
                          color: item.type === 'expense' ? '#fb7185' : '#34d399',
                          border: item.type === 'expense' ? '1px solid var(--danger-border)' : '1px solid rgba(16,185,129,0.3)',
                        }}
                      >
                        {item.type === 'expense' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                        <span>{item.type === 'expense' ? 'Expense' : 'Income'}</span>
                      </button>

                      {/* Confidence Badge */}
                      {item.isLowConfidence ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(230, 167, 60, 0.15)',
                            color: '#e6a73c',
                            border: '1px solid rgba(230, 167, 60, 0.35)',
                          }}
                        >
                          <AlertTriangle size={12} />
                          <span>Review Needed ({Math.round(item.confidence * 100)}%)</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#34d399',
                          }}
                        >
                          <span>✓ {Math.round(item.confidence * 100)}% Match</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="btn-icon"
                      title="Discard this entry"
                      style={{
                        width: '28px',
                        height: '28px',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Warning Reason if Low Confidence */}
                  {item.isLowConfidence && item.reason && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#facc15',
                        background: 'rgba(230, 167, 60, 0.12)',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Info size={13} flexShrink={0} />
                      <span>{item.reason}</span>
                    </div>
                  )}

                  {/* Editable Grid: Amount, Category, Date, PaymentMethod */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 1.3fr 1fr', gap: '0.5rem' }}>
                    {/* Amount */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.875rem', fontWeight: 600 }}
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Category *
                      </label>
                      <select
                        className="form-select"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        value={item.category}
                        onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                      >
                        {(item.type === 'expense' ? expenseCategories : incomeCategories).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Date *
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        value={item.date}
                        onChange={(e) => handleItemChange(index, 'date', e.target.value)}
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Method
                      </label>
                      <select
                        className="form-select"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        value={item.paymentMethod || 'UPI'}
                        onChange={(e) => handleItemChange(index, 'paymentMethod', e.target.value)}
                      >
                        {paymentMethods.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description / Note */}
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                      Description / Note
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Chai with friends"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SmartQuickAddModal;
