"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
    Layout,
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
    Statistic,
    Skeleton,
    Timeline,
    theme,
    DatePicker,
    Form,
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
} from "lucide-react";

import {
    BookOutlined,
    EyeOutlined,
} from "@ant-design/icons";

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
import { TreePersonCard } from "@/components/TreePersonCard/TreePersonCard";

const { Content, Sider } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

// ==================== I18N ====================
const T: Record<string, Record<string, string>> = {
    vi: {
        selectCourse: "Chọn môn học",
        myDiagram: "Xem sơ đồ của tôi",
        messagePlaceholder: "Nhập nội dung thư tín...",
        dragZoom: "Kéo để di chuyển · Cuộn để zoom · Click node để xem nhánh · Nhấn 👁 để xem chi tiết",
        send: "Gửi",
    },
    en: {
        selectCourse: "Select course",
        myDiagram: "My Diagram",
        messagePlaceholder: "Type your message...",
        dragZoom: "Drag to pan · Scroll to zoom · Click node to highlight branch · Click 👁 for details",
        send: "Send",
    },
    ko: {
        selectCourse: "과목 선택",
        myDiagram: "내 다이어그램",
        messagePlaceholder: "서신 내용을 입력하세요...",
        dragZoom: "드래그로 이동 · 스크롤로 확대/축소 · 노드 클릭 시 하위 트리 강조 · 👁 클릭 시 상세 정보",
        send: "보내기",
    },
};

type Link = {
    id: string;
    mentorId: string;
    discipleId: string;
    startDate?: string;
    endDate?: string | null;
    status?: "in_progress" | "completed";
};

type Course = { id: string; name: string };

type MentorStat = {
    courseId: string;
    courseName: string;
    totalDisciples: number;
};

type DescendantNode = {
    member: MemberProfileRecord;
    level: number;
    link: { id: string; startDate?: string; endDate?: string | null };
};

type MemberDetailResponse = {
    member: MemberProfileRecord;
    mentorStats: MentorStat[];
    descendants: DescendantNode[];
    ancestors: AncestorNodeRecord[];
};

// ==================== SUBTREE HELPER ====================
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

// ==================== BUILD TREE ====================
function buildTreeForCourse(
    links: Link[],
    memberMap: Map<string, MemberProfileRecord>,
    focusMemberId: string | undefined,
    onEyeClick: (memberId: string) => void
) {
    if (!links.length) return { nodes: [], edges: [] as Edge[] };

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

    const byLevel: Record<number, string[]> = {};
    Object.entries(levelMap).forEach(([id, lv]) => { byLevel[lv] ||= []; byLevel[lv].push(id); });

    const posMap: Record<string, { x: number; y: number }> = {};
    const NODE_W = 200, NODE_H = 100, GAP_X = 50, GAP_Y = 120;

    Object.entries(byLevel).forEach(([lvStr, ids]) => {
        const lv = Number(lvStr);
        const totalW = ids.length * NODE_W + (ids.length - 1) * GAP_X;
        const startX = -totalW / 2;
        ids.forEach((id, i) => {
            posMap[id] = { x: startX + i * (NODE_W + GAP_X), y: lv * (NODE_H + GAP_Y) };
        });
    });

    const subtreeIds = focusMemberId ? getSubtreeIds(links, focusMemberId) : null;

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const addedNodeIds = new Set<string>();
    const mentorSet = new Set(allMentorIds);
    const allMemberIds = new Set([...allMentorIds, ...allDiscipleIds]);

    const rootInSubtree = !subtreeIds || (focusMemberId ? rootIds.includes(focusMemberId) : false);

    nodes.push({
        id: "root",
        type: "rootNode",
        position: { x: -110, y: -160 },
        data: { courseName: "Môn học Kinh Thánh", isDimmed: subtreeIds ? !rootInSubtree : false },
    });
    addedNodeIds.add("root");

    allMemberIds.forEach(id => {
        if (addedNodeIds.has(id)) return;
        const member = memberMap.get(id);
        const isFocus = focusMemberId === id;
        const isInSubtree = subtreeIds ? subtreeIds.has(id) : false;
        const isDimmed = subtreeIds ? !isInSubtree : false;
        const isMentor = mentorSet.has(id);

        if (isMentor) {
            nodes.push({
                id,
                type: "mentorNode",
                position: posMap[id] || { x: 0, y: 0 },
                data: { member, discipleCount: discipleCount[id] || 0, isFocus, isInSubtree, isDimmed, onEyeClick },
            });
        } else {
            const link = links.find(l => l.discipleId === id);
            nodes.push({
                id,
                type: "discipleNode",
                position: posMap[id] || { x: 0, y: 0 },
                data: { member, link, isFocus, isInSubtree, isDimmed, onEyeClick },
            });
        }
        addedNodeIds.add(id);
    });

    links.forEach(link => {
        const highlighted = subtreeIds && subtreeIds.has(link.mentorId) && subtreeIds.has(link.discipleId);
        const dimmed = subtreeIds && !highlighted;
        edges.push({
            id: `e_${link.id}`,
            source: link.mentorId,
            target: link.discipleId,
            type: "smoothstep",
            animated: !dimmed,
            zIndex: highlighted ? 10 : 0,
            markerEnd: { type: MarkerType.ArrowClosed, color: dimmed ? "#E2E8F0" : "#6366F1" },
            style: {
                stroke: dimmed ? "#E2E8F0" : "#6366F1",
                strokeWidth: highlighted ? 3 : 2,
                opacity: dimmed ? 0.4 : 1,
            },
            pathOptions: { borderRadius: 8 },
        } as Edge);
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
            markerEnd: { type: MarkerType.ArrowClosed, color: dimmed ? "#E2E8F0" : "#38BDF8" },
            style: {
                stroke: dimmed ? "#E2E8F0" : "#38BDF8",
                strokeWidth: 2,
                opacity: dimmed ? 0.4 : 1,
            },
            pathOptions: { borderRadius: 8 },
        } as Edge);
    });

    return { nodes, edges };
}

// ==================== EYE BUTTON ====================
const EyeButton = ({ onClick }: { onClick: () => void }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        title="Xem chi tiết"
        style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            border: "none",
            borderRadius: 6,
            background: "rgba(15,23,42,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#475569",
            padding: 0,
        }}
    >
        <EyeOutlined style={{ fontSize: 12 }} />
    </button>
);

// ==================== CUSTOM NODES ====================
const RootNode = ({ data }: { data: { courseName: string; isDimmed: boolean } }) => (
    <div style={{
        background: "linear-gradient(135deg,#0F172A,#1E3A5F)",
        color: "#fff", borderRadius: 12, padding: "10px 22px",
        fontSize: 13, fontWeight: 700,
        boxShadow: "0 4px 20px rgba(15,23,42,0.35)",
        textAlign: "center", minWidth: 200, border: "2px solid #38BDF8",
        opacity: data.isDimmed ? 0.35 : 1,
        transition: "opacity 0.2s",
    }}>
        <BookOutlined style={{ marginRight: 6, color: "#38BDF8" }} />
        {data.courseName}
        <Handle type="source" position={Position.Bottom} style={{ background: "#14B8A6", width: 10, height: 10 }} />
    </div>
);

const MentorNode = ({ data }: {
    data: {
        member: MemberProfileRecord;
        discipleCount: number;
        isFocus: boolean;
        isInSubtree: boolean;
        isDimmed: boolean;
        onEyeClick: (id: string) => void;
    };
}) => {
    const { member, discipleCount, isFocus, isInSubtree, isDimmed, onEyeClick } = data;
    const borderColor = isFocus ? "#6366F1" : isInSubtree ? "#A5B4FC" : "#C7D2FE";
    return (
        <div style={{
            position: "relative",
            background: isFocus ? "linear-gradient(135deg,#EEF2FF,#E0E7FF)" : "#fff",
            border: `2px solid ${borderColor}`,
            borderRadius: 12, padding: "10px 14px", width: 196,
            boxShadow: isFocus
                ? "0 0 0 4px #6366F130, 0 4px 16px rgba(99,102,241,0.2)"
                : "0 2px 8px rgba(0,0,0,0.08)",
            opacity: isDimmed ? 0.35 : 1,
            transition: "all 0.2s", cursor: "pointer",
        }}>
            <Handle type="target" position={Position.Top} style={{ background: "#6366F1", width: 9, height: 9 }} />
            <EyeButton onClick={() => onEyeClick(member?.id)} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingRight: 18 }}>
                <Avatar size={32} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", fontSize: 13, fontWeight: 700 }}>
                    {member?.fullName?.[0] || "?"}
                </Avatar>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{member?.fullName}</div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>{member?.branchName}</div>
                </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
                <Tag color="geekblue">👤 {discipleCount} môn đồ</Tag>
                <Tag color="purple">Người HD</Tag>
            </div>
            <Handle type="source" position={Position.Bottom} style={{ background: "#6366F1", width: 9, height: 9 }} />
        </div>
    );
};

const DiscipleNode = ({ data }: {
    data: {
        member: MemberProfileRecord;
        link: { id: string; startDate?: string; endDate?: string | null } | undefined;
        isFocus: boolean;
        isInSubtree: boolean;
        isDimmed: boolean;
        onEyeClick: (id: string) => void;
    };
}) => {
    const { member, link, isFocus, isInSubtree, isDimmed, onEyeClick } = data;
    const borderColor = isFocus ? "#10B981" : isInSubtree ? "#6EE7B7" : "#BBF7D0";
    return (
        <div style={{
            position: "relative",
            background: isFocus ? "linear-gradient(135deg,#F0FDF4,#DCFCE7)" : "#fff",
            border: `2px solid ${borderColor}`,
            borderRadius: 12, padding: "10px 14px", width: 196,
            boxShadow: isFocus
                ? "0 0 0 4px #10B98120, 0 4px 16px rgba(16,185,129,0.15)"
                : "0 2px 8px rgba(0,0,0,0.06)",
            opacity: isDimmed ? 0.35 : 1,
            transition: "all 0.2s", cursor: "pointer",
        }}>
            <Handle type="target" position={Position.Top} style={{ background: "#10B981", width: 9, height: 9 }} />
            <EyeButton onClick={() => onEyeClick(member?.id)} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingRight: 18 }}>
                <Avatar size={32} style={{ background: "linear-gradient(135deg,#10B981,#059669)", fontSize: 13, fontWeight: 700 }}>
                    {member?.fullName?.[0] || "?"}
                </Avatar>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{member?.fullName}</div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>{member?.branchName}</div>
                </div>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <Tag color="green">Môn đồ</Tag>
                {link?.startDate && (
                    <Tag style={{ fontSize: 9, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B" }}>
                        {link.startDate} → {link.endDate ?? "-"}
                    </Tag>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} style={{ background: "#10B981", width: 9, height: 9 }} />
        </div>
    );
};

const nodeTypes = { rootNode: RootNode, mentorNode: MentorNode, discipleNode: DiscipleNode };

// ==================== SIDE PANEL SHELL ====================
// Reusable panel chrome matching the reference screenshot: white bg, left/right border,
// header row with title + close button, scrollable body.
const SidePanel = ({
    side,
    title,
    width = 320,
    onClose,
    children,
}: {
    side: "left" | "right";
    title: React.ReactNode;
    width?: number;
    onClose: () => void;
    children: React.ReactNode;
}) => (
    <div
        style={{
            width,
            minWidth: width,
            height: "100%",
            background: "#fff",
            borderLeft: side === "right" ? "1px solid #EEF1F5" : undefined,
            borderRight: side === "left" ? "1px solid #EEF1F5" : undefined,
            display: "flex",
            flexDirection: "column",
            boxShadow: side === "left" ? "2px 0 8px rgba(15,23,42,0.03)" : "-2px 0 8px rgba(15,23,42,0.03)",
            zIndex: 15,
        }}
    >
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid #EEF1F5",
            }}
        >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{title}</div>
            <Button type="text" size="small" icon={<X size={16} />} onClick={onClose} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>{children}</div>
    </div>
);

// ==================== MAIN COMPONENT ====================
export default function Diagram() {
    const [lang] = useState<"vi" | "en" | "ko">("vi");
    const t = T[lang];
    const { token } = theme.useToken();

    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [focusMyself, setFocusMyself] = useState(false);
    const [currentUserId] = useState<string>("");

    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    const [treeLinks, setTreeLinks] = useState<Link[]>([]);
    const [memberMap, setMemberMap] = useState<Map<string, MemberProfileRecord>>(new Map());

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // ---- RIGHT PANEL (detail) ----
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [selectedMemberDetail, setSelectedMemberDetail] = useState<MemberDetailResponse | null>(null);
    const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // ---- LEFT PANEL (create new disciple line) ----
    const [leftPanelOpen, setLeftPanelOpen] = useState(false);
    const [leftPanelMember, setLeftPanelMember] = useState<MemberProfileRecord | null>(null);
    const [createForm] = Form.useForm();
    const [creatingLink, setCreatingLink] = useState(false);
    const [allMembers, setAllMembers] = useState<MemberProfileRecord[]>([]);

    const [messageInput, setMessageInput] = useState("");
    const [loading, setLoading] = useState(false);

    // Load Courses
    useEffect(() => {
        fetch("/api/courses")
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setCourses(res.data || []);
                    if (res.data?.length) setSelectedCourse(res.data[0].id);
                }
            })
            .catch(() => message.error("Không tải được danh sách môn học"));
    }, []);

    // Load all members for the "add disciple" select
    useEffect(() => {
        fetch("/api/members")
            .then(r => r.json())
            .then(res => {
                if (res.success) setAllMembers(res.data || []);
            })
            .catch(() => {});
    }, []);

    const fetchMemberDetail = useCallback(async (memberId: string) => {
        setDrawerLoading(true);
        setViewingMemberId(memberId);
        try {
            const res = await fetch(`/api/members/${memberId}?courseId=${selectedCourse}`);
            const json = await res.json();
            if (json.success) {
                setSelectedMemberDetail(json.data);
            } else {
                message.error(json.error?.message || "Không tải được thông tin thành viên");
            }
        } catch {
            message.error("Lỗi kết nối server");
        } finally {
            setDrawerLoading(false);
        }
    }, [selectedCourse]);

    // Eye icon -> open RIGHT detail panel
    const onEyeClick = useCallback((memberId: string) => {
        if (!memberId) return;
        setLeftPanelOpen(false);
        setFocusedNodeId(memberId);
        setRightPanelOpen(true);
        fetchMemberDetail(memberId);
    }, [fetchMemberDetail]);

    // Node click (not eye) -> highlight branch + open LEFT create panel
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        if (node.id === "root") {
            setFocusedNodeId(null);
            setLeftPanelOpen(false);
            return;
        }
        setFocusedNodeId(prev => (prev === node.id ? null : node.id));
        const member = (node.data as any)?.member as MemberProfileRecord | undefined;
        if (member) {
            setLeftPanelMember(member);
            setLeftPanelOpen(true);
            setRightPanelOpen(false);
            createForm.resetFields();
        }
    }, [createForm]);

    // Rebuild nodes/edges khi focusedNodeId thay đổi
    useEffect(() => {
        if (!treeLinks.length) return;
        const { nodes: n, edges: e } = buildTreeForCourse(treeLinks, memberMap, focusedNodeId ?? undefined, onEyeClick);
        setNodes(n);
        setEdges(e);
    }, [focusedNodeId, treeLinks, memberMap, onEyeClick, setNodes, setEdges]);

    // Load Tree
    useEffect(() => {
        if (!selectedCourse) return;
        const loadTree = async () => {
            setLoading(true);
            setFocusedNodeId(null);
            try {
                const url = focusMyself && currentUserId
                    ? `/api/discipleship-tree?courseId=${selectedCourse}&focusMemberId=${currentUserId}`
                    : `/api/discipleship-tree?courseId=${selectedCourse}`;

                const res = await fetch(url).then(r => r.json());
                if (res.success && res.data?.links) {
                    const links: Link[] = res.data.links;
                    const map = new Map<string, MemberProfileRecord>(
                        res.data.members?.map((m: MemberProfileRecord) => [m.id, m]) || []
                    );
                    setTreeLinks(links);
                    setMemberMap(map);
                } else {
                    setTreeLinks([]);
                    setMemberMap(new Map());
                }
            } catch {
                message.error("Lỗi tải sơ đồ");
            } finally {
                setLoading(false);
            }
        };
        loadTree();
    }, [selectedCourse, focusMyself, currentUserId]);

    const handleDrawerPersonClick = useCallback(async (memberId: string) => {
        setFocusedNodeId(memberId);
        await fetchMemberDetail(memberId);
    }, [fetchMemberDetail]);

    const closeRightPanel = useCallback(() => {
        setRightPanelOpen(false);
        setSelectedMemberDetail(null);
        setViewingMemberId(null);
    }, []);

    const closeLeftPanel = useCallback(() => {
        setLeftPanelOpen(false);
        setLeftPanelMember(null);
        createForm.resetFields();
    }, [createForm]);

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedMemberDetail?.member) return;
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fromId: currentUserId,
                    toId: selectedMemberDetail.member.id,
                    content: messageInput,
                }),
            });
            if (res.ok) {
                message.success("Thư tín đã gửi thành công!");
                setMessageInput("");
            }
        } catch {
            message.error("Gửi thư tín thất bại");
        }
    };

    // Submit new disciple line from LEFT panel
    const handleCreateDiscipleLine = async () => {
        try {
            const values = await createForm.validateFields();
            if (!leftPanelMember?.id) return;
            setCreatingLink(true);
            const res = await fetch("/api/discipleship-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId: selectedCourse,
                    mentorId: leftPanelMember.id,
                    discipleId: values.discipleId,
                    startDate: values.startDate
                        ? values.startDate.format("YYYY-MM-DD")
                        : undefined,
                }),
            });
            const json = await res.json();
            if (json.success) {
                message.success("Đã thêm môn đồ mới!");
                createForm.resetFields();
                // reload tree to reflect new link
                setSelectedCourse(c => c); // no-op trigger; reload manually below
                const reload = await fetch(`/api/discipleship-tree?courseId=${selectedCourse}`).then(r => r.json());
                if (reload.success && reload.data?.links) {
                    setTreeLinks(reload.data.links);
                    const map = new Map<string, MemberProfileRecord>(
                        reload.data.members?.map((m: MemberProfileRecord) => [m.id, m]) || []
                    );
                    setMemberMap(map);
                }
            } else {
                message.error(json.error?.message || "Không thể thêm môn đồ");
            }
        } catch (err) {
            // validation error or network error - validateFields throws for invalid form
            if ((err as any)?.errorFields) return;
            message.error("Lỗi kết nối server");
        } finally {
            setCreatingLink(false);
        }
    };

    // Candidates for "new disciple": any member not already a disciple of someone, excluding the mentor itself
    const existingDiscipleIds = new Set(treeLinks.map(l => l.discipleId));
    const candidateMembers = allMembers.filter(
        m => m.id !== leftPanelMember?.id && !existingDiscipleIds.has(m.id)
    );

    return (
        <div style={{ height: "100vh", background: "#f8fafc" }}>
            <Layout style={{ height: "100%" }}>
                <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-100">
                    <Select
                        value={selectedCourse}
                        onChange={setSelectedCourse}
                        style={{ width: 280 }}
                        placeholder={t.selectCourse}
                    >
                        {courses.map(c => (
                            <Option key={c.id} value={c.id}>{c.name}</Option>
                        ))}
                    </Select>

                    <Button
                        type={focusMyself ? "primary" : "default"}
                        icon={<EyeOutlined />}
                        onClick={() => setFocusMyself(!focusMyself)}
                    >
                        {t.myDiagram}
                    </Button>
                </div>

                {/* 3-column row: LEFT panel | Flow canvas | RIGHT panel */}
                <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                    {leftPanelOpen && leftPanelMember && (
                        <SidePanel
                            side="left"
                            width={320}
                            title={
                                <Space>
                                    <UserPlus size={16} />
                                    <span>Thêm môn đồ mới</span>
                                </Space>
                            }
                            onClose={closeLeftPanel}
                        >
                            <Flex vertical gap={16}>
                                <Card size="small" bordered styles={{ body: { padding: 12 } }}>
                                    <Flex align="center" gap={10}>
                                        <Avatar
                                            size={36}
                                            style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", fontWeight: 700 }}
                                        >
                                            {leftPanelMember.fullName?.[0]}
                                        </Avatar>
                                        <Flex vertical gap={0}>
                                            <Text strong style={{ fontSize: 13 }}>{leftPanelMember.fullName}</Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                Người hướng dẫn (mentor)
                                            </Text>
                                        </Flex>
                                    </Flex>
                                </Card>

                                <Form form={createForm} layout="vertical" requiredMark={false}>
                                    <Form.Item
                                        name="discipleId"
                                        label="Chọn môn đồ"
                                        rules={[{ required: true, message: "Vui lòng chọn môn đồ" }]}
                                    >
                                        <Select
                                            showSearch
                                            placeholder="Tìm thành viên..."
                                            optionFilterProp="children"
                                            filterOption={(input, option) =>
                                                (option?.children as unknown as string)
                                                    ?.toLowerCase()
                                                    .includes(input.toLowerCase())
                                            }
                                        >
                                            {candidateMembers.map(m => (
                                                <Option key={m.id} value={m.id}>
                                                    {m.fullName}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item name="startDate" label="Ngày bắt đầu">
                                        <DatePicker style={{ width: "100%" }} />
                                    </Form.Item>
                                </Form>

                                <Button
                                    type="primary"
                                    block
                                    loading={creatingLink}
                                    onClick={handleCreateDiscipleLine}
                                >
                                    Tạo liên kết môn đồ
                                </Button>
                            </Flex>
                        </SidePanel>
                    )}

                    <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-20">
                                <Spin size="large" />
                            </div>
                        )}

                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onNodeClick={onNodeClick}
                            nodeTypes={nodeTypes}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            minZoom={0.2}
                            maxZoom={2.5}
                        >
                            <Background variant={BackgroundVariant.Lines} gap={20} color="#f1f5f9" />
                            <Controls />
                            <MiniMap />
                            <Panel position="top-right">
                                <div style={{
                                    background: "#fff",
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                    fontSize: 12,
                                }}>
                                    {t.dragZoom}
                                </div>
                            </Panel>
                        </ReactFlow>
                    </div>

                    {rightPanelOpen && (
                        <SidePanel
                            side="right"
                            width={600}
                            title={
                                selectedMemberDetail ? (
                                    <Space size={12}>
                                        <Avatar
                                            size={36}
                                            style={{ background: token.colorPrimary, fontWeight: 700 }}
                                        >
                                            {selectedMemberDetail.member.fullName?.[0]}
                                        </Avatar>
                                        <Flex vertical gap={0}>
                                            <Text strong style={{ fontSize: 14 }}>
                                                {selectedMemberDetail.member.fullName}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {selectedMemberDetail.member.branchName}
                                            </Text>
                                        </Flex>
                                    </Space>
                                ) : (
                                    "Chi tiết thành viên"
                                )
                            }
                            onClose={closeRightPanel}
                        >
                            {drawerLoading ? (
                                <Flex vertical gap={20}>
                                    <Skeleton.Avatar active size={80} />
                                    <Skeleton active paragraph={{ rows: 4 }} />
                                    <Skeleton active paragraph={{ rows: 6 }} />
                                    <Skeleton active paragraph={{ rows: 3 }} />
                                </Flex>
                            ) : selectedMemberDetail ? (
                                <Flex vertical gap={20}>
                                    {/* HERO */}
                                    <Card
                                        bordered={false}
                                        styles={{
                                            body: {
                                                borderRadius: token.borderRadiusLG,
                                                background: token.colorFillAlter,
                                                boxShadow: token.boxShadowSecondary,
                                            },
                                        }}
                                    >
                                        <Flex gap={20} align="center">
                                            <Avatar
                                                size={84}
                                                style={{
                                                    background: token.colorPrimary,
                                                    fontSize: 28,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {selectedMemberDetail.member.fullName?.[0]}
                                            </Avatar>

                                            <Flex vertical flex={1}>
                                                <Title level={3} style={{ margin: 0 }}>
                                                    {selectedMemberDetail.member.fullName}
                                                </Title>

                                                <Text type="secondary">
                                                    {selectedMemberDetail.member.email}
                                                </Text>

                                                <Space wrap style={{ marginTop: 12 }}>
                                                    {selectedMemberDetail.member.roles?.map(role => (
                                                        <Tag key={role} color="processing">
                                                            {role}
                                                        </Tag>
                                                    ))}
                                                </Space>
                                            </Flex>
                                        </Flex>
                                    </Card>

                                    {/* PROFILE */}
                                    <Card title="Thông tin cá nhân">
                                        <Descriptions
                                            column={1}
                                            size="middle"
                                            colon={false}
                                            items={[
                                                {
                                                    key: "email",
                                                    label: (
                                                        <Space>
                                                            <Mail size={16} />
                                                            Email
                                                        </Space>
                                                    ),
                                                    children: selectedMemberDetail.member.email || "-",
                                                },
                                                {
                                                    key: "phone",
                                                    label: (
                                                        <Space>
                                                            <Phone size={16} />
                                                            Điện thoại
                                                        </Space>
                                                    ),
                                                    children: selectedMemberDetail.member.phone || "-",
                                                },
                                                {
                                                    key: "birth",
                                                    label: (
                                                        <Space>
                                                            <Calendar size={16} />
                                                            Ngày sinh
                                                        </Space>
                                                    ),
                                                    children: selectedMemberDetail.member.birthDate || "-",
                                                },
                                                {
                                                    key: "branch",
                                                    label: (
                                                        <Space>
                                                            <Building2 size={16} />
                                                            Chi hội
                                                        </Space>
                                                    ),
                                                    children: selectedMemberDetail.member.branchName || "-",
                                                },
                                            ]}
                                        />
                                    </Card>

                                    {/* TREE */}
                                    <Card
                                        title={
                                            <Space>
                                                <Users size={18} />
                                                <span>Cây Môn Đồ</span>
                                            </Space>
                                        }
                                    >
                                        {selectedMemberDetail.ancestors.length === 0 &&
                                            selectedMemberDetail.descendants.length === 0 ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description="Chưa có dữ liệu"
                                            />
                                        ) : (
                                            <Timeline
                                                items={[
                                                    ...selectedMemberDetail.ancestors
                                                        .slice()
                                                        .reverse()
                                                        .map(item => ({
                                                            children: (
                                                                <TreePersonCard
                                                                    member={item.member}
                                                                    active={item.member.id === viewingMemberId}
                                                                    onClick={() => handleDrawerPersonClick(item.member.id)}
                                                                />
                                                            ),
                                                        })),

                                                    {
                                                        color: token.colorPrimary,
                                                        children: (
                                                            <TreePersonCard
                                                                member={selectedMemberDetail.member}
                                                                active={selectedMemberDetail.member.id === viewingMemberId}
                                                                onClick={() => handleDrawerPersonClick(selectedMemberDetail.member.id)}
                                                            />
                                                        ),
                                                    },

                                                    ...selectedMemberDetail.descendants.map(item => ({
                                                        children: (
                                                            <TreePersonCard
                                                                member={item.member}
                                                                level={item.level}
                                                                active={item.member.id === viewingMemberId}
                                                                onClick={() => handleDrawerPersonClick(item.member.id)}
                                                            />
                                                        ),
                                                    })),
                                                ]}
                                            />
                                        )}
                                    </Card>

                                    {/* STATS */}
                                    {selectedMemberDetail.mentorStats.length > 0 && (
                                        <Card
                                            title={
                                                <Space>
                                                    <GraduationCap size={18} />
                                                    <span>Thống kê đào tạo</span>
                                                </Space>
                                            }
                                        >
                                            <List
                                                dataSource={selectedMemberDetail.mentorStats}
                                                renderItem={stat => (
                                                    <List.Item>
                                                        <Statistic
                                                            title={stat.courseName}
                                                            value={stat.totalDisciples}
                                                            suffix="môn đồ"
                                                        />
                                                    </List.Item>
                                                )}
                                            />
                                        </Card>
                                    )}

                                    {/* MESSAGE */}
                                    <Card title="Thư tín">
                                        <Flex vertical gap={12}>
                                            <Input.TextArea
                                                rows={4}
                                                value={messageInput}
                                                onChange={e => setMessageInput(e.target.value)}
                                                placeholder={t.messagePlaceholder}
                                                showCount
                                                maxLength={500}
                                            />

                                            <Flex justify="end">
                                                <Button
                                                    type="primary"
                                                    icon={<Send size={16} />}
                                                    onClick={sendMessage}
                                                >
                                                    {t.send}
                                                </Button>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                </Flex>
                            ) : (
                                <Empty description="Không có dữ liệu" />
                            )}
                        </SidePanel>
                    )}
                </div>
            </Layout>
        </div>
    );
}
