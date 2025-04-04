'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Session } from '@supabase/auth-helpers-nextjs';
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from 'react';
import { useDataTable } from '@/hooks/use-data-table';

interface Member {
  id: string;
  member_no: string;
  nickname: string;
  wechat: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  gender: string;
  target_area: string;
  birth_year: number;
  height: number;
  weight: number;
  education: string;
  occupation: string;
  income: string;
  marriage: string;
  has_children: string;
  want_children: string;
  housing: string;
  car: string;
  smoking: string;
  drinking: string;
  partner_requirement: string;
  type: string;
  status: string;
  remaining_matches: number;
  created_at: string;
  house_car: string;
  hukou_province: string;
  hukou_city: string;
  children_plan: string;
  marriage_cert: string;
  marriage_history: string;
  sexual_orientation: string;
  [key: string]: string | number;
}

// 首先定义一个类型来表示所有可能的列键
type ColumnKey = 'member_no' | 'wechat' | 'phone' | 'type' | 'status' | 'gender' | 'birth_year' | 
  'height' | 'weight' | 'education' | 'occupation' | 'province' | 'city' | 'district' | 
  'target_area' | 'house_car' | 'hukou_province' | 'hukou_city' | 'children_plan' | 
  'marriage_cert' | 'marriage_history' | 'sexual_orientation' | 'remaining_matches' | 
  'created_at' | 'actions' | 'self_description' | 'partner_requirement';

// 修改 availableColumns 的类型
const availableColumns: { key: ColumnKey; label: string }[] = [
  { key: 'member_no', label: '会员编号' },
  { key: 'wechat', label: '微信号' },
  { key: 'phone', label: '手机号' },
  { key: 'type', label: '会员类型' },
  { key: 'status', label: '状态' },
  { key: 'gender', label: '性别' },
  { key: 'birth_year', label: '出生年份' },
  { key: 'height', label: '身高' },
  { key: 'weight', label: '体重' },
  { key: 'education', label: '学历' },
  { key: 'occupation', label: '职业' },
  { key: 'province', label: '所在省份' },
  { key: 'city', label: '所在城市' },
  { key: 'district', label: '所在区市' },
  { key: 'target_area', label: '目标区域' },
  { key: 'house_car', label: '房车情况' },
  { key: 'hukou_province', label: '户口所在省' },
  { key: 'hukou_city', label: '户口所在市' },
  { key: 'children_plan', label: '孩子需求' },
  { key: 'marriage_cert', label: '领证需求' },
  { key: 'marriage_history', label: '婚史' },
  { key: 'sexual_orientation', label: '性取向' },
  { key: 'remaining_matches', label: '剩余匹配次数' },
  { key: 'created_at', label: '创建时间' },
  { key: 'self_description', label: '个人说明' },
  { key: 'partner_requirement', label: '择偶要求' },
  { key: 'actions', label: '操作' }  // 将actions列固定在最后
];

function MembersPageContent() {
  const { toast } = useToast();
  const { session, isLoading } = useAuth() as { session: Session | null, isLoading: boolean };
  const router = useRouter();
  const { updateFilters } = useDataTable({
    tableName: 'members',
    pageSize: 25,
    defaultSort: { column: 'created_at', ascending: false }
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberType, setSelectedMemberType] = useState<string | null>(null);
  const [upgradeType, setUpgradeType] = useState<'ONE_TIME' | 'ANNUAL'>('ONE_TIME');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [upgradeDate, setUpgradeDate] = useState(new Date());
  const [memberCounts, setMemberCounts] = useState({ NORMAL: 0, ONE_TIME: 0, ANNUAL: 0 });
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(() => {
    if (typeof window !== 'undefined') {
      const savedColumns = localStorage.getItem('memberTableColumns');
      if (savedColumns) {
        const parsedColumns = JSON.parse(savedColumns);
        // 确保操作列始终在最后
        const columnsWithoutActions = parsedColumns.filter((col: string) => col !== 'actions');
        return [...columnsWithoutActions, 'actions'];
      }
    }
    // 默认显示所有列，操作列在最后
    const defaultColumns = availableColumns.map(col => col.key).filter(col => col !== 'actions');
    return [...defaultColumns, 'actions'];
  });

  const handleColumnChange = (columns: ColumnKey[]) => {
    // 确保操作列始终在最后
    const columnsWithoutActions = columns.filter(col => col !== 'actions');
    const finalColumns = [...columnsWithoutActions, 'actions'];
    setSelectedColumns(finalColumns);
    localStorage.setItem('memberTableColumns', JSON.stringify(finalColumns));
  };
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (statusFilter) queryParams.set('status', statusFilter);
      if (genderFilter) queryParams.set('gender', genderFilter);
      if (searchTerm) queryParams.set('search', searchTerm);

      // 获取URL中的type参数
      const urlParams = new URLSearchParams(window.location.search);
      const urlType = urlParams.get('type');
      const currentType = urlType || typeFilter;

      // 添加调试日志
      console.log('会员列表请求参数:', {
        queryParams: Object.fromEntries(queryParams.entries()),
        currentType,
        apiUrl: '/api/members' + (currentType ? `/${currentType.toLowerCase()}` : '')
      });

      // 根据会员类型调用不同的 API
      let apiUrl = '/api/members';
      if (currentType) {
        switch (currentType) {
          case 'NORMAL':
            apiUrl = '/api/members/normal';
            break;
          case 'ONE_TIME':
            apiUrl = '/api/members/one-time';
            break;
          case 'ANNUAL':
            apiUrl = '/api/members/annual';
            break;
          default:
            apiUrl = '/api/members';
        }
      }

      const response = await fetch(`${apiUrl}?${queryParams}`);
      const data = await response.json();

      // 添加响应数据调试日志
      console.log('会员列表响应数据:', {
        status: response.status,
        total: data,
        recordCount: data.data?.length
      });

      if (!response.ok) {
        throw new Error(data.error || '获取会员列表失败');
      }

      setMembers(data.data);
      setTotal(data.total);
      setTotalCount(data.total);
      setMemberCounts(data.memberCounts || { NORMAL: 0, ONE_TIME: 0, ANNUAL: 0 });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '获取会员列表失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter, genderFilter, searchTerm, toast]);

  const handleMemberAction = async (memberId: string, action: string, type?: string) => {
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, type })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '操作失败');
      }

      toast({
        title: '操作成功',
        description: '会员状态已更新'
      });

      fetchMembers();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
      return;
    }

    fetchMembers();
  }, [isLoading, session, router, fetchMembers]);

  useEffect(() => {
    console.log('筛选条件变化:', {
      statusFilter,
      typeFilter,
      genderFilter,
      searchTerm
    });
    fetchMembers();
  }, [statusFilter, typeFilter, genderFilter, searchTerm, fetchMembers]);

  useEffect(() => {
    const newFilters = {
      status: statusFilter,
      type: typeFilter,
      gender: genderFilter,
      search: searchTerm
    };
    updateFilters(newFilters);
  }, [statusFilter, typeFilter, genderFilter, searchTerm, updateFilters]);

  const getMemberTypeText = (type: string, remainingMatches: number): string => {
    switch (type) {
      case 'NORMAL':
        return '普通会员';
      case 'ONE_TIME':
        return `一次性会员 (${remainingMatches}次)`;
      case 'ANNUAL':
        return '年费会员';
      default:
        return '未知';
    }
  };

  const getGenderText = (gender: string): string => {
    return gender === 'male' ? '男' : '女';
  };

  const getHouseCarText = (houseCar: string) => {
    switch (houseCar) {
      case 'NEITHER':
        return '无房无车';
      case 'HOUSE_ONLY':
        return '有房无车';
      case 'CAR_ONLY':
        return '无房有车';
      case 'BOTH':
        return '有房有车';
      default:
        return '未知';
    }
  };

  const getChildrenPlanText = (childrenPlan: string) => {
    switch (childrenPlan) {
      case 'BOTH':
        return '一起要';
      case 'SEPARATE':
        return '各自要';
      case 'NEGOTIATE':
        return '互相协商';
      case 'NONE':
        return '不要孩子';
      default:
        return '未知';
    }
  };

  const getMarriageCertText = (marriageCert: string) => {
    switch (marriageCert) {
      case 'WANT':
        return '要';
      case 'DONT_WANT':
        return '不要';
      case 'NEGOTIATE':
        return '互相协商';
      default:
        return '未知';
    }
  };

  const getMarriageHistoryText = (marriageHistory: string) => {
    switch (marriageHistory) {
      case 'YES':
        return '有婚史';
      case 'NO':
        return '无婚史';
      default:
        return '未知';
    }
  };

  const getEducationText = (education: string) => {
    switch (education) {
      case 'HIGH_SCHOOL':
        return '高中';
      case 'COLLEGE':
        return '大专';
      case 'BACHELOR':
        return '本科';
      case 'MASTER':
        return '硕士';
      case 'PHD':
        return '博士';
      default:
        return '未知';
    }
  };

  const getSexualOrientationText = (sexualOrientation: string) => {
    switch (sexualOrientation) {
      case 'STRAIGHT_MALE':
        return '直男';
      case 'STRAIGHT_FEMALE':
        return '直女';
      case 'LES':
        return 'LES';
      case 'GAY':
        return 'GAY';
      case 'ASEXUAL':
        return '无性恋';
      default:
        return '未知';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setPage(page);
  };

  const getColumnWidth = (columnKey: ColumnKey): string => {
    switch (columnKey) {
      case 'member_no':
        return 'w-[120px]';
      case 'actions':
        return 'w-[200px]';
      case 'wechat':
        return 'min-w-[150px]';
      case 'phone':
        return 'min-w-[120px]';
      case 'type':
      case 'status':
      case 'gender':
        return 'min-w-[100px]';
      case 'birth_year':
      case 'height':
      case 'weight':
        return 'min-w-[80px]';
      case 'education':
      case 'occupation':
      case 'house_car':
      case 'children_plan':
      case 'marriage_cert':
      case 'marriage_history':
      case 'sexual_orientation':
        return 'min-w-[120px]';
      case 'province':
      case 'city':
      case 'district':
      case 'hukou_province':
      case 'hukou_city':
        return 'min-w-[100px]';
      case 'target_area':
      case 'self_description':
      case 'partner_requirement':
        return 'min-w-[200px]';
      default:
        return 'min-w-[120px]';
    }
  };

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [activateReason, setActivateReason] = useState('');
  const [activateLoading, setActivateLoading] = useState(false);

  const [targetMemberNo, setTargetMemberNo] = useState('');

  const handleMatch = async (memberId: string) => {
    if (!targetMemberNo.trim()) {
      toast({
        variant: 'destructive',
        title: '匹配失败',
        description: '请输入目标会员编号'
      });
      return;
    }

    setMatchLoading(true);
    try {
      const response = await fetch('/api/members/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          targetMemberNo,
          matchedBy: session?.user?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '会员匹配失败');
      }

      toast({
        title: '会员匹配成功',
        description: '已成功匹配会员'
      });

      setMatchDialogOpen(false);
      setTargetMemberNo('');
      fetchMembers();
    } catch (error) {
      console.error('会员匹配失败:', error);
      toast({
        variant: 'destructive',
        title: '会员匹配失败',
        description: error instanceof Error ? error.message : (error as { message?: string })?.message || '操作失败，请重试'
      });
    } finally {
      setMatchLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center p-4">加载中...</div>;
  }

  const handleActivate = async (memberId: string) => {
    if (!activateReason.trim()) {
      toast({
        variant: 'destructive',
        title: '激活失败',
        description: '请输入激活原因'
      });
      return;
    }

    setActivateLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || ''
        },
        body: JSON.stringify({
          reason: activateReason,
          notes: ''
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '会员激活失败');
      }

      toast({
        title: '会员激活成功',
        description: '已将会员状态更新为激活'
      });

      setActivateDialogOpen(false);
      setActivateReason('');
      fetchMembers();
    } catch (error) {
      console.error('会员激活失败:', error);
      toast({
        variant: 'destructive',
        title: '会员激活失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setActivateLoading(false);
    }
  };

  const handleRevoke = async (memberId: string) => {
    if (!revokeReason.trim()) {
      toast({
        variant: 'destructive',
        title: '撤销失败',
        description: '请输入撤销原因'
      });
      return;
    }

    setRevokeLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: revokeReason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '会员撤销失败');
      }

      toast({
        title: '会员撤销成功',
        description: '已将会员状态更新为撤销'
      });

      setRevokeDialogOpen(false);
      setRevokeReason('');
      fetchMembers();
    } catch (error) {
      console.error('会员撤销失败:', error);
      toast({
        variant: 'destructive',
        title: '会员撤销失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedMemberId || !upgradeType) return;
    
    setUpgradeLoading(true);
    try {
      const paymentTime = upgradeDate.toISOString().slice(0, 19).replace('T', ' ');
      const expiryTime = upgradeType === 'ANNUAL' 
        ? new Date(upgradeDate.getFullYear() + 1, upgradeDate.getMonth(), upgradeDate.getDate() - 1).toISOString().slice(0, 19).replace('T', ' ')
        : null;
      
      const response = await fetch(`/api/members/${selectedMemberId}/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: upgradeType,
          payment_time: paymentTime,
          expiry_time: expiryTime,
          notes: `${new Date().toLocaleString('zh-CN')} 将会员升级为${upgradeType === 'ONE_TIME' ? '一次性会员' : '年费会员'}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '会员升级失败');
      }

      toast({
        title: '会员升级成功',
        description: `已将会员升级为${upgradeType === 'ONE_TIME' ? '一次性会员' : '年费会员'}`
      });

      setUpgradeDialogOpen(false);
      fetchMembers();
    } catch (error) {
      console.error('会员升级失败:', error);
      toast({
        variant: 'destructive',
        title: '会员升级失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}/delete`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '删除失败');
      }

      toast({
        title: '删除成功',
        description: '会员数据已删除'
      });

      setDeleteDialogOpen(false);
      setSelectedMemberId(null);
      fetchMembers();
    } catch (error) {
      console.error('删除会员失败:', error);
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>激活会员</DialogTitle>
            <DialogDescription>
              请输入激活原因
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">激活原因</label>
              <Input
                value={activateReason}
                onChange={(e) => setActivateReason(e.target.value)}
                placeholder="请输入激活原因"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>取消</Button>
            <Button onClick={() => handleActivate(selectedMemberId!)} disabled={activateLoading}>
              {activateLoading ? '激活中...' : '确认激活'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销会员</DialogTitle>
            <DialogDescription>
              请输入撤销原因
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">撤销原因</label>
              <Input
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="请输入撤销原因"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>取消</Button>
            <Button onClick={() => handleRevoke(selectedMemberId!)} disabled={revokeLoading}>
              {revokeLoading ? '撤销中...' : '确认撤销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>会员升级</DialogTitle>
            <DialogDescription>
              请选择要升级的会员类型
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">升级类型</label>
              <Select value={upgradeType} onValueChange={(value: 'ONE_TIME' | 'ANNUAL') => setUpgradeType(value)} disabled={selectedMemberType === 'ONE_TIME'}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择升级类型" />
                </SelectTrigger>
                <SelectContent>
                  {selectedMemberType === 'NORMAL' && <SelectItem value="ONE_TIME">一次性会员</SelectItem>}
                  {selectedMemberType !== 'ANNUAL' && <SelectItem value="ANNUAL">年费会员</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">升级时间</label>
              <Input
                type="date"
                value={upgradeDate.toISOString().split('T')[0]}
                onChange={(e) => setUpgradeDate(new Date(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>取消</Button>
            <Button onClick={handleUpgrade} disabled={upgradeLoading}>
              {upgradeLoading ? '升级中...' : '确认升级'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>匹配会员</DialogTitle>
            <DialogDescription>
              <div className="flex items-center space-x-4 mb-4 mt-[50px] bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">{memberCounts.NORMAL}</div>
                    <div className="text-sm text-gray-600">普通会员</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{memberCounts.ONE_TIME}</div>
                    <div className="text-sm text-gray-600">一次性会员</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">{memberCounts.ANNUAL}</div>
                    <div className="text-sm text-gray-600">年费会员</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium">目标会员编号</label>
                <Input
                  value={targetMemberNo}
                  onChange={(e) => setTargetMemberNo(e.target.value)}
                  placeholder="请输入目标会员编号"
                  className="w-full"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">目标会员编号</label>
              <Input
                value={targetMemberNo}
                onChange={(e) => setTargetMemberNo(e.target.value)}
                placeholder="请输入目标会员编号"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>取消</Button>
            <Button onClick={() => handleMatch(selectedMemberId!)} disabled={matchLoading}>
              {matchLoading ? '匹配中...' : '确认匹配'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除会员</DialogTitle>
            <DialogDescription>
              确定要删除这个会员吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(selectedMemberId!)}
              disabled={deleteLoading}
            >
              {deleteLoading ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-[40px] bg-white flex items-center px-4 space-x-2 border-b fixed top-[48px] right-0 left-[294px] z-50">
          <div className="relative column-selector">
            <Button
              variant="outline"
              className="flex items-center gap-2 text-[13px] h-[26px]"
              onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3h18v18H3zM12 3v18M3 12h18" />
              </svg>
              显示字段
            </Button>
            {isColumnSelectorOpen && (
              <div className="column-selector absolute top-[40px] left-4 bg-white border rounded-md shadow-lg p-4 z-[1002] w-[280px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-medium text-sm">选择显示字段</h3>
                    <span className="text-[12px] text-gray-500">
                      已选 {selectedColumns.length} 项
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {availableColumns.map(({ key, label }) => (
                      <label key={key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(key as ColumnKey)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleColumnChange([...selectedColumns, key as ColumnKey]);
                            } else {
                              handleColumnChange(selectedColumns.filter(col => col !== key));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-[13px] text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <Link href="/members/new">
            <Button className="bg-primary text-white text-[13px] h-[26px]">
              新增会员
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">会员编号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">微信号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">手机号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">会员类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[120px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[120px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[80px]" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-[100px]" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-[13px] mt-[40px]">暂无会员数据</div>
        ) : (
          <>
            <div className="flex items-center space-x-4">
              <Input
                placeholder="搜索会员编号/微信/手机"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setSearchTerm(e.target.value);
                  fetchMembers();
                }}
                className="w-[240px]"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchKeyword('');
                  fetchMembers();
                }}
              >
                重置
              </Button>
            </div>
            <div className="overflow-auto flex-1 pb-10">
              <div className="relative">
                <table className="w-full min-w-[1200px]">
                  <thead className="sticky top-0 bg-[#f2f2f2] z-40">
                    <tr className="border-b">
                      {selectedColumns.map((columnKey: ColumnKey) => {
                        const column = availableColumns.find(col => col.key === columnKey);
                        return column ? (
                          <th key={column.key} className={`py-3 px-4 text-left text-[13px] whitespace-nowrap ${getColumnWidth(column.key)} ${columnKey === 'actions' ? 'sticky right-0 bg-[#f2f2f2] shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.15)]' : ''}`}>{column.label}</th>
                        ) : null;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b hover:bg-gray-50 h-10">
                        {selectedColumns.map((columnKey: ColumnKey) => (
                          <td key={columnKey} className={`py-3 px-4 text-[13px] whitespace-nowrap ${getColumnWidth(columnKey)} ${columnKey === 'actions' ? 'sticky right-0 bg-white shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.15)]' : ''}`}>
                            {columnKey === 'type' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-[26px] text-[13px]"
                                onClick={() => {
                                  if (member.type === 'NORMAL' || member.type === 'ONE_TIME') {
                                    setSelectedMemberId(member.id);
                                    setSelectedMemberType(member.type);
                                    setUpgradeType(member.type === 'ONE_TIME' ? 'ANNUAL' : 'ONE_TIME');
                                    setUpgradeDialogOpen(true);
                                  }
                                }}
                              >
                                {getMemberTypeText(member.type, member.remaining_matches)}
                              </Button>
                            ) :
                             columnKey === 'gender' ? getGenderText(member.gender) :
                             columnKey === 'house_car' ? getHouseCarText(member.house_car) :
                             columnKey === 'children_plan' ? getChildrenPlanText(member.children_plan) :
                             columnKey === 'marriage_cert' ? getMarriageCertText(member.marriage_cert) :
                             columnKey === 'marriage_history' ? getMarriageHistoryText(member.marriage_history) :
                             columnKey === 'sexual_orientation' ? getSexualOrientationText(member.sexual_orientation) :
                             columnKey === 'education' ? getEducationText(member.education) :
                             columnKey === 'status' ? (
                              <span className={`px-2 py-1 rounded-full text-[13px] ${member.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : member.status === 'REVOKED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                {member.status === 'ACTIVE' ? '激活' : member.status === 'REVOKED' ? '撤销' : '成功'}
                              </span>
                             ) :
                             columnKey === 'actions' ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-[26px] text-[13px]"
                                  onClick={() => router.push(`/members/${member.id}`)}
                                >
                                  查看
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-[26px] text-[13px]"
                                  onClick={() => router.push(`/members/${member.id}/edit`)}
                                >
                                  编辑
                                </Button>
                                {member.status === 'ACTIVE' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-[26px] text-[13px] text-blue-500 hover:text-blue-500"
                                      onClick={() => {
                                        if (member.remaining_matches <= 0) {
                                          toast({
                                            variant: 'destructive',
                                            title: '匹配失败',
                                            description: '该用户匹配次数为0，无法匹配'
                                          });
                                          return;
                                        }
                                        setSelectedMemberId(member.id);
                                        setMatchDialogOpen(true);
                                      }}
                                      disabled={loading || member.status !== 'ACTIVE'}
                                    >
                                      匹配
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-[26px] text-[13px] text-red-500 hover:text-red-500"
                                      onClick={() => {
                                        setSelectedMemberId(member.id);
                                        setRevokeReason('');
                                        setRevokeDialogOpen(true);
                                      }}
                                    >
                                      撤销
                                    </Button>
                                  </>
                                )}
                                {member.status === 'REVOKED' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMemberId(member.id);
                                      setActivateDialogOpen(true);
                                    }}
                                  >
                                    激活
                                  </Button>
                                )}
                                {member.status === 'REVOKED' && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMemberId(member.id);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-[13px] h-[26px]"
                                  >
                                    删除
                                  </Button>
                                )}
                              </div>
                             ) :
                             columnKey === 'created_at' ? new Date(member[columnKey]).toLocaleString() :
                             String(member[columnKey as keyof Member])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="h-[36px] flex items-center justify-between border-t fixed bottom-0 left-[294px] right-0 bg-white z-50 px-4">
              <div className="text-[13px] text-gray-500">
                共 {totalCount} 条记录
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="text-[13px] h-[26px]"
                >
                  上一页
                </Button>
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    const halfVisible = Math.floor(maxVisiblePages / 2);
                    
                    // 始终显示第一页
                    pages.push(
                      <Button
                        key={1}
                        variant={1 === currentPage ? "default" : "outline"}
                        onClick={() => handlePageChange(1)}
                        className="min-w-[40px] text-[13px] h-[26px]"
                      >
                        1
                      </Button>
                    );

                    let startPage = Math.max(2, currentPage - halfVisible);
                    let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

                    // 调整以确保显示正确数量的页码
                    if (currentPage <= halfVisible + 1) {
                      endPage = Math.min(totalPages - 1, maxVisiblePages - 1);
                    } else if (currentPage >= totalPages - halfVisible) {
                      startPage = Math.max(2, totalPages - maxVisiblePages + 1);
                    }

                    // 添加前省略号
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis-start" className="px-2">...</span>
                      );
                    }

                    // 添加中间页码
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={i === currentPage ? "default" : "outline"}
                          onClick={() => handlePageChange(i)}
                          className="min-w-[40px] text-[13px] h-[26px]"
                        >
                          {i}
                        </Button>
                      );
                    }

                    // 添加后省略号
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis-end" className="px-2">...</span>
                      );
                    }

                    // 始终显示最后一页
                    if (totalPages > 1) {
                      pages.push(
                        <Button
                          key={totalPages}
                          variant={totalPages === currentPage ? "default" : "outline"}
                          onClick={() => handlePageChange(totalPages)}
                          className="min-w-[40px] text-[13px] h-[26px]"
                        >
                          {totalPages}
                        </Button>
                      );
                    }

                    return pages;
                  })()} 
                </div>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="text-[13px] h-[26px]"
                >
                  下一页
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    }>
      <MembersPageContent />
    </Suspense>
  );
}