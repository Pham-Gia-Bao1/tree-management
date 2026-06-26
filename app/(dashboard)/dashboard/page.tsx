'use client';

import { useMemo } from 'react';
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
import { useDashboard } from '@/hooks/useDashboard';
import type {
  RecentMentorRequest,
  RecentTrainingRelation,
  RecentNotification,
  BranchUserStat,
  CourseProgressStat,
} from '@/types/dashboard.types';

const { Title, Text } = Typography;

export function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

/**
 * Format a date string to DD-MM-YYYY HH:MM
 */
export function formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return '';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

/**
 * Parse DD-MM-YYYY string to ISO date string (YYYY-MM-DD)
 */
export function parseDDMMYYYY(value: string): string {
    const [dd, mm, yyyy] = value.split('-');
    return `${yyyy}-${mm}-${dd}`;
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
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title level={5} style={{ margin: '0 0 12px 0', color: '#374151' }}>
      {children}
    </Title>
  );
}

/* ─── Horizontal bar chart ───────────────────────────────── */
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
    () =>
      Math.max(
        ...data.map((d) => Number(d[valueKey]) || 0),
        1
      ),
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
                <Text
                  ellipsis
                  style={{ maxWidth: 160, fontSize: 13, color: '#374151' }}
                >
                  {label}
                </Text>
              </Tooltip>

              <Text strong style={{ fontSize: 13 }}>
                {value}
              </Text>
            </div>

            <Progress
              percent={pct}
              showInfo={false}
              strokeColor={color}
              size="small"
            />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Donut-style pie with Progress.Circle ───────────────── */
function PieChart({
  data,
}: {
  data: { status: string; total: number }[];
}) {
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
          <div
            key={item.status}
            style={{ textAlign: 'center', minWidth: 100 }}
          >
            <Progress
              type="circle"
              percent={pct}
              size={90}
              strokeColor={COLORS[item.status] ?? '#6366f1'}
              format={() => (
                <span style={{ fontSize: 18, fontWeight: 700 }}>
                  {item.total}
                </span>
              )}
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#6B7280' }}>
              {item.status}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 12, color: '#9CA3AF', alignSelf: 'flex-end' }}>
        Total: {total}
      </div>
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
    render: (v: string) => (
      <span style={{ fontSize: 13, color: '#6B7280' }}>{formatDate(v)}</span>
    ),
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
    render: (v: string) => (
      <span style={{ fontSize: 13, color: '#6B7280' }}>{formatDate(v)}</span>
    ),
  },
];

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const { dashboard, loading, refreshDashboard } = useDashboard();

  const kpiCards = useMemo(
    () => [
      {
        title: 'Total Users',
        value: dashboard?.overview.totalUsers ?? 0,
        icon: <TeamOutlined style={{ fontSize: 22, color: '#6366f1' }} />,
        color: '#ede9fe',
      },
      {
        title: 'Mentors',
        value: dashboard?.overview.totalMentors ?? 0,
        icon: <UserOutlined style={{ fontSize: 22, color: '#0ea5e9' }} />,
        color: '#e0f2fe',
      },
      {
        title: 'Members',
        value: dashboard?.overview.totalMembers ?? 0,
        icon: <UserAddOutlined style={{ fontSize: 22, color: '#f59e0b' }} />,
        color: '#fef3c7',
      },
      {
        title: 'Branches',
        value: dashboard?.overview.totalBranches ?? 0,
        icon: <ApartmentOutlined style={{ fontSize: 22, color: '#10b981' }} />,
        color: '#d1fae5',
      },
      {
        title: 'Courses',
        value: dashboard?.overview.totalCourses ?? 0,
        icon: <BookOutlined style={{ fontSize: 22, color: '#8b5cf6' }} />,
        color: '#ede9fe',
      },
      {
        title: 'Active Relations',
        value: dashboard?.overview.activeTrainingRelations ?? 0,
        icon: <NodeIndexOutlined style={{ fontSize: 22, color: '#3b82f6' }} />,
        color: '#dbeafe',
      },
      {
        title: 'Completed',
        value: dashboard?.overview.completedTrainingRelations ?? 0,
        icon: <CheckCircleOutlined style={{ fontSize: 22, color: '#22c55e' }} />,
        color: '#dcfce7',
      },
      {
        title: 'Pending Requests',
        value: dashboard?.overview.pendingMentorRequests ?? 0,
        icon: <ClockCircleOutlined style={{ fontSize: 22, color: '#f97316' }} />,
        color: '#ffedd5',
      },
    ],
    [dashboard],
  );

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
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void refreshDashboard()}
        >
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
              <Card
                styles={{ body: { padding: '16px 20px' } }}
                style={{ borderRadius: 10 }}
              >
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
                    title={
                      <span style={{ fontSize: 12, color: '#6B7280' }}>
                        {kpi.title}
                      </span>
                    }
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
  data={dashboard?.charts.usersByBranch ?? []}
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
              <PieChart data={dashboard?.charts.trainingStatus ?? []} />
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Course Progress ── */}
      <Card title={<SectionTitle>Course Progress (Completions)</SectionTitle>}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : (
          <BarChart
            data={dashboard?.charts.courseProgress as CourseProgressStat[] ?? []}
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
            dataSource={dashboard?.recentMentorRequests ?? []}
            columns={mentorRequestColumns}
            pagination={false}
            size="small"
            locale={{ emptyText: <Empty description="No recent requests" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
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
            dataSource={dashboard?.recentTrainingRelations ?? []}
            columns={trainingColumns}
            pagination={false}
            size="small"
            locale={{ emptyText: <Empty description="No recent training relations" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        )}
      </Card>

      {/* ── Recent Notifications ── */}
      <Card title={<SectionTitle>Recent Notifications</SectionTitle>}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <List<RecentNotification>
            dataSource={dashboard?.recentNotifications ?? []}
            locale={{ emptyDescription: 'No notifications' }}
            renderItem={(item) => (
              <List.Item
                style={{ padding: '10px 0' }}
                extra={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDate(item.createdAt)}
                  </Text>
                }
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
                      <CloseCircleOutlined
                        style={{ color: '#6366f1', fontSize: 14 }}
                      />
                    </div>
                  }
                  title={
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {item.title}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
