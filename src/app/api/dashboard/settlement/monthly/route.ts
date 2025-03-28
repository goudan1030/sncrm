import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    // 获取当前日期，并设置为UTC时间以避免时区问题
    const now = new Date();
    
    // 当月第一天，确保是当地时间的1号
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // 当月最后一天
    // 通过设置下个月的0号(即上个月的最后一天)来获取
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    console.log('结算记录API查询范围(UTC修正):', firstDayStr, '至', lastDayStr);

    // 查询当月已结算总额，使用settlement_date字段
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT SUM(amount) as total FROM settlement_records WHERE settlement_date >= ? AND settlement_date <= ?',
      [firstDayStr, lastDayStr]
    );

    console.log('结算记录API查询结果:', rows);

    // 安全地处理结果
    const total = rows && rows[0] && rows[0].total ? Number(rows[0].total) : 0;

    return NextResponse.json({ amount: total });
  } catch (error) {
    console.error('获取当月已结算金额失败:', error);
    return NextResponse.json(
      { error: '获取当月已结算金额失败' },
      { status: 500 }
    );
  }
}