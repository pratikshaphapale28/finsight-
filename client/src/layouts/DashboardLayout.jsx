import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import AddTransactionModal from '../components/AddTransactionModal';
import SmartQuickAddModal from '../components/SmartQuickAddModal';

const titlesMap = {
  '/dashboard': { title: 'Financial Dashboard', subtitle: 'Real-time overview of your income, expenses, and goals' },
  '/transactions': { title: 'Transactions Manager', subtitle: 'Track, categorize, and filter your financial records' },
  '/import': { title: 'Import Statement', subtitle: 'Upload and review bank or payment statements to automatically add transactions' },
  '/budgets': { title: 'Budget Management', subtitle: 'Set monthly category limits and monitor spending thresholds' },
  '/savings': { title: 'Savings Goals', subtitle: 'Track targets, deadlines, and calculate required monthly deposits' },
  '/analytics': { title: 'Financial Analytics', subtitle: 'In-depth visual insights into your cashflow and category distributions' },
  '/assistant': { title: 'Financial Assistant', subtitle: 'Ask natural-language questions about your spending, estimates, and budgets' },
  '/profile': { title: 'Profile & Settings', subtitle: 'Manage your personal baseline settings and preferences' },
};

const DashboardLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickInitialText, setQuickInitialText] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Global Ctrl+K / Cmd+K shortcut for Smart Quick Entry
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickAddOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenQuickAdd = (initialText = '') => {
    setQuickInitialText(initialText);
    setQuickAddOpen(true);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(63, 191, 159, 0.2)',
            borderTopColor: 'var(--accent-primary)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.9rem' }}>Loading FinSight...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const currentMeta = titlesMap[location.pathname] || {
    title: 'FinSight',
    subtitle: 'Smart Expense & Financial Planning',
  };

  const handleTransactionAdded = () => {
    // Increment trigger to notify active child views
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        isMobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar
          pageTitle={currentMeta.title}
          pageSubtitle={currentMeta.subtitle}
          onToggleMobile={() => setMobileOpen((prev) => !prev)}
          onOpenAddTransaction={() => setAddModalOpen(true)}
          onOpenQuickAdd={handleOpenQuickAdd}
        />

        <main style={{ flex: 1, padding: '1.75rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          <Outlet
            context={{
              refreshTrigger,
              onOpenAddTransaction: () => setAddModalOpen(true),
              onOpenQuickAdd: handleOpenQuickAdd,
            }}
          />
        </main>
      </div>

      <AddTransactionModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleTransactionAdded}
        onSwitchToQuickAdd={() => {
          setAddModalOpen(false);
          setQuickAddOpen(true);
        }}
      />

      <SmartQuickAddModal
        isOpen={quickAddOpen}
        onClose={() => {
          setQuickAddOpen(false);
          setQuickInitialText('');
        }}
        onSuccess={handleTransactionAdded}
        initialText={quickInitialText}
      />
    </div>
  );
};


export default DashboardLayout;
