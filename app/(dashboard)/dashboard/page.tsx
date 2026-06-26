'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  List,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ApartmentOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';

// Types
import type {
  RecentMentorRequest,
  RecentTrainingRelation,
  RecentNotification,
  BranchUserStat,
  CourseProgressStat,
  TrainingStatusStat,
  DashboardOverview,
} from '@/types/dashboard.types';
import type { UserRecord } from '@/types/user.types';
import type { BranchRecord } from '@/types/branch.types';
import type { CourseRecord } from '@/types/course.types';
import type { TrainingRelationRecord } from '@/types/training-link.types';

// We'll define a minimal type for mentor requests (from /api/mentor-requests)
interface MentorRequest {
  id: string;
  status: string;
  requester?: { name: string } | null;
  createdAt: string;
}

const { Title, Text } = Typography;

/* ─── Date helpers ───────────────────────────────────────── */

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/* ─── Status config ──────────────────────────────────────── */
const MENTOR_REQUEST_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: 'gold', label: 'Pending' },
  approved: { color: 'success', label: 'Approved' },
  rejected: { color: 'error', label: 'Rejected' },
};

const TRAINING_STATUS: Record<string, { color: string; label: string }> = {
  in_progress: { color: 'blue', label: 'In Progress' },
  completed: { color: 'green', label: 'Completed' },
};

/* ─── KPI card skeleton ──────────────────────────────────── */
function KpiSkeleton() {
  return (
    <Card style={{ height: 120 }}>
      <Skeleton active paragraph={false} title={{ width: '60%' }} />
      <Skeleton.Input active size="large" style={{ width: '40%', marginTop: 8 }} />
    </Card>
  );
}

/* ─── Section title ──────────────────────────────────────── */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Title level={5} style={{ margin: '0 0 12px 0', color: '#374151' }}>
      {children}
    </Title>
  );
}

/* ─── Horizontal bar chart ──────────────────────────────── */
function BarChart<T extends object>({
  data,
  labelKey,
  valueKey,
  color = '#6366f1',
}: {
  data: T[];
  labelKey: keyof T;
  valueKey: keyof T;
  color?: string;
}) {
  const max = useMemo(
    () => Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1),
    [data, valueKey],
  );

  if (data.length === 0) {
    return <Empty description="No data" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((row, i) => {
        const label = String(row[labelKey]);
        const value = Number(row[valueKey]);
        const pct = Math.round((value / max) * 100);
        return (
          <div key={i}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
                fontSize: 13,
              }}
            >
              <Tooltip title={label}>
                <Text ellipsis style={{ maxWidth: 160, fontSize: 13, color: '#374151' }}>
                  {label}
                </Text>
              </Tooltip>
              <Text strong style={{ fontSize: 13 }}>
                {value}
              </Text>
            </div>
            <Progress percent={pct} showInfo={false} strokeColor={color} size="small" />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Donut-style pie with Progress.Circle ───────────────── */
function PieChart({ data }: { data: TrainingStatusStat[] }) {
  const total = useMemo(() => data.reduce((s, d) => s + d.total, 0), [data]);

  const COLORS: Record<string, string> = {
    'In Progress': '#3b82f6',
    Completed: '#22c55e',
  };

  if (total === 0) {
    return <Empty description="No data" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {data.map((item) => {
        const pct = total > 0 ? Math.round((item.total / total) * 100) : 0;
        return (
          <div key={item.status} style={{ textAlign: 'center', minWidth: 100 }}>
            <Progress
              type="circle"
              percent={pct}
              size={90}
              strokeColor={COLORS[item.status] ?? '#6366f1'}
              format={() => <span style={{ fontSize: 18, fontWeight: 700 }}>{item.total}</span>}
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#6B7280' }}>{item.status}</div>
          </div>
        );
      })}
      <div style={{ fontSize: 12, color: '#9CA3AF', alignSelf: 'flex-end' }}>Total: {total}</div>
    </div>
  );
}

/* ─── Mentor requests columns ────────────────────────────── */
const mentorRequestColumns: ColumnsType<RecentMentorRequest> = [
  {
    title: 'Requester',
    dataIndex: 'requesterName',
    render: (name: string) => (
      <Space size={6}>
        <Avatar size={24} style={{ background: '#7F77DD', fontSize: 11 }}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <span style={{ fontSize: 13 }}>{name}</span>
      </Space>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (v: string) => {
      const cfg = MENTOR_REQUEST_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={cfg.color}>{cfg.label.toUpperCase()}</Tag>;
    },
  },
  {
    title: 'Submitted',
    dataIndex: 'createdAt',
    render: (v: string) => <span style={{ fontSize: 13, color: '#6B7280' }}>{formatDate(v)}</span>,
  },
];

/* ─── Training relations columns ─────────────────────────── */
const trainingColumns: ColumnsType<RecentTrainingRelation> = [
  {
    title: 'Mentor',
    dataIndex: 'mentorName',
    render: (name: string) => (
      <Space size={6}>
        <Avatar size={24} style={{ background: '#0ea5e9', fontSize: 11 }}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <span style={{ fontSize: 13 }}>{name}</span>
      </Space>
    ),
  },
  {
    title: 'Disciple',
    dataIndex: 'discipleName',
    render: (name: string) => <span style={{ fontSize: 13 }}>{name}</span>,
  },
  {
    title: 'Course',
    dataIndex: 'courseName',
    render: (name: string) => <span style={{ fontSize: 13 }}>{name}</span>,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (v: string) => {
      const cfg = TRAINING_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={cfg.color}>{cfg.label}</Tag>;
    },
  },
  {
    title: 'Start Date',
    dataIndex: 'startDate',
    render: (v: string) => <span style={{ fontSize: 13, color: '#6B7280' }}>{formatDate(v)}</span>,
  },
];

/* ─── Main Page ───────────────────────────────────────────── */
export default function DashboardPage() {
  // ── State ──
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview>({
    totalUsers: 0,
    totalMentors: 0,
    totalMembers: 0,
    totalBranches: 0,
    totalCourses: 0,
    activeTrainingRelations: 0,
    completedTrainingRelations: 0,
    pendingMentorRequests: 0,
  });
  const [usersByBranch, setUsersByBranch] = useState<BranchUserStat[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatusStat[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgressStat[]>([]);
  const [recentMentorRequests, setRecentMentorRequests] = useState<RecentMentorRequest[]>([]);
  const [recentTrainingRelations, setRecentTrainingRelations] = useState<RecentTrainingRelation[]>([]);
  // Notifications: we'll skip or derive from training relations for demo; set empty.
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);

  const [error, setError] = useState<string | null>(null);

  // ── Fetch helper ──
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch all needed resources in parallel
      const [usersRes, branchesRes, coursesRes, trainingRes, mentorRequestsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/branches'),
        fetch('/api/courses'),
        fetch('/api/training-relations'),
        fetch('/api/mentor-requests'),
      ]);

      if (!usersRes.ok) throw new Error('Failed to fetch users');
      if (!branchesRes.ok) throw new Error('Failed to fetch branches');
      if (!coursesRes.ok) throw new Error('Failed to fetch courses');
      if (!trainingRes.ok) throw new Error('Failed to fetch training relations');
      if (!mentorRequestsRes.ok) throw new Error('Failed to fetch mentor requests');

      const usersData = (await usersRes.json()).data as UserRecord[];
      const branchesData = (await branchesRes.json()).data as BranchRecord[];
      const coursesData = (await coursesRes.json()).data as CourseRecord[];
      const trainingData = (await trainingRes.json()).data as TrainingRelationRecord[];
      const mentorRequestsData = (await mentorRequestsRes.json()).data as MentorRequest[];

      // ── Compute overview ──
      const totalUsers = usersData.length;
      const totalMentors = usersData.filter((u) => u.roles.includes('MENTOR')).length;
      const totalMembers = usersData.filter((u) => u.roles.includes('MEMBER')).length;
      const totalBranches = branchesData.length;
      const totalCourses = coursesData.length;
      const activeTrainingRelations = trainingData.filter((t) => t.status === 'in_progress').length;
      const completedTrainingRelations = trainingData.filter((t) => t.status === 'completed').length;
      const pendingMentorRequests = mentorRequestsData.filter((r) => r.status === 'pending').length;

      setOverview({
        totalUsers,
        totalMentors,
        totalMembers,
        totalBranches,
        totalCourses,
        activeTrainingRelations,
        completedTrainingRelations,
        pendingMentorRequests,
      });

      // ── Users by Branch ──
      const branchMap = new Map(branchesData.map((b) => [b.id, b.name]));
      const branchCounts = new Map<string, number>();
      usersData.forEach((u) => {
        if (u.branchId) {
          branchCounts.set(u.branchId, (branchCounts.get(u.branchId) || 0) + 1);
        }
      });
      const byBranch: BranchUserStat[] = Array.from(branchCounts.entries()).map(([id, count]) => ({
        branchName: branchMap.get(id) || id,
        total: count,
      }));
      byBranch.sort((a, b) => b.total - a.total);
      setUsersByBranch(byBranch);

      // ── Training Status ──
      const statusCounts = new Map<string, number>();
      trainingData.forEach((t) => {
        statusCounts.set(t.status, (statusCounts.get(t.status) || 0) + 1);
      });
      const statusStats: TrainingStatusStat[] = Array.from(statusCounts.entries()).map(([status, total]) => ({
        status: status === 'in_progress' ? 'In Progress' : 'Completed',
        total,
      }));
      setTrainingStatus(statusStats);

      // ── Course Progress ──
      const courseMap = new Map(coursesData.map((c) => [c.id, c.name]));
      const courseCounts = new Map<string, number>();
      trainingData.forEach((t) => {
        if (t.courseId) {
          courseCounts.set(t.courseId, (courseCounts.get(t.courseId) || 0) + 1);
        }
      });
      const progressStats: CourseProgressStat[] = Array.from(courseCounts.entries()).map(([id, count]) => ({
        courseName: courseMap.get(id) || id,
        total: count,
      }));
      progressStats.sort((a, b) => b.total - a.total);
      setCourseProgress(progressStats);

      // ── Recent Mentor Requests (last 5) ──
      const sortedRequests = mentorRequestsData
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          requesterName: r.requester?.name || 'Unknown',
          status: r.status,
          createdAt: r.createdAt,
        }));
      setRecentMentorRequests(sortedRequests);

      // ── Recent Training Relations (last 5 by createdAt) ──
      const sortedTraining = trainingData
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          mentorName: t.mentorName || 'Unknown',
          discipleName: t.discipleName || 'Unknown',
          courseName: t.courseName || 'Unknown',
          status: t.status,
          startDate: t.startDate,
        }));
      setRecentTrainingRelations(sortedTraining);

      // ── Recent Notifications (skip for now) ──
      setRecentNotifications([]);
    } catch (err) {
      console.error('[Dashboard] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── KPI cards ──
  const kpiCards = useMemo(
    () => [
      {
        title: 'Total Users',
        value: overview.totalUsers,
        icon: <TeamOutlined style={{ fontSize: 22, color: '#6366f1' }} />,
        color: '#ede9fe',
      },
      {
        title: 'Mentors',
        value: overview.totalMentors,
        icon: <UserOutlined style={{ fontSize: 22, color: '#0ea5e9' }} />,
        color: '#e0f2fe',
      },
      {
        title: 'Members',
        value: overview.totalMembers,
        icon: <UserAddOutlined style={{ fontSize: 22, color: '#f59e0b' }} />,
        color: '#fef3c7',
      },
      {
        title: 'Branches',
        value: overview.totalBranches,
        icon: <ApartmentOutlined style={{ fontSize: 22, color: '#10b981' }} />,
        color: '#d1fae5',
      },
      {
        title: 'Courses',
        value: overview.totalCourses,
        icon: <BookOutlined style={{ fontSize: 22, color: '#8b5cf6' }} />,
        color: '#ede9fe',
      },
      {
        title: 'Active Relations',
        value: overview.activeTrainingRelations,
        icon: <NodeIndexOutlined style={{ fontSize: 22, color: '#3b82f6' }} />,
        color: '#dbeafe',
      },
      {
        title: 'Completed',
        value: overview.completedTrainingRelations,
        icon: <CheckCircleOutlined style={{ fontSize: 22, color: '#22c55e' }} />,
        color: '#dcfce7',
      },
      {
        title: 'Pending Requests',
        value: overview.pendingMentorRequests,
        icon: <ClockCircleOutlined style={{ fontSize: 22, color: '#f97316' }} />,
        color: '#ffedd5',
      },
    ],
    [overview],
  );

  // ── Render ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Dashboard
          </Title>
          <Text type="secondary">Overview of your discipleship system</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => fetchDashboardData()}>
          Refresh
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <Row gutter={[16, 16]}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Col key={i} xs={24} sm={12} md={8} lg={6}>
                <KpiSkeleton />
              </Col>
            ))
          : kpiCards.map((kpi) => (
              <Col key={kpi.title} xs={24} sm={12} md={8} lg={6}>
                <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: kpi.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {kpi.icon}
                    </div>
                    <Statistic
                      title={<span style={{ fontSize: 12, color: '#6B7280' }}>{kpi.title}</span>}
                      value={kpi.value}
                      valueStyle={{ fontSize: 24, fontWeight: 700 }}
                    />
                  </div>
                </Card>
              </Col>
            ))}
      </Row>

      {/* ── Charts row ── */}
      <Row gutter={[16, 16]}>
        {/* Users by Branch */}
        <Col xs={24} md={12}>
          <Card title={<SectionTitle>Users by Branch</SectionTitle>} style={{ height: '100%' }}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <BarChart<BranchUserStat>
                data={usersByBranch}
                labelKey="branchName"
                valueKey="total"
                color="#6366f1"
              />
            )}
          </Card>
        </Col>

        {/* Training Status */}
        <Col xs={24} md={12}>
          <Card title={<SectionTitle>Training Status</SectionTitle>} style={{ height: '100%' }}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <PieChart data={trainingStatus} />
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Course Progress ── */}
      <Card title={<SectionTitle>Course Progress (Completions)</SectionTitle>}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : (
          <BarChart<CourseProgressStat>
            data={courseProgress}
            labelKey="courseName"
            valueKey="total"
            color="#10b981"
          />
        )}
      </Card>

      {/* ── Recent Mentor Requests ── */}
      <Card title={<SectionTitle>Recent Mentor Requests</SectionTitle>}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <Table<RecentMentorRequest>
            rowKey="id"
            dataSource={recentMentorRequests}
            columns={mentorRequestColumns}
            pagination={false}
            size="small"
            locale={{
              emptyText: <Empty description="No recent requests" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            }}
          />
        )}
      </Card>

      {/* ── Recent Training Relations ── */}
      <Card title={<SectionTitle>Recent Training Relations</SectionTitle>}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <Table<RecentTrainingRelation>
            rowKey="id"
            dataSource={recentTrainingRelations}
            columns={trainingColumns}
            pagination={false}
            size="small"
            locale={{
              emptyText: (
                <Empty description="No recent training relations" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ),
            }}
          />
        )}
      </Card>

      {/* ── Recent Notifications ── */}
      <Card title={<SectionTitle>Recent Notifications</SectionTitle>}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <List<RecentNotification>
            dataSource={recentNotifications}
            locale={{ emptyText: 'No notifications' }}
            renderItem={(item) => (
              <List.Item
                style={{ padding: '10px 0' }}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>{formatDate(item.createdAt)}</Text>}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#ede9fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CloseCircleOutlined style={{ color: '#6366f1', fontSize: 14 }} />
                    </div>
                  }
                  title={<span style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</span>}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
