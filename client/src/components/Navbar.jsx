import React, { useState } from 'react';
import { Menu, Plus, Sparkles, CornerDownLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const Navbar = ({
  pageTitle,
  pageSubtitle,
  onToggleMobile,
  onOpenAddTransaction,
  onOpenQuickAdd,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [quickText, setQuickText] = useState('');

  const showAddTransaction =
    ['/dashboard', '/transactions', '/budgets', '/import'].includes(currentPath) &&
    Boolean(onOpenAddTransaction);

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (quickText.trim() && onOpenQuickAdd) {
      onOpenQuickAdd(quickText.trim());
      setQuickText('');
    } else if (onOpenQuickAdd) {
      onOpenQuickAdd();
    }
  };

  return (
    <header
      style={{
        height: '70px',
        padding: '0 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(7, 18, 16, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flexShrink: 0 }}>
        <button
          onClick={onToggleMobile}
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
          style={{
            display: 'none',
            color: 'var(--text-primary)',
            padding: '6px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            {pageTitle || 'FinSight'}
          </h1>
          {pageSubtitle && (
            <p className="hide-on-mobile" style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Global Quick Add Input & Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
        {/* Quick Add Search/Input Form */}
        {onOpenQuickAdd && (
          <form
            onSubmit={handleQuickSubmit}
            className="navbar-quick-add-form"
            style={{
              position: 'relative',
              maxWidth: '380px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '10px',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Sparkles size={15} />
            </div>

            <input
              type="text"
              className="form-input"
              placeholder="Quick Add: 120 chai, auto 60..."
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              style={{
                paddingLeft: '32px',
                paddingRight: '60px',
                paddingTop: '0.45rem',
                paddingBottom: '0.45rem',
                fontSize: '0.825rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(63, 191, 159, 0.25)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                right: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {quickText ? (
                <button
                  type="submit"
                  aria-label="Parse entry"
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#06241e',
                    border: 'none',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <CornerDownLeft size={12} strokeWidth={2.5} />
                </button>
              ) : (
                <span
                  className="hide-on-mobile"
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Ctrl+K
                </span>
              )}
            </div>
          </form>
        )}

        {/* Quick Add Button */}
        {onOpenQuickAdd && (
          <button
            type="button"
            onClick={() => onOpenQuickAdd(quickText.trim())}
            className="btn btn-secondary btn-sm"
            title="Smart Quick Add (Ctrl+K)"
            style={{
              borderColor: 'rgba(63, 191, 159, 0.3)',
              color: 'var(--accent-primary)',
            }}
          >
            <Sparkles size={15} />
            <span className="hide-on-mobile">Quick Add</span>
          </button>
        )}

        {/* Existing Manual Add Transaction Button */}
        {showAddTransaction && (
          <button
            onClick={onOpenAddTransaction}
            className="btn btn-primary btn-sm"
            title="Open standard transaction form"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hide-on-mobile">Add Transaction</span>
          </button>
        )}
      </div>


      <style>{`
        @media (max-width: 900px) {
          .mobile-menu-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .hide-on-mobile {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
