import { Transaction, MonthlyExpense, CategoryExpense, Budget, SpendingInsight } from '@/types/finance';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getMonthlyExpenses = (transactions: Transaction[]): MonthlyExpense[] => {
  const monthlyData: { [key: string]: number } = {};
  
  transactions
    .filter(transaction => transaction.type === 'expense')
    .forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!monthlyData[monthName]) {
        monthlyData[monthName] = 0;
      }
      monthlyData[monthName] += transaction.amount;
    });

  return Object.entries(monthlyData)
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .slice(-6);
};

export const getCategoryExpenses = (transactions: Transaction[]): CategoryExpense[] => {
  const categoryData: { [key: string]: number } = {};
  const colors = [
    '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
    '#EC4899', '#84CC16', '#6366F1', '#F97316', '#14B8A6'
  ];
  
  transactions
    .filter(transaction => transaction.type === 'expense')
    .forEach(transaction => {
      if (!categoryData[transaction.category]) {
        categoryData[transaction.category] = 0;
      }
      categoryData[transaction.category] += transaction.amount;
    });

  return Object.entries(categoryData)
    .map(([category, amount], index) => ({
      category,
      amount,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.amount - a.amount);
};

export const calculateBudgetStatus = (budgets: Budget[], transactions: Transaction[]): Budget[] => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as { [key: string]: number });

  return budgets.map(budget => {
    const spent = monthlyExpenses[budget.category] || 0;
    const remaining = Math.max(0, budget.amount - spent);
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return {
      ...budget,
      spent,
      remaining,
      percentage: Math.min(100, percentage)
    };
  });
};

export const getSpendingInsights = (transactions: Transaction[], budgets: Budget[]): SpendingInsight[] => {
  const insights: SpendingInsight[] = [];
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));
  
  // Budget warnings
  const budgetStatus = calculateBudgetStatus(budgets, transactions);
  budgetStatus.forEach(budget => {
    if (budget.percentage > 90) {
      insights.push({
        type: 'warning',
        title: `${budget.category} Budget Alert`,
        description: `You've spent ${budget.percentage.toFixed(0)}% of your ${budget.category} budget this month.`,
        icon: 'AlertTriangle'
      });
    }
  });

  // Top spending category
  const categoryExpenses = getCategoryExpenses(thisMonthExpenses);
  if (categoryExpenses.length > 0) {
    const topCategory = categoryExpenses[0];
    insights.push({
      type: 'info',
      title: 'Top Spending Category',
      description: `${topCategory.category} accounts for ${formatCurrency(topCategory.amount)} of your spending this month.`,
      icon: 'TrendingUp'
    });
  }

  // Spending trend
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthKey = lastMonth.toISOString().slice(0, 7);
  
  const thisMonthTotal = thisMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const lastMonthTotal = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(lastMonthKey))
    .reduce((sum, t) => sum + t.amount, 0);

  if (lastMonthTotal > 0) {
    const change = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    if (change > 10) {
      insights.push({
        type: 'warning',
        title: 'Increased Spending',
        description: `Your spending increased by ${change.toFixed(1)}% compared to last month.`,
        icon: 'TrendingUp'
      });
    } else if (change < -10) {
      insights.push({
        type: 'success',
        title: 'Great Savings!',
        description: `You've reduced spending by ${Math.abs(change).toFixed(1)}% compared to last month.`,
        icon: 'TrendingDown'
      });
    }
  }

  return insights.slice(0, 3);
};

export const validateTransaction = (amount: string, date: string, description: string, category: string) => {
  const errors: { amount?: string; date?: string; description?: string; category?: string } = {};
  
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.amount = 'Please enter a valid amount greater than 0';
  }
  
  if (!date) {
    errors.date = 'Please select a date';
  } else if (new Date(date) > new Date()) {
    errors.date = 'Date cannot be in the future';
  }
  
  if (!description.trim()) {
    errors.description = 'Please enter a description';
  } else if (description.trim().length < 3) {
    errors.description = 'Description must be at least 3 characters long';
  }

  if (!category.trim()) {
    errors.category = 'Please select a category';
  }
  
  return errors;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
  'Groceries',
  'Rent/Mortgage',
  'Insurance',
  'Subscriptions',
  'Other'
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Rental Income',
  'Side Hustle',
  'Gifts',
  'Refunds',
  'Other'
];