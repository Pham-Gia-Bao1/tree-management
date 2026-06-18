'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Breadcrumb,
    Card,
    Typography,
    Button,
    Input,
    Space,
    Form,
    Select,
    Popconfirm,
    App,
    Drawer,
    Table,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { TrainingRelationRecord } from '@/types/training-link.types';
import type { CourseRecord } from '@/types/course.types';
import type { UserRecord } from '@/types/user.types';

const { Title, Text } = Typography;

type RelationRow = TrainingRelationRecord & { key: string };

// Giá trị form khi submit
interface RelationFormValues {
    courseId: string;
    mentorId: string;
    discipleId: string;
    startMonth: string;
    endMonth?: string;
    notes?: string;
    status?: 'in_progress' | 'completed';
}

export default function TrainingRelations() {
    const { message } = App.useApp();
    const [search, setSearch] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<RelationRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<RelationRow[]>([]);
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [form] = Form.useForm<RelationFormValues>();

    // ── Load initial data ──────────────────────────────────────────────────────
    useEffect(() => {
        void (async () => {
            try {
                const [relationsRes, coursesRes, usersRes] = await Promise.all([
                    fetch('/api/training-relations'),
                    fetch('/api/courses'),
                    fetch('/api/users'),
                ]);
                const [relationsPayload, coursesPayload, usersPayload] = await Promise.all([
                    relationsRes.json(),
                    coursesRes.json(),
                    usersRes.json(),
                ]);
                setData(
                    (relationsPayload.data ?? []).map((r: TrainingRelationRecord) => ({
                        ...r,
                        key: r.id,
                    })),
                );
                setCourses(coursesPayload.data ?? []);
                setUsers(usersPayload.data ?? []);
            } catch {
                message.error('Failed to load training relations');
            }
        })();
    }, [message]);

    // ── Select options ─────────────────────────────────────────────────────────
    const mentorOptions = useMemo(
        () =>
            users
                .filter((u) => u.role === 'ADMIN' || u.role === 'MEMBER')
                .map((u) => ({ value: u.id, label: u.name })),
        [users],
    );
    const discipleOptions = mentorOptions;
    const courseOptions = useMemo(
        () => courses.map((c) => ({ value: c.id, label: c.name })),
        [courses],
    );
    const statusOptions = [
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
    ];

    // ── Client-side search filter ──────────────────────────────────────────────
    const filteredData = useMemo(() => {
        if (!search) return data;
        const kw = search.toLowerCase();
        return data.filter((r) =>
            [r.mentorName, r.discipleName, r.courseName, r.branchName]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(kw)),
        );
    }, [data, search]);

    // ── Drawer helpers ─────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditingRecord(null);
        form.resetFields();
        // Default status khi tạo mới
        form.setFieldsValue({ status: 'in_progress' });
        setDrawerOpen(true);
    };

    const openEdit = (record: RelationRow) => {
        setEditingRecord(record);
        form.setFieldsValue({
            courseId: record.courseId,
            mentorId: record.mentorId,
            discipleId: record.discipleId,
            startMonth: record.startMonth,
            endMonth: record.endMonth ?? undefined,
            status: record.status ?? 'in_progress',
            notes: record.notes ?? undefined,
        });
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        setEditingRecord(null);
        form.resetFields();
    };

    // ── Create ─────────────────────────────────────────────────────────────────
    const handleCreate = async (values: RelationFormValues) => {
        const response = await fetch('/api/training-relations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                courseId: values.courseId,
                mentorId: values.mentorId,
                discipleId: values.discipleId,
                startMonth: values.startMonth,
                endMonth: values.endMonth || null,
                status: values.status ?? 'in_progress',
                notes: values.notes || null,
                createdBy: '00000000-0000-0000-0000-000000000101',
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result?.message ?? 'Failed to create relation');
        }

        const created: TrainingRelationRecord = result.data;
        setData((prev) => [{ ...created, key: created.id }, ...prev]);
        message.success('Training relation created');
    };

    // ── Edit (optimistic + PUT) ────────────────────────────────────────────────
    const handleEdit = async (values: RelationFormValues, record: RelationRow) => {
        // TODO: Implement PUT /api/training-relations/[id] ở phía BE
        const response = await fetch(`/api/training-relations/${record.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                courseId: values.courseId,
                mentorId: values.mentorId,
                discipleId: values.discipleId,
                startMonth: values.startMonth,
                endMonth: values.endMonth || null,
                status: values.status ?? record.status,
                notes: values.notes || null,
            }),
        });

        if (!response.ok) {
            // Nếu BE chưa có PUT endpoint, fallback cập nhật local
            // Xóa đoạn này khi BE đã sẵn sàng
            const courseName = courseOptions.find((o) => o.value === values.courseId)?.label;
            const mentorName = mentorOptions.find((o) => o.value === values.mentorId)?.label;
            const discipleName = discipleOptions.find((o) => o.value === values.discipleId)?.label;

            setData((prev) =>
                prev.map((item) =>
                    item.id === record.id
                        ? {
                              ...item,
                              courseId: values.courseId,
                              courseName,
                              mentorId: values.mentorId,
                              mentorName,
                              discipleId: values.discipleId,
                              discipleName,
                              startMonth: values.startMonth,
                              endMonth: values.endMonth || null,
                              status: values.status ?? item.status,
                              notes: values.notes || null,
                          }
                        : item,
                ),
            );
            message.success('Training relation updated (local)');
            return;
        }

        const result = await response.json();
        const updated: TrainingRelationRecord = result.data;
        setData((prev) =>
            prev.map((item) =>
                item.id === record.id ? { ...updated, key: updated.id } : item,
            ),
        );
        message.success('Training relation updated');
    };

    // ── Save handler ──────────────────────────────────────────────────────────
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            if (editingRecord) {
                await handleEdit(values, editingRecord);
            } else {
                await handleCreate(values);
            }

            closeDrawer();
        } catch (error) {
            if (error instanceof Error) {
                message.error(error.message);
            }
            // Ant Design validation errors are objects, not Error instances — ignore them silently
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        try {
            // TODO: gọi DELETE /api/training-relations/[id] khi BE sẵn sàng
            // await fetch(`/api/training-relations/${id}`, { method: 'DELETE' });
            setData((prev) => prev.filter((item) => item.id !== id));
            message.success('Relation deleted');
        } catch {
            message.error('Failed to delete relation');
        }
    };

    // ── Columns ────────────────────────────────────────────────────────────────
    const columns = [
        {
            title: 'Mentor',
            dataIndex: 'mentorName',
            sorter: (a: RelationRow, b: RelationRow) =>
                (a.mentorName ?? '').localeCompare(b.mentorName ?? ''),
            render: (value?: string) => (
                <span className="font-medium text-[#24292f]">{value ?? '-'}</span>
            ),
        },
        {
            title: 'Disciple',
            dataIndex: 'discipleName',
            render: (value?: string) => <span className="text-[#24292f]">{value ?? '-'}</span>,
        },
        {
            title: 'Course',
            dataIndex: 'courseName',
            render: (value?: string) => (
                <span className="text-[#0969da] font-medium">{value ?? '-'}</span>
            ),
        },
        {
            title: 'Branch',
            dataIndex: 'branchName',
            render: (value?: string) => (
                <span className="text-[#656d76]">{value ?? '-'}</span>
            ),
        },
        {
            title: 'Start Month',
            dataIndex: 'startMonth',
        },
        {
            title: 'End Month',
            dataIndex: 'endMonth',
            render: (value: string | null) => value ?? '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (value: string) =>
                value === 'completed' ? (
                    <span className="text-green-600 font-medium">Completed</span>
                ) : (
                    <span className="text-blue-600 font-medium">In Progress</span>
                ),
        },
        {
            title: 'Created By',
            dataIndex: 'createdBy',
            render: (value: string | null) => (
                <span className="text-[#656d76]">{value ?? '-'}</span>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: 100,
            align: 'right' as const,
            render: (_: unknown, record: RelationRow) => (
                <Space size={4}>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />
                    <Popconfirm
                        title="Delete this relation?"
                        onConfirm={() => void handleDelete(record.id)}
                    >
                        <Button danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            <Breadcrumb
                items={[{ title: 'Administration' }, { title: 'Training Relations' }]}
            />

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <Title level={3} style={{ marginBottom: 0 }}>
                        Training Relations
                    </Title>
                    <Text type="secondary">Manage discipleship relationships</Text>
                </div>
                <Space>
                    <Button>Export</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        New Training Relation
                    </Button>
                </Space>
            </div>

            <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Space wrap>
                        <Input.Search
                            allowClear
                            placeholder="Search..."
                            style={{ width: 280 }}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Button onClick={() => message.success('Refreshed')}>Refresh</Button>
                    </Space>
                    <Space wrap>
                        <Select
                            allowClear
                            placeholder="Course"
                            style={{ width: 180 }}
                            options={courseOptions}
                        />
                        <Select
                            allowClear
                            placeholder="Mentor"
                            style={{ width: 180 }}
                            options={mentorOptions}
                        />
                    </Space>
                </div>
            </Card>

            <Card styles={{ body: { padding: 0 } }}>
                <Table<RelationRow>
                    rowKey="id"
                    columns={columns}
                    dataSource={filteredData}
                    pagination={{
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total) => `${total} items`,
                    }}
                />
            </Card>

            {/* ── Create / Edit Drawer ── */}
            <Drawer
                open={drawerOpen}
                title={editingRecord ? 'Edit Training Relation' : 'Create Training Relation'}
                placement="right"
                size="large"
                onClose={closeDrawer}
                footer={
                    <Space style={{ width: '100%', justifyContent: 'end' }}>
                        <Button onClick={closeDrawer}>Cancel</Button>
                        <Button type="primary" loading={saving} onClick={handleSave}>
                            Save
                        </Button>
                    </Space>
                }
            >
                <Form form={form} layout="vertical">
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            label="Course"
                            name="courseId"
                            rules={[{ required: true, message: 'Please select a course' }]}
                        >
                            <Select placeholder="Select course" options={courseOptions} />
                        </Form.Item>

                        <Form.Item
                            label="Mentor"
                            name="mentorId"
                            rules={[{ required: true, message: 'Please select a mentor' }]}
                        >
                            <Select placeholder="Select mentor" options={mentorOptions} />
                        </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            label="Disciple"
                            name="discipleId"
                            rules={[{ required: true, message: 'Please select a disciple' }]}
                        >
                            <Select placeholder="Select disciple" options={discipleOptions} />
                        </Form.Item>

                        <Form.Item
                            label="Status"
                            name="status"
                            rules={[{ required: true, message: 'Please select a status' }]}
                        >
                            <Select options={statusOptions} />
                        </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            label="Start Month"
                            name="startMonth"
                            rules={[
                                { required: true, message: 'Please enter start month' },
                                {
                                    pattern: /^\d{4}-(0[1-9]|1[0-2])$/,
                                    message: 'Format must be YYYY-MM (e.g. 2026-06)',
                                },
                            ]}
                        >
                            <Input placeholder="2026-06" maxLength={7} />
                        </Form.Item>

                        <Form.Item
                            label="End Month"
                            name="endMonth"
                            rules={[
                                {
                                    pattern: /^\d{4}-(0[1-9]|1[0-2])$/,
                                    message: 'Format must be YYYY-MM (e.g. 2026-12)',
                                },
                            ]}
                        >
                            <Input placeholder="2026-12 (optional)" maxLength={7} />
                        </Form.Item>
                    </div>

                    <Form.Item label="Notes" name="notes">
                        <Input.TextArea rows={4} placeholder="Optional notes..." />
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    );
}
