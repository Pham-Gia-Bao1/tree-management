'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    App,
    Avatar,
    Button,
    Card,
    Col,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    CheckOutlined,
    CloseOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { formatDate, formatDateTime } from '@/utils/date';
import type { MentorRequestStatus } from '@/types/database.types';
import type { MentorRequestRecord } from '@/types/mentor-request.types';

const { Title, Text } = Typography;

/* =========================
   STATUS CONFIG
========================= */
const STATUS_COLOR: Record<MentorRequestStatus, string> = {
    pending: 'gold',
    approved: 'success',
    rejected: 'error',
};

/* =========================
   BRANCH OPTION
========================= */
interface BranchOption {
    value: string;
    label: string;
}

/* =========================
   PAGE
========================= */
export default function MentorRequestsPage() {
    const { message, modal } = App.useApp();
    const [rejectForm] = Form.useForm<{ reviewNote: string }>();

    const [data, setData] = useState<MentorRequestRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<MentorRequestStatus | ''>('');
    const [branchFilter, setBranchFilter] = useState('');
    const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    /* ─── Load branches ─── */
    useEffect(() => {
        void (async () => {
            const res = await fetch('/api/branches');
            if (!res.ok) return;
            const payload = await res.json();
            setBranchOptions(
                (payload.data ?? []).map((b: { id: string; name: string }) => ({
                    value: b.id,
                    label: b.name,
                })),
            );
        })();
    }, []);

    /* ─── Load requests ─── */
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            if (search) params.set('search', search);
            if (branchFilter) params.set('branchId', branchFilter);

            const res = await fetch(`/api/mentor-requests?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to load');
            const payload = await res.json();
            setData(payload.data ?? []);
        } catch {
            message.error('Failed to load mentor requests');
        } finally {
            setLoading(false);
        }
    }, [message, statusFilter, search, branchFilter]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    /* ─── Stats ─── */
    const stats = useMemo(
        () => ({
            total: data.length,
            pending: data.filter((i) => i.status === 'pending').length,
            approved: data.filter((i) => i.status === 'approved').length,
            rejected: data.filter((i) => i.status === 'rejected').length,
        }),
        [data],
    );

    /* ─── Approve ─── */
    const handleApprove = (record: MentorRequestRecord) => {
        modal.confirm({
            title: 'Approve Mentor Request',
            content: `Approve request from ${record.requester?.name ?? 'this member'}? They will be granted the MENTOR role.`,
            okText: 'Approve',
            onOk: async () => {
                try {
                    setActionLoading(true);
                    const res = await fetch(`/api/mentor-requests/${record.id}/approve`, {
                        method: 'PUT',
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err?.error?.message ?? 'Failed to approve');
                    }
                    message.success('Request approved. Member promoted to Mentor.');
                    await loadData();
                } catch (err) {
                    message.error(err instanceof Error ? err.message : 'Failed to approve');
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    /* ─── Reject ─── */
    const openRejectModal = (record: MentorRequestRecord) => {
        setRejectTargetId(record.id);
        rejectForm.resetFields();
        setRejectModalOpen(true);
    };

    const handleRejectConfirm = async () => {
        try {
            const values = await rejectForm.validateFields();
            setActionLoading(true);

            const res = await fetch(`/api/mentor-requests/${rejectTargetId}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewNote: values.reviewNote }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error?.message ?? 'Failed to reject');
            }

            message.success('Request rejected.');
            setRejectModalOpen(false);
            setRejectTargetId(null);
            await loadData();
        } catch (err) {
            if (err instanceof Error && err.message !== 'Validate Failed') {
                message.error(err.message);
            }
        } finally {
            setActionLoading(false);
        }
    };

    /* ─── Columns ─── */
    const columns: ColumnsType<MentorRequestRecord> = [
        {
            title: 'Member',
            key: 'member',
            render: (_, record) => (
                <Space size={8}>
                    <Avatar size={32} style={{ background: '#7F77DD' }}>
                        {(record.requester?.name ?? '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                            {record.requester?.name ?? '—'}
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                            {record.requester?.email ?? '—'}
                        </div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Branch',
            key: 'branch',
            render: (_, record) =>
                record.requester?.branch ? (
                    <Tag>{record.requester.branch.name}</Tag>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: 'Submitted At',
            dataIndex: 'createdAt',
            render: (v: string) => (
                <span style={{ fontSize: 13 }}>{formatDate(v)}</span>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (v: MentorRequestStatus) => (
                <Tag color={STATUS_COLOR[v]}>{v.toUpperCase()}</Tag>
            ),
        },
        {
            title: 'Reason',
            dataIndex: 'reason',
            render: (v: string | null) => (
                <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v ?? '' }}>
                    {v ?? '—'}
                </Text>
            ),
            width: 180,
        },
        {
            title: 'Experience',
            dataIndex: 'experience',
            render: (v: string | null) => (
                <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v ?? '' }}>
                    {v ?? '—'}
                </Text>
            ),
            width: 180,
        },
        {
            title: 'Reviewed By',
            key: 'reviewedBy',
            render: (_, record) =>
                record.reviewedBy ? (
                    <span style={{ fontSize: 13 }}>{record.reviewedBy.name}</span>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: 'Reviewed At',
            dataIndex: 'reviewedAt',
            render: (v: string | null) =>
                v ? (
                    <span style={{ fontSize: 13 }}>{formatDateTime(v)}</span>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            render: (_, record) =>
                record.status === 'pending' ? (
                    <Space>
                        <Button
                            type="primary"
                            size="small"
                            icon={<CheckOutlined />}
                            loading={actionLoading}
                            onClick={() => handleApprove(record)}
                        >
                            Approve
                        </Button>
                        <Button
                            danger
                            size="small"
                            icon={<CloseOutlined />}
                            loading={actionLoading}
                            onClick={() => openRejectModal(record)}
                        >
                            Reject
                        </Button>
                    </Space>
                ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.status === 'approved' ? 'Approved' : 'Rejected'}
                    </Text>
                ),
        },
    ];

    /* ─── UI ─── */
    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <Title level={3} style={{ marginBottom: 0 }}>
                    Mentor Requests
                </Title>
                <Text type="secondary">
                    Review and manage member requests to become a mentor
                </Text>
            </div>

            {/* Stats */}
            <Row gutter={12}>
                {(
                    [
                        { title: 'Total', value: stats.total },
                        { title: 'Pending', value: stats.pending },
                        { title: 'Approved', value: stats.approved },
                        { title: 'Rejected', value: stats.rejected },
                    ] as const
                ).map((s) => (
                    <Col span={6} key={s.title}>
                        <Card>
                            <Statistic title={s.title} value={s.value} />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Filters */}
            <Card>
                <Space wrap>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search member name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 260 }}
                        allowClear
                    />
                    <Select
                        placeholder="Filter by status"
                        value={statusFilter || undefined}
                        onChange={(v) => setStatusFilter(v ?? '')}
                        allowClear
                        style={{ width: 160 }}
                        options={[
                            { value: 'pending', label: 'Pending' },
                            { value: 'approved', label: 'Approved' },
                            { value: 'rejected', label: 'Rejected' },
                        ]}
                    />
                    <Select
                        placeholder="Filter by branch"
                        value={branchFilter || undefined}
                        onChange={(v) => setBranchFilter(v ?? '')}
                        allowClear
                        style={{ width: 200 }}
                        options={branchOptions}
                    />
                    <Button onClick={() => void loadData()}>Refresh</Button>
                </Space>
            </Card>

            {/* Table */}
            <Card styles={{ body: { padding: 0, overflow: 'hidden' } }}>
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <Table<MentorRequestRecord>
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={data}
                        scroll={{ x: 'max-content' }}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `${total} items`,
                        }}
                    />
                </div>
            </Card>

            {/* Reject Modal */}
            <Modal
                title="Reject Mentor Request"
                open={rejectModalOpen}
                onCancel={() => {
                    setRejectModalOpen(false);
                    setRejectTargetId(null);
                }}
                onOk={handleRejectConfirm}
                okText="Reject"
                okButtonProps={{ danger: true, loading: actionLoading }}
            >
                <Form form={rejectForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="reviewNote"
                        label="Review Note"
                        rules={[{ required: true, message: 'Please provide a reason for rejection.' }]}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder="Explain why this request is being rejected..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
