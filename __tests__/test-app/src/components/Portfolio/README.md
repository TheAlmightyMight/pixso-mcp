# Portfolio Account Card Component

Generated from: `selection-11-03-2026_16-44-26.json`

## Overview

A broker account portfolio card component that displays account information including balance, profit/loss, and action buttons for deposits and withdrawals.

## Features

- **Account Information Display**: Shows account title and current balance
- **P&L Badge**: Displays profit/loss with icon indicator
- **Action Buttons**:
  - "Пополнить" (Top Up) - Primary action button
  - "Вывести" (Withdraw) - Secondary action button
- **Responsive Design**: Adapts to mobile, tablet, and desktop screens
- **Expandable Details**: Toggle view for additional account details
- **Interactive Feedback**: Hover and active states for buttons

## Data Structure

The component renders the following information from the Pixso design:

```
Account Block (621x152px)
├── Account Section (Left)
│   ├── Account Title: "Брокерский счет・Основной"
│   ├── Balance: "600 000 ₽"
│   └── P&L: "1 035,42 ₽ • 0,05%" (Green indicator)
└── Button Section (Right)
    ├── Top Up Button (Primary)
    └── Withdraw Button (Secondary)
```

## Usage

```jsx
import PortfolioCard from './Generation1'

export default function App() {
  return <PortfolioCard />
}
```

## Styling

The component uses CSS modules for encapsulated styling:
- Color scheme matches the Pixso design tokens (blue accents, green P&L)
- Rounded corners (24px for block, 12px for buttons, 8px for badge)
- Flexbox layout for responsive arrangement
- Modern hover and active states

## Responsive Breakpoints

- **Desktop (768px+)**: Horizontal layout with buttons aligned right
- **Tablet/Mobile (< 768px)**: Vertical layout, buttons stack
- **Small Mobile (< 480px)**: Reduced font sizes, compact button spacing

## Future Enhancements

- Connect to real account data API
- Add transaction history
- Implement real deposit/withdrawal flows
- Add charts for balance history
- Support multiple accounts
