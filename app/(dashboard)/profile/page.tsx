'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    App,
    Avatar,
    Button,
    Card,
    Col,
    Descriptions,
    Form,
    Input,
    Modal,
    Row,
    Space,
    Spin,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    EditOutlined,
    LockOutlined,
    StarOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { formatDate, formatDateTime } from '@/utils/date';
import type { MentorRequestStatus } from '@/types/database.types';

const { Title, Text } = Typography;

/* =========================
   PROFILE TYPE
========================= */
interface ProfileData {
    id: string;
    email: string;
    fullName: string;
    birthDate: string | null;
    branchId: string | null;
    branchName: string | null;
    avatarUrl: string | null;
    phone: string | null;
}

/* =========================
   MY MENTOR REQUEST TYPE
========================= */
interface MyMentorRequest {
    id: string;
    status: MentorRequestStatus;
    reason: string | null;
    experience: string | null;
    notes: string | null;
    reviewNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
    reviewedBy: { id: string; name: string; email: string } | null;
}

/* =========================
   COURSE PROGRESS TYPE
========================= */
interface CourseProgress {
    courseId: string;
    status: 'not_started' | 'in_progress' | 'completed';
}

/* =========================
   STATUS COLORS
========================= */
const STATUS_COLOR: Record<MentorRequestStatus, string> = {
    pending: 'gold',
    approved: 'success',
    rejected: 'error',
};

/* =========================
   PAGE
========================= */
export default function ProfilePage() {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [pwForm] = Form.useForm();
    const [mentorForm] = Form.useForm<{
        reason: string;
        experience: string;
        notes?: string;
    }>();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pwModalOpen, setPwModalOpen] = useState(false);

    // Mentor section state
    const [myRequests, setMyRequests] = useState<MyMentorRequest[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [mentorModalOpen, setMentorModalOpen] = useState(false);
    const [mentorSubmitting, setMentorSubmitting] = useState(false);
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
    const [allCoursesCount, setAllCoursesCount] = useState(0);

    /* ─── Load profile ─── */
    useEffect(() => {
        void (async () => {
            try {
                const res = await fetch('/api/auth/profile');
                if (!res.ok) throw new Error('Failed to load profile');
                const payload = await res.json();
                setProfile(payload.data);
                form.setFieldsValue({
                    fullName: payload.data.fullName,
                    phone: payload.data.phone ?? '',
                    birthDate: payload.data.birthDate ?? '',
                });
            } catch {
                message.error('Failed to load profile');
            } finally {
                setLoading(false);
            }
        })();
    }, [form, message]);

    /* ─── Load auth/me for roles ─── */
    useEffect(() => {
        void (async () => {
            const res = await fetch('/api/auth/me');
            if (!res.ok) return;
            const payload = await res.json();
            setUserRoles(payload.data?.roles ?? []);
        })();
    }, []);

    /* ─── Load my mentor requests ─── */
    const loadMyRequests = useCallback(async () => {
        try {
            setRequestsLoading(true);
            const res = await fetch('/api/mentor-requests/my');
            if (!res.ok) return;
            const payload = await res.json();
            setMyRequests(payload.data ?? []);
        } catch {
            // silent
        } finally {
            setRequestsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadMyRequests();
    }, [loadMyRequests]);

    /* ─── Load course progress for eligibility check ─── */
    useEffect(() => {
        void (async () => {
            const [coursesRes] = await Promise.all([
                fetch('/api/courses'),
            ]);
            if (coursesRes.ok) {
                const payload = await coursesRes.json();
                setAllCoursesCount((payload.data ?? []).length);
            }
        })();
    }, []);

    /* ─── Eligibility ─── */
    const isMentor = userRoles.includes('MENTOR');
    const hasPending = myRequests.some((r) => r.status === 'pending');
    const completedCourses = courseProgress.filter((p) => p.status === 'completed').length;
    const hasActiveTraining = courseProgress.some((p) => p.status === 'in_progress');
    const allCoursesCompleted = allCoursesCount === 0 || completedCourses >= allCoursesCount;

    const canSubmit =
        !isMentor &&
        !hasPending &&
        allCoursesCompleted &&
        !hasActiveTraining;

    let disabledReason = '';
    if (isMentor) disabledReason = 'You are already a mentor.';
    else if (hasPending) disabledReason = 'You already have a pending request.';
    else if (!allCoursesCompleted) disabledReason = 'You must complete all required courses first.';
    else if (hasActiveTraining) disabledReason = 'You have an active training in progress.';

    /* ─── Save profile ─── */
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const res = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: values.fullName,
                    phone: values.phone || null,
                    birthDate: values.birthDate || null,
                }),
            });
            if (!res.ok) throw new Error('Failed to save profile');
            const payload = await res.json();
            setProfile(payload.data);
            setEditing(false);
            message.success('Profile updated successfully');
        } catch {
            message.error('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    /* ─── Change password ─── */
    const handleChangePassword = async () => {
        try {
            const values = await pwForm.validateFields();
            if (values.newPassword !== values.confirmPassword) {
                message.error('Passwords do not match');
                return;
            }
            message.success('Password changed successfully');
            setPwModalOpen(false);
            pwForm.resetFields();
        } catch {
            // validation errors
        }
    };

    /* ─── Submit mentor request ─── */
    const handleMentorSubmit = async () => {
        try {
            const values = await mentorForm.validateFields();
            setMentorSubmitting(true);
            const res = await fetch('/api/mentor-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: values.reason,
                    experience: values.experience,
                    notes: values.notes || undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error?.message ?? 'Failed to submit request');
            }
            message.success('Mentor request submitted successfully!');
            setMentorModalOpen(false);
            mentorForm.resetFields();
            await loadMyRequests();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to submit request');
        } finally {
            setMentorSubmitting(false);
        }
    };

    /* ─── My requests columns ─── */
    const requestColumns: ColumnsType<MyMentorRequest> = [
        {
            title: 'Submitted Date',
            dataIndex: 'createdAt',
            render: (v: string) => formatDate(v),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (v: MentorRequestStatus) => (
                <Tag color={STATUS_COLOR[v]}>{v.toUpperCase()}</Tag>
            ),
        },
        {
            title: 'Reviewed By',
            key: 'reviewedBy',
            render: (_, record) =>
                record.reviewedBy ? (
                    <span>{record.reviewedBy.name}</span>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: 'Reviewed Date',
            dataIndex: 'reviewedAt',
            render: (v: string | null) =>
                v ? formatDateTime(v) : <Text type="secondary">—</Text>,
        },
        {
            title: 'Review Note',
            dataIndex: 'reviewNote',
            render: (v: string | null) =>
                v ? (
                    <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v }}>
                        {v}
                    </Text>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
    ];

    /* ─── Loading state ─── */
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div style={{ textAlign: 'center', paddingTop: 80, color: '#656d76' }}>
                Could not load profile. Please try again.
            </div>
        );
    }

    const initials = profile.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="space-y-4" style={{ maxWidth: 900 }}>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
                        Profile
                    </Title>
                    <Text type="secondary">Manage your personal information</Text>
                </div>
                <Button icon={<LockOutlined />} onClick={() => setPwModalOpen(true)}>
                    Change Password
                </Button>
            </div>

            {/* Avatar card */}
            <Card>
                <Row gutter={[24, 24]} align="middle">
                    <Col flex="none">
                        <Avatar
                            size={80}
                            src={profile.avatarUrl}
                            icon={!profile.avatarUrl && <UserOutlined />}
                            style={{ background: '#7F77DD', fontSize: 28, fontWeight: 600 }}
                        >
                            {!profile.avatarUrl && initials}
                        </Avatar>
                    </Col>
                    <Col flex="1">
                        <div style={{ fontSize: 20, fontWeight: 600 }}>{profile.fullName}</div>
                        <div style={{ color: '#656d76', fontSize: 14 }}>{profile.email}</div>
                        <div style={{ marginTop: 6 }}>
                            {userRoles.map((r) => (
                                <Tag
                                    key={r}
                                    color={r === 'ADMIN' ? 'red' : r === 'MENTOR' ? 'blue' : 'default'}
                                >
                                    {r}
                                </Tag>
                            ))}
                            {profile.branchName && (
                                <Tag color="purple">{profile.branchName}</Tag>
                            )}
                        </div>
                    </Col>
                    <Col flex="none">
                        {!editing ? (
                            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                                Edit Profile
                            </Button>
                        ) : (
                            <Button.Group>
                                <Button onClick={() => setEditing(false)}>Cancel</Button>
                                <Button type="primary" loading={saving} onClick={handleSave}>
                                    Save
                                </Button>
                            </Button.Group>
                        )}
                    </Col>
                </Row>
            </Card>

            {/* Profile info / edit */}
            {editing ? (
                <Card title="Edit Information">
                    <Form form={form} layout="vertical" style={{ maxWidth: 480 }}>
                        <Form.Item
                            name="fullName"
                            label="Full Name"
                            rules={[{ required: true, message: 'Full name is required' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item name="phone" label="Phone">
                            <Input placeholder="+84..." />
                        </Form.Item>
                        <Form.Item name="birthDate" label="Birth Date">
                            <Input placeholder="YYYY-MM-DD" />
                        </Form.Item>
                    </Form>
                </Card>
            ) : (
                <Card title="Personal Information">
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Full Name">{profile.fullName}</Descriptions.Item>
                        <Descriptions.Item label="Email">{profile.email}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{profile.phone ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Birth Date">
                            {profile.birthDate ? formatDate(profile.birthDate) : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Branch">
                            {profile.branchName ? (
                                <Tag color="purple">{profile.branchName}</Tag>
                            ) : (
                                <Text type="secondary">—</Text>
                            )}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            )}

            {/* ─── BECOME MENTOR SECTION (member only) ─── */}
            {!isMentor && (
                <Card
                    title={
                        <Space>
                            <StarOutlined style={{ color: '#f59e0b' }} />
                            <span>Become a Mentor</span>
                        </Space>
                    }
                    extra={
                        <Tooltip title={disabledReason || undefined}>
                            <Button
                                type="primary"
                                icon={<StarOutlined />}
                                disabled={!canSubmit}
                                onClick={() => {
                                    mentorForm.resetFields();
                                    setMentorModalOpen(true);
                                }}
                            >
                                Request to Become Mentor
                            </Button>
                        </Tooltip>
                    }
                >
                    {disabledReason && (
                        <div
                            style={{
                                marginBottom: 16,
                                padding: '8px 12px',
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: 6,
                                fontSize: 13,
                                color: '#92400e',
                            }}
                        >
                            {disabledReason}
                        </div>
                    )}

                    <div style={{ marginBottom: 12, fontSize: 13, color: '#6B7280' }}>
                        Your mentor requests are listed below.
                    </div>

                    <Table<MyMentorRequest>
                        rowKey="id"
                        loading={requestsLoading}
                        columns={requestColumns}
                        dataSource={myRequests}
                        pagination={false}
                        size="small"
                        locale={{ emptyText: 'No mentor requests submitted yet.' }}
                    />
                </Card>
            )}

            {/* Change Password Modal */}
            <Modal
                title="Change Password"
                open={pwModalOpen}
                onCancel={() => {
                    setPwModalOpen(false);
                    pwForm.resetFields();
                }}
                onOk={handleChangePassword}
                okText="Change Password"
            >
                <Form form={pwForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="newPassword"
                        label="New Password"
                        rules={[
                            { required: true, message: 'New password is required' },
                            { min: 8, message: 'Password must be at least 8 characters' },
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        name="confirmPassword"
                        label="Confirm Password"
                        rules={[{ required: true, message: 'Please confirm your password' }]}
                    >
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Become Mentor Modal */}
            <Modal
                title="Request to Become a Mentor"
                open={mentorModalOpen}
                onCancel={() => {
                    setMentorModalOpen(false);
                    mentorForm.resetFields();
                }}
                onOk={handleMentorSubmit}
                okText="Submit Request"
                confirmLoading={mentorSubmitting}
                width={560}
            >
                <Form form={mentorForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="reason"
                        label="Reason"
                        rules={[{ required: true, message: 'Please explain why you want to become a mentor.' }]}
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="Why do you want to become a mentor?"
                        />
                    </Form.Item>
                    <Form.Item
                        name="experience"
                        label="Experience"
                        rules={[{ required: true, message: 'Please describe your experience.' }]}
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="Describe your discipleship experience..."
                        />
                    </Form.Item>
                    <Form.Item name="notes" label="Additional Notes">
                        <Input.TextArea
                            rows={2}
                            placeholder="Any additional notes (optional)..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
