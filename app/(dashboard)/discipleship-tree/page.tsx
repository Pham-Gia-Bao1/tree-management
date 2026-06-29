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
  Leaf,
  Flower,
  Sparkles,
  TreePine,
} from "lucide-react";

import { EyeOutlined, PlusOutlined, MenuOutlined } from "@ant-design/icons";

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
  nodeLibrary: "Thư viện lãnh đạo",
  searchMembers: "Tìm kiếm thành viên...",
  createNode: "Thêm môn đồ mới",
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
  selectMentor: "Chọn người hướng dẫn",
  selectDisciple: "Chọn môn đồ",
  selectStatus: "Chọn trạng thái",
  info: "Tổng quan",
  properties: "Thuộc tính",
  runtime: "Chỉ số đào tạo",
  variables: "Hệ thống cấp bậc",
  send: "Gửi tin nhắn",
  msgCreateSuccess: "Tạo liên kết thành công!",
  msgUpdateSuccess: "Cập nhật liên kết thành công!",
  msgError: "Có lỗi xảy ra, vui lòng thử lại.",
  msgEmpty: "Click vào một node để xem chi tiết",
  msgRequiredCourse: "Vui lòng chọn khóa học.",
  msgRequiredMentor: "Vui lòng chọn người hướng dẫn.",
  msgRequiredDisciple: "Vui lòng chọn môn đồ.",
  msgRequiredStartDate: "Vui lòng chọn ngày bắt đầu.",
  msgMentorDiscipleDiff: "Người hướng dẫn và môn đồ phải là 2 người khác nhau.",
  msgStartBeforeEnd: "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.",
  msgEndAfterStart: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.",
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
type UserRecord = { id: string; fullName: string; roles?: string[] };
type MentorStat = { courseId: string; courseName: string; totalDisciples: number };
type DescendantNode = { member: MemberProfileRecord; level: number; link: { id: string; startDate?: string; endDate?: string | null } };
type MemberDetailResponse = { member: MemberProfileRecord; mentorStats: MentorStat[]; descendants: DescendantNode[]; ancestors: AncestorNodeRecord[] };
type PanelMode = 'view' | 'create' | 'edit';

// ==================== LAYOUT ALGORITHM (DỌC – GIỐNG CÂY) ====================
function calculateTreeLayout(
  rootIds: string[],
  links: Link[],
  levelMap: Record<string, number>
): Record<string, { x: number; y: number }> {
  const posMap: Record<string, { x: number; y: number }> = {};
  const NODE_W = 280;
  const NODE_H = 80;
  const GAP_Y = 120; // Khoảng cách dọc giữa các cấp
  const GAP_X = 40;  // Khoảng cách ngang giữa các node cùng cấp

  // Tính kích thước subtree (số lượng node con)
  const subtreeSize: Record<string, number> = {};
  const dfsCount = (id: string): number => {
    const children = links.filter(l => l.mentorId === id).map(l => l.discipleId);
    if (children.length === 0) {
      subtreeSize[id] = 1;
      return 1;
    }
    let total = 0;
    children.forEach(child => total += dfsCount(child));
    subtreeSize[id] = total;
    return total;
  };
  rootIds.forEach(root => dfsCount(root));

  // Hàm đệ quy gán vị trí (x, y)
  const assignPos = (id: string, x: number, y: number) => {
    posMap[id] = { x, y };
    const children = links.filter(l => l.mentorId === id).map(l => l.discipleId);
    if (children.length === 0) return;

    // Phân bố các con đều nhau theo chiều ngang trong khoảng chiều rộng của subtree
    const childCount = children.length;
    const totalWidth = (childCount - 1) * (NODE_W + GAP_X);
    const startX = x - totalWidth / 2;
    children.forEach((child, index) => {
      const childX = startX + index * (NODE_W + GAP_X);
      assignPos(child, childX, y + GAP_Y);
    });
  };

  // Xác định vị trí các root: phân bố đều theo chiều ngang
  const totalRoots = rootIds.length;
  const totalWidth = (totalRoots - 1) * (NODE_W + GAP_X);
  rootIds.forEach((root, index) => {
    const x = -totalWidth / 2 + index * (NODE_W + GAP_X);
    assignPos(root, x, 0);
  });

  return posMap;
}

// ==================== HELPER ====================
const getColorForLevel = (level: number) => {
  if (level === 0) return "#10B981";
  if (level === 1) return "#F97316";
  return "#3B82F6";
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

  // Sử dụng layout dọc
  const posMap = calculateTreeLayout(rootIds, links, levelMap);

  const subtreeIds = focusMemberId ? getSubtreeIds(links, focusMemberId) : null;
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const addedNodeIds = new Set<string>();
  const mentorSet = new Set(allMentorIds);
  const allMemberIds = new Set([...allMentorIds, ...allDiscipleIds]);
  const rootInSubtree = !subtreeIds || (focusMemberId ? rootIds.includes(focusMemberId) : false);

  // Node gốc (Đấng Tối Cao) – đặt ở trên cùng, x=0
  nodes.push({
    id: "root",
    type: "rootNode",
    position: { x: 0, y: -80 },
    data: {
      courseName: "Đấng Tối Cao",
      isDimmed: subtreeIds ? !rootInSubtree : false,
    },
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
    const data = {
      member,
      level,
      isFocus,
      isInSubtree,
      isDimmed,
      onEyeClick,
      discipleCount: discipleCount[id] || 0,
      isMentor,
    };
    const node = {
      id,
      position: posMap[id] || { x: 0, y: 0 },
      data,
    };
    if (isMentor) {
      nodes.push({ ...node, type: "mentorNode" });
    } else {
      const link = links.find(l => l.discipleId === id);
      nodes.push({ ...node, type: "discipleNode", data: { ...data, link } });
    }
    addedNodeIds.add(id);
  });

  // Edges
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
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: dimmed ? "#E2E8F0" : edgeColor,
      },
      style: {
        stroke: dimmed ? "#E2E8F0" : edgeColor,
        strokeWidth: highlighted ? 3 : 2,
        opacity: dimmed ? 0.4 : 1,
      },
      pathOptions: { borderRadius: 8 },
    } as any);
  });

  // Kết nối root → các root thật
  rootIds.forEach(rid => {
    const highlighted = !subtreeIds || (subtreeIds && subtreeIds.has(rid) && rootInSubtree);
    const dimmed = subtreeIds && !highlighted;
    edges.unshift({
      id: `root_${rid}`,
      source: "root",
      target: rid,
      type: "smoothstep",
      zIndex: highlighted ? 10 : 0,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: dimmed ? "#E2E8F0" : "#10B981",
      },
      style: {
        stroke: dimmed ? "#E2E8F0" : "#10B981",
        strokeWidth: 2,
        opacity: dimmed ? 0.4 : 1,
      },
      pathOptions: { borderRadius: 8 },
    } as any);
  });

  return { nodes, edges };
}

// ==================== CUSTOM NODES VỚI HOA LÁ & ANIMATION ====================
const WorkflowNodeBase = ({
  data,
  children,
  leafIcon = null,
}: {
  data: any;
  children: React.ReactNode;
  leafIcon?: React.ReactNode;
}) => {
  const { member, level, isDimmed, isFocus, isMentor, onEyeClick, discipleCount } = data;
  const color = getColorForLevel(level);
  const isRoot = level === 0;

  return (
    <div
      className="fade-in-node"
      style={{
        width: isRoot ? 200 : 280,
        background: isFocus
          ? "linear-gradient(135deg, #f0fdf4, #dcfce7)"
          : "linear-gradient(135deg, #ffffff, #fafafa)",
        border: isFocus ? `2px solid ${color}` : "1px solid #d1d5db",
        borderRadius: 20,
        padding: 14,
        boxShadow: isFocus
          ? "0 8px 25px rgba(16, 185, 129, 0.2)"
          : "0 4px 12px rgba(0,0,0,0.06)",
        opacity: isDimmed ? 0.4 : 1,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        backdropFilter: "blur(4px)",
        cursor: "pointer",
        transform: isFocus ? "scale(1.02)" : "scale(1)",
      }}
    >
      {/* Hoa lá trang trí */}
      {leafIcon && (
        <div
          style={{
            position: "absolute",
            top: -12,
            right: -12,
            fontSize: 28,
            opacity: 0.9,
            animation: "sway 4s ease-in-out infinite",
          }}
        >
          {leafIcon}
        </div>
      )}
      {!isRoot && (
        <div
          style={{
            position: "absolute",
            bottom: -10,
            left: -10,
            fontSize: 20,
            opacity: 0.7,
            animation: "sway 5s ease-in-out infinite reverse",
          }}
        >
          <Leaf size={20} color="#4CAF50" />
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #f1f5f9",
          paddingBottom: 6,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isRoot ? <TreePine size={16} /> : <User size={14} />}
          {isRoot ? "Đấng Tối Cao" : member?.fullName || "Người vô danh"}
        </div>
        <div>
          {isRoot && (
            <Tag color="success" style={{ fontSize: 10, borderRadius: 12 }}>
              Khởi nguồn
            </Tag>
          )}
          {!isRoot && isMentor && (
            <Tag color="warning" style={{ fontSize: 10, borderRadius: 12 }}>
              <GraduationCap size={12} /> Người HD
            </Tag>
          )}
          {!isRoot && !isMentor && (
            <Tag color="processing" style={{ fontSize: 10, borderRadius: 12 }}>
              <Users size={12} /> Môn đồ
            </Tag>
          )}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "#475569",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {children}
      </div>

      {/* Nút xem chi tiết */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          cursor: "pointer",
          background: "#f1f5f9",
          borderRadius: "50%",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (member?.id) onEyeClick(member.id);
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
      >
        <EyeOutlined style={{ color: "#64748b", fontSize: 14 }} />
      </div>

      {/* Handles cho layout dọc: target ở trên, source ở dưới */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: color,
          width: 12,
          height: 12,
          border: "2px solid white",
          boxShadow: "0 0 0 2px rgba(16,185,129,0.3)",
          borderRadius: "50%",
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: color,
          width: 12,
          height: 12,
          border: "2px solid white",
          boxShadow: "0 0 0 2px rgba(16,185,129,0.3)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
};

const RootNode = ({ data }: { data: any }) => (
  <WorkflowNodeBase data={data} leafIcon={<Sparkles size={24} color="#fbbf24" />}>
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <TreePine size={14} /> Sự khởi đầu của hệ thống
    </div>
  </WorkflowNodeBase>
);

const MentorNode = ({ data }: { data: any }) => (
  <WorkflowNodeBase data={data} leafIcon={<Flower size={24} color="#f472b6" />}>
    <div>
      <Tag color="geekblue" style={{ borderRadius: 12 }}>
        <GraduationCap size={12} /> Dẫn dắt
      </Tag>{" "}
      <span style={{ color: "#1e293b" }}>
        {data.member?.branchName || ""}
      </span>
    </div>
    <div>
      <Users size={14} /> Môn đồ:{" "}
      <span style={{ fontWeight: 600 }}>{data.discipleCount || 0}</span>
    </div>
  </WorkflowNodeBase>
);

const DiscipleNode = ({ data }: { data: any }) => (
  <WorkflowNodeBase data={data} leafIcon={<Leaf size={24} color="#34d399" />}>
    <div>
      <Tag color="green" style={{ borderRadius: 12 }}>
        <Users size={12} /> Học viên
      </Tag>{" "}
      <span style={{ color: "#1e293b" }}>
        {data.member?.branchName || ""}
      </span>
    </div>
    <div>
      <Calendar size={14} /> Gia nhập:{" "}
      {data.link?.startDate || "Chưa có"}
    </div>
  </WorkflowNodeBase>
);

const nodeTypes = {
  rootNode: RootNode,
  mentorNode: MentorNode,
  discipleNode: DiscipleNode,
};

// ==================== MAIN COMPONENT ====================
export default function Diagram() {
  const { message } = App.useApp();
  const [panelForm] = Form.useForm();

  // States
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [focusMyself, setFocusMyself] = useState(false);
  const [currentUserId] = useState<string>("");

  // Tree
  const [treeLinks, setTreeLinks] = useState<Link[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, MemberProfileRecord>>(new Map());
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(false);

  // Sidebars
  const [sidebarsVisible, setSidebarsVisible] = useState(false);

  // Right Panel
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('view');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<MemberDetailResponse | null>(null);
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // ==================== LOAD DATA ====================
  useEffect(() => {
    Promise.all([
      fetch('/api/courses').then(r => r.json()),
      fetch('/api/users').then(r => r.json())
    ])
      .then(([courseRes, userRes]) => {
        if (courseRes.success) {
          setCourses(courseRes.data || []);
          if (courseRes.data?.length && !selectedCourse) setSelectedCourse(courseRes.data[0].id);
        }
        if (userRes.success) {
          setUsers(userRes.data || []);
        }
      })
      .catch(() => message.error("Lỗi tải dữ liệu khởi tạo"));
  }, [message]);

  const fetchMemberDetail = useCallback(async (memberId: string) => {
    setDetailLoading(true);
    setViewingMemberId(memberId);
    try {
      const res = await fetch(`/api/members/${memberId}?courseId=${selectedCourse}`);
      const json = await res.json();
      if (json.success) setSelectedMemberDetail(json.data);
      else message.error(json.error?.message || "Lỗi tải chi tiết");
    } catch { message.error("Lỗi kết nối"); } finally { setDetailLoading(false); }
  }, [selectedCourse, message]);

  // ==================== OPTIONS ====================
  const mentorOptions = useMemo(
    () => users
      .filter((u) => u.roles?.includes('MENTOR') || u.roles?.includes('ADMIN'))
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

  // ==================== TREE LOGIC ====================
  const onEyeClick = useCallback((memberId: string) => {
    if (!memberId) return;
    setSidebarsVisible(true);
    setPanelMode('view');
    setRightPanelOpen(true);
    fetchMemberDetail(memberId);
  }, [fetchMemberDetail]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id === "root") {
      setFocusedNodeId(null);
      return;
    }
    setFocusedNodeId(prev => (prev === node.id ? null : node.id));
    const member = (node.data as any)?.member as MemberProfileRecord | undefined;
    if (member) {
      setSidebarsVisible(true);
      onEyeClick(member.id);
    }
  }, [onEyeClick]);

  useEffect(() => {
    if (!treeLinks.length) return;
    const { nodes: n, edges: e } = buildTreeForCourse(
      treeLinks,
      memberMap,
      focusedNodeId ?? undefined,
      onEyeClick
    );
    setNodes(n);
    setEdges(e);
  }, [focusedNodeId, treeLinks, memberMap, onEyeClick, setNodes, setEdges]);

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
          setTreeLinks(res.data.links);
          setMemberMap(new Map(res.data.members?.map((m: MemberProfileRecord) => [m.id, m]) || []));
        } else { setTreeLinks([]); setMemberMap(new Map()); }
      } catch { message.error("Lỗi tải cây môn đồ"); } finally { setLoading(false); }
    };
    loadTree();
  }, [selectedCourse, focusMyself, currentUserId, message]);

  // ==================== API HANDLERS ====================
  const reloadTree = async () => {
    const res = await fetch(`/api/discipleship-tree?courseId=${selectedCourse}`).then(r => r.json());
    if (res.success && res.data?.links) {
      setTreeLinks(res.data.links);
      setMemberMap(new Map(res.data.members?.map((m: MemberProfileRecord) => [m.id, m]) || []));
    }
  };

  const handleCreateRelation = async () => {
    const values = await panelForm.validateFields();
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/training-relations', {
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
      const res = await fetch(`/api/training-relations/${editingLinkId}`, {
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

  // ==================== PANEL HANDLERS ====================
  const openCreatePanel = useCallback(() => {
    setSidebarsVisible(true);
    setPanelMode('create');
    setEditingLinkId(null);
    setRightPanelOpen(true);
    setSelectedMemberDetail(null);
    setViewingMemberId(null);
    panelForm.resetFields();
    panelForm.setFieldsValue({
      status: 'in_progress',
      courseId: selectedCourse
    });
  }, [panelForm, selectedCourse]);

  const closeRightPanel = useCallback(() => {
    setRightPanelOpen(false);
    setSelectedMemberDetail(null);
    setViewingMemberId(null);
    setPanelMode('view');
    setSidebarsVisible(false);
  }, []);

  // ==================== RENDER RIGHT PANEL ====================
  const renderRightPanel = () => {
    if (!rightPanelOpen) return null;

    // VIEW
    if (panelMode === 'view') {
      if (detailLoading) return <Flex vertical gap={16} className="p-4"><Skeleton active paragraph={{ rows: 6 }} /></Flex>;
      if (!selectedMemberDetail) return <div className="flex h-full items-center justify-center text-slate-400"><Empty description={T.msgEmpty} /></div>;

      const data = selectedMemberDetail;
      return (
        <Flex vertical className="h-full overflow-y-auto p-4 gap-4 pb-24">
          <Card
            size="small"
            title={<span className="text-slate-700"><Mail size={14} className="inline mr-2" /> {T.info}</span>}
            className="shadow-none border-slate-200"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Avatar size={36} style={{ background: theme.defaultConfig.token?.colorPrimary }}>
                  {data.member.fullName?.[0]}
                </Avatar>
                <div>
                  <Text strong>{data.member.fullName}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{data.member.email || "-"}</Text>
                </div>
              </div>
            </div>
          </Card>
          <Card
            size="small"
            title={<span className="text-slate-700"><Settings size={14} className="inline mr-2" /> {T.properties}</span>}
            className="shadow-none border-slate-200"
          >
            <Descriptions column={1} size="small" labelStyle={{ color: "#64748B", width: 80 }}>
              <Descriptions.Item label="Vai trò">
                <Tag color={data.member.roles?.length ? "processing" : "default"}>
                  {data.member.roles?.[0] || "Thành viên"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{data.member.phone || "-"}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{data.member.birthDate || "-"}</Descriptions.Item>
              <Descriptions.Item label="Chi hội">{data.member.branchName || "-"}</Descriptions.Item>
            </Descriptions>
          </Card>
          {data.mentorStats.length > 0 && (
            <Card
              size="small"
              title={<span className="text-slate-700"><PlayCircle size={14} className="inline mr-2" /> {T.runtime}</span>}
              className="shadow-none border-slate-200"
            >
              {data.mentorStats.map(stat => (
                <div key={stat.courseId} className="flex justify-between py-1 text-sm border-b border-slate-50 border-dashed last:border-0">
                  <span>{stat.courseName}</span>
                  <span className="font-semibold text-slate-700">{stat.totalDisciples} <span className="font-normal text-slate-400">môn đồ</span></span>
                </div>
              ))}
            </Card>
          )}
          <Card
            size="small"
            title={<span className="text-slate-700"><Database size={14} className="inline mr-2" /> {T.variables}</span>}
            className="shadow-none border-slate-200 pb-6"
          >
            <Timeline
              items={[
                ...data.ancestors.slice().reverse().map(a => ({
                  color: "blue",
                  children: <div className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100"><span className="font-semibold">Người dẫn dắt:</span> {a.member.fullName}</div>
                })),
                {
                  color: "green",
                  children: <div className="text-xs bg-green-50 px-2 py-1 rounded border border-green-100 font-semibold text-green-700"> {data.member.fullName} (Đang xem)</div>
                },
                ...data.descendants.map(d => ({
                  color: "orange",
                  children: <div className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100 flex justify-between"><span><span className="font-semibold text-orange-600">Môn đồ:</span> {d.member.fullName}</span><span className="text-slate-400 text-[10px]">Cấp {d.level}</span></div>
                })),
              ]}
            />
          </Card>
          <div className="mt-auto sticky bottom-0 bg-white py-3 border-t border-slate-100 flex flex-col gap-2">
            <div className="text-xs text-slate-500 mb-1">Gửi tin nhắn đào tạo</div>
            <Input.TextArea rows={2} value={messageInput} onChange={e => setMessageInput(e.target.value)} placeholder="Nhập lời nhắn..." className="text-sm" />
            <Button type="primary" icon={<Send size={14} />} onClick={sendMessage} style={{ background: "#F97316", borderColor: "#F97316", width: "100%" }}>{T.send}</Button>
          </div>
        </Flex>
      );
    }

    // CREATE / EDIT FORM – ĐÃ ĐƯỢC STYLE LẠI
    return (
      <Flex vertical className="h-full overflow-hidden p-4 bg-gradient-to-b from-white to-green-50">
        <div className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2 border-b pb-2">
          {panelMode === 'create' ? (
            <>
              <Flower size={20} className="text-green-500" />
              {T.createRelation}
            </>
          ) : (
            <>
              <Sparkles size={20} className="text-amber-500" />
              {T.editRelation}
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <Form
            form={panelForm}
            layout="vertical"
            requiredMark="optional"
            className="space-y-4"
          >
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-green-100 shadow-sm">
              <Form.Item
                label={<span><BookOpen size={14} className="mr-1" /> {T.course}</span>}
                name="courseId"
                rules={[{ required: true, message: T.msgRequiredCourse }]}
              >
                <Select
                  options={courseOptions}
                  placeholder="Chọn khóa học"
                  showSearch
                  optionFilterProp="label"
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                label={<span><GraduationCap size={14} className="mr-1" /> {T.mentor}</span>}
                name="mentorId"
                rules={[
                  { required: true, message: T.msgRequiredMentor },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value !== getFieldValue('discipleId')) return Promise.resolve();
                      return Promise.reject(new Error(T.msgMentorDiscipleDiff));
                    },
                  }),
                ]}
              >
                <Select
                  options={mentorOptions}
                  placeholder={T.selectMentor}
                  showSearch
                  optionFilterProp="label"
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                label={<span><Users size={14} className="mr-1" /> {T.disciple}</span>}
                name="discipleId"
                rules={[
                  { required: true, message: T.msgRequiredDisciple },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value !== getFieldValue('mentorId')) return Promise.resolve();
                      return Promise.reject(new Error(T.msgMentorDiscipleDiff));
                    },
                  }),
                ]}
              >
                <Select
                  options={discipleOptions}
                  placeholder={T.selectDisciple}
                  showSearch
                  optionFilterProp="label"
                  className="rounded-lg"
                />
              </Form.Item>
            </div>

            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-green-100 shadow-sm">
              <Form.Item
                label={<span><Calendar size={14} className="mr-1" /> {T.startDate}</span>}
                name="startDate"
                rules={[
                  { required: true, message: T.msgRequiredStartDate },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const end = getFieldValue('endDate');
                      if (!value || !end || value <= end) return Promise.resolve();
                      return Promise.reject(new Error(T.msgStartBeforeEnd));
                    },
                  }),
                ]}
              >
                <Input type="date" className="w-full rounded-lg" />
              </Form.Item>

              <Form.Item
                label={<span><Calendar size={14} className="mr-1" /> {T.endDate}</span>}
                name="endDate"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const start = getFieldValue('startDate');
                      if (!value || !start || start <= value) return Promise.resolve();
                      return Promise.reject(new Error(T.msgEndAfterStart));
                    },
                  }),
                ]}
              >
                <Input type="date" className="w-full rounded-lg" />
              </Form.Item>

              <Form.Item
                label={<span><Settings size={14} className="mr-1" /> {T.status}</span>}
                name="status"
                initialValue="in_progress"
              >
                <Select
                  options={[
                    { value: 'in_progress', label: T.in_progress },
                    { value: 'completed', label: T.completed }
                  ]}
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                label={<span><Mail size={14} className="mr-1" /> {T.notes}</span>}
                name="notes"
              >
                <Input.TextArea rows={4} placeholder="Nhập ghi chú..." className="rounded-lg" />
              </Form.Item>
            </div>
          </Form>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-green-100 mt-2 shrink-0 bg-white/50 backdrop-blur-sm p-2 rounded-xl">
          <Button onClick={() => { setPanelMode('view'); closeRightPanel(); }} className="rounded-full">
            {T.cancelBtn}
          </Button>
          <Button
            type="primary"
            loading={submitLoading}
            onClick={handleSubmit}
            style={{ background: "#10B981", borderColor: "#10B981" }}
            className="rounded-full px-6 shadow-md hover:shadow-lg transition-all"
          >
            {panelMode === 'create' ? (
              <>
                <UserPlus size={16} className="mr-1" /> {T.addRelationBtn}
              </>
            ) : (
              <>
                <Save size={16} className="mr-1" /> {T.saveBtn}
              </>
            )}
          </Button>
        </div>
      </Flex>
    );
  };

  // ==================== MAIN UI ====================
  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-green-50 via-white to-emerald-50 font-sans overflow-hidden">
      {/* Toolbar */}
      <div className="flex justify-between items-center px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-green-100 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Space>
            <div className="font-bold text-slate-700 text-base flex items-center gap-2">
              <TreePine size={20} className="text-green-600" />
              {T.nodeLibrary}
            </div>
          </Space>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCourse}
            onChange={setSelectedCourse}
            style={{ width: 180 }}
            placeholder={T.selectCourse}
            className="rounded-full"
          >
            {courses.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
          </Select>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: "#10B981", borderColor: "#10B981" }}
            className="rounded-full shadow-md hover:shadow-lg transition-all"
            onClick={openCreatePanel}
          >
            {T.createNode}
          </Button>

          <Button
            icon={sidebarsVisible ? <X size={14} /> : <MenuOutlined />}
            className="rounded-full"
            onClick={() => setSidebarsVisible(!sidebarsVisible)}
          />

          <Button
            type={focusMyself ? "primary" : "default"}
            onClick={() => setFocusMyself(!focusMyself)}
            icon={<EyeOutlined />}
            className="rounded-full"
          >
            {T.myDiagram}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {sidebarsVisible && (
          <div className="w-[320px] min-w-[320px] bg-white/90 backdrop-blur-sm border-r border-green-100 flex flex-col h-full">
            <div className="p-4 border-b border-green-100">
              <Input
                prefix={<Search size={14} className="text-slate-400" />}
                placeholder={T.searchMembers}
                className="mb-3 rounded-full"
              />
              <Button
                block
                style={{ background: "#10B981", borderColor: "#10B981", color: "white" }}
                className="rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                onClick={openCreatePanel}
              >
                <PlusOutlined /> {T.createNode}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                <TreePine size={12} /> Hệ thống lãnh đạo
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-3 text-sm text-slate-700 shadow-sm">
                <BookOpen size={14} className="inline mr-2" /> Đấng Tối Cao (Gốc)
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mt-4 flex items-center gap-1">
                <GraduationCap size={12} /> Người hướng dẫn
              </div>
              {Array.from(memberMap.values()).slice(0, 5).map(m => (
                <div
                  key={m.id}
                  onClick={() => onEyeClick(m.id)}
                  className="bg-white border border-slate-200 rounded-2xl p-2 text-sm text-slate-600 hover:bg-green-50 cursor-pointer transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                >
                  <Avatar size={20} style={{ fontSize: 10 }}>{m.fullName?.[0]}</Avatar> {m.fullName}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Center Canvas */}
        <div className="flex-1 relative bg-[#fafbfc]">
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
            minZoom={0.1}
            maxZoom={2.5}
          >
            <Background variant={BackgroundVariant.Dots} gap={12} color="#d1d5db" />
            <Controls className="!bg-white !border !border-slate-200 !shadow-sm rounded-full" />
            <MiniMap className="!bg-white !border !border-slate-200 !shadow-sm rounded-xl" />
            <Panel position="top-left" className="bg-white/80 backdrop-blur-sm border border-green-200 px-3 py-1.5 rounded-full shadow-sm text-xs text-slate-600">
              <div className="font-semibold flex items-center gap-1">
                <TreePine size={14} />
                {courses.find(c => c.id === selectedCourse)?.name || "Cây Môn Đồ"}
              </div>
              <div className="text-slate-400 text-[10px]">{T.dragZoom}</div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Sidebar */}
        {sidebarsVisible && (
          <div className="w-[380px] min-w-[380px] bg-white/90 backdrop-blur-sm border-l border-green-100 flex flex-col h-full">
            <div className="px-4 py-3 border-b border-green-100 flex justify-between items-center bg-white/50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">
                  {panelMode === 'view' ? (
                    <>
                      <Leaf size={16} className="inline mr-1 text-green-500" /> Hệ thống cấp bậc
                    </>
                  ) : panelMode === 'create' ? (
                    <>
                      <Flower size={16} className="inline mr-1 text-pink-400" /> {T.createRelation}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="inline mr-1 text-amber-400" /> {T.editRelation}
                    </>
                  )}
                </span>
                {panelMode === 'view' && rightPanelOpen && selectedMemberDetail && (
                  <Tag color="processing" className="text-[10px] rounded-full">Đang chọn</Tag>
                )}
              </div>
              {rightPanelOpen && (
                <Button type="text" size="small" icon={<X size={14} />} onClick={closeRightPanel} />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {renderRightPanel()}
            </div>
          </div>
        )}
      </div>

      {/* CSS Animation cho hoa lá và node */}
      <style jsx>{`
        @keyframes sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fade-in-node {
          animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}
