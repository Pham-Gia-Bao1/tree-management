'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  BookOpen,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import DataPage from '@/components/common/DataPage';

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'in_progress' | 'completed';

interface TrainingRelationRecord {
  id: string;
  courseId: string;
  courseName?: string;
  mentorId: string;
  mentorName?: string;
  discipleId: string;
  discipleName?: string;
  branchName?: string;
  startDate: string;
  endDate?: string | null;
  status: Status;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface CourseRecord {
  id: string;
  name: string;
}

interface UserRecord {
  id: string;
  fullName: string;
  roles?: string[];
}

type RelationRow = TrainingRelationRecord & { key: string };

type DrawerMode = 'create' | 'edit' | 'view';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<Status, { color: string; label: string }> = {
  in_progress: { color: 'blue', label: 'In Progress' },
  completed: { color: 'green', label: 'Completed' },
};

function StatusTag({ status }: { status: string }) {
  const cfg = statusConfig[status as Status];
  if (!cfg) return <Tag>{status}</Tag>;
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

function avatarLetter(name?: string | null) {
  return name?.trim()?.[0]?.toUpperCase() ?? '?';
}

function formatDate(v?: string | null) {
  if (!v) return '—';
  return v.slice(0, 10);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrainingRelationsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  // ── Data state ──
  const [data, setData] = useState<RelationRow[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Drawer state ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRelation, setSelectedRelation] =
    useState<TrainingRelationRecord | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  // ── Filter state ──
  const [search, setSearch] = useState('');
  const [mentorFilter, setMentorFilter] = useState<string | null>(null);
  const [discipleFilter, setDiscipleFilter] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string | null>(null);


  // ── Load ──────────────────────────────────────────────────────────────────

  const loadRelations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/training-relations');
      const json = await res.json();
      setData(
        (json.data ?? []).map((r: TrainingRelationRecord) => ({
          ...r,
          key: r.id,
        }))
      );
    } catch {
      message.error('Failed to load training relations.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  const loadSupportingData = useCallback(async () => {
    try {
      const [courseRes, userRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/users'),
      ]);
      const [courseJson, userJson] = await Promise.all([
        courseRes.json(),
        userRes.json(),
      ]);
      setCourses(courseJson.data ?? []);
      setUsers(userJson.data ?? []);
    } catch {
      message.error('Failed to load supporting data.');
    }
  }, [message]);

  useEffect(() => {
    void loadRelations();
    void loadSupportingData();
  }, [loadRelations, loadSupportingData]);

  const loadRelationDetail = useCallback(
    async (id: string) => {
      setDrawerLoading(true);
      try {
        const res = await fetch(`/api/training-relations/${id}`);
        const json = await res.json();
        return json.data as TrainingRelationRecord;
      } catch {
        message.error('Failed to load relation details.');
        return null;
      } finally {
        setDrawerLoading(false);
      }
    },
    [message]
  );

  // ── Options ───────────────────────────────────────────────────────────────

  const mentorOptions = useMemo(
    () =>
      users
        .filter(
          (u) => u.roles?.includes('MENTOR') || u.roles?.includes('ADMIN')
        )
        .map((u) => ({ value: u.id, label: u.fullName })),
    [users]
  );

  const discipleOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: u.fullName })),
    [users]
  );

  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: c.id, label: c.name })),
    [courses]
  );

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (mentorFilter && item.mentorId !== mentorFilter) return false;
      if (discipleFilter && item.discipleId !== discipleFilter) return false;
      if (courseFilter && item.courseId !== courseFilter) return false;
      if (search) {
        const kw = search.toLowerCase();
        const match = [
          item.mentorName,
          item.discipleName,
          item.courseName,
          item.branchName,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(kw));
        if (!match) return false;
      }
      return true;
    });
  }, [data, search, mentorFilter, discipleFilter, courseFilter]);

  // ── Drawer handlers ───────────────────────────────────────────────────────

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingId(null);
    setSelectedRelation(null);
    form.resetFields();
  }, [form]);

  const openCreateDrawer = useCallback(() => {
    setDrawerMode('create');
    setEditingId(null);
    setSelectedRelation(null);
    form.resetFields();
    setDrawerOpen(true);
  }, [form]);

  const openEditDrawer = useCallback(
    async (id: string) => {
      setDrawerMode('edit');
      setEditingId(id);
      setDrawerOpen(true);
      const detail = await loadRelationDetail(id);
      if (detail) {
        setSelectedRelation(detail);
        form.setFieldsValue({
          courseId: detail.courseId,
          mentorId: detail.mentorId,
          discipleId: detail.discipleId,
          startDate: detail.startDate?.slice(0, 10),
          endDate: detail.endDate?.slice(0, 10) ?? '',
          status: detail.status,
          notes: detail.notes ?? '',
        });
      }
    },
    [form, loadRelationDetail]
  );

  const openViewDrawer = useCallback(
    async (id: string) => {
      setDrawerMode('view');
      setEditingId(id);
      setDrawerOpen(true);
      const detail = await loadRelationDetail(id);
      if (detail) setSelectedRelation(detail);
    },
    [loadRelationDetail]
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    const values = await form.validateFields();
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/training-relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: values.courseId,
          mentorId: values.mentorId,
          discipleId: values.discipleId,
          startDate: values.startDate,
          endDate: values.endDate || null,
          status: values.status ?? 'in_progress',
          notes: values.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      message.success('Training relation created.');
      closeDrawer();
      void loadRelations();
    } catch {
      message.error('Failed to create relation.');
    } finally {
      setSubmitLoading(false);
    }
  }, [form, message, closeDrawer, loadRelations]);

  const handleUpdate = useCallback(async () => {
    if (!editingId) return;
    const values = await form.validateFields();
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/training-relations/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: values.courseId,
          mentorId: values.mentorId,
          discipleId: values.discipleId,
          startDate: values.startDate,
          endDate: values.endDate || null,
          status: values.status,
          notes: values.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      message.success('Training relation updated.');
      closeDrawer();
      void loadRelations();
    } catch {
      message.error('Failed to update relation.');
    } finally {
      setSubmitLoading(false);
    }
  }, [editingId, form, message, closeDrawer, loadRelations]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleteLoadingId(id);
      try {
        const res = await fetch(`/api/training-relations/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error();
        message.success('Relation deleted.');
        void loadRelations();
      } catch {
        message.error('Failed to delete relation.');
      } finally {
        setDeleteLoadingId(null);
      }
    },
    [message, loadRelations]
  );

  const handleSubmit = useCallback(() => {
    if (drawerMode === 'create') return handleCreate();
    if (drawerMode === 'edit') return handleUpdate();
  }, [drawerMode, handleCreate, handleUpdate]);

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: ColumnsType<RelationRow> = [
    {
      title: 'Course',
      dataIndex: 'courseName',
      ellipsis: true,
      render: (v: string) => v ?? '—',
    },
    {
      title: 'Mentor',
      dataIndex: 'mentorName',
      ellipsis: true,
      render: (v: string) => (
        <Space size={8}>
          <Avatar size={24} style={{ background: '#4F46E5', fontSize: 11 }}>
            {avatarLetter(v)}
          </Avatar>
          <span>{v ?? '—'}</span>
        </Space>
      ),
    },
    {
      title: 'Disciple',
      dataIndex: 'discipleName',
      ellipsis: true,
      render: (v: string) => (
        <Space size={8}>
          <Avatar size={24} style={{ background: '#0EA5E9', fontSize: 11 }}>
            {avatarLetter(v)}
          </Avatar>
          <span>{v ?? '—'}</span>
        </Space>
      ),
    },
    {
      title: 'Branch',
      dataIndex: 'branchName',
      ellipsis: true,
      render: (v: string) => v ?? '—',
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      width: 130,
      align: 'center',
      render: formatDate,
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      width: 130,
      align: 'center',
      render: formatDate,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      align: 'center',
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      ellipsis: true,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Actions',
      width: 120,
      fixed: 'right',
      align: 'center',
      render: (_: unknown, row: RelationRow) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<Eye size={13} />}
            onClick={() => openViewDrawer(row.id)}
            title="View"
          />
          <Button
            size="small"
            icon={<Pencil size={13} />}
            onClick={() => openEditDrawer(row.id)}
            title="Edit"
          />
          <Popconfirm
            title="Are you sure to delete this relation?"
            onConfirm={() => handleDelete(row.id)}
            okText="Yes, delete"
            cancelText="Cancel"
          >
            <Button
              danger
              size="small"
              loading={deleteLoadingId === row.id}
              icon={<Trash2 size={13} />}
              title="Delete"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Detail view ───────────────────────────────────────────────────────────

  const DetailView = () => {
    if (drawerLoading)
      return (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      );
    if (!selectedRelation)
      return <Empty description="No data" className="mt-16" />;

    const r = selectedRelation;

    return (
      <div className="space-y-4">
        {/* Relation Information */}
        <Card
          size="small"
          title={
            <Space>
              <BookOpen size={15} className="text-indigo-500" />
              <span>Relation Information</span>
            </Space>
          }
          className="rounded-xl shadow-sm"
        >
          <Descriptions column={1} size="small" labelStyle={{ color: '#6B7280' }}>
            <Descriptions.Item label="Status">
              <StatusTag status={r.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Start Date">
              {formatDate(r.startDate)}
            </Descriptions.Item>
            <Descriptions.Item label="End Date">
              {formatDate(r.endDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Branch">
              {r.branchName ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Notes">
              {r.notes ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {r.createdAt ? formatDate(r.createdAt) : '—'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Mentor Information */}
        <Card
          size="small"
          title={
            <Space>
              <User size={15} className="text-indigo-500" />
              <span>Mentor Information</span>
            </Space>
          }
          className="rounded-xl shadow-sm"
        >
          <Space size={12}>
            <Avatar size={48} style={{ background: '#4F46E5', fontSize: 20 }}>
              {avatarLetter(r.mentorName)}
            </Avatar>
            <div>
              <Text strong>{r.mentorName ?? '—'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                ID: {r.mentorId}
              </Text>
            </div>
          </Space>
        </Card>

        {/* Disciple Information */}
        <Card
          size="small"
          title={
            <Space>
              <Users size={15} className="text-sky-500" />
              <span>Disciple Information</span>
            </Space>
          }
          className="rounded-xl shadow-sm"
        >
          <Space size={12}>
            <Avatar size={48} style={{ background: '#0EA5E9', fontSize: 20 }}>
              {avatarLetter(r.discipleName)}
            </Avatar>
            <div>
              <Text strong>{r.discipleName ?? '—'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                ID: {r.discipleId}
              </Text>
            </div>
          </Space>
        </Card>

        {/* Course Information */}
        <Card
          size="small"
          title={
            <Space>
              <BookOpen size={15} className="text-emerald-500" />
              <span>Course Information</span>
            </Space>
          }
          className="rounded-xl shadow-sm"
        >
          <Descriptions column={1} size="small" labelStyle={{ color: '#6B7280' }}>
            <Descriptions.Item label="Course Name">
              {r.courseName ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Course ID">
              <Text type="secondary" style={{ fontSize: 12 }}>
                {r.courseId}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    );
  };

  // ── Drawer title & footer ─────────────────────────────────────────────────

  const drawerTitle =
    drawerMode === 'create'
      ? 'Create Training Relation'
      : drawerMode === 'edit'
      ? 'Edit Training Relation'
      : 'Training Relation Detail';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <DataPage<RelationRow>
        title="Training Relations"
        subtitle="Manage mentor–disciple training relationships"
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        searchable
        searchPlaceholder="Search by mentor, disciple, course, branch…"
        onSearch={(kw) => setSearch(kw)}
        onRefresh={() => void loadRelations()}
        actions={
          <Button
            type="primary"
            icon={<Plus size={15} />}
            onClick={openCreateDrawer}
          >
            Create Relation
          </Button>
        }
        filters={
          <>
            <Select
              placeholder="Filter by Mentor"
              allowClear
              options={mentorOptions}
              onChange={setMentorFilter}
              style={{ width: 180 }}
            />
            <Select
              placeholder="Filter by Disciple"
              allowClear
              options={discipleOptions}
              onChange={setDiscipleFilter}
              style={{ width: 180 }}
            />
            <Select
              placeholder="Filter by Course"
              allowClear
              options={courseOptions}
              onChange={setCourseFilter}
              style={{ width: 180 }}
            />
          </>
        }
        tableProps={{
          size: 'middle',
          scroll: { x: 1200 },
          sticky: true,
          pagination: {
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `${total} relations`,
          },
        }}
      />

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        size="large"
        title={drawerTitle}
        onClose={closeDrawer}
        destroyOnClose
        footer={
          drawerMode !== 'view' ? (
            <div className="flex justify-end gap-2">
              <Button onClick={closeDrawer}>Cancel</Button>
              <Button
                type="primary"
                loading={submitLoading}
                onClick={handleSubmit}
              >
                {drawerMode === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button onClick={closeDrawer}>Close</Button>
            </div>
          )
        }
      >
        {drawerMode === 'view' ? (
          <DetailView />
        ) : (
          <Spin spinning={drawerLoading}>
            <Form form={form} layout="vertical" requiredMark="optional">
              <Form.Item
                label="Course"
                name="courseId"
                rules={[{ required: true, message: 'Course is required.' }]}
              >
                <Select
                  options={courseOptions}
                  placeholder="Select course"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>

              <Form.Item
                label="Mentor"
                name="mentorId"
                rules={[
                  { required: true, message: 'Mentor is required.' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value !== getFieldValue('discipleId')) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('Mentor and disciple must be different people.')
                      );
                    },
                  }),
                ]}
              >
                <Select
                  options={mentorOptions}
                  placeholder="Select mentor"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>

              <Form.Item
                label="Disciple"
                name="discipleId"
                rules={[
                  { required: true, message: 'Disciple is required.' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value !== getFieldValue('mentorId')) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('Mentor and disciple must be different people.')
                      );
                    },
                  }),
                ]}
              >
                <Select
                  options={discipleOptions}
                  placeholder="Select disciple"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>

              <Form.Item
                label="Start Date"
                name="startDate"
                rules={[
                  { required: true, message: 'Start date is required.' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const end = getFieldValue('endDate');
                      if (!value || !end || value <= end) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('Start date must be on or before end date.')
                      );
                    },
                  }),
                ]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item
                label="End Date"
                name="endDate"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const start = getFieldValue('startDate');
                      if (!value || !start || start <= value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('End date must be on or after start date.')
                      );
                    },
                  }),
                ]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item label="Status" name="status" initialValue="in_progress">
                <Select
                  options={[
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                  ]}
                />
              </Form.Item>

              <Form.Item label="Notes" name="notes">
                <Input.TextArea
                  rows={4}
                  placeholder="Optional notes about this relation…"
                />
              </Form.Item>
            </Form>
          </Spin>
        )}
      </Drawer>
    </div>
  );
}
