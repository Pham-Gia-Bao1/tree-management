'use client';
import { useMemo, useState } from 'react';
import {
    Typography,
    Table,
    Button,
    Tag,
    Space,
    Descriptions,
    App,
    Input,
    Card,
    Statistic,
    Row,
    Col,
    Drawer,
    Tabs,
    Avatar,
} from 'antd';
import {
    CheckOutlined,
    CloseOutlined,
    EyeOutlined,
    UserAddOutlined,
    SearchOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    StopOutlined,
} from '@ant-design/icons';
import { MENTOR_REQUESTS } from '@/lib/demoData';
const { Title, Text } = Typography;
type RequestRecord = (typeof MENTOR_REQUESTS)[number];
const STATUS_COLORS: Record<string, string> = {
    pending: 'gold',
    approved: 'success',
    rejected: 'error',
};
// Helper: Avatar + tên, dùng cho requestedBy / approvedBy / pendingApproveBy
function UserCell({ user }: { user: { name: string; email: string; avatar: string } | null }) {
    if (!user) return <Text type="secondary">—</Text>;
    return (
        <Space size={6}>
            <Avatar size={22} style={{ background: '#7F77DD', fontSize: 11 }}>
                {user.avatar}
            </Avatar>
            <div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: '#656d76' }}>{user.email}</div>
            </div>
        </Space>
    );
}
export default function MentorRequestsPage() {
    const { message, modal } = App.useApp();
    const isAdmin = true;
    const userId = '101';
    const currentAdmin = { id: 'adm1', name: 'Admin Tuan', email: 'tuan@admin.com', avatar: 'AT' };
    const [data, setData] = useState<RequestRecord[]>(MENTOR_REQUESTS);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState(isAdmin ? 'task-pending' : 'my-requests');
    const [viewRecord, setViewRecord] = useState<RequestRecord | null>(null);
    const [viewOpen, setViewOpen] = useState(false);
    const filteredData = useMemo(() => {
        let source: RequestRecord[] = [];
        if (isAdmin) {
            source = activeTab === 'task-pending'
                ? data.filter(i => i.status === 'pending')
                : data;
        } else {
            source = activeTab === 'my-requests'
                ? data.filter(i => i.userId === userId)
                : data.filter(i => i.userId === userId && i.status !== 'pending');
        }
        return source.filter(item =>
            !search ||
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.branch.toLowerCase().includes(search.toLowerCase()) ||
            item.contact.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search, activeTab, isAdmin, userId]);
    const stats = useMemo(() => ({
        total: data.length,
        pending: data.filter(i => i.status === 'pending').length,
        approved: data.filter(i => i.status === 'approved').length,
        rejected: data.filter(i => i.status === 'rejected').length,
}), [data]);
    const handleApprove = (record: RequestRecord) => {
        modal.confirm({
            title: 'Approve Mentor Request',
            content: (
                <div>
                    <div className="font-medium mb-2">{record.name}</div>
                    <div className="text-gray-500 text-sm">
                        A virtual mentor account will be created automatically.
                    </div>
                </div>
            ),
            okText: 'Approve',
            onOk: () => {
                setData(prev => prev.map(item =>
                    item.id === record.id
                        ? ({ ...item, status: 'approved', approvedBy: currentAdmin } as RequestRecord)
                        : item
                ));
                message.success('Mentor approved successfully');
            },
        });
    };
    const handleReject = (record: RequestRecord) => {
        modal.confirm({
            title: 'Reject Mentor Request',
            content: `Reject request from ${record.name}?`,
            okText: 'Reject',
            okButtonProps: { danger: true },
            onOk: () => {
                setData(prev => prev.map(item =>
                    item.id === record.id
                        ? ({ ...item, status: 'rejected', approvedBy: currentAdmin } as RequestRecord)
                        : item
                ));
                message.success('Request rejected');
            },
        });
    };
    const baseColumns = [
        {
            title: 'Applicant',
            dataIndex: 'name',
            key: 'name',
            render: (_: string, record: RequestRecord) => (
                <div>
                    <div className="font-medium text-[#24292f]">{record.name}</div>
                    <div className="text-xs text-[#656d76]">{record.contact}</div>
                </div>
            ),
        },
        {
            title: 'Request By',
            key: 'requestedBy',
            width: 180,
            render: (_: unknown, record: RequestRecord) => (
                <UserCell user={record.requestedBy} />
            ),
        },
        {
            title: 'Branch',
            dataIndex: 'branch',
            key: 'branch',
            width: 140,
            render: (value: string) => (
                <Tag variant="filled" color="purple">{value}</Tag>
            ),
        },
        {
            title: 'Submit On',
            dataIndex: 'submittedOn',
            key: 'submittedOn',
            width: 120,
            render: (value: string) => (
                <span style={{ fontSize: 13, color: '#656d76' }}>{value}</span>
            ),
        },
        // Cột "Pending Approve By" chỉ show ở tab task-pending của admin
        ...(isAdmin && activeTab === 'task-pending' ? [{
            title: 'Pending Approve By',
            key: 'pendingApproveBy',
            width: 180,
            render: (_: unknown, record: RequestRecord) => (
                <UserCell user={record.pendingApproveBy} />
),
        }] : []),
        // Cột "Approved By" chỉ show khi không phải task-pending
        ...(!(isAdmin && activeTab === 'task-pending') ? [{
            title: 'Approved By',
            key: 'approvedBy',
            width: 180,
            render: (_: unknown, record: RequestRecord) => (
                <UserCell user={record.approvedBy} />
            ),
        }] : []),
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (value: string) => (
                <Tag variant="filled" color={STATUS_COLORS[value]}>
                    {value.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: 160,
            align: 'right' as const,
            render: (_: unknown, record: RequestRecord) => (
                <Space size={4}>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => { setViewRecord(record); setViewOpen(true); }}
                    />
                    {isAdmin && activeTab === 'task-pending' && record.status === 'pending' && (
                        <>
                            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(record)} />
                            <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleReject(record)} />
                        </>
                    )}
                    {!isAdmin && record.status === 'pending' && (
                        <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleReject(record)}>
                            Cancel
                        </Button>
                    )}
                </Space>
            ),
        },
    ];
    const tabCounts = {
        'task-pending': data.filter(i => i.status === 'pending').length,
        'all-requests': data.length,
        'my-requests': data.filter(i => i.userId === userId).length,
        'my-completed': data.filter(i => i.userId === userId && i.status !== 'pending').length,
    };
    const adminTabItems = [
        {
            key: 'task-pending',
            label: (
                <span>
                    Task Pending
                    <Tag style={{ marginLeft: 6 }} color="gold">{tabCounts['task-pending']}</Tag>
                </span>
            ),
        },
        { key: 'all-requests', label: `All Requests (${tabCounts['all-requests']})` },
    ];
    const userTabItems = [
        { key: 'my-requests', label: `My Requests (${tabCounts['my-requests']})` },
        { key: 'my-completed', label: `My Completed (${tabCounts['my-completed']})` },
    ];
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
<Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
                        {isAdmin ? 'Mentor Requests' : 'My Mentor Requests'}
                    </Title>
                    <Text type="secondary">
                        {isAdmin
                            ? 'Review and approve mentor registration requests'
                            : 'Manage your mentor registration requests'}
                    </Text>
                </div>
                {isAdmin && (
                    <Tag color="gold" variant="filled" style={{ paddingInline: 10, height: 28, lineHeight: '26px' }}>
                        {stats.pending} Pending
                    </Tag>
                )}
            </div>
            {/* Statistics: chỉ admin */}
            {isAdmin && (
                <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card size="small"><Statistic title="Total Requests" value={stats.total} prefix={<UserAddOutlined />} /></Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card size="small"><Statistic title="Pending" value={stats.pending} prefix={<ClockCircleOutlined />} /></Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card size="small"><Statistic title="Approved" value={stats.approved} prefix={<CheckCircleOutlined />} /></Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card size="small"><Statistic title="Rejected" value={stats.rejected} prefix={<StopOutlined />} /></Card>
                    </Col>
                </Row>
            )}
            {/* Tabs + Search + Table */}
            <Card size="small" styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '0 12px' }}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={isAdmin ? adminTabItems : userTabItems}
                    />
                </div>
                <div style={{ padding: '0 12px 12px' }}>
                    <Input
                        allowClear
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        prefix={<SearchOutlined />}
                        placeholder="Search name, branch or contact..."
                        style={{ maxWidth: 320 }}
                    />
                </div>
                <Table
                    rowKey="id"
                    columns={baseColumns}
                    dataSource={filteredData}
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                />
            </Card>
            {/* Drawer */}
            <Drawer
                open={viewOpen}
                size="large"
onClose={() => setViewOpen(false)}
                title="Mentor Request Detail"
                footer={
                    <Space style={{ width: '100%', justifyContent: 'end' }}>
                        <Button onClick={() => setViewOpen(false)}>Close</Button>
                        {isAdmin && viewRecord?.status === 'pending' && (
                            <>
                                <Button danger onClick={() => { setViewOpen(false); handleReject(viewRecord); }}>Reject</Button>
                                <Button type="primary" onClick={() => { setViewOpen(false); handleApprove(viewRecord); }}>Approve</Button>
                            </>
                        )}
                        {!isAdmin && viewRecord?.status === 'pending' && (
                            <Button danger onClick={() => { setViewOpen(false); handleReject(viewRecord!); }}>Cancel Request</Button>
                        )}
                    </Space>
                }
            >
                {viewRecord && (
                    <Descriptions bordered size="small" column={1}>
                        <Descriptions.Item label="Name">{viewRecord.name}</Descriptions.Item>
                        <Descriptions.Item label="Request By">
                            <UserCell user={viewRecord.requestedBy} />
                        </Descriptions.Item>
                        <Descriptions.Item label="Branch">
                            <Tag variant="filled" color="purple">{viewRecord.branch}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Contact">{viewRecord.contact}</Descriptions.Item>
                        <Descriptions.Item label="Reason">{viewRecord.reason}</Descriptions.Item>
                        <Descriptions.Item label="Submit On">
                            {viewRecord.submittedOn}
                        </Descriptions.Item>
                        <Descriptions.Item label="Pending Approve By">
                            <UserCell user={viewRecord.pendingApproveBy} />
                        </Descriptions.Item>
                        <Descriptions.Item label="Approved By">
                            <UserCell user={viewRecord.approvedBy} />
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag variant="filled" color={STATUS_COLORS[viewRecord.status]}>
                                {viewRecord.status.toUpperCase()}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </div>
    );
}