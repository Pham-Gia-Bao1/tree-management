"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
    Layout,
    Input,
    Tag,
    Button,
    Select,
    Drawer,
    Empty,
    message,
    Spin,
    Card,
    Flex,
    Space,
    Divider,
    Avatar
} from "antd";
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

import {
    Mail,
    Phone,
    Calendar,
    Building2,
    GraduationCap,
    ChevronDown,
    Users,
    X,
    Send,
} from "lucide-react";

import "@xyflow/react/dist/style.css";
import { AncestorNodeRecord, MemberProfileRecord } from "@/types/member.types";
import { TreePersonCard } from "@/components/TreePersonCard/TreePersonCard";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";

const { Content } = Layout;
const { Option } = Select;

// ==================== I18N ====================
const T: Record<string, Record<string, string>> = {
    vi: {
        selectCourse: "Chọn môn học",
        myDiagram: "Xem sơ đồ của tôi",
        messagePlaceholder: "Nhập nội dung thư tín...",
        dragZoom: "Kéo để di chuyển · Cuộn để zoom · Click node để xem chi tiết",
        send: "Gửi",
    },
    en: {
        selectCourse: "Select course",
        myDiagram: "My Diagram",
        messagePlaceholder: "Type your message...",
        dragZoom: "Drag to pan · Scroll to zoom · Click node for details",
        send: "Send",
    },
    ko: {
        selectCourse: "과목 선택",
        myDiagram: "내 다이어그램",
        messagePlaceholder: "서신 내용을 입력하세요...",
        dragZoom: "드래그로 이동 · 스크롤로 확대/축소 · 노드 클릭 시 상세 정보",
        send: "보내기",
    },
};

type Link = {
    id: string;
    mentorId: string;
    discipleId: string;
    startDate?: string;
    endDate?: string | null;
    status?: 'in_progress' | 'completed';
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

// ==================== BUILD TREE ====================
function buildTreeForCourse(
    links: Link[],
    memberMap: Map<string, MemberProfileRecord>,
    focusMemberId?: string
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

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const addedNodeIds = new Set<string>();
    const mentorSet = new Set(allMentorIds);
    const allMemberIds = new Set([...allMentorIds, ...allDiscipleIds]);

    nodes.push({
        id: "root",
        type: "rootNode",
        position: { x: -110, y: -160 },
        data: { courseName: "Môn học Kinh Thánh" },
    });
    addedNodeIds.add("root");

    allMemberIds.forEach(id => {
        if (addedNodeIds.has(id)) return;
        const member = memberMap.get(id);
        const isFocus = focusMemberId === id;
        const isMentor = mentorSet.has(id);

        if (isMentor) {
            nodes.push({
                id,
                type: "mentorNode",
                position: posMap[id] || { x: 0, y: 0 },
                data: { member, discipleCount: discipleCount[id] || 0, isFocus },
            });
        } else {
            const link = links.find(l => l.discipleId === id);
            nodes.push({
                id,
                type: "discipleNode",
                position: posMap[id] || { x: 0, y: 0 },
                data: { member, link, isFocus },
            });
        }
        addedNodeIds.add(id);
    });

    links.forEach(link => {
        edges.push({
            id: `e_${link.id}`,
            source: link.mentorId,
            target: link.discipleId,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6366F1" },
            style: { stroke: "#6366F1", strokeWidth: 2 },
            pathOptions: { borderRadius: 8 },
        } as Edge);
    });

    rootIds.forEach(rid => {
        edges.unshift({
            id: `root_${rid}`,
            source: "root",
            target: rid,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#38BDF8" },
            style: { stroke: "#38BDF8", strokeWidth: 2 },
            pathOptions: { borderRadius: 8 },
        } as Edge);
    });

    return { nodes, edges };
}

// ==================== CUSTOM NODES ====================
const RootNode = ({ data }: any) => (
    <div style={{
        background: "linear-gradient(135deg,#0F172A,#1E3A5F)",
        color: "#fff", borderRadius: 12, padding: "10px 22px",
        fontSize: 13, fontWeight: 700,
        boxShadow: "0 4px 20px rgba(15,23,42,0.35)",
        textAlign: "center", minWidth: 200, border: "2px solid #38BDF8",
    }}>
        <BookOutlined style={{ marginRight: 6, color: "#38BDF8" }} />
        {data.courseName}
        <Handle type="source" position={Position.Bottom} style={{ background: "#14B8A6", width: 10, height: 10 }} />
    </div>
);

const MentorNode = ({ data }: any) => {
    const { member, discipleCount, isFocus } = data;
    return (
        <div style={{
            background: isFocus ? "linear-gradient(135deg,#EEF2FF,#E0E7FF)" : "#fff",
            border: `2px solid ${isFocus ? "#6366F1" : "#C7D2FE"}`,
            borderRadius: 12, padding: "10px 14px", width: 196,
            boxShadow: isFocus
                ? "0 0 0 4px #6366F130, 0 4px 16px rgba(99,102,241,0.2)"
                : "0 2px 8px rgba(0,0,0,0.08)",
            transition: "all 0.2s", cursor: "pointer",
        }}>
            <Handle type="target" position={Position.Top} style={{ background: "#6366F1", width: 9, height: 9 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
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

const DiscipleNode = ({ data }: any) => {
    const { member, link, isFocus } = data;
    return (
        <div style={{
            background: isFocus ? "linear-gradient(135deg,#F0FDF4,#DCFCE7)" : "#fff",
            border: `2px solid ${isFocus ? "#10B981" : "#BBF7D0"}`,
            borderRadius: 12, padding: "10px 14px", width: 196,
            boxShadow: isFocus
                ? "0 0 0 4px #10B98120, 0 4px 16px rgba(16,185,129,0.15)"
                : "0 2px 8px rgba(0,0,0,0.06)",
            transition: "all 0.2s", cursor: "pointer",
        }}>
            <Handle type="target" position={Position.Top} style={{ background: "#10B981", width: 9, height: 9 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
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
                        {link.startDate} → {link.endDate ?? '-'}
                    </Tag>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} style={{ background: "#10B981", width: 9, height: 9 }} />
        </div>
    );
};

const nodeTypes = { rootNode: RootNode, mentorNode: MentorNode, discipleNode: DiscipleNode };

// ==================== MAIN COMPONENT ====================
export default function Diagram() {
    const [lang] = useState<"vi" | "en" | "ko">("vi");
    const t = T[lang];

    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [focusMyself, setFocusMyself] = useState(false);
    const [currentUserId] = useState<string>("");

    // FIX 1: track which member id is currently highlighted on the diagram
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    // Raw tree data so we can rebuild nodes with new highlight without re-fetching
    const [treeLinks, setTreeLinks] = useState<Link[]>([]);
    const [memberMap, setMemberMap] = useState<Map<string, MemberProfileRecord>>(new Map());

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedMemberDetail, setSelectedMemberDetail] = useState<MemberDetailResponse | null>(null);

    // FIX 2: track which member id is being viewed in the drawer
    const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);

    const [messageInput, setMessageInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);

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

    // Rebuild nodes whenever focusedNodeId changes — no extra fetch needed
    useEffect(() => {
        if (!treeLinks.length) return;
        const { nodes: n, edges: e } = buildTreeForCourse(treeLinks, memberMap, focusedNodeId ?? undefined);
        setNodes(n);
        setEdges(e);
    }, [focusedNodeId, treeLinks, memberMap, setNodes, setEdges]);

    // Load Tree (fetch)
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
                    // initial render without focus
                    const { nodes: n, edges: e } = buildTreeForCourse(links, map, undefined);
                    setNodes(n);
                    setEdges(e);
                }
            } catch {
                message.error("Lỗi tải sơ đồ");
            } finally {
                setLoading(false);
            }
        };
        loadTree();
    }, [selectedCourse, focusMyself, currentUserId, setNodes, setEdges]);

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

    // FIX 1: on node click → set focusedNodeId so diagram highlights it, then open drawer
    const onNodeClick = useCallback(async (_: any, node: Node) => {
        if (node.id === "root") return;
        setFocusedNodeId(node.id);   // ← highlight on diagram
        setDrawerOpen(true);
        await fetchMemberDetail(node.id);
    }, [fetchMemberDetail]);

    // Clicking a person inside the drawer tree
    const handleDrawerPersonClick = useCallback(async (memberId: string) => {
        await fetchMemberDetail(memberId);
    }, [fetchMemberDetail]);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        setSelectedMemberDetail(null);
        setViewingMemberId(null);
        setFocusedNodeId(null);   // clear diagram highlight when drawer closes
    }, []);

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

                <Content style={{ position: "relative" }}>
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
                            <div style={{ background: "#fff", padding: "6px 12px", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                                💡 {t.dragZoom}
                            </div>
                        </Panel>
                    </ReactFlow>
                </Content>
            </Layout>

            {/* ==================== DRAWER ==================== */}
            <Drawer
                open={drawerOpen}
                onClose={closeDrawer}
                placement="right"
                closable={false}
                size="large"
            >
                {drawerLoading && !selectedMemberDetail ? (
                    <Flex justify="center" align="center" style={{ height: "100%" }}>
                        <Spin size="large" />
                    </Flex>
                ) : selectedMemberDetail ? (
                    <Flex vertical gap={24}>
                        {/* Header */}
                        <Card styles={{ body: { background: "linear-gradient(135deg,#4F46E5 0%, #7C3AED 100%)", color: "#fff" } }}>
                            <Flex justify="space-between" align="flex-start">
                                <Space size={16} align="start">
                                    <Avatar size={72}>
                                        {selectedMemberDetail.member.fullName?.[0]}
                                    </Avatar>
                                    <Flex vertical gap={4}>
                                        <Title level={3} style={{ color: "#fff", margin: 0 }}>
                                            {selectedMemberDetail.member.fullName}
                                        </Title>
                                        <Text style={{ color: "#E2E8F0" }}>
                                            {selectedMemberDetail.member.branchName}
                                        </Text>
                                        <Space wrap>
                                            {selectedMemberDetail.member.roles?.map(role => (
                                                <Tag key={role} color="processing">{role}</Tag>
                                            ))}
                                        </Space>
                                    </Flex>
                                </Space>
                                <Button type="text" icon={<X size={18} />} onClick={closeDrawer} />
                            </Flex>
                        </Card>

                        {/* Profile */}
                        <Card title="Thông tin cá nhân">
                            <Flex vertical gap={20}>
                                {[
                                    { icon: <Mail size={16} />, label: "Email", value: selectedMemberDetail.member.email },
                                    { icon: <Phone size={16} />, label: "Phone", value: selectedMemberDetail.member.phone },
                                    { icon: <Calendar size={16} />, label: "Birth Date", value: selectedMemberDetail.member.birthDate },
                                    { icon: <Building2 size={16} />, label: "Branch", value: selectedMemberDetail.member.branchName },
                                ].map(({ icon, label, value }) => (
                                    <Flex key={label} justify="space-between">
                                        <Space>{icon}<Text strong>{label}</Text></Space>
                                        <Text>{value}</Text>
                                    </Flex>
                                ))}
                            </Flex>
                        </Card>

                        {/* Tree — FIX 2: pass viewingMemberId to highlight the correct person */}
                        <Card title={<Space><Users size={18} /><span>Cây Môn Đồ</span></Space>}>
                            <Flex vertical gap={12}>
                                {selectedMemberDetail.ancestors?.slice().reverse().map(item => (
                                    <React.Fragment key={item.member.id}>
                                        <TreePersonCard
                                            member={item.member}
                                            // FIX 2: highlight if this ancestor is the one being viewed
                                            active={item.member.id === viewingMemberId}
                                            onClick={() => handleDrawerPersonClick(item.member.id)}
                                        />
                                        <Flex justify="center"><ChevronDown size={18} /></Flex>
                                    </React.Fragment>
                                ))}

                                {/* FIX 2: highlight the root member only if they are the one being viewed */}
                                <TreePersonCard
                                    member={selectedMemberDetail.member}
                                    active={selectedMemberDetail.member.id === viewingMemberId}
                                    onClick={() => handleDrawerPersonClick(selectedMemberDetail.member.id)}
                                />

                                {selectedMemberDetail.descendants.length > 0 && (
                                    <Flex justify="center"><ChevronDown size={18} /></Flex>
                                )}

                                {selectedMemberDetail.descendants.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có môn đồ" />
                                ) : (
                                    <Flex vertical gap={10}>
                                        {selectedMemberDetail.descendants.map(item => (
                                            <TreePersonCard
                                                key={item.member.id}
                                                member={item.member}
                                                level={item.level}
                                                // FIX 2: highlight if this descendant is the one being viewed
                                                active={item.member.id === viewingMemberId}
                                                onClick={() => handleDrawerPersonClick(item.member.id)}
                                            />
                                        ))}
                                    </Flex>
                                )}
                            </Flex>
                        </Card>

                        {/* Stats */}
                        {selectedMemberDetail.mentorStats.length > 0 && (
                            <Card title={<Space><GraduationCap size={18} /><span>Thống kê đào tạo</span></Space>}>
                                <Flex vertical>
                                    {selectedMemberDetail.mentorStats.map((stat, index) => (
                                        <React.Fragment key={stat.courseId}>
                                            <Flex justify="space-between" align="center">
                                                <Text>{stat.courseName}</Text>
                                                <Tag color="blue">{stat.totalDisciples}</Tag>
                                            </Flex>
                                            {index !== selectedMemberDetail.mentorStats.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </Flex>
                            </Card>
                        )}

                        {/* Message */}
                        <Card title="Thư tín">
                            <Space.Compact block>
                                <Input
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    onPressEnter={sendMessage}
                                    placeholder={t.messagePlaceholder}
                                />
                                <Button type="primary" icon={<Send size={16} />} onClick={sendMessage}>
                                    {t.send}
                                </Button>
                            </Space.Compact>
                        </Card>
                    </Flex>
                ) : null}
            </Drawer>
        </div>
    );
}
