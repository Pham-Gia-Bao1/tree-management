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
    DatePicker,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { TrainingRelationRecord } from '@/types/training-link.types';
import type { CourseRecord } from '@/types/course.types';
import type { UserRecord } from '@/types/user.types';

const { Title, Text } = Typography;

type RelationRow = TrainingRelationRecord & { key: string };

interface RelationFormValues {
    courseId: string;
    mentorId: string;
    discipleId: string;
    startDate: Dayjs;
    endDate?: Dayjs;
    notes?: string;
    status?: 'in_progress' | 'completed';
}

/** Dayjs → "YYYY-MM-DD" */
function toDateString(d: Dayjs): string {
    return d.format('YYYY-MM-DD');
}

/** API string → Dayjs (for DatePicker pre-fill) */
function toDayjs(value: string | null | undefined): Dayjs | undefined {
    if (!value) return undefined;
    const d = dayjs(value);
    return d.isValid() ? d : undefined;
}

/** Display date in table: "DD/MM/YYYY" */
function formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const d = dayjs(value);
    return d.isValid() ? d.format('DD/MM/YYYY') : value;
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
    const [loading, setLoading] = useState(false);

    // ── Load initial data ──────────────────────────────────────────────────────
    useEffect(() => {
    void fetchData();
}, []);
    const fetchData = async () => {
    try {
        setLoading(true);

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
    } finally {
        setLoading(false);
    }
};

    // ── Select / Status options ────────────────────────────────────────────────
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

    // ── Client-side search ─────────────────────────────────────────────────────
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
        form.setFieldsValue({ status: 'in_progress' });
        setDrawerOpen(true);
    };

    const openEdit = (record: RelationRow) => {
        setEditingRecord(record);
        form.setFieldsValue({
            courseId: record.courseId,
            mentorId: record.mentorId,
            discipleId: record.discipleId,
            startDate: toDayjs(record.startDate),
            endDate: toDayjs(record.endDate),
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
                startDate: toDateString(values.startDate),
                endDate: values.endDate ? toDateString(values.endDate) : null,
                status: values.status ?? 'in_progress',
                notes: values.notes || null,
                createdBy: null, // replace with auth user when available
            }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result?.message ?? 'Failed to create relation');

        const created: TrainingRelationRecord = result.data;
        setData((prev) => [{ ...created, key: created.id }, ...prev]);
        message.success('Training relation created');
    };

    // ── Edit ──────────────────────────────────────────────────────────────────
    const handleEdit = async (values: RelationFormValues, record: RelationRow) => {
        const response = await fetch(`/api/training-relations/${record.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                courseId: values.courseId,
                mentorId: values.mentorId,
                discipleId: values.discipleId,
                startDate: toDateString(values.startDate),
                endDate: values.endDate ? toDateString(values.endDate) : null,
                status: values.status ?? record.status,
                notes: values.notes || null,
            }),
        });

        if (!response.ok) {
            // Fallback: optimistic local update until PUT endpoint is ready on BE
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
                              startDate: toDateString(values.startDate),
                              endDate: values.endDate ? toDateString(values.endDate) : null,
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
            if (error instanceof Error) message.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/training-relations/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result?.message ?? 'Failed to delete relation');
            }
            setData((prev) => prev.filter((item) => item.id !== id));
            message.success('Relation deleted');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to delete relation');
        }
    };

    // ── Table columns ──────────────────────────────────────────────────────────
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
            render: (value?: string) => (
                <span className="text-[#24292f]">{value ?? '-'}</span>
            ),
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
            title: 'Start Date',
            dataIndex: 'startDate',
            render: (value: string | null) => formatDate(value),
        },
        {
            title: 'End Date',
            dataIndex: 'endDate',
            render: (value: string | null) => formatDate(value),
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
                      <Button onClick={() => void fetchData()} loading={loading}>
    Refresh
</Button>
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
                    loading={loading}
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
                            label="Start Date"
                            name="startDate"
                            rules={[{ required: true, message: 'Please select a start date' }]}
                        >
                            <DatePicker
                                style={{ width: '100%' }}
                                format="DD/MM/YYYY"
                                placeholder="Select start date"
                            />
                        </Form.Item>

                        <Form.Item
                            label="End Date"
                            name="endDate"
                            dependencies={['startDate']}
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value: Dayjs | undefined) {
                                        const start: Dayjs | undefined = getFieldValue('startDate');
                                        if (!value || !start || value.isAfter(start)) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(
                                            new Error('End date must be after start date'),
                                        );
                                    },
                                }),
                            ]}
                        >
                            <DatePicker
                                style={{ width: '100%' }}
                                format="DD/MM/YYYY"
                                placeholder="Select end date (optional)"
                            />
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
