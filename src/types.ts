export interface Pocket {
  id: string;
  name: string;
  budget: number;       // Monthly budget assigned to this pocket
  balance: number;      // Current balance in this pocket
  isAccumulative: boolean; // Rolls over remaining funds to next month
  isCustom: boolean;    // User-created
  targetAmount?: number; // Target goal (optional)
  icon: string;         // Lucide-icon identifier
}

export interface ActiveDebt {
  monthlyPayment: number;
  isActive: boolean;
  monthsRemaining: number;
  totalMonthsOriginal: number;
  description: string;
}

export interface Transaction {
  id: string;
  date: string;         // YYYY-MM-DD
  description: string;
  amount: number;       // In COP
  type: 'income' | 'expense' | 'transfer' | 'credit_card_payment';
  fromPocketId?: string; // Origin pocket for expenses/transfers
  toPocketId?: string;   // Destination pocket for transfers
}

export interface BillReminder {
  id: string;
  name: string;
  amount: number;
  dueDate: number; // Day of the month (e.g. 15 for 15th)
  isPaidThisMonth: boolean;
  category: 'house' | 'mobile_plan' | 'other';
}

export interface NuSimulation {
  purchaseAmount: number;
  installmentsCount: number;
  monthlyInterestRate: number; // calculated from 11.75% E.A.
  monthlyInstallment: number;
  totalInterest: number;
  totalAmountWithInterest: number;
  schedule: Array<{
    month: number;
    installmentValue: number;
    principalPaid: number;
    interestPaid: number;
    remainingBalance: number;
  }>;
}
