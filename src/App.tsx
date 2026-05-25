import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Coins,
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  Calculator,
  Eye,
  EyeOff,
  User,
  Sliders,
  Wallet,
  Info,
  Calendar,
  Layers,
  CheckCircle,
  HelpCircle,
  Trash2,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Bell,
  Heart,
  ChevronRight,
  Sparkle,
  History,
  Search,
  Download,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from './types';

// Let's define the interface for itemized Credit Card Charges to support custom installments, E.A rates, and available cupo tracking
interface CCCharge {
  id: string;
  date: string;
  description: string;
  amount: number;             // Total principal original amount
  installments: number;       // e.g. 1 to 72 cuotas
  paidInstallments: number;   // e.g. 0 to installments
  category: 'salida' | 'general';
  monthlyPayment: number;     // calculated French installment value
  isMarcaAliada?: boolean;    // No interest if true
  billingTarget?: 'current_26' | 'next_26'; // Target payment choice
}

export default function App() {
  // --- Nu Colombia Constant Configuration ---
  const CC_EA_RATE = 0.2775; // 27.75% E.A. as specified by user
  const CC_MONTHLY_INTEREST_RATE = Math.pow(1 + CC_EA_RATE, 1 / 12) - 1; // ≈ 2.0577% monthly equivalent compounding interest
  const CC_CUOTA_MANEJO = 12000; // $12,000 COP monthly fee as updated by user

  // --- State backing from LocalStorage to keep user's data persistent ---
  
  // Custom Cycle Parameters with LocalStorage persistence to match real Nu Cards
  const [cutoffDay, setCutoffDay] = useState<number>(() => {
    const saved = localStorage.getItem('nu_app_cutoff_day');
    return saved ? parseInt(saved) : 15; // default 15
  });

  const [paymentDueDay, setPaymentDueDay] = useState<number>(() => {
    const saved = localStorage.getItem('nu_app_payment_due_day');
    return saved ? parseInt(saved) : 4; // default 4
  });

  // 1. Outings Section Balance & Monthly Budget Setup (with migration support to preserve old data)
  const [salidasBalance, setSalidasBalance] = useState<number>(() => {
    const savedV2 = localStorage.getItem('nu_app_salidas_balance_v2');
    if (savedV2 !== null) return parseFloat(savedV2);
    const savedV1 = localStorage.getItem('nu_app_salidas_balance');
    if (savedV1 !== null) return parseFloat(savedV1);
    const savedOld = localStorage.getItem('salidasBalance');
    if (savedOld !== null) return parseFloat(savedOld);
    return 400000; // default 400k
  });

  const [monthlyOutingsBudget, setMonthlyOutingsBudget] = useState<number>(() => {
    const savedV2 = localStorage.getItem('nu_app_monthly_outings_budget_v2');
    if (savedV2 !== null) return parseFloat(savedV2);
    const savedV1 = localStorage.getItem('nu_app_monthly_outings_budget');
    if (savedV1 !== null) return parseFloat(savedV1);
    const savedOld = localStorage.getItem('monthlyOutingsBudget');
    if (savedOld !== null) return parseFloat(savedOld);
    return 400000; // default 400k, completely editable
  });

  // 2. Credit Card Section: Credit Limit & Itemized Purchases (with migration support to preserve old data)
  const [creditCardLimit, setCreditCardLimit] = useState<number>(() => {
    const savedV2 = localStorage.getItem('nu_app_cc_limit_v2');
    if (savedV2 !== null) return parseFloat(savedV2);
    const savedV1 = localStorage.getItem('nu_app_cc_limit');
    if (savedV1 !== null) return parseFloat(savedV1);
    const savedOld = localStorage.getItem('creditCardLimit');
    if (savedOld !== null) return parseFloat(savedOld);
    return 1000000; // default 1,000,000 COP, completely adjustable
  });

  const [ccCharges, setCcCharges] = useState<CCCharge[]>(() => {
    const savedV2 = localStorage.getItem('nu_app_cc_charges_v2');
    if (savedV2 !== null) return JSON.parse(savedV2);
    const savedV1 = localStorage.getItem('nu_app_cc_charges');
    if (savedV1 !== null) return JSON.parse(savedV1);
    const savedOld = localStorage.getItem('ccCharges');
    if (savedOld !== null) return JSON.parse(savedOld);
    return [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const savedV2 = localStorage.getItem('nu_app_transactions_v2');
    if (savedV2 !== null) return JSON.parse(savedV2);
    const savedV1 = localStorage.getItem('nu_app_transactions');
    if (savedV1 !== null) return JSON.parse(savedV1);
    const savedOld = localStorage.getItem('transactions');
    if (savedOld !== null) return JSON.parse(savedOld);
    return [];
  });

  // 3. Simulated Day of the Month for Interactive Payment Alerts
  const [currentSimDay, setCurrentSimDay] = useState<number>(() => {
    const saved = localStorage.getItem('nu_app_current_sim_day');
    return saved ? parseInt(saved) : new Date().getDate(); // defaults to actual day of month 
  });

  // --- UI Controller States ---
  const [activeTab, setActiveTab ] = useState<'salidas' | 'tarjeta' | 'cupo' | 'historial'>('salidas');
  const [hideBalances, setHideBalances] = useState<boolean>(false);
  const [isEditingBudget, setIsEditingBudget] = useState<boolean>(false);
  const [isEditingLimit, setIsEditingLimit] = useState<boolean>(false);
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [paySuccess, setPaySuccess] = useState<boolean>(false);
  const [payAmountApplied, setPayAmountApplied] = useState<number>(0);
  
  // Temp inputs for adding budget or limit
  const [tempBudgetInput, setTempBudgetInput] = useState<string>('400000');
  const [tempLimitInput, setTempLimitInput] = useState<string>('1000000');

  // New Date Picker inputs
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [ccPurchaseDate, setCcPurchaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // New Outing Expense states
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'debit' | 'credit'>('debit');
  const [expenseInstallments, setExpenseInstallments] = useState<number>(1);
  const [isMarcaAliadaOuting, setIsMarcaAliadaOuting] = useState<boolean>(false);
  const [billingTargetOuting, setBillingTargetOuting] = useState<'current_26' | 'next_26'>(() => {
    return new Date().getDate() <= cutoffDay ? 'current_26' : 'next_26';
  });

  // New Regular CC Purchase states
  const [ccPurchaseAmount, setCcPurchaseAmount] = useState<string>('');
  const [ccPurchaseDesc, setCcPurchaseDesc] = useState<string>('');
  const [ccPurchaseInstallments, setCcPurchaseInstallments] = useState<number>(1);
  const [isMarcaAliadaGeneral, setIsMarcaAliadaGeneral] = useState<boolean>(false);
  const [billingTargetGeneral, setBillingTargetGeneral] = useState<'current_26' | 'next_26'>(() => {
    return new Date().getDate() <= cutoffDay ? 'current_26' : 'next_26';
  });

  // Manual payment state
  const [manualPayAmount, setManualPayAmount] = useState<string>('');

  // Toggles collapsing slider configuration
  const [showCycleDaySlider, setShowCycleDaySlider] = useState<boolean>(false);

  // History state filters
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'salidas' | 'tarjeta' | 'abonos'>('all');

  // --- Sync storage changes ---
  useEffect(() => {
    localStorage.setItem('nu_app_cutoff_day', cutoffDay.toString());
  }, [cutoffDay]);

  useEffect(() => {
    localStorage.setItem('nu_app_payment_due_day', paymentDueDay.toString());
  }, [paymentDueDay]);

  useEffect(() => {
    localStorage.setItem('nu_app_salidas_balance_v2', salidasBalance.toString());
  }, [salidasBalance]);

  useEffect(() => {
    localStorage.setItem('nu_app_monthly_outings_budget_v2', monthlyOutingsBudget.toString());
  }, [monthlyOutingsBudget]);

  useEffect(() => {
    localStorage.setItem('nu_app_cc_limit_v2', creditCardLimit.toString());
  }, [creditCardLimit]);

  useEffect(() => {
    localStorage.setItem('nu_app_cc_charges_v2', JSON.stringify(ccCharges));
  }, [ccCharges]);

  useEffect(() => {
    localStorage.setItem('nu_app_transactions_v2', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('nu_app_current_sim_day', currentSimDay.toString());
  }, [currentSimDay]);

  // --- Formatter Helper ---
  const formatCOP = (val: number) => {
    const rounded = Math.round(val);
    const sign = rounded < 0 ? '-' : '';
    const absVal = Math.abs(rounded);
    return `${sign}$${absVal.toLocaleString('es-CO')}`;
  };

  // --- Dynamic calculations derived from state ---
  const SPANISH_MONTHS = React.useMemo(() => [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ], []);

  const getSpanishMonth = (offsetMonths = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offsetMonths);
    return SPANISH_MONTHS[d.getMonth()];
  };

  const isPurchaseBeforeCutoff = React.useCallback((dateStr: string) => {
    if (!dateStr) return true;
    const parts = dateStr.split('-');
    const d = parseInt(parts[2]) || new Date().getDate();
    return d <= cutoffDay;
  }, [cutoffDay]);

  const getDynamicSuggestionText = React.useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const rawMonth = parseInt(parts[1]) || (new Date().getMonth() + 1);
    const mMonthIndex = rawMonth - 1; // 0-based
    const d = parseInt(parts[2]) || new Date().getDate();

    const isBefore = d <= cutoffDay;
    const purchaseMonthName = SPANISH_MONTHS[mMonthIndex % 12];
    
    if (isBefore) {
      const cutMonthName = SPANISH_MONTHS[mMonthIndex % 12];
      const dueMonthName = SPANISH_MONTHS[(mMonthIndex + 1) % 12];
      return `💡 El consumo del ${d} de ${purchaseMonthName} entra en el corte del ${cutoffDay} de ${cutMonthName}. Tu fecha límite de pago oficial es el ${paymentDueDay} de ${dueMonthName}. Tu abono personal sugerido quedará bloqueado para el 26 de ${cutMonthName} (antes del vencimiento).`;
    } else {
      const cutMonthName = SPANISH_MONTHS[(mMonthIndex + 1) % 12];
      const dueMonthName = SPANISH_MONTHS[(mMonthIndex + 2) % 12];
      const nextAbonoMonthName = SPANISH_MONTHS[(mMonthIndex + 1) % 12];
      return `💡 El consumo del ${d} de ${purchaseMonthName} es después del corte. Entra en el ciclo que corta el ${cutoffDay} de ${cutMonthName}, con vencimiento oficial el ${paymentDueDay} de ${dueMonthName}. Puedes elegir abonar este 26 de ${purchaseMonthName} o el próximo 26 de ${nextAbonoMonthName}.`;
    }
  }, [cutoffDay, paymentDueDay, SPANISH_MONTHS]);

  // Synchronize billing targets with chosen dates & cutoffDay dynamically
  useEffect(() => {
    if (isPurchaseBeforeCutoff(expenseDate)) {
      setBillingTargetOuting('current_26');
    }
  }, [expenseDate, cutoffDay, isPurchaseBeforeCutoff]);

  useEffect(() => {
    if (isPurchaseBeforeCutoff(ccPurchaseDate)) {
      setBillingTargetGeneral('current_26');
    }
  }, [ccPurchaseDate, cutoffDay, isPurchaseBeforeCutoff]);

  const getChargeAbonoLabel = (charge: CCCharge) => {
    if (!charge.date) return 'Abono 26';
    const parts = charge.date.split('-');
    const m = (parseInt(parts[1]) || (new Date().getMonth() + 1)) - 1; // 0-based
    const targetMonth = charge.billingTarget === 'current_26' ? m : m + 1;
    return `Abono 26 de ${SPANISH_MONTHS[targetMonth % 12]}`;
  };

  // Outstanding Debt: Sum of outstanding principal (amortized proportionally)
  const totalCcDebt = ccCharges.reduce((acc, charge) => {
    const unpaidRatio = (charge.installments - charge.paidInstallments) / charge.installments;
    return acc + (charge.amount * unpaidRatio);
  }, 0);

  // Available Limit (Cupo disponible)
  const availableLimit = Math.max(0, creditCardLimit - totalCcDebt);

  // CC Spending Percent
  const ccUsagePercent = creditCardLimit > 0 ? (totalCcDebt / creditCardLimit) * 100 : 0;

  // --- INTELLIGENT CREDIT CARD DATE ARITHMETIC ENGINE ---
  // Calculates the official due date of each individual installment k (1-indexed) for the BANK
  const getInstallmentDueDate = React.useCallback((
    purchaseDateStr: string,
    installmentIndex1Based: number
  ) => {
    const parts = purchaseDateStr.split('-');
    // Support safe parsing of dates
    const y = parseInt(parts[0]) || new Date().getFullYear();
    const m = (parseInt(parts[1]) || (new Date().getMonth() + 1)) - 1; // 0-based
    const d = parseInt(parts[2]) || new Date().getDate();

    let cutoffMonth = m;
    let cutoffYear = y;

    if (d > cutoffDay) {
      // Passes current cut-off, falls in next month's cut-off cycle
      cutoffMonth = m + 1;
    }

    // Since the cycle cuts off in cutoffMonth (on cutoffDay), the bank's 1st installment (k=1)
    // is due on the paymentDueDay of the following month (cutoffMonth + 1)
    const targetMonth = (cutoffMonth + 1) + (installmentIndex1Based - 1);
    return new Date(cutoffYear, targetMonth, paymentDueDay);
  }, [cutoffDay, paymentDueDay]);

  // Construct a simulated Today Date using currentSimDay
  const simTodayDate = React.useMemo(() => {
    const d = new Date();
    // Handle days exceeding the month's maximum length gracefully
    const maxDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(currentSimDay, maxDays);
    d.setDate(targetDay);
    return d;
  }, [currentSimDay]);

  // Next Payment Due Date of the Credit Card
  const nextPaymentDueDate = React.useMemo(() => {
    const y = simTodayDate.getFullYear();
    const m = simTodayDate.getMonth();
    const d = simTodayDate.getDate();

    // If we haven't passed the payment due day of the current month yet, that's the next deadline.
    if (d <= paymentDueDay) {
      return new Date(y, m, paymentDueDay);
    } else {
      // Otherwise, the next deadline is the payment due day of the next month.
      return new Date(y, m + 1, paymentDueDay);
    }
  }, [simTodayDate, paymentDueDay]);

  // Sum of due installments across all charges up to nextPaymentDueDate
  const activeInstallmentsTotal = React.useMemo(() => {
    return ccCharges.reduce((acc, charge) => {
      let dueCount = 0;
      for (let k = 1; k <= charge.installments; k++) {
        const iDueDate = getInstallmentDueDate(charge.date, k);
        if (iDueDate <= nextPaymentDueDate) {
          dueCount++;
        }
      }
      const unpaidDueCount = Math.max(0, dueCount - charge.paidInstallments);
      return acc + (unpaidDueCount * charge.monthlyPayment);
    }, 0);
  }, [ccCharges, nextPaymentDueDate, getInstallmentDueDate]);

  // Consolidated simulated monthly payment = Installments sum + Cuota de manejo (if there's any active debt due)
  const estimatedMonthlyMinimumPayment = activeInstallmentsTotal > 0 
    ? activeInstallmentsTotal + CC_CUOTA_MANEJO 
    : 0;

  // --- Amortization formula calculation (French system / Marca Aliada) ---
  const calculateFrenchInstallment = (principal: number, installments: number, isMarcaAliada = false) => {
    if (installments === 1 || isMarcaAliada) {
      return principal / installments; // 0% interest for 1 installment or special partner brand selection (Marca Aliada)
    }
    const rate = CC_MONTHLY_INTEREST_RATE;
    return principal * (rate * Math.pow(1 + rate, installments)) / (Math.pow(1 + rate, installments) - 1);
  };

  // --- Action Handler Functions ---

  // 1. Inyectar presupuesto mensual para Salidas
  const handleInjectMonthlyBudget = () => {
    setSalidasBalance(prev => prev + monthlyOutingsBudget);

    const newTx: Transaction = {
      id: 'inj-' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      description: `Aporte mensual de presupuesto para Salidas 🌸`,
      amount: monthlyOutingsBudget,
      type: 'income',
      toPocketId: 'salidas_pareja'
    };
    setTransactions(prev => [newTx, ...prev]);
    alert(`¡Presupuesto asignado! Se agregaron ${formatCOP(monthlyOutingsBudget)} a la cajita de Salidas.`);
  };

  // Save budget configuration edits
  const handleSaveBudgetConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempBudgetInput);
    if (!isNaN(val) && val > 0) {
      setMonthlyOutingsBudget(val);
      setIsEditingBudget(false);
      alert(`Presupuesto predeterminado ajustado a ${formatCOP(val)}.`);
    } else {
      alert('Ingresa un presupuesto válido mayor a $0.');
    }
  };

  // Save credit limit edits
  const handleSaveLimitConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempLimitInput);
    if (!isNaN(val) && val >= 0) {
      setCreditCardLimit(val);
      setIsEditingLimit(false);
      alert(`Cupo total de la tarjeta ajustado a ${formatCOP(val)}.`);
    } else {
      alert('Ingresa un cupo de crédito válido.');
    }
  };

  // 2. Registrar Gasto de Salida (Con opción Débito ó Crédito)
  const handleRegisterOutingExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Ingresa un valor válido para el gasto de salida.');
      return;
    }

    const descriptionText = expenseDesc.trim() || 'Salida en pareja 👩‍❤️‍👨';
    
    if (paymentMethod === 'debit') {
      // Flow 1: DEBIT spend
      // Directly deducts from outings balance (can go negative)
      setSalidasBalance(prev => prev - amountNum);

      const newTx: Transaction = {
        id: 'out-deb-' + Math.random().toString(36).substr(2, 9),
        date: expenseDate,
        description: `[DÉBITO] ${descriptionText}`,
        amount: -amountNum,
        type: 'expense',
        fromPocketId: 'salidas_pareja'
      };
      setTransactions(prev => [newTx, ...prev]);
      alert(`¡Gasto registrado en débito! Se descontaron ${formatCOP(amountNum)} del saldo de salidas.`);
    } else {
      // Flow 2: CREDIT spend
      // 1. Checks if available credit limit is enough
      if (availableLimit < amountNum) {
        const confirmOverlimit = window.confirm(
          `¡Atención! No cuentas con suficiente cupo disponible en la Tarjeta para este gasto (${formatCOP(availableLimit)} libre).\n` +
          `¿Deseas forzar este gasto y sobregirar el cupo de la tarjeta de todas formas?`
        );
        if (!confirmOverlimit) return;
      }

      // 2. Deducts from outings balance (user will pay off this credit spend from outings pocket)
      setSalidasBalance(prev => prev - amountNum);

      // 3. Calculates French installment value (27.75% E.A. or 0% if Marca Aliada)
      const computedInstallment = calculateFrenchInstallment(amountNum, expenseInstallments, isMarcaAliadaOuting);

      // 5. Append charge to credit card charges
      const newCharge: CCCharge = {
        id: 'cc-' + Math.random().toString(36).substr(2, 9),
        date: expenseDate,
        description: `[Salida] ${descriptionText}`,
        amount: amountNum,
        installments: expenseInstallments,
        paidInstallments: 0,
        category: 'salida',
        monthlyPayment: computedInstallment,
        isMarcaAliada: isMarcaAliadaOuting,
        billingTarget: billingTargetOuting
      };

      setCcCharges(prev => [newCharge, ...prev]);

      const aliadaLabel = isMarcaAliadaOuting ? ' [M. Aliada 0% Int]' : '';
      const targetLabel = billingTargetOuting === 'current_26' 
        ? ` (Pagar el ${paymentDueDay} de ${getSpanishMonth(0)})` 
        : ` (Pagar el ${paymentDueDay} de ${getSpanishMonth(1)})`;

      const newTx: Transaction = {
        id: 'out-cred-' + Math.random().toString(36).substr(2, 9),
        date: expenseDate,
        description: `[CRÉDITO - ${expenseInstallments} cuotas] ${descriptionText}${aliadaLabel}${targetLabel}`,
        amount: -amountNum,
        type: 'credit_card_payment',
        fromPocketId: 'salidas_pareja',
        toPocketId: 'tarjeta_credito'
      };
      setTransactions(prev => [newTx, ...prev]);
      alert(`¡Gasto en Pareja Registrado con Tarjeta! Se descontaron ${formatCOP(amountNum)} de Salidas. Nueva compra diferida agregada a la Tarjeta.`);
    }

    // Reset fields
    setExpenseAmount('');
    setExpenseDesc('');
    setExpenseInstallments(1);
    setIsMarcaAliadaOuting(false);
    setExpenseDate(new Date().toISOString().split('T')[0]);
    // Set target billing according to current cutoff
    setBillingTargetOuting(new Date().getDate() <= cutoffDay ? 'current_26' : 'next_26');
  };

  // 3. Registrar Compra General de Tarjeta (Fuera del presupuesto de salidas)
  const handleRegisterGeneralCCPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(ccPurchaseAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Ingresa un valor válido para la compra.');
      return;
    }

    if (availableLimit < amountNum) {
      const confirmSpend = window.confirm(
        `Tu cupo libre actual es de ${formatCOP(availableLimit)}. Registrar este consumo de ${formatCOP(amountNum)} sobregirará tu límite.\n` +
        `¿Deseas continuar de todas formas?`
      );
      if (!confirmSpend) return;
    }

    const descriptionText = ccPurchaseDesc.trim() || 'Gasto General Tarjeta';
    const computedMonthlyPayment = calculateFrenchInstallment(amountNum, ccPurchaseInstallments, isMarcaAliadaGeneral);

    const newCharge: CCCharge = {
      id: 'cc-gen-' + Math.random().toString(36).substr(2, 9),
      date: ccPurchaseDate,
      description: descriptionText,
      amount: amountNum,
      installments: ccPurchaseInstallments,
      paidInstallments: 0,
      category: 'general',
      monthlyPayment: computedMonthlyPayment,
      isMarcaAliada: isMarcaAliadaGeneral,
      billingTarget: billingTargetGeneral
    };

    setCcCharges(prev => [newCharge, ...prev]);

    const aliadaLabel = isMarcaAliadaGeneral ? ' [M. Aliada 0% Int]' : '';
    const targetLabel = billingTargetGeneral === 'current_26' 
      ? ` (Pagar el ${paymentDueDay} de ${getSpanishMonth(0)})` 
      : ` (Pagar el ${paymentDueDay} de ${getSpanishMonth(1)})`;

    const newTx: Transaction = {
      id: 'tx-ccg-' + Math.random().toString(36).substr(2, 9),
      date: ccPurchaseDate,
      description: `[Compra General CC - ${ccPurchaseInstallments}M] ${descriptionText}${aliadaLabel}${targetLabel}`,
      amount: -amountNum,
      type: 'credit_card_payment',
      toPocketId: 'tarjeta_credito'
    };

    setTransactions(prev => [newTx, ...prev]);
    setCcPurchaseAmount('');
    setCcPurchaseDesc('');
    setCcPurchaseInstallments(1);
    setIsMarcaAliadaGeneral(false);
    setCcPurchaseDate(new Date().toISOString().split('T')[0]);
    setBillingTargetGeneral(new Date().getDate() <= cutoffDay ? 'current_26' : 'next_26');
    alert(`Compra general agregada exitosamente. Se redujo tu cupo disponible en ${formatCOP(amountNum)}.`);
  };



  // 5. Registrar Pago/Abono Manual Extraordinario (Aumenta cupo)
  const handleManualAbono = (e: React.FormEvent) => {
    e.preventDefault();
    const payNum = parseFloat(manualPayAmount);
    if (!payNum || payNum <= 0) {
      alert('Ingresa una cantidad de abono válida.');
      return;
    }

    if (ccCharges.length === 0) {
      alert('No tienes consumos activos para abonar.');
      return;
    }

    let remainingAbono = payNum;
    const updatedCharges = ccCharges.map(charge => {
      if (remainingAbono <= 0) return charge;
      const outstanding = charge.amount * ((charge.installments - charge.paidInstallments) / charge.installments);
      
      if (remainingAbono >= outstanding) {
        remainingAbono -= outstanding;
        return { ...charge, paidInstallments: charge.installments };
      } else {
        // Deduct proportionally
        const fractionToPay = remainingAbono / charge.amount;
        const equivalentInstallments = Math.max(1, Math.round(fractionToPay * charge.installments));
        remainingAbono = 0;
        return {
          ...charge,
          paidInstallments: Math.min(charge.installments, charge.paidInstallments + equivalentInstallments)
        };
      }
    }).filter(c => c.paidInstallments < c.installments);

    setCcCharges(updatedCharges);

    const newTx: Transaction = {
      id: 'cc-pay-man-' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      description: `Abono Manual Extraordinario a Cupo Nu`,
      amount: payNum,
      type: 'transfer',
      fromPocketId: 'efectivo',
      toPocketId: 'tarjeta_credito'
    };
    setTransactions(prev => [newTx, ...prev]);

    setPayAmountApplied(payNum);
    setPaySuccess(true);
    setIsPaying(false);
    setManualPayAmount('');
  };

  // --- SEGURIDAD DE DATOS (IMPORTAR & EXPORTAR RESPALDO LOCAL) ---
  const handleExportBackup = () => {
    const backupData = {
      cutoffDay,
      paymentDueDay,
      salidasBalance,
      monthlyOutingsBudget,
      creditCardLimit,
      ccCharges,
      transactions,
      currentSimDay
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NuFinanzas_Respaldo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawResult = event.target?.result;
        if (typeof rawResult !== 'string') return;
        const data = JSON.parse(rawResult);
        
        let importedCount = 0;
        if (typeof data.cutoffDay === 'number') { setCutoffDay(data.cutoffDay); importedCount++; }
        if (typeof data.paymentDueDay === 'number') { setPaymentDueDay(data.paymentDueDay); importedCount++; }
        if (typeof data.salidasBalance === 'number') { setSalidasBalance(data.salidasBalance); importedCount++; }
        if (typeof data.monthlyOutingsBudget === 'number') { setMonthlyOutingsBudget(data.monthlyOutingsBudget); importedCount++; }
        if (typeof data.creditCardLimit === 'number') { setCreditCardLimit(data.creditCardLimit); importedCount++; }
        if (Array.isArray(data.ccCharges)) { setCcCharges(data.ccCharges); importedCount++; }
        if (Array.isArray(data.transactions)) { setTransactions(data.transactions); importedCount++; }
        if (typeof data.currentSimDay === 'number') { setCurrentSimDay(data.currentSimDay); importedCount++; }

        if (importedCount > 0) {
          alert('¡Respaldo importado con éxito! 🎉 Se han recuperado tus deudas, presupuestos y configuraciones de forma limpia.');
        } else {
          alert('El archivo cargado no posee un formato de respaldo válido para esta app.');
        }
      } catch (err) {
        alert('Ocurrió un error al procesar el archivo de respaldo: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 6. Eliminar Cargo Individual de la Tarjeta (Fácil corrección)
  const handleDeleteIndividualCharge = (chargeId: string) => {
    const charge = ccCharges.find(c => c.id === chargeId);
    if (!charge) return;

    const confirmDel = window.confirm(`¿Seguro que deseas eliminar el registro de este consumo por ${formatCOP(charge.amount)}?\n\nEsto liberará el cupo de la tarjeta de inmediato sin registrar pagos reales.`);
    if (!confirmDel) return;

    setCcCharges(ccCharges.filter(c => c.id !== chargeId));
    alert('Consumo cancelado y removido de la tarjeta.');
  };

  // 6b. Eliminar Transacción del Historial de logs
  const handleClearIndividualTransaction = (txId: string, desc: string) => {
    const confirmDel = window.confirm(`¿Seguro que deseas eliminar esta transacción del historial?\n\n"${desc}"\n\n*Nota: Esto limpia el log del historial pero no revierte los saldos de tus bolsillos.`);
    if (!confirmDel) return;

    setTransactions(prev => prev.filter(t => t.id !== txId));
  };

  // 7. Simular paso de mes (Pagar cuotas mensuales ordinarias)
  const handleTriggerMonthlyClosing = () => {
    if (ccCharges.length === 0) {
      alert('No tienes cargos activos para amortizar este mes.');
      return;
    }

    if (estimatedMonthlyMinimumPayment <= 0) {
      alert('La cuota mínima exigible para este corte es de $0. No tienes cuotas cortadas que pagar en este momento.');
      return;
    }

    const confirmSim = window.confirm(
      `¿Deseas registrar el pago de la cuota mensual de la tarjeta por ${formatCOP(estimatedMonthlyMinimumPayment)}?\n\n` +
      `Esto amortizará únicamente las cuotas que ya han cortado (exigibles para el ciclo que vence el ${nextPaymentDueDate.getDate()} de ${SPANISH_MONTHS[nextPaymentDueDate.getMonth()]}) junto con la cuota de manejo mensual ($12K). Las compras que no han cortado se pagarán en el próximo ciclo.`
    );
    if (!confirmSim) return;

    const updated = ccCharges.map(charge => {
      // Find how many installments are due up to the payment next due date
      let dueCount = 0;
      for (let k = 1; k <= charge.installments; k++) {
        if (getInstallmentDueDate(charge.date, k) <= nextPaymentDueDate) {
          dueCount++;
        }
      }
      // Calculate how many are due but not yet paid
      const unpaidDueCount = Math.max(0, dueCount - charge.paidInstallments);
      if (unpaidDueCount > 0) {
        return {
          ...charge,
          paidInstallments: Math.min(charge.installments, charge.paidInstallments + unpaidDueCount)
        };
      }
      return charge;
    }).filter(c => c.paidInstallments < c.installments);

    setCcCharges(updated);

    const newTx: Transaction = {
      id: 'nu-closed-' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      description: `Cierre del Mes Nu (Cuota ordinaria de ${formatCOP(estimatedMonthlyMinimumPayment)} descontada de deuda)`,
      amount: -estimatedMonthlyMinimumPayment,
      type: 'transfer',
      fromPocketId: 'tarjeta_credito'
    };
    setTransactions(prev => [newTx, ...prev]);
    alert('¡Cierre de mes y amortización simulados con éxito! Se avanzaron las cuotas que ya estaban listas para cobro.');
  };

  // Reset App data completely
  const handleResetAllData = () => {
    const confirmDouble = window.confirm(
      '⚠️ ¿Estás completamente seguro de vaciar la aplicación?\n\n' +
      'Esto restablecerá tu saldo de salidas a $400.000, vaciará las deudas de tu tarjeta, restablecerá tu cupo a $1.000.000 y eliminará todo el historial.'
    );
    if (!confirmDouble) return;

    setSalidasBalance(400000);
    setMonthlyOutingsBudget(400000);
    setCreditCardLimit(1000000);
    setCcCharges([]);
    setTransactions([]);
    setCurrentSimDay(new Date().getDate());
    
    localStorage.removeItem('nu_app_salidas_balance_v2');
    localStorage.removeItem('nu_app_monthly_outings_budget_v2');
    localStorage.removeItem('nu_app_cc_limit_v2');
    localStorage.removeItem('nu_app_cc_charges_v2');
    localStorage.removeItem('nu_app_reserva_balance_v2');
    localStorage.removeItem('nu_app_transactions_v2');
    localStorage.removeItem('nu_app_current_sim_day');
    alert('¡Toda la información ha sido restablecida!');
  };

  // --- Date Reminder Alerts (Dynamic Content based on simulation Day) ---
  const renderDateReminders = () => {
    const list: Array<{ day: number; desc: string; title: string; type: 'urgent' | 'warning' | 'info' }> = [
      { day: Math.max(1, paymentDueDay - 1), title: 'Día de Pago Ordinario', desc: 'Sueles pagar la tarjeta hoy usando tus ahorros resguardados.', type: 'urgent' },
      { day: paymentDueDay, title: 'Fecha Límite de Pago', desc: 'Último chance para pagar el extracto del mes al banco.', type: 'urgent' },
      { day: Math.max(1, cutoffDay - 2), title: 'Abono Planificado', desc: 'Fecha configurada para efectuar aportaciones preventivas a tus deudas diferidas.', type: 'warning' },
      { day: cutoffDay, title: 'Fecha de Corte Nu', desc: 'Se consolida el extracto y se calculan tus cuotas mensuales fijas.', type: 'info' }
    ];

    // Find if today matches any direct date or nearby
    return (
      <div className="space-y-2 mt-2" id="timeline-alerts">
        {list.map(rem => {
          const isToday = currentSimDay === rem.day;
          let isNear = false;
          let daysTo = 0;
          if (currentSimDay < rem.day && (rem.day - currentSimDay) <= 3) {
            isNear = true;
            daysTo = rem.day - currentSimDay;
          }

          if (!isToday && !isNear) return null;

          return (
            <div
              key={rem.day}
              className={`p-3 rounded-xl border flex items-center gap-3 text-xs shadow-md transition-all ${
                isToday 
                  ? 'bg-amber-950/45 border-amber-600 text-amber-100 ring-2 ring-amber-500/30' 
                  : 'bg-indigo-950/20 border-indigo-950 text-purple-200'
              }`}
              id={`reminder-day-${rem.day}`}
            >
              <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 ${
                isToday ? 'bg-amber-600 text-white font-extrabold shadow-lg animate-pulse' : 'bg-indigo-950 border border-purple-900/40 text-purple-300'
              }`}>
                {rem.day}
              </div>
              <div className="flex-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#b149f2]" />
                  {rem.title} {isToday ? '• ¡ES HOY!' : `• en ${daysTo} ${daysTo === 1 ? 'día' : 'días'}`}
                </p>
                <p className="text-[10px] text-zinc-300 mt-0.5 leading-relaxed">{rem.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#06000a] text-neutral-100 flex justify-center overflow-hidden md:p-6" id="app-container">
      {/* Mobile-First Frame Viewport */}
      <div className="w-full max-w-md bg-[#0d0114] h-full md:h-[840px] md:max-h-[840px] md:rounded-[40px] md:border md:border-purple-950/40 shadow-[0_0_50px_rgba(130,10,209,0.15)] relative overflow-hidden flex flex-col" id="mobile-viewport">
        
        {/* HEADER BAR (Minimal and elegant - Nu branding) */}
        <header className="px-6 py-4.5 bg-[#0d0114]/90 backdrop-blur-md border-b border-purple-950/30 flex items-center justify-between sticky top-0 z-40" id="main-header">
          <div className="flex items-center gap-2.5" id="logo-container">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#820ad1] to-[#b149f2] flex items-center justify-center shadow-[0_4px_12px_rgba(130,10,209,0.3)]" id="avatar-container">
              <span className="font-extrabold text-white text-sm tracking-wide">Nu</span>
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1" id="app-title">
                Mis Gastos Pareja <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              </h1>
              <p className="text-[10px] text-purple-300/60 font-mono" id="app-subtitle">Tarjeta, Ahorro & Agenda</p>
            </div>
          </div>

          <div className="flex items-center gap-2" id="header-actions">
            <button
              onClick={() => setHideBalances(!hideBalances)}
              className="p-2 text-purple-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title={hideBalances ? "Ver balances" : "Ocultar balances"}
              id="btn-eye-toggle"
            >
              {hideBalances ? <EyeOff className="w-4.5 h-4.5 text-[#b149f2]" /> : <Eye className="w-4.5 h-4.5 text-purple-300" />}
            </button>
            <button
              onClick={handleResetAllData}
              title="Vacíar datos de la App"
              className="p-2 text-purple-400/50 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
              id="btn-app-vaceadora"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* CONTAINER SCROLL AREA */}
        <main className="flex-1 overflow-y-auto px-5 py-4 pb-28 space-y-4" id="main-content">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: SALIDAS SECTOR */}
            {activeTab === 'salidas' && (
              <motion.div
                key="salidas-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
                id="tab-salidas"
              >
                {/* SALIDAS HERO CARD */}
                <div className="p-5.5 rounded-3xl bg-gradient-to-br from-[#2f044e] via-[#16022b] to-[#0a000f] border border-purple-900/30 relative overflow-hidden shadow-xl" id="salidas-hero-card">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#820ad1]/10 rounded-full blur-2xl -z-10"></div>
                  
                  <div className="flex items-center justify-between" id="salidas-hero-header">
                    <span className="text-[10px] font-bold text-pink-300 tracking-wider uppercase flex items-center gap-1">
                      <Heart className="w-3 h-3 text-pink-400 fill-pink-400" /> Fund de Salidas
                    </span>
                    <button 
                      onClick={() => {
                        setTempBudgetInput(monthlyOutingsBudget.toString());
                        setIsEditingBudget(!isEditingBudget);
                      }}
                      className="text-purple-300 hover:text-white text-[10px] font-bold flex items-center gap-0.5"
                    >
                      Ajustar Presupuesto
                    </button>
                  </div>

                  {/* Salidas main balance */}
                  <div className="mt-2.5" id="salidas-balance-view">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Saldo Disponible en Débito</p>
                    <p className={`text-3xl font-extrabold tracking-tight mt-1 font-mono ${salidasBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {hideBalances ? '•••••••' : formatCOP(salidasBalance)}
                    </p>
                  </div>

                  {/* EDIT PROMPT IF OPEN */}
                  {isEditingBudget && (
                    <motion.form 
                      onSubmit={handleSaveBudgetConfig}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 p-3 bg-black/40 border border-purple-950/40 rounded-xl space-y-2 text-xs"
                    >
                      <label className="text-[10px] font-bold text-purple-200">Definir Presupuesto Mensual por Defecto (COP):</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={tempBudgetInput}
                          onChange={(e) => setTempBudgetInput(e.target.value)}
                          className="bg-[#0a000f] border border-purple-900/50 p-1.5 rounded-lg flex-1 text-xs text-white font-mono"
                          placeholder="Ej. 400000"
                        />
                        <button type="submit" className="bg-[#820ad1] text-white px-3 rounded-lg text-xs font-bold">
                          Guardar
                        </button>
                      </div>
                    </motion.form>
                  )}

                  <div className="flex items-center justify-between mt-4.5 pt-4.5 border-t border-purple-950/20" id="salidas-card-footer">
                    <div>
                      <p className="text-[9px] text-zinc-400 font-mono">Monto Mensual Predeterminado</p>
                      <p className="text-xs font-bold text-white font-mono">{formatCOP(monthlyOutingsBudget)}</p>
                    </div>
                    <button
                      onClick={handleInjectMonthlyBudget}
                      className="px-3 py-1.5 bg-[#820ad1] hover:bg-[#9712ef] text-[11px] font-bold text-white rounded-xl transition duration-150 shadow-md flex items-center gap-1"
                      id="btn-inject-outings"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Inyectar Presupuesto
                    </button>
                  </div>
                </div>

                {/* FORM PANEL: REGISTRAR UNA CITA DE PAREJA */}
                <div className="p-5 rounded-2xl bg-neutral-900/40 border border-purple-950/20 space-y-3.5 shadow-sm" id="form-outing-expense">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-pink-400" />
                      Registrar Salida con Pareja
                    </span>
                    <span className="text-[8px] bg-purple-950/50 text-pink-300 px-2.5 py-0.5 rounded-md font-bold uppercase font-mono">
                      Descuenta automático
                    </span>
                  </div>

                  <form onSubmit={handleRegisterOutingExpense} className="space-y-4.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9.5px] uppercase font-bold text-purple-350">Valor del Pago (COP)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-[10px] text-zinc-500 font-mono">$</span>
                          <input
                            type="number"
                            required
                            placeholder="Ej. 150000"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            className="w-full bg-black/40 border border-purple-950/40 p-2.5 pl-6.5 text-xs rounded-xl text-white font-mono focus:outline-none focus:border-[#820ad1] transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9.5px] uppercase font-bold text-purple-355">¿Qué hicieron? (Detalle)</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Hamburguesa + Cine"
                          value={expenseDesc}
                          onChange={(e) => setExpenseDesc(e.target.value)}
                          className="w-full bg-black/40 border border-purple-950/40 p-2.5 text-xs rounded-xl text-white focus:outline-none focus:border-[#820ad1] transition-all"
                        />
                      </div>
                    </div>

                    {/* TWO WAY METHOD TOGGLE BUTTONS */}
                    <div className="space-y-1.5">
                      <label className="text-[9.5px] uppercase font-bold text-purple-350">Método de Pago Empleado</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('debit')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                            paymentMethod === 'debit'
                              ? 'bg-purple-950/40 border-[#b149f2] text-white shadow-sm shadow-[#820ad1]/20'
                              : 'bg-black/20 border-purple-950/30 text-purple-300/60 hover:text-white'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5 text-pink-400" />
                          Débito / Efectivo
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('credit')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                            paymentMethod === 'credit'
                              ? 'bg-purple-900/50 border-[#820ad1] text-white shadow-sm shadow-[#820ad1]/20'
                              : 'bg-black/20 border-purple-950/30 text-purple-300/60 hover:text-white'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                          Tarjeta CC (Nu)
                        </button>
                      </div>
                    </div>

                    {/* IF PAID WITH CREDIT, CHOOSE INSTALLMENTS & SMART OPTIONS */}
                    {paymentMethod === 'credit' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-[#11011c] border border-purple-950/60 rounded-2xl space-y-4 text-xs shadow-inner"
                      >
                        {/* Installments count Section */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-purple-300">Cuotas (Diferido):</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                max="72"
                                value={expenseInstallments}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value);
                                  if (!isNaN(v) && v >= 1 && v <= 72) {
                                    setExpenseInstallments(v);
                                  }
                                }}
                                className="w-12 bg-black/60 border border-purple-900/40 p-1 rounded text-center text-xs font-bold text-white font-mono"
                              />
                              <span className="text-[10px] text-zinc-400 font-mono">Meses</span>
                            </div>
                          </div>

                          {/* Beautiful Interactive Range Slider (1 - 72) */}
                          <input
                            type="range"
                            min="1"
                            max="72"
                            value={expenseInstallments}
                            onChange={(e) => setExpenseInstallments(parseInt(e.target.value))}
                            className="w-full h-1 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-[#b149f2]"
                          />

                          {/* Elegant Instant presets */}
                          <div className="grid grid-cols-6 gap-1 font-mono text-[8.5px]">
                            {[1, 3, 12, 24, 48, 72].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setExpenseInstallments(num)}
                                className={`py-1 rounded-md transition-colors ${
                                  expenseInstallments === num
                                    ? 'bg-[#820ad1] text-white font-bold'
                                    : 'bg-black/30 border border-purple-950/40 text-purple-300 hover:text-white'
                                }`}
                              >
                                {num}M
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Marca Aliada Toggle Button */}
                        <div className="p-3 rounded-xl bg-purple-950/15 border border-purple-900/20 flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <span className="text-[10.5px] font-bold text-pink-300 flex items-center gap-1">
                              🎗️ Marca Aliada Nu
                            </span>
                            <p className="text-[9px] text-zinc-400 leading-normal mt-0.5">
                              ¿La compra se realizó en un comercio aliado? No generará intereses.
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setIsMarcaAliadaOuting(!isMarcaAliadaOuting)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border shrink-0 ${
                              isMarcaAliadaOuting
                                ? 'bg-pink-905 border-pink-500 text-pink-200 bg-pink-950/50 shadow-sm'
                                : 'bg-black/40 border-purple-950/40 text-purple-300 hover:text-white'
                            }`}
                          >
                            {isMarcaAliadaOuting ? 'SÍ, 0% INT ✨' : 'NO'}
                          </button>
                        </div>

                        {/* Intelligent Billing & Custom Payment cycle chooser */}
                        <div className="space-y-2 border-t border-purple-950/20 pt-3">
                          <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider block">
                            📅 Agenda / Envío inteligente al 26:
                          </span>

                          {/* Mini dynamic explanation text */}
                          <div className="p-2.5 rounded-lg bg-black/40 border border-purple-955/30 text-[9px] text-zinc-350 leading-relaxed space-y-1">
                            <p>
                              {getDynamicSuggestionText(expenseDate)}
                            </p>
                            <p className="text-pink-300/80 italic font-medium font-mono text-[8.5px]">
                              Cuota estim: {expenseInstallments === 1 ? '1 sola cuota sin intereses' : isMarcaAliadaOuting ? `${formatCOP(parseFloat(expenseAmount || '0') / expenseInstallments)} [Ahorro 0% Int]` : `${formatCOP(calculateFrenchInstallment(parseFloat(expenseAmount || '0'), expenseInstallments, isMarcaAliadaOuting))} / mes con intereses`}
                            </p>
                          </div>

                          {/* Custom Override Option */}
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setBillingTargetOuting('current_26')}
                              className={`py-2 px-1 text-[9.5px] rounded-xl font-bold border transition-all flex flex-col items-center justify-center ${
                                billingTargetOuting === 'current_26'
                                  ? 'bg-purple-950/50 border-[#820ad1] text-white'
                                  : 'bg-black/30 border-purple-955/20 text-purple-305/60'
                              }`}
                            >
                              <span>Abonar este 26 ({(() => {
                                const parts = expenseDate.split('-');
                                const m = (parseInt(parts[1]) || (new Date().getMonth() + 1)) - 1;
                                return SPANISH_MONTHS[m % 12];
                              })()})</span>
                              <span className="text-[8px] text-purple-400 font-normal">Sugerido</span>
                            </button>

                            <button
                              type="button"
                              disabled={isPurchaseBeforeCutoff(expenseDate)}
                              onClick={() => setBillingTargetOuting('next_26')}
                              className={`py-2 px-1 text-[9.5px] rounded-xl font-bold border transition-all flex flex-col items-center justify-center ${
                                isPurchaseBeforeCutoff(expenseDate)
                                  ? 'opacity-40 bg-zinc-950/20 border-zinc-900/30 text-zinc-500 cursor-not-allowed'
                                  : billingTargetOuting === 'next_26'
                                  ? 'bg-purple-950/50 border-[#820ad1] text-white'
                                  : 'bg-black/30 border-purple-955/20 text-purple-305/60'
                              }`}
                              title={isPurchaseBeforeCutoff(expenseDate) ? "No elegible porque el consumo vence el próximo 4" : "Abonar en el periodo de abono posterior"}
                            >
                              <span>Abonar próximo 26 ({(() => {
                                const parts = expenseDate.split('-');
                                const m = (parseInt(parts[1]) || (new Date().getMonth() + 1));
                                return SPANISH_MONTHS[m % 12];
                              })()})</span>
                              <span className="text-[8px] font-normal">
                                {isPurchaseBeforeCutoff(expenseDate) ? '🚫 Vence el 4' : 'Planificado'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-850 text-xs font-bold text-white rounded-xl transition duration-150 shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Registrar Nueva Cita
                    </button>
                  </form>
                </div>

                {/* HISTORIAL RECIENTE SECTION */}
                <div className="space-y-2 border-t border-purple-950/20 pt-4" id="mini-history">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Historial Reciente</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('historial')}
                      className="text-[9.5px] font-bold text-[#bc8acf] hover:text-white transition-colors flex items-center gap-0.5"
                    >
                      Ver Historial Completo →
                    </button>
                  </div>
                  {transactions.length === 0 ? (
                    <div className="p-4 text-center border border-purple-950/20 rounded-xl bg-neutral-900/10">
                      <p className="text-[10px] text-zinc-500 font-sans">Aún no hay transacciones para este periodo mensual.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {transactions.slice(0, 2).map(tx => {
                        const isExpense = tx.amount < 0;
                        return (
                          <div key={tx.id} className="p-2.5 bg-neutral-900/20 border border-purple-950/10 rounded-xl flex items-center justify-between text-xs hover:border-[#820ad1]/10 transition-all">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-1 rounded-lg shrink-0 ${isExpense ? 'bg-rose-950/20 text-rose-400' : 'bg-emerald-950/20 text-emerald-400'}`}>
                                {isExpense ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-zinc-350 line-clamp-1 leading-tight truncate">{tx.description}</p>
                              </div>
                            </div>
                            <span className={`font-bold font-mono text-[10.5px] ml-2 shrink-0 ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isExpense ? '' : '+'}{formatCOP(tx.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* TAB 2: TARJETA DE CRÉDITO SECTOR */}
            {activeTab === 'tarjeta' && (
              <motion.div
                key="tarjeta-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
                id="tab-tarjeta"
              >
                
                {/* TARJETA CREDIT HERO BOARD */}
                <div className="p-5.5 rounded-3xl bg-neutral-900/50 border border-purple-950/50 space-y-3 shadow-md" id="cc-hero-card">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-[#b149f2]" /> Estado Tarjeta Nu (27.75% EA)
                    </span>
                    <span className="text-[9px] text-[#bc8acf] font-bold bg-[#820ad1]/15 px-2 py-0.5 rounded border border-purple-900/30">
                      Manejo: {formatCOP(CC_CUOTA_MANEJO)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Pago Total Deuda CC</p>
                      <p className="text-xl font-extrabold text-white font-mono mt-1">
                        {hideBalances ? '•••••••' : formatCOP(totalCcDebt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Cuota Estimada Mes</p>
                      <p className="text-xl font-extrabold text-[#bc8acf] font-mono mt-1">
                        {hideBalances ? '•••••••' : formatCOP(estimatedMonthlyMinimumPayment)}
                      </p>
                      <p className="text-[8.5px] text-zinc-500 mt-0.5 font-sans">*Incluido $12K cuota manejo</p>
                    </div>
                  </div>



                  {/* PROMINENT PAGAR BUTTON */}
                  <button
                    onClick={() => {
                      if (totalCcDebt <= 0) {
                        alert("No tienes consumos o deudas que pagar en tu tarjeta Nu.");
                        return;
                      }
                      setIsPaying(true);
                    }}
                    type="button"
                    className={`w-full py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${
                      totalCcDebt > 0
                        ? 'bg-[#820ad1] text-white hover:bg-[#9712ef] active:scale-[0.98]'
                        : 'bg-zinc-850 border border-zinc-805 text-zinc-500 cursor-not-allowed opacity-50'
                    }`}
                    id="btn-cc-payer-main"
                  >
                    <Wallet className="w-4 h-4" />
                    PAGAR TARJETA
                  </button>
                </div>

                {/* FORM: AGREGAR GASTO GENERAL DIRECTO A LA TARJETA */}
                <div className="p-4.5 rounded-2xl bg-neutral-900/45 border border-purple-950/20 space-y-3" id="cc-purchase-direct">
                  <p className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                    Registrar Compra General (CC Directo)
                  </p>
                  <p className="text-[9.5px] text-zinc-400 leading-normal">
                    Registra cualquier otra compra personal a cuotas que realices en el mes para mantener tu cupo sincronizado y recibir alertas.
                  </p>

                  <form onSubmit={handleRegisterGeneralCCPurchase} className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-purple-300">Monto Compra (COP)</label>
                        <input
                          type="number"
                          required
                          value={ccPurchaseAmount}
                          onChange={(e) => setCcPurchaseAmount(e.target.value)}
                          placeholder="Ej. 300000"
                          className="w-full bg-black/40 border border-purple-950/40 p-2 text-xs rounded-xl text-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-purple-300">Descripción / Establecimiento</label>
                        <input
                          type="text"
                          required
                          value={ccPurchaseDesc}
                          onChange={(e) => setCcPurchaseDesc(e.target.value)}
                          placeholder="Ej. Súper Éxito"
                          className="w-full bg-black/40 border border-purple-950/40 p-2 text-xs rounded-xl text-white"
                        />
                      </div>
                    </div>

                    {/* Custom Installments Selection Range (1 - 72) */}
                    <div className="space-y-2 bg-[#11011c] border border-purple-950/40 p-3 rounded-xl">
                      <div className="flex justify-between items-center text-[10.5px]">
                        <span className="font-bold text-purple-300">Diferir Meses (Cuotas):</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="72"
                            value={ccPurchaseInstallments}
                            onChange={(e) => {
                              const v = parseInt(e.target.value);
                              if (!isNaN(v) && v >= 1 && v <= 72) {
                                setCcPurchaseInstallments(v);
                              }
                            }}
                            className="w-12 bg-black/60 border border-purple-900/40 p-1 rounded text-center text-xs font-bold text-white font-mono"
                          />
                          <span className="text-[10px] text-zinc-400 font-mono">Meses</span>
                        </div>
                      </div>

                      {/* Interactive range slider */}
                      <input
                        type="range"
                        min="1"
                        max="72"
                        value={ccPurchaseInstallments}
                        onChange={(e) => setCcPurchaseInstallments(parseInt(e.target.value))}
                        className="w-full h-1 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-[#b149f2]"
                      />

                      {/* Presets */}
                      <div className="grid grid-cols-6 gap-1 font-mono text-[8px] text-center">
                        {[1, 3, 12, 24, 48, 72].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setCcPurchaseInstallments(n)}
                            className={`py-1 rounded border transition-colors ${
                              ccPurchaseInstallments === n
                                ? 'bg-purple-800 border-transparent text-white font-bold'
                                : 'bg-black/30 border-purple-950/30 text-purple-300 hover:text-white'
                            }`}
                          >
                            {n}M
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Marca Aliada Toggle Button for General Purchase */}
                    <div className="p-3 rounded-xl bg-purple-955/10 border border-purple-900/20 flex items-center justify-between gap-2.5">
                      <div className="flex-1 text-[10px]">
                        <span className="font-bold text-pink-305 flex items-center gap-1">
                          🎗️ Marca Aliada Partner
                        </span>
                        <p className="text-[8.5px] text-zinc-400 leading-tight mt-0.5">
                          ¿Esta compra en particular califica para 0% de interés de Marca Aliada?
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setIsMarcaAliadaGeneral(!isMarcaAliadaGeneral)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border shrink-0 ${
                          isMarcaAliadaGeneral
                            ? 'bg-pink-905 border-pink-500 text-pink-200 bg-pink-950/50 shadow-sm'
                            : 'bg-black/40 border-purple-950/40 text-purple-300 hover:text-white'
                        }`}
                      >
                        {isMarcaAliadaGeneral ? 'SÍ, 0% INT ✨' : 'NO'}
                      </button>
                    </div>

                    {/* Custom billing cycle target chooser */}
                    <div className="space-y-2 border-t border-purple-950/25 pt-3">
                      <span className="text-[9.5px] uppercase font-bold text-purple-305 tracking-wider block">
                        📅 Agenda / Envío inteligente al 26:
                      </span>

                      {/* Mini dynamic explanation text */}
                      <div className="p-2 rounded-lg bg-black/40 border border-purple-955/35 text-[8.5px] text-zinc-350 leading-relaxed">
                        <p>
                          {getDynamicSuggestionText(ccPurchaseDate)}
                        </p>
                        <p className="text-[#bc8acf] italic mt-1 font-mono text-[8.5px]">
                          Cuota estim: {ccPurchaseInstallments === 1 ? '1 sola cuota sin intereses' : isMarcaAliadaGeneral ? `${formatCOP(parseFloat(ccPurchaseAmount || '0') / ccPurchaseInstallments)} [Ahorro 0% Int]` : `${formatCOP(calculateFrenchInstallment(parseFloat(ccPurchaseAmount || '0'), ccPurchaseInstallments, isMarcaAliadaGeneral))} / mes con intereses`}
                        </p>
                      </div>

                      {/* Custom Override Option */}
                      <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                        <button
                          type="button"
                          onClick={() => setBillingTargetGeneral('current_26')}
                          className={`py-2 px-1 rounded-xl font-bold border transition-all flex flex-col items-center justify-center ${
                            billingTargetGeneral === 'current_26'
                              ? 'bg-purple-950/50 border-[#820ad1] text-white'
                              : 'bg-black/30 border-purple-955/20 text-purple-305/60'
                          }`}
                        >
                          <span>Abonar este 26 ({(() => {
                            const parts = ccPurchaseDate.split('-');
                            const m = (parseInt(parts[1]) || (new Date().getMonth() + 1)) - 1;
                            return SPANISH_MONTHS[m % 12];
                          })()})</span>
                        </button>

                        <button
                          type="button"
                          disabled={isPurchaseBeforeCutoff(ccPurchaseDate)}
                          onClick={() => setBillingTargetGeneral('next_26')}
                          className={`py-2 px-1 rounded-xl font-bold border transition-all flex flex-col items-center justify-center ${
                            isPurchaseBeforeCutoff(ccPurchaseDate)
                              ? 'opacity-40 bg-zinc-950/20 border-zinc-900/30 text-zinc-500 cursor-not-allowed'
                              : billingTargetGeneral === 'next_26'
                              ? 'bg-purple-950/50 border-[#820ad1] text-white'
                              : 'bg-black/30 border-purple-955/20 text-purple-305/60'
                          }`}
                          title={isPurchaseBeforeCutoff(ccPurchaseDate) ? "No elegible porque el consumo vence el próximo 4" : "Abonar en el periodo de abono posterior"}
                        >
                          <span>Abonar próximo 26 ({(() => {
                            const parts = ccPurchaseDate.split('-');
                            const m = (parseInt(parts[1]) || (new Date().getMonth() + 1));
                            return SPANISH_MONTHS[m % 12];
                          })()})</span>
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-850 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                      Agregar Compra a Tarjeta Nu
                    </button>
                  </form>
                </div>

                {/* VISIBLE ACTIVE CARD CONSUMPTIONS */}
                <div className="space-y-2.5" id="cc-charges-itemized">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Cargos Activos Diferidos ({ccCharges.length})</span>
                    {ccCharges.length > 0 && (
                      <button 
                        onClick={handleTriggerMonthlyClosing}
                        className="text-purple-300 hover:text-pink-300 font-bold text-[9px] px-2 py-0.5 bg-purple-950/20 border border-purple-900/40 rounded flex items-center gap-0.5"
                      >
                        Simular Amortizar Mes
                      </button>
                    )}
                  </div>

                  {ccCharges.length === 0 ? (
                    <div className="p-8 text-center border border-purple-950/15 rounded-2xl bg-[#0a000f]/10" id="no-cc-charges">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto opacity-70 mb-1.5" />
                      <p className="text-[10.5px] text-zinc-500">No tienes deudas activas registradas en tu Tarjeta.</p>
                    </div>
                  ) : (
                    <div className="space-y-2" id="cc-charges-stack">
                      {ccCharges.map(charge => {
                        const unpaidCount = charge.installments - charge.paidInstallments;
                        const individualOutstanding = charge.amount * (unpaidCount / charge.installments);
                        return (
                          <div key={charge.id} className="p-3 bg-[#12021a]/85 border border-purple-950/25 rounded-2xl text-xs flex flex-col gap-1.5">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-bold text-white leading-tight flex items-center gap-1.5 flex-wrap">
                                  {charge.description}
                                  {charge.isMarcaAliada && (
                                    <span className="text-[8.5px] bg-pink-950/45 text-pink-350 px-1.5 py-0.5 rounded-md border border-pink-900/40 font-bold uppercase font-sans shrink-0">
                                      🎗️ Aliada 0%
                                    </span>
                                  )}
                                  {charge.billingTarget && (
                                    <span className="text-[8.5px] bg-purple-950/50 text-[#bc8acf] px-1.5 py-0.5 rounded border border-purple-900/30 font-medium shrink-0">
                                      📅 {getChargeAbonoLabel(charge)}
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[9px] text-[#bc8acf] font-mono mt-1">
                                  {charge.category === 'salida' ? '🌸 Salida Pareja' : '🛡️ Consumo CC'} • Original: {formatCOP(charge.amount)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteIndividualCharge(charge.id)}
                                className="text-zinc-550 hover:text-rose-400 p-1"
                                title="Eliminar consumo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-1.5 border-t border-b border-purple-950/15 text-[10px] text-zinc-350 font-mono">
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-sans">Cuotas pagas</span>
                                <span className="text-white font-extrabold">{charge.paidInstallments}/{charge.installments}M</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-sans">Valor Cuota</span>
                                <span className="text-[#bc8acf] font-bold">
                                  {formatCOP(charge.monthlyPayment)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-sans">Pendiente</span>
                                <span className="text-rose-450 font-bold">{formatCOP(individualOutstanding)}</span>
                              </div>
                            </div>

                            {unpaidCount > 0 && (() => {
                              const nextK = charge.paidInstallments + 1;
                              const dueDate = getInstallmentDueDate(charge.date, nextK);
                              const day = dueDate.getDate();
                              const monthName = SPANISH_MONTHS[dueDate.getMonth()];
                              return (
                                <p className="text-[8.5px] text-zinc-400 font-sans italic flex items-center gap-1 mt-0.5">
                                  <span>🏦 Próxima cuota del banco ({nextK}/{charge.installments}) vence:</span>
                                  <span className="font-bold font-mono text-purple-300 bg-purple-950/30 px-1 py-0.2 rounded border border-purple-900/10 shrink-0">
                                    {day} de {monthName}
                                  </span>
                                </p>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>



              </motion.div>
            )}

            {/* TAB: HISTORIAL SECTOR */}
            {activeTab === 'historial' && (
              <motion.div
                key="historial-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
                id="tab-historial"
              >
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-1.5 text-purple-200">
                    <History className="w-5 h-5 text-[#b149f2]" />
                    Historial de Movimientos
                  </h2>
                  <p className="text-[10px] text-purple-305">Consulta todos tus movimientos: salidas de pareja, gastos diferidos y abonos de tarjeta.</p>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-4 rounded-3xl bg-neutral-900/40 border border-purple-950/30 space-y-3 shadow-md" id="history-controls">
                  {/* Search query input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-purple-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Buscar por descripción..."
                      className="w-full bg-[#0d0114] border border-purple-950/45 py-2 pl-9 pr-4 text-xs rounded-xl text-white font-sans focus:outline-none focus:border-[#820ad1]"
                    />
                  </div>

                  {/* Filter chips (Row) */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1" id="history-filter-scroll">
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'salidas', label: 'Salidas 🌸' },
                      { id: 'tarjeta', label: 'Tarjeta CC 🛡️' },
                      { id: 'abonos', label: 'Abonos 💵' }
                    ].map(chip => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setHistoryFilter(chip.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border shrink-0 whitespace-nowrap ${
                          historyFilter === chip.id
                            ? 'bg-[#820ad1] border-[#9712ef] text-white shadow-md'
                            : 'bg-black/35 border-purple-955/20 text-purple-300 hover:text-white'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transaction list feed */}
                <div className="space-y-2 pb-16" id="history-list-feed">
                  {(() => {
                    const filtered = transactions.filter(tx => {
                      // 1. Filter by search term
                      const matchesSearch = tx.description.toLowerCase().includes(historySearch.toLowerCase());
                      if (!matchesSearch) return false;

                      // 2. Filter by type
                      if (historyFilter === 'all') return true;
                      if (historyFilter === 'salidas') {
                        return tx.description.toUpperCase().includes('SALIDA') || tx.fromPocketId === 'salidas_pareja' || tx.description.toUpperCase().includes('CRÉDITO');
                      }
                      if (historyFilter === 'tarjeta') {
                        return tx.description.toUpperCase().includes('COMPRA GENERAL') || (tx.type === 'credit_card_payment' && tx.fromPocketId !== 'salidas_pareja');
                      }
                      if (historyFilter === 'abonos') {
                        return tx.description.toUpperCase().includes('ABONO') || tx.description.toUpperCase().includes('PAGAR') || tx.type === 'transfer' || tx.description.toUpperCase().includes('RECARGA');
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-10 text-center border border-purple-950/20 rounded-2xl bg-black/10">
                          <p className="text-[11px] text-zinc-500 font-sans">No se encontraron movimientos recomendados.</p>
                        </div>
                      );
                    }

                    return filtered.map(tx => {
                      const isExpense = tx.amount < 0;
                      const isSalida = tx.description.toUpperCase().includes('SALIDA') || tx.fromPocketId === 'salidas_pareja' || tx.description.toUpperCase().includes('CRÉDITO');
                      const isPayment = tx.description.toUpperCase().includes('ABONO') || tx.description.toUpperCase().includes('PAGAR') || tx.type === 'transfer' || tx.description.toUpperCase().includes('RECARGA');

                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 bg-neutral-900/15 border border-purple-950/15 rounded-2xl flex items-center justify-between text-xs hover:border-[#820ad1]/20 transition-all gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              isPayment 
                                ? 'bg-emerald-950/30 text-emerald-400' 
                                : isSalida 
                                  ? 'bg-pink-950/30 text-pink-400' 
                                  : 'bg-purple-950/30 text-purple-300'
                            }`}>
                              {isPayment ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-zinc-100 leading-tight truncate">{tx.description}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[9px] text-zinc-400 font-mono">{tx.date}</span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                                  isPayment 
                                    ? 'bg-emerald-950/45 text-emerald-405' 
                                    : isSalida 
                                      ? 'bg-pink-950/45 text-pink-350' 
                                      : 'bg-purple-950/45 text-purple-305'
                                }`}>
                                  {isPayment ? 'Abono 💵' : isSalida ? 'Salida 🌸' : 'Gasto CC 🛡️'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2 shrink-0">
                            <div>
                              <p className={`font-mono font-black text-xs ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isExpense ? '' : '+'}{formatCOP(tx.amount)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleClearIndividualTransaction(tx.id, tx.description)}
                              className="p-1 text-zinc-650 hover:text-rose-400 rounded transition-all"
                              title="Borrar logs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}

            {/* TAB 3: CUPO Y ALERTAS SECTOR */}
            {activeTab === 'cupo' && (
              <motion.div
                key="cupo-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
                id="tab-cupo"
              >
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-1.5 text-purple-200">
                    <Sliders className="w-5 h-5 text-[#b149f2]" />
                    Cupo & Alertas Inteligentes
                  </h2>
                  <p className="text-[10px] text-purple-300">Monitoreo de cupo disponible, alertas de endeudamiento y límites recomendados.</p>
                </div>

                {/* CUPO EXPLANATION CARD WITH METER */}
                <div className="p-5.5 rounded-3xl bg-neutral-900/40 border border-purple-950/30 space-y-4 shadow-sm" id="cupo-meter-parent">
                  
                  {/* Total Adjusted Limit Display */}
                  <div className="flex justify-between items-center" id="limit-header">
                    <div>
                      <p className="text-[9px] text-zinc-400 font-mono">Cupo Máximo Ajustable</p>
                      <p className="text-xl font-extrabold text-[#bc8acf] font-mono mt-0.5">{formatCOP(creditCardLimit)}</p>
                    </div>

                    <button
                      onClick={() => {
                        setTempLimitInput(creditCardLimit.toString());
                        setIsEditingLimit(!isEditingLimit);
                      }}
                      className="text-[10.5px] text-purple-300 hover:text-white font-bold flex items-center gap-0.5"
                    >
                      Ajustar Cupo
                    </button>
                  </div>

                  {/* EDIT LIMIT FORM IF OPEN */}
                  {isEditingLimit && (
                    <motion.form 
                      onSubmit={handleSaveLimitConfig}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="p-3 bg-[#0a000f] border border-purple-950/40 rounded-xl space-y-2 text-xs"
                    >
                      <label className="text-[9.5px] font-bold text-purple-200">Definir Nuevo Límite (Cupo) de Tarjeta (COP):</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={tempLimitInput}
                          onChange={(e) => setTempLimitInput(e.target.value)}
                          className="bg-black/50 border border-purple-900/50 p-1.5 rounded-lg flex-1 text-xs text-white font-mono"
                          placeholder="Ej. 1000000"
                        />
                        <button type="submit" className="bg-[#820ad1] text-white px-3 rounded-lg text-xs font-bold">
                          Guardar
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {/* VISUAL REAL-TIME LIMIT BAR */}
                  <div className="space-y-1.5" id="limit-bar-visual">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Usado: {formatCOP(totalCcDebt)}</span>
                      <span>Dispon: {formatCOP(availableLimit)}</span>
                    </div>

                    {/* DUAL COLORED PROGRESS BAR */}
                    <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-purple-950/35 relative flex">
                      {/* Safe zone indicator border at 30% and 50% */}
                      <div className="absolute top-0 bottom-0 left-[30%] w-[1px] bg-yellow-500/30 z-10" title="Límite Recomendado (30%)"></div>
                      <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-rose-500/40 z-10" title="Límite Crítico (50%)"></div>

                      <div 
                        className={`h-full transition-all duration-300 ${
                          ccUsagePercent > 50 
                            ? 'bg-gradient-to-r from-purple-800 to-rose-500' 
                            : ccUsagePercent > 30 
                              ? 'bg-gradient-to-r from-purple-800 to-amber-500' 
                              : 'bg-gradient-to-r from-purple-800 to-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, ccUsagePercent)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-zinc-500 pt-0.5">
                      <span>0%</span>
                      <span className="text-yellow-405">30% Sugerido</span>
                      <span className="text-rose-405">50% Crítico</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* PERCENT DISPLAY */}
                  <div className="p-3 bg-black/40 rounded-xl border border-purple-950/20 text-center flex items-center justify-between">
                    <span className="text-zinc-400 text-[10px] font-sans">Porcentaje de uso actual:</span>
                    <span className="text-sm font-bold font-mono tracking-tight text-white flex items-center gap-1">
                      {ccUsagePercent.toFixed(1)}% {ccUsagePercent > 50 ? '🚨' : ccUsagePercent > 30 ? '⚠️' : '✅'}
                    </span>
                  </div>
                </div>

                {/* COLLAPSIBLE INTELLIGENT CYCLE CONTROLLER */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">📅 Calendario de Alertas</span>
                    <button
                      onClick={() => setShowCycleDaySlider(!showCycleDaySlider)}
                      className="text-[#bc8acf] hover:text-white text-[9px] font-bold px-2.5 py-1 bg-purple-950/40 rounded-lg border border-purple-900/30 transition-all flex items-center gap-1"
                    >
                      <span>{showCycleDaySlider ? 'Cerrar Ajustes ⚙️' : 'Cambiar Día del Ciclo ⚙️'}</span>
                    </button>
                  </div>

                  {showCycleDaySlider && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 rounded-xl bg-[#11021b]/80 border border-purple-950/45 space-y-3.5"
                      id="sim-day-slider"
                    >
                      {/* SIMU DAY CONTROL */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-purple-200">Día del mes simulado:</span>
                          <span className="font-mono text-xs font-bold bg-purple-950/30 text-[#bc8acf] px-2 py-0.5 rounded border border-purple-900/10">
                            Día {currentSimDay}
                          </span>
                        </div>
                        <p className="text-[9px] text-zinc-400 leading-normal font-sans">
                          Ajusta el día actual para simular el paso del tiempo y probar alertas automáticas de corte, abonos o límite de pago.
                        </p>
                        <input
                          type="range"
                          min="1"
                          max="31"
                          value={currentSimDay}
                          onChange={(e) => setCurrentSimDay(parseInt(e.target.value))}
                          className="w-full h-1 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-[#b149f2]"
                          id="range-sim-day"
                        />
                      </div>

                      {/* CUTOFF DAY CONTROL */}
                      <div className="border-t border-purple-950/30 pt-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-purple-200">Día de Corte de la Tarjeta:</span>
                          <span className="font-mono text-xs font-bold bg-purple-950/30 text-[#bc8acf] px-2 py-0.5 rounded border border-purple-900/10">
                            Día {cutoffDay} de cada mes
                          </span>
                        </div>
                        <p className="text-[9px] text-zinc-400 leading-normal font-sans">
                          Nu consolida tus compras acumuladas hasta este día. Lo que compres después se pasa al siguiente mes.
                        </p>
                        <input
                          type="range"
                          min="1"
                          max="28"
                          value={cutoffDay}
                          onChange={(e) => setCutoffDay(parseInt(e.target.value))}
                          className="w-full h-1 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-[#b149f2]"
                        />
                      </div>

                      {/* DUE DAY CONTROL */}
                      <div className="border-t border-purple-950/30 pt-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-purple-200">Día Límite de Pago (Vencimiento):</span>
                          <span className="font-mono text-xs font-bold bg-purple-950/30 text-[#bc8acf] px-2 py-0.5 rounded border border-purple-900/10">
                            Día {paymentDueDay} del mes siguiente
                          </span>
                        </div>
                        <p className="text-[9px] text-zinc-400 leading-normal font-sans">
                          Último día permitido por el banco para pagar el extracto mensual sin generar cobro de intereses de mora.
                        </p>
                        <input
                          type="range"
                          min="1"
                          max="28"
                          value={paymentDueDay}
                          onChange={(e) => setPaymentDueDay(parseInt(e.target.value))}
                          className="w-full h-1 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-[#b149f2]"
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-[8.5px] font-mono text-center text-zinc-400 pt-1">
                        <button onClick={() => setCurrentSimDay(Math.max(1, paymentDueDay - 1))} className={`p-1 rounded ${currentSimDay === Math.max(1, paymentDueDay - 1) ? 'bg-purple-800 text-white font-bold' : 'bg-black/20 hover:bg-purple-955/20'}`}>Pago (Día {Math.max(1, paymentDueDay - 1)})</button>
                        <button onClick={() => setCurrentSimDay(paymentDueDay)} className={`p-1 rounded ${currentSimDay === paymentDueDay ? 'bg-purple-800 text-white font-bold' : 'bg-black/20 hover:bg-purple-955/20'}`}>Límite (Día {paymentDueDay})</button>
                        <button onClick={() => setCurrentSimDay(Math.max(1, cutoffDay - 2))} className={`p-1 rounded ${currentSimDay === Math.max(1, cutoffDay - 2) ? 'bg-purple-800 text-white font-bold' : 'bg-black/20 hover:bg-purple-955/20'}`}>Abono (Día {Math.max(1, cutoffDay - 2)})</button>
                        <button onClick={() => setCurrentSimDay(cutoffDay)} className={`p-1 rounded ${currentSimDay === cutoffDay ? 'bg-purple-800 text-white font-bold' : 'bg-black/20 hover:bg-purple-955/20'}`}>Corte (Día {cutoffDay})</button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ALERT ENGINE (REAL TIME RENDER BASED ON USER CONSTRAINTS) */}
                <div className="space-y-2.5" id="warning-center">
                  
                  {/* Dynamic Date reminders */}
                  {renderDateReminders()}

                  {/* Regla del 50% & 30% Warnings - active before cutoff date */}
                  {currentSimDay < cutoffDay ? (
                    ccUsagePercent > 50 ? (
                      <div className="p-4 rounded-2xl bg-rose-950/35 border-2 border-rose-500 text-rose-105 flex gap-3 shadow-md animate-bounce-subtle" id="alert-over-50">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-205">🚨 ¡ADVERTENCIA CRÍTICA (Antes de corte)!</p>
                          <p className="text-[10px] text-zinc-200 mt-1 leading-relaxed font-sans">
                            Has superado el <strong>50%</strong> del cupo de tu tarjeta ({formatCOP(creditCardLimit * 0.5)}) antes de tu fecha de corte (Día {cutoffDay}). 
                            Nu reportará un nivel de endeudamiento alto a las agencias crediticias, lo que disminuye tu puntaje Score. Te recomendamos liberar cupo de inmediato.
                          </p>
                        </div>
                      </div>
                    ) : ccUsagePercent > 30 ? (
                      <div className="p-4 rounded-2xl bg-amber-950/30 border-2 border-amber-500 text-amber-100 flex gap-3 shadow-md" id="alert-over-30">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">⚠️ RECOMENDACIÓN DE CUPO (Mantenimiento)</p>
                          <p className="text-[10px] text-zinc-200 mt-1 leading-relaxed font-sans">
                            Estás superando el <strong>30%</strong> acumulativo de tu cupo disponible ({formatCOP(creditCardLimit * 0.3)}). 
                            Para mantener un perfil ideal ante el banco y asegurar que tu historial crediticio se mantenga impecable, procura no sobrepasar este umbral antes del día {cutoffDay}.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900 text-emerald-100 flex gap-3 shadow-sm" id="alert-healthy">
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-emerald-405">✅ CONDUCTA SALUDABLE DE CUPO</p>
                          <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed font-sans">
                            Estás por debajo del <strong>30%</strong> de consumo ({formatCOP(creditCardLimit * 0.3)}). Tu conducta crediticia actual es excelente y mantendrá tu puntaje de riesgo bancario al máximo.
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 text-purple-200 flex gap-3 shadow-sm" id="alert-corte-passed">
                      <Info className="w-5 h-5 text-purple-400 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-purple-300 uppercase">Ciclo de Facturación en Proceso</p>
                        <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed font-sans">
                          Te encuentras en el período de facturación consolidándose (Pasada la fecha de corte del día {cutoffDay}). Las deudas aquí facturadas formarán parte del corte del próximo período. Recuerda tus fechas límites de pago (Días {paymentDueDay - 1} y {paymentDueDay}).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* RESUMEN DE NORMAS FINANCIERAS NU */}
                  <div className="p-4.5 rounded-2xl bg-black/45 border border-purple-950/20 space-y-2 text-[10px] text-zinc-400">
                    <p className="font-bold text-white uppercase text-[10.5px] border-b border-purple-950/10 pb-1 flex items-center gap-1">
                      <Sparkle className="w-3.5 h-3.5 text-yellow-405" /> Manual de Consumos del Titular:
                    </p>
                    <ul className="space-y-1.5 list-disc list-inside">
                      <li><strong>Autopagar:</strong> El dinero se extrae de tu saldo mensual ($400K) de salidas cada que utilizas la tarjeta CC ordinaria, quedando acumulado en la reserva.</li>
                      <li><strong>No acumular sobrepagos:</strong> Si gastaste de más en salidas de forma virtual, el saldo registrará negativo, cancelándose con la próxima inyección de efectivo mensual de forma limpia.</li>
                      <li><strong>Control 30% ordinario:</strong> Mantener consumos por debajo de {formatCOP(creditCardLimit * 0.3)}</li>
                      <li><strong>Alarma 50% límite:</strong> No comprometer cupo por más de {formatCOP(creditCardLimit * 0.5)} antes de la fecha límite ordinaria para no dañar reportes.</li>
                    </ul>
                  </div>

                  {/* CENTRAL DE RESPALDO Y SEGURIDAD */}
                  <div className="p-4 bg-gradient-to-br from-[#1b0330] to-[#0a0014] border border-[#820ad1]/25 rounded-2xl space-y-3 shadow-md" id="backup-restore-center">
                    <div>
                      <h4 className="text-[10.5px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <UploadCloud className="w-4 h-4 text-[#bc8acf]" /> Respaldo de Seguridad Local
                      </h4>
                      <p className="text-[9.5px] text-zinc-450 mt-1 leading-relaxed">
                        ¿Quieres asegurar que nada de lo registrado se borre? Descarga un archivo con tus datos para guardarlo o importarlo en otro celular de forma indefinida.
                      </p>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={handleExportBackup}
                        className="flex-1 py-1.5 px-3 bg-[#820ad1]/20 border border-[#820ad1]/40 hover:bg-[#820ad1]/30 text-white rounded-xl text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 font-sans"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-300" />
                        Exportar JSON
                      </button>

                      <label className="flex-1 py-1.5 px-3 bg-black/40 border border-purple-900/30 hover:bg-black/60 text-purple-200 rounded-xl text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans">
                        <UploadCloud className="w-3.5 h-3.5 text-purple-300" />
                        Importar JSON
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportBackup}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* SECURE SUBWAY NAV BAR (Modern iOS feel) */}
        <nav className="absolute bottom-0 left-0 right-0 bg-[#0d0114]/95 backdrop-blur-md border-t border-purple-900/30 py-2.5 px-4 flex items-center justify-around z-50 shadow-inner" id="app-navigation">
          <button
            onClick={() => setActiveTab('salidas')}
            className={`flex flex-col items-center gap-1 p-1 flex-1 transition-all ${
              activeTab === 'salidas' ? 'text-[#b149f2] font-semibold scale-105' : 'text-purple-300/40 hover:text-purple-300'
            }`}
            id="nav-tab-salidas"
          >
            <Heart className="w-4.5 h-4.5" />
            <span className="text-[8px] sm:text-[9px] tracking-tight">1. Salidas</span>
          </button>

          <button
            onClick={() => setActiveTab('tarjeta')}
            className={`flex flex-col items-center gap-1 p-1 flex-1 transition-all ${
              activeTab === 'tarjeta' ? 'text-[#b149f2] font-semibold scale-105' : 'text-purple-300/40 hover:text-purple-300'
            }`}
            id="nav-tab-tarjeta"
          >
            <CreditCard className="w-4.5 h-4.5" />
            <span className="text-[8px] sm:text-[9px] tracking-tight">2. Tarjeta CC</span>
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`flex flex-col items-center gap-1 p-1 flex-1 transition-all ${
              activeTab === 'historial' ? 'text-[#b149f2] font-semibold scale-105' : 'text-purple-300/40 hover:text-purple-300'
            }`}
            id="nav-tab-historial"
          >
            <History className="w-4.5 h-4.5" />
            <span className="text-[8px] sm:text-[9px] tracking-tight">3. Historial</span>
          </button>

          <button
            onClick={() => setActiveTab('cupo')}
            className={`flex flex-col items-center gap-1 p-1 flex-1 transition-all ${
              activeTab === 'cupo' ? 'text-[#b149f2] font-semibold scale-105' : 'text-purple-300/40 hover:text-purple-300'
            }`}
            id="nav-tab-cupo"
          >
            <Sliders className="w-4.5 h-4.5" />
            <span className="text-[8px] sm:text-[9px] tracking-tight">4. Cupo & Alertas</span>
          </button>
        </nav>

        {/* INTERACTIVE PAYING DRAWER */}
        <AnimatePresence>
          {isPaying && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPaying(false)}
                className="absolute inset-0 bg-black/80 z-40 transition-opacity"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute inset-x-0 bottom-0 bg-[#0d0114] border-t border-purple-800/40 rounded-t-[32px] p-6 shadow-[0_-8px_32px_rgba(130,10,209,0.25)] z-50 flex flex-col max-h-[85%] overflow-hidden"
                id="payment-drawer"
              >
                {/* Drag Handle Bar */}
                <div className="w-12 h-1 bg-purple-950/80 rounded-full mx-auto mb-4 shrink-0"></div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-tight flex items-center gap-1.5 font-mono">
                      <Wallet className="w-4 h-4 text-[#b149f2]" /> Pagar Deuda Nu
                    </h3>
                    <p className="text-[10px] text-purple-300/70 mt-0.5">Dinero interno simulado. No gastas saldo real.</p>
                  </div>
                  <button 
                    onClick={() => setIsPaying(false)}
                    className="p-1 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-pink-300 bg-pink-950/30 hover:bg-pink-900/40 transition-colors"
                  >
                    Salir
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto pr-1 pb-4" id="drawer-payment-options">
                  {/* Status Summary */}
                  <div className="p-3.5 rounded-2xl bg-black/45 border border-purple-950/45 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400">Deuda Total Tarjeta:</span>
                      <span className="font-bold text-white">{formatCOP(totalCcDebt)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400">Cuota del Mes (+ Manejo):</span>
                      <span className="font-bold text-[#bc8acf]">{formatCOP(estimatedMonthlyMinimumPayment)}</span>
                    </div>
                  </div>

                  {/* DIRECT MANUAL PAYMENT */}
                  <div className="p-4 rounded-2xl border border-purple-950/50 bg-black/20 space-y-3">
                    <div>
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                        Registrar Abono/Pago Directo
                      </span>
                      <p className="text-[9.5px] text-zinc-350 mt-1 leading-relaxed">
                        Ingresa el monto a abonar a la tarjeta para amortizar tus compras activas y liberar cupo de inmediato.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 font-mono text-zinc-500 text-xs">$</span>
                        <input
                          type="number"
                          placeholder="Ingresa valor a abonar"
                          value={manualPayAmount}
                          onChange={(e) => setManualPayAmount(e.target.value)}
                          className="w-full bg-[#0d0114] border border-purple-950/40 p-2 text-xs rounded-xl text-white font-mono focus:outline-none focus:border-[#820ad1]"
                        />
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (estimatedMonthlyMinimumPayment > 0) {
                              setManualPayAmount(Math.round(estimatedMonthlyMinimumPayment).toString());
                            } else {
                              alert("No posees cuotas activas para abonar este mes.");
                            }
                          }}
                          className="bg-purple-950/30 border border-purple-900/30 text-purple-200 px-2.5 py-1.5 rounded-lg text-[9px] font-bold font-mono hover:text-white"
                        >
                          Mínimo: {formatCOP(estimatedMonthlyMinimumPayment)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualPayAmount(Math.round(totalCcDebt).toString())}
                          className="bg-purple-950/30 border border-purple-900/30 text-purple-200 px-2.5 py-1.5 rounded-lg text-[9px] font-bold font-mono hover:text-white"
                        >
                          Total: {formatCOP(totalCcDebt)}
                        </button>
                      </div>

                      <button
                        onClick={handleManualAbono}
                        className="w-full py-2 bg-[#820ad1] hover:bg-[#9712ef] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#820ad1]/15 leading-tight"
                      >
                        PAGAR AHORA
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* PAYMENT SUCCESS OVERLAY POPUP */}
        <AnimatePresence>
          {paySuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0d0114] z-55 flex flex-col justify-center items-center p-6 text-center"
              id="payment-success-overlay"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10, stiffness: 120 }}
                className="w-18 h-18 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(16,185,129,0.25)] mb-5"
              >
                <CheckCircle className="w-10 h-10 stroke-[2.5]" />
              </motion.div>

              <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-mono">
                ¡Abono Realizado!
              </h3>
              <p className="text-[10px] text-purple-300/80 mt-1 max-w-xs font-sans">
                El abono simulado se ha liquidado de forma correcta liberando tu cupo de inmediato.
              </p>

              <div className="p-4 rounded-xl bg-black/40 border border-purple-950/40 w-full max-w-xs mt-5 space-y-2 font-mono text-[11px]" id="overlay-receipt">
                <div className="flex justify-between text-pink-300">
                  <span>Monto Abonado:</span>
                  <span className="font-extrabold">{formatCOP(payAmountApplied)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Deuda Restante CC:</span>
                  <span>{formatCOP(totalCcDebt)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Nuevo Cupo Libre Nu:</span>
                  <span className="text-emerald-405 font-bold">{formatCOP(availableLimit)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setPaySuccess(false);
                  setPayAmountApplied(0);
                }}
                className="mt-8 px-6 py-2.5 bg-[#820ad1] hover:bg-[#9712ef] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#820ad1]/15 leading-tight"
              >
                COMPLETAR
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
