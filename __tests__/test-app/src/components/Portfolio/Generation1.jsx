import { useState } from 'react'
import styles from './Portfolio.module.css'

/**
 * Portfolio Account Card Component
 * Generated from: selection-11-03-2026_16-44-26.json
 *
 * Displays broker account information including balance and P&L
 * with action buttons for deposit and withdrawal
 */

export default function PortfolioCard() {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className={styles.container}>
      {/* Main Block Container */}
      <div className={styles.block}>
        {/* Left Section: Account Info */}
        <div className={styles.accountSection}>
          <div className={styles.accountFrame}>
            {/* Account Title */}
            <div className={styles.accountTitle}>
              Брокерский счет・Основной
            </div>

            {/* Account Details Rows */}
            <div className={styles.detailsRows}>
              {/* Balance Row */}
              <div className={styles.row}>
                <div className={styles.balance}>
                  600 000 ₽
                </div>
              </div>

              {/* P&L Badge */}
              <div className={styles.pnlBadge}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className={styles.pnlIcon}
                >
                  <path
                    fill="currentColor"
                    d="M8 3l3 5H5l3-5z"
                  />
                </svg>
                <span className={styles.pnlText}>
                  1 035,42 ₽ • 0,05%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div className={styles.buttonGroup}>
          {/* Top Up Button */}
          <button
            className={styles.buttonPrimary}
            onClick={() => alert('Пополнить - Top Up account')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              className={styles.buttonIcon}
            >
              <path
                fill="currentColor"
                d="M8 2v12M2 8h12"
                strokeWidth="2"
                stroke="currentColor"
              />
            </svg>
            <span>Пополнить</span>
          </button>

          {/* Withdraw Button */}
          <button
            className={styles.buttonSecondary}
            onClick={() => alert('Вывести - Withdraw from account')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              className={styles.buttonIcon}
            >
              <path
                fill="currentColor"
                d="M3 8h10"
                strokeWidth="2"
                stroke="currentColor"
              />
            </svg>
            <span>Вывести</span>
          </button>
        </div>
      </div>

      {/* Optional: Details Toggle */}
      <div className={styles.footer}>
        <button
          className={styles.detailsToggle}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        {showDetails && (
          <div className={styles.detailsPanel}>
            <div className={styles.detailItem}>
              <label>Account Type:</label>
              <value>Broker Account (Main)</value>
            </div>
            <div className={styles.detailItem}>
              <label>Total Balance:</label>
              <value>600 000 ₽</value>
            </div>
            <div className={styles.detailItem}>
              <label>Profit/Loss:</label>
              <value className={styles.positive}>+1 035,42 ₽ (0.05%)</value>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
