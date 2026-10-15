import React, { useState } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { ArrowDownLeft, ArrowUpRight, Sparkles } from 'lucide-react';

const expenseCategories = [
  'Food',
  'Transport',
  'Shopping',
  'Education',
  'Bills',
  'Entertainment',
  'Healthcare',
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

const AddTransactionModal = ({ isOpen, onClose, onSuccess, onSwitchToQuickAdd }) => {

  const toast = useToast();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(newType === 'expense' ? 'Food' : 'Salary');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/transactions', {
        type,
        amount: Number(amount),
        category,
        paymentMethod,
        date,
        description,
      });

      if (res.data.success) {
        toast.success(`${type === 'income' ? 'Income' : 'Expense'} recorded successfully!`);
        setAmount('');
        setDescription('');
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Transaction"
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-transaction-form"
            className="btn btn-primary btn-sm"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Record Transaction'}
          </button>
        </>
      }
    >
      <form id="add-transaction-form" onSubmit={handleSubmit}>
        {onSwitchToQuickAdd && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.85rem' }}>
            <button
              type="button"
              onClick={onSwitchToQuickAdd}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.785rem',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                background: 'rgba(63, 191, 159, 0.12)',
                border: '1px solid rgba(63, 191, 159, 0.25)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={13} />
              <span>Or use Smart Quick Entry (⚡)</span>
            </button>
          </div>
        )}

        {/* Type Toggle Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            background: 'rgba(0,0,0,0.3)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '1.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.6rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: type === 'expense' ? 'var(--danger-bg)' : 'transparent',
              color: type === 'expense' ? '#fb7185' : 'var(--text-secondary)',
              border: type === 'expense' ? '1px solid var(--danger-border)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowDownLeft size={16} />
            <span>Expense (Outflow)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.6rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: type === 'income' ? 'var(--success-bg)' : 'transparent',
              color: type === 'income' ? '#34d399' : 'var(--text-secondary)',
              border: type === 'income' ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowUpRight size={16} />
            <span>Income (Inflow)</span>
          </button>
        </div>

        {/* Amount Input */}
        <div className="form-group">
          <label className="form-label">Amount (₹) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            className="form-input"
            placeholder="e.g. 1500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ fontSize: '1.1rem', fontWeight: 600 }}
          />
        </div>

        {/* Category & Payment Method */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {(type === 'expense' ? expenseCategories : incomeCategories).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select
              className="form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Input */}
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input
            type="date"
            required
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Description / Note */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Description / Note (Optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Weekly grocery stock, Metro recharge..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddTransactionModal;
