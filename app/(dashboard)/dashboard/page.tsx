'use client';

import { useMemo } from 'react';
import {
    Avatar,
    Button,
    Card,
    Col,
    Empty,
    List,
    Row,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import {
    ApartmentOutlined,
    BellOutlined,
    BookOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    NodeIndexOutlined,
    ReloadOutlined,
    TeamOutlined,
    UserAddOutlined,
    UserOutlined,
} from '@ant-design/icons';

import {
    Bar,
    Column,
    Pie,
} from '@ant-design/charts';

import { useDashboard } from '@/hooks/useDashboard';
import { formatDate, formatDateTime } from '@/utils/date';

import type {
    RecentMentorRequest,
    RecentNotification,
    RecentTrainingRelation,
} from '@/types/dashboard.types';

const { Title, Text } = Typography;

const CHART_COLORS = {
    primary: '#6366f1',
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#0ea5e9',
    purple: '#8b5cf6',
    teal: '#14b8a6',
    orange: '#f97316',
};

const STATUS_MENTOR: Record<string, { color: string; label: string }> = {
    pending: { color: 'gold', label: 'Pending' },
    approved: { color: 'success', label: 'Approved' },
    rejected: { color: 'error', label: 'Rejected' },
};

const STATUS_TRAINING: Record<string, { color: string; label: string }> = {
    in_progress: { color: 'blue', label: 'In Progress' },
    completed: { color: 'green', label: 'Completed' },
};

function KpiSkeleton() {
    return (
        <Card style={{ borderRadius: 12, height: 110 }}>
            <Skeleton active paragraph={false} title={{ width: '60%' }} />
            <Skeleton.Input
                active
                size="large"
                style={{ width: '40%', marginTop: 8 }}
            />
        </Card>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 20,
            }}
        >
            {children}
        </div>
    );
}

const mentorCols: ColumnsType<RecentMentorRequest> = [
    {
        title: 'Requester',
        dataIndex: 'requesterName',
        render: (name: string) => (
            <Space>
                <Avatar style={{ background: '#7F77DD' }}>
                    {name.charAt(0).toUpperCase()}
                </Avatar>

                <span>{name}</span>
            </Space>
        ),
    },
    {
        title: 'Status',
        dataIndex: 'status',
        width: 120,
        render: (value: string) => {
            const cfg = STATUS_MENTOR[value];

            return (
                <Tag color={cfg?.color ?? 'default'}>
                    {(cfg?.label ?? value).toUpperCase()}
                </Tag>
            );
        },
    },
    {
        title: 'Submitted',
        dataIndex: 'createdAt',
        width: 150,
        render: (value: string) => formatDate(value),
    },
];

const trainingCols: ColumnsType<RecentTrainingRelation> = [
    {
        title: 'Mentor',
        dataIndex: 'mentorName',
        render: (name: string) => (
            <Space>
                <Avatar style={{ background: '#0ea5e9' }}>
                    {name.charAt(0).toUpperCase()}
                </Avatar>

                {name}
            </Space>
        ),
    },
    {
        title: 'Disciple',
        dataIndex: 'discipleName',
    },
    {
        title: 'Course',
        dataIndex: 'courseName',
    },
    {
        title: 'Status',
        dataIndex: 'status',
        width: 120,
        render: (value: string) => {
            const cfg = STATUS_TRAINING[value];

            return (
                <Tag color={cfg?.color ?? 'default'}>
                    {cfg?.label ?? value}
                </Tag>
            );
        },
    },
    {
        title: 'Start Date',
        dataIndex: 'startDate',
        width: 130,
        render: (value: string) => formatDate(value),
    },
];

export default function DashboardPage() {
    const { dashboard, loading, refreshDashboard } = useDashboard();

    const kpiCards = useMemo(
        () => [
            {
                title: 'Total Users',
                value: dashboard?.overview.totalUsers ?? 0,
                icon: <TeamOutlined />,
                bg: '#ede9fe',
            },
            {
                title: 'Mentors',
                value: dashboard?.overview.totalMentors ?? 0,
                icon: <UserOutlined />,
                bg: '#e0f2fe',
            },
            {
                title: 'Members',
                value: dashboard?.overview.totalMembers ?? 0,
                icon: <UserAddOutlined />,
                bg: '#fef3c7',
            },
            {
                title: 'Branches',
                value: dashboard?.overview.totalBranches ?? 0,
                icon: <ApartmentOutlined />,
                bg: '#ccfbf1',
            },
            {
                title: 'Courses',
                value: dashboard?.overview.totalCourses ?? 0,
                icon: <BookOutlined />,
                bg: '#ede9fe',
            },
            {
                title: 'Active Relations',
                value:
                    dashboard?.overview.activeTrainingRelations ?? 0,
                icon: <NodeIndexOutlined />,
                bg: '#dbeafe',
            },
            {
                title: 'Completed',
                value:
                    dashboard?.overview.completedTrainingRelations ?? 0,
                icon: <CheckCircleOutlined />,
                bg: '#dcfce7',
            },
            {
                title: 'Pending Requests',
                value:
                    dashboard?.overview.pendingMentorRequests ?? 0,
                icon: <ClockCircleOutlined />,
                bg: '#ffedd5',
            },
        ],
        [dashboard],
    );

    const branchData = useMemo(
        () =>
            (dashboard?.charts.usersByBranch ?? []).map((item) => ({
                name: item.branchName,
                total: item.total,
            })),
        [dashboard],
    );

    const trainingStatusData = useMemo(
        () =>
            (dashboard?.charts.trainingStatus ?? []).map((item) => ({
                type: item.status,
                value: item.total,
            })),
        [dashboard],
    );

    const courseData = useMemo(
        () =>
            (dashboard?.charts.courseProgress ?? []).map((item) => ({
                course: item.courseName,
                total: item.total,
            })),
        [dashboard],
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header */}

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        Dashboard
                    </Title>

                    <Text type="secondary">
                        Overview of your discipleship system
                    </Text>
                </div>

                <Button
                    icon={<ReloadOutlined />}
                    loading={loading}
                    onClick={() => void refreshDashboard()}
                >
                    Refresh
                </Button>
            </div>

            {/* KPI */}

            <Row gutter={[16, 16]}>
                {loading
                    ? Array.from({ length: 8 }).map((_, idx) => (
                          <Col key={idx} xs={24} sm={12} md={8} lg={6}>
                              <KpiSkeleton />
                          </Col>
                      ))
                    : kpiCards.map((item) => (
                          <Col
                              key={item.title}
                              xs={24}
                              sm={12}
                              md={8}
                              lg={6}
                          >
                              <Card
                                  style={{ borderRadius: 12 }}
                                  styles={{
                                      body: {
                                          padding: 18,
                                      },
                                  }}
                              >
                                  <Space size={16}>
                                      <Avatar
                                          size={52}
                                          style={{
                                              background: item.bg,
                                              color: CHART_COLORS.primary,
                                          }}
                                          icon={item.icon}
                                      />

                                      <Statistic
                                          title={item.title}
                                          value={item.value}
                                      />
                                  </Space>
                              </Card>
                          </Col>
                      ))}
            </Row>

            {/* Charts */}

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                    <Card style={{ borderRadius: 12 }}>
                        <SectionTitle>
                            👥 Users By Branch
                        </SectionTitle>

                        {loading ? (
                            <Skeleton active paragraph={{ rows: 6 }} />
                        ) : branchData.length === 0 ? (
                            <Empty />
                        ) : (
                            <Bar
                                height={320}
                                data={branchData}
                                xField="name"
                                yField="total"
                                seriesField="name"
                                legend={false}
                            />
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={10}>
                    <Card style={{ borderRadius: 12 }}>
                        <SectionTitle>
                            📊 Training Status
                        </SectionTitle>

                        {loading ? (
                            <Skeleton active paragraph={{ rows: 6 }} />
                        ) : (
                            <Pie
                                height={320}
                                data={trainingStatusData}
                                angleField="value"
                                colorField="type"
                                innerRadius={0.6}
                                label={{
                                    text: 'value',
                                    position: 'outside',
                                }}
                                legend={{
                                    position: 'bottom',
                                }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            <Card style={{ borderRadius: 12 }}>
                <SectionTitle>
                    📚 Course Completions
                </SectionTitle>

                {loading ? (
                    <Skeleton active paragraph={{ rows: 5 }} />
                ) : (
                    <Column
                        height={320}
                        data={courseData}
                        xField="course"
                        yField="total"
                        colorField="course"
                        legend={false}
                    />
                )}
            </Card>

            {/* Tables */}

            <Row gutter={[16, 16]}>
                <Col xs={24} xl={12}>
                    <Card
                        title="🙋 Recent Mentor Requests"
                        style={{ borderRadius: 12 }}
                        styles={{ body: { padding: 0 } }}
                    >
                        <Table
                            rowKey="id"
                            columns={mentorCols}
                            dataSource={
                                dashboard?.recentMentorRequests ?? []
                            }
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>

                <Col xs={24} xl={12}>
                    <Card
                        title="🔗 Recent Training Relations"
                        style={{ borderRadius: 12 }}
                        styles={{ body: { padding: 0 } }}
                    >
                        <Table
                            rowKey="id"
                            columns={trainingCols}
                            dataSource={
                                dashboard?.recentTrainingRelations ?? []
                            }
                            pagination={false}
                            size="small"
                            scroll={{ x: 600 }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Notifications */}

            <Card
                title="🔔 Recent Notifications"
                style={{ borderRadius: 12 }}
            >
                <List
                    dataSource={
                        dashboard?.recentNotifications ?? []
                    }
                    locale={{
                        emptyText: 'No notifications',
                    }}
                    renderItem={(item: RecentNotification) => (
                        <List.Item
                            extra={
                                <Text type="secondary">
                                    {formatDateTime(item.createdAt)}
                                </Text>
                            }
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar
                                        icon={<BellOutlined />}
                                        style={{
                                            background:
                                                CHART_COLORS.primary,
                                        }}
                                    />
                                }
                                title={item.title}
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
}
