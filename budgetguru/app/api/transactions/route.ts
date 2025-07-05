

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';


export async function GET() {
  try {
    await dbConnect();
    const transactions = await Transaction.find({}).sort({ createdAt: -1 });
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

{/*export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const transaction = new Transaction({
      amount: body.amount,
      date: body.date,
      description: body.description,
      type: body.type,
      category: body.category
    });

    const savedTransaction = await transaction.save();
    return NextResponse.json(savedTransaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}*/}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    // Validate request body
    if (!body.amount || body.amount < 0.01) {
      throw new Error('Invalid amount');
    }
    if (!body.date) {
      throw new Error('Date is required');
    }
    if (!body.description || body.description.trim().length < 3) {
      throw new Error('Description must be at least 3 characters');
    }
    if (!['income', 'expense'].includes(body.type)) {
      throw new Error('Type must be either "income" or "expense"');
    }
    if (!body.category || body.category.trim() === '') {
      throw new Error('Category is required');
    }

    const transaction = new Transaction({
      amount: body.amount,
      date: body.date,
      description: body.description.trim(),
      type: body.type,
      category: body.category.trim(),
    });

    const savedTransaction = await transaction.save();
    return NextResponse.json(savedTransaction, { status: 201 });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error.message || error },
      { status: 500 }
    );
  }
}