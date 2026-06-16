// 'use client';

// import { useEffect, useState } from 'react';
// import { Typography, Card, Avatar, Form, Input, Select, Button, Modal, App, Tag } from 'antd';
// import { UserOutlined, EditOutlined, LockOutlined, CameraOutlined } from '@ant-design/icons';
// import type { UserRecord } from '@/types/user.types';

// const { Title, Text } = Typography;

// export default function ProfilePage() {
//     // const { message } = App.useApp();
//     // const [form] = Form.useForm();
//     // const [pwForm] = Form.useForm();
//     // const [pwModalOpen, setPwModalOpen] = useState(false);
//     // const [editing, setEditing] = useState(false);
//     // const [currentUser] = useState<UserRecord>(FALLBACK_USER);

//     // useEffect(() => {
//     //     form.setFieldsValue({
//     //         name: currentUser.name,
//     //         email: currentUser.email,
//     //         birthDate: currentUser.birthDate,
//     //         branch: currentUser.branchName,
//     //         language: 'vi',
//     //     });
//     // }, [currentUser, form]);

//     // const handleUpdateProfile = async () => {
//     //     try {
//     //         await form.validateFields();
//     //         message.success('Profile updated successfully!');
//     //         setEditing(false);
//     //     } catch {
//     //         return;
//     //     }
//     // };

//     // const handleChangePassword = async () => {
//     //     try {
//     //         const values = await pwForm.validateFields();
//     //         if (values.newPassword !== values.confirmPassword) {
//     //             message.error('Passwords do not match');
//     //             return;
//     //         }
//     //         message.success('Password changed successfully!');
//     //         setPwModalOpen(false);
//     //         pwForm.resetFields();
//     //     } catch {
//     //         return;
//     //     }
//     // };

//     // return (
//     //     <div className="max-w-3xl">
//     //         <div className="mb-6">
//     //             <Title level={2} style={{ margin: 0, fontSize: 24 }}>Profile</Title>
//     //             <Text type="secondary">Thông tin cá nhân của bạn</Text>
//     //         </div>

//     //         <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}>
//     //             <div className="flex items-center gap-6 flex-wrap">
//     //                 <div className="relative">
//     //                     <Avatar size={96} icon={<UserOutlined />} style={{ background: '#52C41A', fontSize: 40 }} />
//     //                     <button
//     //                         className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors shadow"
//     //                         onClick={() => message.info('Avatar upload coming soon')}
//     //                     >
//     //                         <CameraOutlined style={{ fontSize: 12 }} />
//     //                     </button>
//     //                 </div>
//     //                 <div>
//     //                     <h2 className="text-2xl font-bold text-gray-800">{currentUser.name}</h2>
//     //                     <div className="flex items-center gap-2 mt-1">
//     //                         <Tag color="green">Admin</Tag>
//     //                         <Tag color="purple">{currentUser.branchName}</Tag>
//     //                     </div>
//     //                     <p className="text-sm text-gray-400 mt-1">Member since 2020-03-15</p>
//     //                 </div>
//     //             </div>
//     //         </Card>

//     //         <Card
//     //             style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}
//     //             title="Personal Information"
//     //             extra={!editing && <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>Edit</Button>}
//     //         >
//     //             <Form form={form} layout="vertical">
//     //                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
//     //                     <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
//     //                         <Input disabled={!editing} />
//     //                     </Form.Item>
//     //                     <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
//     //                         <Input disabled={!editing} />
//     //                     </Form.Item>
//     //                     <Form.Item name="birthDate" label="Birth Date">
//     //                         <Input type="date" disabled={!editing} />
//     //                     </Form.Item>
//     //                     <Form.Item name="branch" label="Branch">
//     //                         <Select options={[{ value: currentUser.branchName, label: currentUser.branchName ?? 'Unknown' }]} disabled={!editing} />
//     //                     </Form.Item>
//     //                     <Form.Item name="language" label="Language">
//     //                         <Select options={[{ value: 'vi', label: '🇻🇳 Vietnamese' }, { value: 'en', label: '🇺🇸 English' }, { value: 'ko', label: '🇰🇷 Korean' }]} disabled={!editing} />
//     //                     </Form.Item>
//     //                 </div>

//     //                 {editing && (
//     //                     <div className="flex gap-2 mt-2">
//     //                         <Button type="primary" onClick={handleUpdateProfile}>Update Profile</Button>
//     //                         <Button onClick={() => { setEditing(false); form.setFieldsValue({ name: currentUser.name, email: currentUser.email, birthDate: currentUser.birthDate, branch: currentUser.branchName, language: 'vi' }); }}>Cancel</Button>
//     //                     </div>
//     //                 )}
//     //             </Form>
//     //         </Card>

//     //         <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} title="Security">
//     //             <div className="flex items-center justify-between">
//     //                 <div>
//     //                     <p className="font-medium">Password</p>
//     //                     <p className="text-sm text-gray-400">Last changed 3 months ago</p>
//     //                 </div>
//     //                 <Button icon={<LockOutlined />} onClick={() => setPwModalOpen(true)}>Change Password</Button>
//     //             </div>
//     //         </Card>

//     //         <Modal
//     //             title={<span><LockOutlined className="mr-2" />Change Password</span>}
//     //             open={pwModalOpen}
//     //             onOk={handleChangePassword}
//     //             onCancel={() => { setPwModalOpen(false); pwForm.resetFields(); }}
//     //             okText="Change Password"
//     //             width={440}
//     //         >
//     //             <Form form={pwForm} layout="vertical" className="mt-4">
//     //                 <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}>
//     //                     <Input.Password />
//     //                 </Form.Item>
//     //                 <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 8 }]}>
//     //                     <Input.Password />
//     //                 </Form.Item>
//     //                 <Form.Item name="confirmPassword" label="Confirm New Password" rules={[{ required: true }]}>
//     //                     <Input.Password />
//     //                 </Form.Item>
//     //             </Form>
//     //         </Modal>
//     //     </div>
//     );
// }

export default function ProfilePage() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Profile Page</h1>
            <p>This is a placeholder page for the user profile.</p>
        </div>
    );
}