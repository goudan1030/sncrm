import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET() {
  try {
    // 查询members表中的总记录数
    const [result] = await pool.execute('SELECT COUNT(*) as total FROM members');
    const total = result[0].total;

    return NextResponse.json({ count: total });
  } catch (error) {
    console.error('获取会员总数失败:', error);
    return NextResponse.json(
      { error: '获取会员总数失败' },
      { status: 500 }
    );
  }
}