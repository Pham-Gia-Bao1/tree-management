"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
    Input,
    Tag,
    Button,
    Select,
    Empty,
    message,
    Spin,
    Flex,
    Space,
    Avatar,
    Card,
    Descriptions,
    List,
    Typography,
    Skeleton,
    Timeline,
    theme,
    Form,
    App,
} from "antd";

import {
    Mail,
    Phone,
    Calendar,
    Building2,
    Users,
    GraduationCap,
    X,
    Send,
    UserPlus,
    BookOpen,
    Search,
    Settings,
    PlayCircle,
    Database,
    User,
} from "lucide-react";

import { EyeOutlined, PlusOutlined } from "@ant-design/icons";

import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    MarkerType,
    Panel,
    BackgroundVariant,
    Node,
    Edge,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { AncestorNodeRecord, MemberProfileRecord } from "@/types/member.types";

const { Option } = Select;
const { Title, Text } = Typography;

// ==================== DỊCH TIẾNG VIỆT ====================
const T = {
    selectCourse: "Chọn lớp/môn học",
    myDiagram: "Sơ đồ của tôi",
    dragZoom: "Kéo di chuyển · Zoom chuột · Click chọn node",
    createRelation: "Tạo liên kết đào tạo",
    editRelation: "Chỉnh sửa liên kết",
    viewDetail: "Chi tiết thành viên",
    addRelationBtn: "Tạo liên kết",
    saveBtn: "Lưu thay đổi",
    cancelBtn: "Hủy bỏ",
    closeBtn: "Đóng",
    course: "Khóa học",
    mentor: "Người hướng dẫn",
    disciple: "Môn đồ",
    status: "Trạng thái",
    startDate: "Ngày bắt đầu",
    endDate: "Ngày kết thúc",
    notes: "Ghi chú",
    in_progress: "Đang đào tạo",
    completed: "Đã hoàn thành",
    info: "Tổng quan",
    properties: "Thuộc tính",
    runtime: "Chỉ số đào tạo",
    variables: "Hệ thống cấp bậc",
    send: "Gửi tin nhắn",
    nodeLibrary: "Thư viện lãnh đạo",
    searchMembers: "Tìm kiếm thành viên...",
    createNode: "Thêm môn đồ mới",
    selectMentor: "Chọn người hướng dẫn",
    selectDisciple: "Chọn môn đồ",
    selectStatus: "Chọn trạng thái",
    msgCreateSuccess: "Tạo liên kết thành công!",
    msgUpdateSuccess: "Cập nhật liên kết thành công!",
    msgError: "Có lỗi xảy ra, vui lòng thử lại.",
    msgEmpty: "Click vào một node để xem chi tiết"
};

// ==================== TYPES ====================
type Link = {
    id: string;
    courseId: string;
    mentorId: string;
    discipleId: string;
    startDate: string;
    endDate?: string | null;
    status?: "in_progress" | "completed";
    notes?: string;
};
type Course = { id: string; name: string };
type MentorStat = { courseId: string; courseName: string; totalDisciples: number };
type DescendantNode = { member: MemberProfileRecord; level: number; link: { id: string; startDate?: string; endDate?: string | null } };
type MemberDetailResponse = { member: MemberProfileRecord; mentorStats: MentorStat[]; descendants: DescendantNode[]; ancestors: AncestorNodeRecord[] };
type PanelMode = 'view' | 'create' | 'edit';

// ==================== HELPER & LAYOUT ALGORITHM ====================
const getColorForLevel = (level: number) => {
    if (level === 0) return "#10B981"; // Đấng tối cao - Start
    if (level === 1) return "#F97316"; // Người hướng dẫn - Logic
    return "#3B82F6";                 // Môn đồ - Transform
};

function getSubtreeIds(links: Link[], rootId: string): Set<string> {
    const set = new Set<string>([rootId]);
    const queue = [rootId];
    while (queue.length) {
        const cur = queue.shift()!;
        links.filter(l => l.mentorId === cur).forEach(l => {
            if (!set.has(l.discipleId)) {
                set.add(l.discipleId);
                queue.push(l.discipleId);
            }
        });
    }
    return set;
}

// Thuật toán xếp layout ngăn chồng chéo
function calculateLayoutTree(rootIds: string[], links: Link[], levelMap: Record<string, number>) {
    const posMap: Record<string, { x: number; y: number }> = {};
    const NODE_W = 280, NODE_H = 80, GAP_X = 300, GAP_Y = 20;
    const subtreeSize: Record<string, number> = {};
    
    const dfsCount = (id: string) => {
        const children = links.filter(l => l.mentorId === id).map(l => l.discipleId);
        if (children.length === 0) { subtreeSize[id] = 1; return 1; }
        let total = 0;
        children.forEach(child => total += dfsCount(child));
        subtreeSize[id] = total;
        return total;
    };
    rootIds.forEach(root => dfsCount(root));

    let yBase = 0;
    const assignY = (id: string, startY: number) => {
        const level = levelMap[id] || 0;
        posMap[id] = { x: level * GAP_X + 150, y: startY * (NODE_H + GAP_Y) };
        let yOffset = startY;
        const children = links.filter(l => l.mentorId === id).map(l => l.discipleId);
        children.forEach(child => { assignY(child, yOffset); yOffset += subtreeSize[child]; });
    };
    rootIds.forEach(root => { assignY(root, yBase); yBase += subtreeSize[root]; });
    return posMap;
}

function buildTreeForCourse(
    links: Link[],
    memberMap: Map<string, MemberProfileRecord>,
    focusMemberId: string | undefined,
    onEyeClick: (memberId: string) => void
) {
    if (!links.length && !focusMemberId) return { nodes: [], edges: [] };
    const allMentorIds = [...new Set(links.map(l => l.mentorId))];
    const allDiscipleIds = [...new Set(links.map(l => l.discipleId))];
    const rootIds = allMentorIds.filter(id => !allDiscipleIds.includes(id));
    const discipleCount: Record<string, number> = {};
    links.forEach(l => { discipleCount[l.mentorId] = (discipleCount[l.mentorId] || 0) + 1; });

    const levelMap: Record<string, number> = {};
    const queue = [...rootIds];
    rootIds.forEach(id => (levelMap[id] = 0));
    const visited = new Set(rootIds);
    while (queue.length) {
        const cur = queue.shift()!;
        links.filter(l => l.mentorId === cur).forEach(l => {
            if (!visited.has(l.discipleId)) {
                visited.add(l.discipleId);
                levelMap[l.discipleId] = (levelMap[cur] || 0) + 1;
                queue.push(l.discipleId);
            }
        });
    }

    const posMap = calculateLayoutTree(rootIds, links, levelMap);
    const subtreeIds = focusMemberId ? getSubtreeIds(links, focusMemberId) : null;
    const nodes: Node[] = [], edges: Edge[] = [];
    const addedNodeIds = new Set<string>();
    const mentorSet = new Set(allMentorIds);
    const allMemberIds = new Set([...allMentorIds, ...allDiscipleIds]);
    const rootInSubtree = !subtreeIds || (focusMemberId ? rootIds.includes(focusMemberId) : false);

    nodes.push({
        id: "root",
        type: "rootNode",
        position: { x: -100, y: 0 },
        data: { courseName: "Đấng Tối Cao (Khởi Đầu)", isDimmed: subtreeIds ? !rootInSubtree : false },
    });
    addedNodeIds.add("root");

    allMemberIds.forEach(id => {
        if (addedNodeIds.has(id)) return;
        const member = memberMap.get(id);
        const isFocus = focusMemberId === id;
        const isInSubtree = subtreeIds ? subtreeIds.has(id) : false;
        const isDimmed = subtreeIds ? !isInSubtree : false;
        const level = levelMap[id] || 0;
        const isMentor = mentorSet.has(id);
        const data = { member, level, isFocus, isInSubtree, isDimmed, onEyeClick, discipleCount: discipleCount[id] || 0, isMentor };
        const node = { id, position: posMap[id] || { x: 0, y: 0 }, data };
        if (isMentor) nodes.push({ ...node, type: "mentorNode" });
        else {
            const link = links.find(l => l.discipleId === id);
            nodes.push({ ...node, type: "discipleNode", data: { ...data, link } });
        }
        addedNodeIds.add(id);
    });

    links.forEach(link => {
        const highlighted = subtreeIds && subtreeIds.has(link.mentorId) && subtreeIds.has(link.discipleId);
        const dimmed = subtreeIds && !highlighted;
        const sourceLevel = levelMap[link.mentorId] || 0;
        const edgeColor = getColorForLevel(sourceLevel);
        edges.push({
            id: `e_${link.id}`,
            source: link.mentorId,
            target: link.discipleId,
            type: "smoothstep",
            animated: !dimmed,
            zIndex: highlighted ? 10 : 0,
            markerEnd: { type: MarkerType.ArrowClosed, color: dimmed ? "#E2E8F0" : edgeColor },
            style: { stroke: dimmed ? "#E2E8F0" : edgeColor, strokeWidth: highlighted ? 3 : 2, opacity: dimmed ? 0.4 : 1 },
            pathOptions: { borderRadius: 8 },
        });
    });
    rootIds.forEach(rid => {
        const highlighted = !subtreeIds || (subtreeIds && subtreeIds.has(rid) && rootInSubtree);
        const dimmed = subtreeIds && !highlighted;
        edges.unshift({
            id: `root_${rid}`,
            source: "root",
            target: rid,
            type: "smoothstep",
            zIndex: highlighted ? 10 : 0,
            markerEnd: { type: MarkerType.ArrowClosed, color: dimmed ? "#E2E8F0" : "#10B981" },
            style: { stroke: dimmed ? "#E2E8F0" : "#10B981", strokeWidth: 2, opacity: dimmed ? 0.4 : 1 },
            pathOptions: { borderRadius: 8 },
        });
    });
    return { nodes, edges };
}

// ==================== CUSTOM NODES ====================
const WorkflowNodeBase = ({ data, children }: { data: any, children: React.ReactNode }) => {
    const { member, level, isDimmed, isFocus, isMentor, onEyeClick, discipleCount } = data;
    const color = getColorForLevel(level);
    const isRoot = level === 0;
    return (
        <div style={{ width: isRoot ? 200 : 280, background: isFocus ? "#F9FAFB" : "#ffffff", border: isFocus ? `2px solid ${color}` : `1px solid #E5E7EB`, borderRadius: 12, padding: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", opacity: isDimmed ? 0.4 : 1, transition: "all 0.2s", position: "relative", }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F3F4F6", paddingBottom: 6, marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", display: "flex", alignItems: "center", gap: 6 }}>
                    {isRoot ? <BookOpen size={14} /> : <User size={14} />}
                    {isRoot ? "Đấng Tối Cao" : (member?.fullName || "Người vô danh")}
                </div>
                <div>
                    {isRoot && <Tag color="success" style={{ fontSize: 10 }}>Khởi nguồn</Tag>}
                    {!isRoot && isMentor && <Tag color="warning" style={{ fontSize: 10 }}>Người HD</Tag>}
                    {!isRoot && !isMentor && <Tag color="processing" style={{ fontSize: 10 }}>Môn đồ</Tag>}
                </div>
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
            <div style={{ position: "absolute", top: 8, right: 8, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onEyeClick(member?.id); }}>
                <EyeOutlined style={{ color: "#9CA3AF", fontSize: 14 }} />
            </div>
            <Handle type="target" position={Position.Left} style={{ background: color, width: 10, height: 10, border: "2px solid white", boxShadow: "0 0 0 1px #E2E8F0" }} />
            <Handle type="source" position={Position.Right} style={{ background: color, width: 10, height: 10, border: "2px solid white", boxShadow: "0 0 0 1px #E2E8F0" }} />
        </div>
    );
};
const RootNode = ({ data }: { data: any }) => <WorkflowNodeBase data={data}><div>Sự khởi đầu của hệ thống môn đồ.</div></WorkflowNodeBase>;
const MentorNode = ({ data }: { data: any }) => <WorkflowNodeBase data={data}><div><Tag color="geekblue">Người dẫn dắt</Tag> <span style={{ color: "#111827" }}>{data.member?.branchName || ""}</span></div><div>Môn đồ dưới quyền: {data.discipleCount || 0}</div></WorkflowNodeBase>;
const DiscipleNode = ({ data }: { data: any }) => <WorkflowNodeBase data={data}><div><Tag color="green">Học viên</Tag> <span style={{ color: "#111827" }}>{data.member?.branchName || ""}</span></div><div>Gia nhập từ: {data.link?.startDate || "Chưa có"}</div></WorkflowNodeBase>;
const nodeTypes = { rootNode: RootNode, mentorNode: MentorNode, discipleNode: DiscipleNode };

// ==================== MAIN COMPONENT ====================
export default function Diagram() {
    const { message } = App.useApp();
    const [panelForm] = Form.useForm();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [focusMyself, setFocusMyself] = useState(false);
    const [currentUserId] = useState<string>("");

    // Nodes & Edges
    const [treeLinks, setTreeLinks] = useState<Link[]>([]);
    const [memberMap, setMemberMap] = useState<Map<string, MemberProfileRecord>>(new Map());
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading] = useState(false);

    // Right Sidebar States (Dùng Panel thay vì Drawer)
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [panelMode, setPanelMode] = useState<PanelMode>('view');
    const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
    const [selectedMemberDetail, setSelectedMemberDetail] = useState<MemberDetailResponse | null>(null);
    const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [messageInput, setMessageInput] = useState("");

    // Other Data
    const [allMembers, setAllMembers] = useState<MemberProfileRecord[]>([]);

    // ── LOAD DATA ──
    useEffect(() => {
        fetch("/api/courses").then(r => r.json()).then(res => {
            if (res.success) { setCourses(res.data || []); if (res.data?.length) setSelectedCourse(res.data[0].id); }
        }).catch(() => message.error("Lỗi tải khóa học"));
        fetch("/api/members").then(r => r.json()).then(res => {
            if (res.success) setAllMembers(res.data || []);
        }).catch(() => {});
    }, [message]);

    const fetchMemberDetail = useCallback(async (memberId: string) => {
        setDetailLoading(true); setViewingMemberId(memberId);
        try {
            const res = await fetch(`/api/members/${memberId}?courseId=${selectedCourse}`);
            const json = await res.json();
            if (json.success) setSelectedMemberDetail(json.data);
            else message.error(json.error?.message || "Lỗi tải chi tiết");
        } catch { message.error("Lỗi kết nối"); } finally { setDetailLoading(false); }
    }, [selectedCourse, message]);

    // ── TREE LOGIC ──
    const onEyeClick = useCallback((memberId: string) => {
        if (!memberId) return;
        setPanelMode('view');
        setRightPanelOpen(true);
        fetchMemberDetail(memberId);
    }, [fetchMemberDetail]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        if (node.id === "root") { setFocusedNodeId(null); return; }
        setFocusedNodeId(prev => (prev === node.id ? null : node.id));
        const member = (node.data as any)?.member as MemberProfileRecord | undefined;
        if (member) onEyeClick(member.id);
    }, [onEyeClick]);

    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    useEffect(() => {
        if (!treeLinks.length) return;
        const { nodes: n, edges: e } = buildTreeForCourse(treeLinks, memberMap, focusedNodeId ?? undefined, onEyeClick);
        setNodes(n); setEdges(e);
    }, [focusedNodeId, treeLinks, memberMap, onEyeClick, setNodes, setEdges]);

    useEffect(() => {
        if (!selectedCourse) return;
        const loadTree = async () => {
            setLoading(true); setFocusedNodeId(null);
            try {
                const url = focusMyself && currentUserId
                    ? `/api/discipleship-tree?courseId=${selectedCourse}&focusMemberId=${currentUserId}`
                    : `/api/discipleship-tree?courseId=${selectedCourse}`;
                const res = await fetch(url).then(r => r.json());
                if (res.success && res.data?.links) {
                    setTreeLinks(res.data.links);
                    setMemberMap(new Map(res.data.members?.map((m: MemberProfileRecord) => [m.id, m]) || []));
                } else { setTreeLinks([]); setMemberMap(new Map()); }
            } catch { message.error("Lỗi tải cây môn đồ"); } finally { setLoading(false); }
        };
        loadTree();
    }, [selectedCourse, focusMyself, currentUserId, message]);

    // ── API HANDLERS (Giống Training Relations) ──
    const handleCreateRelation = async () => {
        const values = await panelForm.validateFields();
        setSubmitLoading(true);
        try {
            const res = await fetch('/api/discipleship-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId: values.courseId || selectedCourse,
                    mentorId: values.mentorId,
                    discipleId: values.discipleId,
                    startDate: values.startDate,
                    endDate: values.endDate || null,
                    status: values.status ?? 'in_progress',
                    notes: values.notes || null,
                }),
            });
            if (!res.ok) throw new Error();
            message.success(T.msgCreateSuccess);
            await reloadTree();
            setPanelMode('view');
            // Tự động load chi tiết người vừa tạo
            setRightPanelOpen(true); 
            fetchMemberDetail(values.discipleId);
        } catch (err) {
            if ((err as any)?.errorFields) return;
            message.error(T.msgError);
        } finally { setSubmitLoading(false); }
    };

    const handleUpdateRelation = async () => {
        if (!editingLinkId) return;
        const values = await panelForm.validateFields();
        setSubmitLoading(true);
        try {
            const res = await fetch(`/api/discipleship-links/${editingLinkId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId: values.courseId || selectedCourse,
                    mentorId: values.mentorId,
                    discipleId: values.discipleId,
                    startDate: values.startDate,
                    endDate: values.endDate || null,
                    status: values.status,
                    notes: values.notes || null,
                }),
            });
            if (!res.ok) throw new Error();
            message.success(T.msgUpdateSuccess);
            await reloadTree();
            setPanelMode('view');
            setRightPanelOpen(true);
            fetchMemberDetail(values.discipleId);
        } catch (err) {
            if ((err as any)?.errorFields) return;
            message.error(T.msgError);
        } finally { setSubmitLoading(false); }
    };

    const handleSubmit = useCallback(() => {
        if (panelMode === 'create') return handleCreateRelation();
        if (panelMode === 'edit') return handleUpdateRelation();
    }, [panelMode]);

    const reloadTree = async () => {
        const res = await fetch(`/api/discipleship-tree?courseId=${selectedCourse}`).then(r => r.json());
        if (res.success && res.data?.links) {
            setTreeLinks(res.data.links);
            setMemberMap(new Map(res.data.members?.map((m: MemberProfileRecord) => [m.id, m]) || []));
        }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedMemberDetail?.member) return;
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fromId: currentUserId, toId: selectedMemberDetail.member.id, content: messageInput }),
            });
            if (res.ok) { message.success("Gửi tin nhắn thành công!"); setMessageInput(""); }
        } catch { message.error("Lỗi gửi tin nhắn"); }
    };

    const openCreatePanel = useCallback(() => {
        setPanelMode('create');
        setEditingLinkId(null);
        setRightPanelOpen(true);
        setSelectedMemberDetail(null);
        setViewingMemberId(null);
        panelForm.resetFields();
        panelForm.setFieldsValue({ status: 'in_progress', courseId: selectedCourse });
    }, [panelForm, selectedCourse]);

    const openEditPanel = useCallback((linkId: string, existingData: Link) => {
        setPanelMode('edit');
        setEditingLinkId(linkId);
        setRightPanelOpen(true);
        setSelectedMemberDetail(null);
        panelForm.setFieldsValue({
            courseId: existingData.courseId,
            mentorId: existingData.mentorId,
            discipleId: existingData.discipleId,
            startDate: existingData.startDate,
            endDate: existingData.endDate ?? '',
            status: existingData.status ?? 'in_progress',
            notes: existingData.notes ?? '',
        });
    }, [panelForm]);

    const closeRightPanel = useCallback(() => {
        setRightPanelOpen(false);
        setSelectedMemberDetail(null);
        setViewingMemberId(null);
    }, []);

    // ── RENDER RIGHT PANEL ──
    const renderRightPanel = () => {
        if (!rightPanelOpen) return null;

        // 1. Panel dạng VIEW chi tiết
        if (panelMode === 'view') {
            if (detailLoading) return <Flex vertical gap={16} className="p-4"><Skeleton active paragraph={{ rows: 6 }} /></Flex>;
            if (!selectedMemberDetail) return <div className="flex h-full items-center justify-center text-slate-400"><Empty description={T.msgEmpty} /></div>;

            const data = selectedMemberDetail;
            return (
                <Flex vertical className="h-full overflow-y-auto p-4 gap-4 pb-24">
                    <Card size="small" title={<span className="text-slate-700"><Mail size={14} className="inline mr-2"/> {T.info}</span>} className="shadow-none border-slate-200">
                        <div className="space-y-2"><div className="flex items-center gap-2"><Avatar size={36} style={{ background: theme.defaultConfig.token?.colorPrimary }}>{data.member.fullName?.[0]}</Avatar><div><Text strong>{data.member.fullName}</Text><br/><Text type="secondary" style={{ fontSize: 12 }}>{data.member.email || "-"}</Text></div></div></div>
                    </Card>
                    <Card size="small" title={<span className="text-slate-700"><Settings size={14} className="inline mr-2"/> {T.properties}</span>} className="shadow-none border-slate-200">
                        <Descriptions column={1} size="small" labelStyle={{ color: "#64748B", width: 80 }}>
                            <Descriptions.Item label="Vai trò"><Tag color={data.member.roles?.length ? "processing" : "default"}>{data.member.roles?.[0] || "Thành viên"}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Điện thoại">{data.member.phone || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Ngày sinh">{data.member.birthDate || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Chi hội">{data.member.branchName || "-"}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                    {data.mentorStats.length > 0 && (
                        <Card size="small" title={<span className="text-slate-700"><PlayCircle size={14} className="inline mr-2"/> {T.runtime}</span>} className="shadow-none border-slate-200">
                            {data.mentorStats.map(stat => <div key={stat.courseId} className="flex justify-between py-1 text-sm border-b border-slate-50 border-dashed last:border-0"><span>{stat.courseName}</span><span className="font-semibold text-slate-700">{stat.totalDisciples} <span className="font-normal text-slate-400">môn đồ</span></span></div>)}
                        </Card>
                    )}
                    <Card size="small" title={<span className="text-slate-700"><Database size={14} className="inline mr-2"/> {T.variables}</span>} className="shadow-none border-slate-200 pb-6">
                        <Timeline
                            items={[
                                ...data.ancestors.slice().reverse().map(a => ({ color: "blue", children: <div className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100"><span className="font-semibold">Người dẫn dắt:</span> {a.member.fullName}</div> })),
                                { color: "green", children: <div className="text-xs bg-green-50 px-2 py-1 rounded border border-green-100 font-semibold text-green-700"> {data.member.fullName} (Đang xem)</div> },
                                ...data.descendants.map(d => ({ color: "orange", children: <div className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100 flex justify-between"><span><span className="font-semibold text-orange-600">Môn đồ:</span> {d.member.fullName}</span><span className="text-slate-400 text-[10px]">Cấp {d.level}</span></div> })),
                            ]}
                        />
                    </Card>
                    <div className="mt-auto sticky bottom-0 bg-white py-3 border-t border-slate-100 flex flex-col gap-2">
                        <div className="text-xs text-slate-500 mb-1">Gửi tin nhắn đào tạo</div>
                        <Input.TextArea rows={2} value={messageInput} onChange={e => setMessageInput(e.target.value)} placeholder="Nhập lời nhắn..." className="text-sm"/>
                        <Button type="primary" icon={<Send size={14} />} onClick={sendMessage} style={{ background: "#F97316", borderColor: "#F97316", width: "100%" }}>{T.send}</Button>
                    </div>
                </Flex>
            );
        }

        // 2. Panel dạng CREATE / EDIT (Panel thay thế)
        return (
            <Flex vertical className="h-full overflow-hidden p-4 bg-white">
                <div className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">{panelMode === 'create' ? T.createRelation : T.editRelation}</div>
                <div className="flex-1 overflow-y-auto pr-1">
                    <Form form={panelForm} layout="vertical" requiredMark="optional">
                        <Form.Item label={T.course} name="courseId" rules={[{ required: true, message: T.msgRequiredCourse }]}>
                            <Select options={courses.map(c => ({ value: c.id, label: c.name }))} placeholder="Chọn khóa học" showSearch optionFilterProp="label" />
                        </Form.Item>
                        <Form.Item label={T.mentor} name="mentorId" rules={[
                            { required: true, message: T.msgRequiredMentor },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || value !== getFieldValue('discipleId')) return Promise.resolve();
                                    return Promise.reject(new Error(T.msgMentorDiscipleDiff));
                                },
                            }),
                        ]}>
                            <Select options={allMembers.filter(u => u.roles?.includes('MENTOR') || u.roles?.includes('ADMIN')).map(u => ({ value: u.id, label: u.fullName }))} placeholder={T.selectMentor} showSearch optionFilterProp="label" />
                        </Form.Item>
                        <Form.Item label={T.disciple} name="discipleId" rules={[
                            { required: true, message: T.msgRequiredDisciple },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || value !== getFieldValue('mentorId')) return Promise.resolve();
                                    return Promise.reject(new Error(T.msgMentorDiscipleDiff));
                                },
                            }),
                        ]}>
                            <Select options={allMembers.map(u => ({ value: u.id, label: u.fullName }))} placeholder={T.selectDisciple} showSearch optionFilterProp="label" />
                        </Form.Item>
                        <Form.Item label={T.startDate} name="startDate" rules={[
                            { required: true, message: T.msgRequiredStartDate },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    const end = getFieldValue('endDate');
                                    if (!value || !end || value <= end) return Promise.resolve();
                                    return Promise.reject(new Error(T.msgStartBeforeEnd));
                                },
                            }),
                        ]}>
                            <Input type="date" className="w-full" />
                        </Form.Item>
                        <Form.Item label={T.endDate} name="endDate" rules={[
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    const start = getFieldValue('startDate');
                                    if (!value || !start || start <= value) return Promise.resolve();
                                    return Promise.reject(new Error(T.msgEndAfterStart));
                                },
                            }),
                        ]}>
                            <Input type="date" className="w-full" />
                        </Form.Item>
                        <Form.Item label={T.status} name="status" initialValue="in_progress">
                            <Select options={[{ value: 'in_progress', label: T.in_progress }, { value: 'completed', label: T.completed }]} />
                        </Form.Item>
                        <Form.Item label={T.notes} name="notes">
                            <Input.TextArea rows={4} placeholder="Nhập ghi chú..." />
                        </Form.Item>
                    </Form>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t mt-2 shrink-0">
                    <Button onClick={() => { setPanelMode('view'); closeRightPanel(); }}>{T.cancelBtn}</Button>
                    <Button type="primary" loading={submitLoading} onClick={handleSubmit} style={{ background: "#F97316", borderColor: "#F97316" }}>
                        {panelMode === 'create' ? T.addRelationBtn : T.saveBtn}
                    </Button>
                </div>
            </Flex>
        );
    };

    // ── UI LAYOUT 3 CỘT ──
    return (
        <div className="h-screen w-full flex flex-col bg-[#f8fafc] font-sans overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200 z-10">
                <div className="flex items-center gap-3"><Space><div className="font-bold text-slate-700 text-base">{T.nodeLibrary}</div></Space></div>
                <div className="flex items-center gap-2">
                    <Button type={focusMyself ? "primary" : "default"} onClick={() => setFocusMyself(!focusMyself)} icon={<EyeOutlined />}>{T.myDiagram}</Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT SIDEBAR */}
                <div className="w-[320px] min-w-[320px] bg-white border-r border-gray-200 flex flex-col h-full">
                    <div className="p-4 border-b border-gray-100">
                        <Select value={selectedCourse} onChange={setSelectedCourse} style={{ width: "100%", marginBottom: 12 }} placeholder={T.selectCourse}>{courses.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}</Select>
                        <Input prefix={<Search size={14} className="text-slate-400"/>} placeholder={T.searchMembers} className="mb-3" />
                        <Button block style={{ background: "#F97316", borderColor: "#F97316", color: "white", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={openCreatePanel}><PlusOutlined /> {T.createNode}</Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Hệ thống lãnh đạo</div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700"><BookOpen size={14} className="inline mr-2"/> Đấng Tối Cao (Gốc)</div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mt-4">Người hướng dẫn</div>
                        {Array.from(memberMap.values()).slice(0, 5).map(m => (
                            <div key={m.id} onClick={() => onEyeClick(m.id)} className="bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-2">
                                <Avatar size={20} style={{ fontSize: 10 }}>{m.fullName?.[0]}</Avatar> {m.fullName}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER CANVAS */}
                <div className="flex-1 relative bg-[#fafbfc]">
                    {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-20"><Spin size="large"/></div>}
                    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.1} maxZoom={2.5}>
                        <Background variant={BackgroundVariant.Dots} gap={12} color="#d1d5db" />
                        <Controls className="!bg-white !border !border-slate-200 !shadow-sm" />
                        <MiniMap className="!bg-white !border !border-slate-200 !shadow-sm" />
                        <Panel position="top-left" className="bg-white/80 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm text-xs text-slate-600">
                            <div className="font-semibold">{courses.find(c => c.id === selectedCourse)?.name || "Cây Môn Đồ"}</div>
                            <div className="text-slate-400 text-[10px]">{T.dragZoom}</div>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* RIGHT SIDEBAR */}
                <div className="w-[380px] min-w-[380px] bg-white border-l border-gray-200 flex flex-col h-full">
                    <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{panelMode === 'view' ? 'Hệ thống cấp bậc' : (panelMode === 'create' ? T.createRelation : T.editRelation)}</span>
                            {panelMode === 'view' && rightPanelOpen && selectedMemberDetail && <Tag color="processing" className="text-[10px]">Đang chọn</Tag>}
                        </div>
                        {rightPanelOpen && <Button type="text" size="small" icon={<X size={14}/>} onClick={closeRightPanel} />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {renderRightPanel()}
                    </div>
                </div>
            </div>
        </div>
    );
}
