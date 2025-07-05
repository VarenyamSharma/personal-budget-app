import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Budget from '@/models/Budget';
import Transaction from '@/models/Transaction';

export async function GET() {
  try {
    await dbConnect();
    const budgets = await Budget.find({});
    
    // Calculate current spending for each budget
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: { $regex: `^${currentMonth}` }
        }
      },
      {
        $group: {
          _id: '$category',
          spent: { $sum: '$amount' }
        }
      }
    ]);

    const expenseMap = monthlyExpenses.reduce((acc, item) => {
      acc[item._id] = item.spent;
      return acc;
    }, {} as Record<string, number>);

    const updatedBudgets = budgets.map(budget => {
      const spent = expenseMap[budget.category] || 0;
      const remaining = Math.max(0, budget.amount - spent);
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        ...budget.toObject(),
        spent,
        remaining,
        percentage: Math.min(100, percentage)
      };
    });

    return NextResponse.json(updatedBudgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const budgets = await request.json();
    
    // Clear existing budgets and create new ones
    await Budget.deleteMany({});
    
    const savedBudgets = await Budget.insertMany(budgets);
    return NextResponse.json(savedBudgets, { status: 201 });
  } catch (error) {
    console.error('Error saving budgets:', error);
    return NextResponse.json(
      { error: 'Failed to save budgets' },
      { status: 500 }
    );
  }
}