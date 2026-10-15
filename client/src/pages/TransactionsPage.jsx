import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  X,
  CreditCard,
  Sparkles,
} from 'lucide-react';

const expenseCategories = ['Food', 'Transport', 'Shopping', 'Education', 'Bills', 'Entertainment', 'Healthcare', 'Other'];
const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Allowance', 'Gift', 'Other'];
const paymentMethods = ['UPI', 'Card', 'Cash', 'Bank Transfer', 'Other'];

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const TransactionsPage = () => {
  const { refreshTrigger, onOpenAddTransaction, onOpenQuickAdd } = useOutletContext() || {};

  const toast = useToast();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    paymentMethod: 'UPI',
    date: '',
    description: '',
  });

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter && categoryFilter !== 'All') params.category = categoryFilter;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/transactions', { params });
      if (res.data.success) {
        setTransactions(res.data.transactions);
      }
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, categoryFilter, search, startDate, endDate, refreshTrigger]);

  // Edit Handler
  const handleOpenEdit = (tx) => {
    setEditingTransaction(tx);
    setEditForm({
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      paymentMethod: tx.paymentMethod,
      date: new Date(tx.date).toISOString().split('T')[0],
      description: tx.description || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.amount || Number(editForm.amount) <= 0) {
      toast.error('Please enter a valid positive amount.');
      return;
    }

    try {
      const res = await api.put(`/transactions/${editingTransaction._id}`, {
        type: editForm.type,
        amount: Number(editForm.amount),
        category: editForm.category,
        paymentMethod: editForm.paymentMethod,
        date: editForm.date,
        description: editForm.description,
      });

      if (res.data.success) {
        toast.success('Transaction updated successfully.');
        setEditModalOpen(false);
        fetchTransactions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update transaction');
    }
  };

  // Delete Handler
  const handleOpenDelete = (id) => {
    setDeletingId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await api.delete(`/transactions/${deletingId}`);
      if (res.data.success) {
        toast.success('Transaction deleted successfully.');
        setDeleteModalOpen(false);
        fetchTransactions();
      }
    } catch (err) {
      toast.error('Failed to delete transaction');
    }
  };

  // Aggregates of filtered list
  const filteredInflow = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredOutflow = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Controls & Actions */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="heading-md">All Transactions</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {transactions.length} total transactions
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {onOpenQuickAdd && (
              <button
                type="button"
                onClick={() => onOpenQuickAdd()}
                className="btn btn-secondary btn-sm"
                title="Smart Quick Add (Ctrl+K)"
                style={{
                  borderColor: 'rgba(63, 191, 159, 0.3)',
                  color: 'var(--accent-primary)',
                }}
              >
                <Sparkles size={15} />
                <span>Smart Quick Add</span>
              </button>
            )}
            <button onClick={onOpenAddTransaction} className="btn btn-primary btn-sm">
              <Plus size={16} /> Add Transaction
            </button>
          </div>
        </div>


        {/* Filter Toolbar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
            gap: '0.75rem',
          }}
          className="filter-grid"
        >
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search description or category..."
              className="form-input"
              style={{ paddingLeft: '32px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
          </select>

          {/* Category Filter */}
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {[...new Set([...expenseCategories, ...incomeCategories])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Date Range Start */}
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start date"
          />

          {/* Date Range End */}
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End date"
          />
        </div>

        {/* Clear Filters (if active) */}
        {(typeFilter || categoryFilter !== 'All' || search || startDate || endDate) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Filters are currently applied</span>
            <button
              onClick={() => {
                setTypeFilter('');
                setCategoryFilter('All');
                setSearch('');
                setStartDate('');
                setEndDate('');
              }}
              style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.785rem' }}
            >
              <X size={14} /> Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Filtered Totals Bar */}
      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          padding: '1rem 1.5rem',
          background: 'rgba(0,0,0,0.25)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filtered Inflow</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>
            +{formatCurrency(filteredInflow)}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filtered Outflow</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fb7185' }}>
            -{formatCurrency(filteredOutflow)}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filtered Net</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: filteredInflow - filteredOutflow >= 0 ? 'var(--accent-primary)' : 'var(--danger)' }}>
            {formatCurrency(filteredInflow - filteredOutflow)}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1rem' }}>No transactions found.</p>
            <button onClick={onOpenAddTransaction} className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
              <Plus size={15} /> Add Transaction
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Payment Method</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(tx.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ fontWeight: 500, maxWidth: '240px' }}>
                      {tx.description || tx.category}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {tx.category}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${tx.type}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: tx.type === 'income' ? '#34d399' : '#fb7185',
                      }}
                    >
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleOpenEdit(tx)}
                          className="btn-icon"
                          title="Edit transaction"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(tx._id)}
                          className="btn-icon"
                          title="Delete transaction"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Transaction"
        footer={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="edit-tx-form" className="btn btn-primary btn-sm">
              Update Transaction
            </button>
          </>
        }
      >
        <form id="edit-tx-form" onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={editForm.type}
              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              className="form-input"
              value={editForm.amount}
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              >
                {(editForm.type === 'expense' ? expenseCategories : incomeCategories).map((c) => (
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
                value={editForm.paymentMethod}
                onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
              >
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              required
              className="form-input"
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        footer={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={confirmDelete}>
              Delete Transaction
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Are you sure you want to permanently delete this transaction? This action cannot be undone and will recalculate your balance and monthly budgets.
        </p>
      </Modal>

      <style>{`
        @media (max-width: 900px) {
          .filter-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TransactionsPage;
