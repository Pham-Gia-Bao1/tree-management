
export const SUBJECTS = [
  { id: '1', name: 'Sáng thế ký 1', abbr: 'Gen 1' },
  { id: '2', name: 'Giới thiệu Cựu Ước', abbr: 'OT Intro' },
  { id: '3', name: 'Giới thiệu Tân Ước', abbr: 'NT Intro' },
  { id: '4', name: 'Thi thiên', abbr: 'Psalms' },
  { id: '5', name: 'Khải huyền', abbr: 'Rev' },
];

export const BRANCHES = [
  { id: '1', name: 'Hà Nội', members: 320, mentors: 45, trainings: 580, status: 'active', address: 'Hoàn Kiếm, Hà Nội', description: 'Chi nhánh trung tâm Hà Nội' },
  { id: '2', name: 'TP HCM', members: 480, mentors: 67, trainings: 920, status: 'active', address: 'Quận 1, TP HCM', description: 'Chi nhánh lớn nhất miền Nam' },
  { id: '3', name: 'Đà Nẵng', members: 180, mentors: 28, trainings: 310, status: 'active', address: 'Hải Châu, Đà Nẵng', description: 'Chi nhánh miền Trung' },
  { id: '4', name: 'Cần Thơ', members: 145, mentors: 22, trainings: 240, status: 'active', address: 'Ninh Kiều, Cần Thơ', description: 'Chi nhánh đồng bằng sông Cửu Long' },
  { id: '5', name: 'Hải Phòng', members: 210, mentors: 31, trainings: 380, status: 'inactive', address: 'Hồng Bàng, Hải Phòng', description: 'Chi nhánh phía Bắc' },
];

export const USERS = [
  { id: '1', name: 'Nguyễn Văn An', birthDate: '1985-03-15', branch: 'Hà Nội', email: 'an.nguyen@email.com', role: 'admin', status: 'active', avatar: null },
  { id: '2', name: 'Trần Thị Bình', birthDate: '1990-07-22', branch: 'TP HCM', email: 'binh.tran@email.com', role: 'mentor', status: 'active', avatar: null },
  { id: '3', name: 'Lê Văn Cường', birthDate: '1992-11-08', branch: 'Đà Nẵng', email: 'cuong.le@email.com', role: 'user', status: 'active', avatar: null },
  { id: '4', name: 'Phạm Thị Dung', birthDate: '1988-05-30', branch: 'Hà Nội', email: 'dung.pham@email.com', role: 'mentor', status: 'active', avatar: null },
  { id: '5', name: 'Hoàng Văn Em', birthDate: '1995-02-14', branch: 'Cần Thơ', email: 'em.hoang@email.com', role: 'user', status: 'inactive', avatar: null },
  { id: '6', name: 'Vũ Thị Phượng', birthDate: '1987-09-18', branch: 'TP HCM', email: 'phuong.vu@email.com', role: 'mentor', status: 'active', avatar: null },
  { id: '7', name: 'Đỗ Văn Giang', birthDate: '1993-12-25', branch: 'Hải Phòng', email: 'giang.do@email.com', role: 'user', status: 'active', avatar: null },
  { id: '8', name: 'Bùi Thị Hoa', birthDate: '1991-04-10', branch: 'Hà Nội', email: 'hoa.bui@email.com', role: 'user', status: 'active', avatar: null },
];

export const TRAINING_RELATIONS = [
  { id: '1', mentor: 'Nguyễn Văn An', disciple: 'Lê Văn Cường', subject: 'Sáng thế ký 1', branch: 'Hà Nội', startDate: '2025-01-10', endDate: '2025-06-10', createdBy: 'Admin' },
  { id: '2', mentor: 'Trần Thị Bình', disciple: 'Hoàng Văn Em', subject: 'Giới thiệu Tân Ước', branch: 'TP HCM', startDate: '2025-02-15', endDate: '2025-08-15', createdBy: 'Admin' },
  { id: '3', mentor: 'Phạm Thị Dung', disciple: 'Bùi Thị Hoa', subject: 'Giới thiệu Cựu Ước', branch: 'Hà Nội', startDate: '2025-03-01', endDate: '2025-09-01', createdBy: 'Admin' },
  { id: '4', mentor: 'Vũ Thị Phượng', disciple: 'Đỗ Văn Giang', subject: 'Thi thiên', branch: 'TP HCM', startDate: '2025-04-20', endDate: '2026-01-20', createdBy: 'Mentor' },
  { id: '5', mentor: 'Nguyễn Văn An', disciple: 'Bùi Thị Hoa', subject: 'Khải huyền', branch: 'Hà Nội', startDate: '2025-05-05', endDate: '2025-11-05', createdBy: 'Admin' },
];

export const MENTOR_REQUESTS = [
    {
        id: '1',
        userId: '101',

        name: 'Nguyễn Minh Tuấn',
        contact: '0912345678',
        branch: 'Hà Nội',

        reason:
            'Đã hoàn thành chương trình môn đồ hóa cơ bản và muốn dạy lại cho người khác.',

        createdDate: '2026-05-20',

        requestedBy: {
            id: '101',
            name: 'Nguyễn Minh Tuấn',
            email: 'tuan.nguyen@email.com',
            avatar: 'NT',
        },

        submittedOn: '2026-05-20',

        pendingApproveBy: {
            id: 'adm1',
            name: 'Admin Tuan',
            email: 'tuan.admin@church.org',
            avatar: 'AT',
        },

        approvedBy: null,

        status: 'pending',
    },

    {
        id: '2',
        userId: '102',

        name: 'Lê Thị Mai',
        contact: 'mai.le@email.com',
        branch: 'TP HCM',

        reason:
            'Có kinh nghiệm dạy học và muốn đóng góp cho cộng đồng.',

        createdDate: '2026-05-22',

        requestedBy: {
            id: '102',
            name: 'Lê Thị Mai',
            email: 'mai.le@email.com',
            avatar: 'LM',
        },

        submittedOn: '2026-05-22',

        pendingApproveBy: {
            id: 'adm2',
            name: 'Admin Huy',
            email: 'huy.admin@church.org',
            avatar: 'AH',
        },

        approvedBy: null,

        status: 'pending',
    },

    {
        id: '3',
        userId: '103',

        name: 'Phạm Quang Vinh',
        contact: '0987654321',
        branch: 'Đà Nẵng',

        reason:
            'Được đề xuất bởi pastor chi nhánh.',

        createdDate: '2026-05-25',

        requestedBy: {
            id: '103',
            name: 'Phạm Quang Vinh',
            email: 'vinh.pham@email.com',
            avatar: 'PV',
        },

        submittedOn: '2026-05-25',

        pendingApproveBy: null,

        approvedBy: {
            id: 'adm1',
            name: 'Admin Tuan',
            email: 'tuan.admin@church.org',
            avatar: 'AT',
        },

        approvedDate: '2026-05-27',

        status: 'approved',
    },

    {
        id: '4',
        userId: '104',

        name: 'Trần Văn Khoa',
        contact: 'khoa.tran@email.com',
        branch: 'Cần Thơ',

        reason:
            'Đã nghiên cứu Kinh Thánh nhiều năm và muốn chia sẻ.',

        createdDate: '2026-05-28',

        requestedBy: {
            id: '104',
            name: 'Trần Văn Khoa',
            email: 'khoa.tran@email.com',
            avatar: 'TK',
        },

        submittedOn: '2026-05-28',

        pendingApproveBy: null,

        approvedBy: {
            id: 'adm3',
            name: 'Admin Phuong',
            email: 'phuong.admin@church.org',
            avatar: 'AP',
        },

        approvedDate: '2026-05-30',

        rejectionReason:
            'Chưa hoàn thành đầy đủ chương trình đào tạo mentor.',

        status: 'rejected',
    },

    {
        id: '5',
        userId: '105',

        name: 'Hoàng Thị Lan',
        contact: '0901234567',
        branch: 'Hải Phòng',

        reason:
            'Mong muốn phát triển cộng đồng đức tin tại địa phương.',

        createdDate: '2026-06-01',

        requestedBy: {
            id: '105',
            name: 'Hoàng Thị Lan',
            email: 'lan.hoang@email.com',
            avatar: 'HL',
        },

        submittedOn: '2026-06-01',

        pendingApproveBy: {
            id: 'adm2',
            name: 'Admin Huy',
            email: 'huy.admin@church.org',
            avatar: 'AH',
        },

        approvedBy: null,

        status: 'pending',
    },
];

export const MESSAGES = [
  {
    id: '1',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Xin chào! Tuần này chúng ta sẽ học về chương 3 của Sáng thế ký nhé.',
    timestamp: '2026-06-05 08:30',
    isOwn: false,
    
  },
  {
    id: '2',
    senderId: 'current',
    senderName: 'Bạn',
    content: 'Vâng, tôi đã chuẩn bị bài rồi. Cảm ơn thầy/cô!',
    timestamp: '2026-06-05 08:45',
    isOwn: true,
  },
  {
    id: '3',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Rất tốt! Hãy đọc trước từ câu 1 đến 24 và suy nghĩ về ý nghĩa của sự sáng tạo.',
    timestamp: '2026-06-05 09:00',
    isOwn: false,
  },
  {
    id: '4',
    senderId: 'current',
    senderName: 'Bạn',
    content: 'Tôi có một câu hỏi về câu 26 - "hình ảnh của chúng ta" có nghĩa là gì?',
    timestamp: '2026-06-05 09:15',
    isOwn: true,
  },
  {
    id: '5',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Đây là câu hỏi rất hay! Chúng ta sẽ thảo luận chi tiết vào buổi học hôm nay.',
    timestamp: '2026-06-05 09:20',
    isOwn: false,
  },
  {
    id: '6',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Bạn đã hoàn thành bài tập tuần trước chưa?',
    timestamp: '2026-06-05 10:00',
    isOwn: false,
  },
  {
    id: '7',
    senderId: 'current',
    senderName: 'Bạn',
    content: 'Dạ rồi, tôi đã ghi chú lại những điều học được.',
    timestamp: '2026-06-05 10:05',
    isOwn: true,
  },
  {
    id: '8',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Tuyệt vời. Bạn có thể chia sẻ điều gì gây ấn tượng nhất không?',
    timestamp: '2026-06-05 10:10',
    isOwn: false,
  },
  {
    id: '9',
    senderId: 'current',
    senderName: 'Bạn',
    content: 'Tôi rất ấn tượng về sự vâng lời của Áp-ra-ham trong hành trình đức tin.',
    timestamp: '2026-06-05 10:15',
    isOwn: true,
  },
  {
    id: '10',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Đó là một bài học quan trọng về sự tin cậy nơi Đức Chúa Trời.',
    timestamp: '2026-06-05 10:20',
    isOwn: false,
  },
  {
    id: '11',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Bạn có cần tài liệu bổ sung cho buổi học tối nay không?',
    timestamp: '2026-06-05 11:00',
    isOwn: false,
  },
  {
    id: '12',
    senderId: 'current',
    senderName: 'Bạn',
    content: 'Nếu có slide hoặc tài liệu tóm tắt thì rất hữu ích ạ.',
    timestamp: '2026-06-05 11:05',
    isOwn: true,
  },
  {
    id: '13',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Được, tôi sẽ gửi tài liệu qua nhóm trước giờ học.',
    timestamp: '2026-06-05 11:10',
    isOwn: false,
  },
  {
    id: '14',
    senderId: 'current',
    senderName: 'Bạn',
    content: 'Cảm ơn thầy/cô rất nhiều.',
    timestamp: '2026-06-05 11:12',
    isOwn: true,
  },
  {
    id: '15',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Ngoài ra, hãy chuẩn bị một lời chứng ngắn khoảng 3 phút nhé.',
    timestamp: '2026-06-05 13:00',
    isOwn: false,
  },
  {
    id: '16',
    senderId: 'current',
    senderName: 'Bạn',
    content: 'Tôi sẽ chuẩn bị. Có yêu cầu chủ đề cụ thể không ạ?',
    timestamp: '2026-06-05 13:05',
    isOwn: true,
  },
  {
    id: '17',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Bạn có thể chia sẻ về hành trình đức tin hoặc một kinh nghiệm gần đây.',
    timestamp: '2026-06-05 13:10',
    isOwn: false,
  },
  {
    id: '18',
    senderId: 'current',
    senderName: 'Bạn',
    content: 'Tôi hiểu rồi. Tôi sẽ chuẩn bị nội dung liên quan đến việc cầu nguyện.',
    timestamp: '2026-06-05 13:15',
    isOwn: true,
  },
  {
    id: '19',
    senderId: '2',
    senderName: 'Trần Thị Bình',
    content: 'Rất tốt. Hẹn gặp bạn vào lúc 19:30 tối nay nhé.',
    timestamp: '2026-06-05 13:20',
    isOwn: false,
  },
  {
    id: '20',
    senderId: 'current',
    senderName: 'Bạn',
    content: 'Vâng, hẹn gặp thầy/cô tối nay. Chúc một ngày tốt lành!',
    timestamp: '2026-06-05 13:25',
    isOwn: true,
  },
];

// Tree data for D3 visualization
export const TREE_DATA = {
  id: 'root',
  name: 'Nguyễn Văn An',
  role: 'mentor' as const,
  location: 'Hà Nội',
  disciples: 25,
  children: [
    {
      id: 'n1',
      name: 'Trần Thị Bình',
      role: 'mentor' as const,
      location: 'TP HCM',
      disciples: 12,
      children: [
        { id: 'n1-1', name: 'Nguyễn Minh Khoa', role: 'leaf' as const, location: 'TP HCM', disciples: 0, children: [] },
        { id: 'n1-2', name: 'Lê Thị Thu Hà', role: 'leaf' as const, location: 'TP HCM', disciples: 0, children: [] },
        { id: 'n1-3', name: 'Phạm Văn Tùng', role: 'leaf' as const, location: 'TP HCM', disciples: 0, children: [] },
      ],
    },
    {
      id: 'n2',
      name: 'Phạm Thị Dung',
      role: 'current' as const,
      location: 'Hà Nội',
      disciples: 8,
      children: [
        { id: 'n2-1', name: 'Bùi Thị Hoa', role: 'leaf' as const, location: 'Hà Nội', disciples: 0, children: [] },
        { id: 'n2-2', name: 'Đỗ Văn Giang', role: 'leaf' as const, location: 'Hải Phòng', disciples: 0, children: [] },
      ],
    },
    {
      id: 'n3',
      name: 'Vũ Thị Phượng',
      role: 'mentor' as const,
      location: 'TP HCM',
      disciples: 10,
      children: [
        { id: 'n3-1', name: 'Hoàng Văn Em', role: 'leaf' as const, location: 'Cần Thơ', disciples: 0, children: [] },
        { id: 'n3-2', name: 'Lê Văn Cường', role: 'leaf' as const, location: 'Đà Nẵng', disciples: 0, children: [] },
        {
          id: 'n3-3',
          name: 'Nguyễn Thị Lan',
          role: 'mentor' as const,
          location: 'TP HCM',
          disciples: 5,
          children: [
            { id: 'n3-3-1', name: 'Trần Minh Tuấn', role: 'leaf' as const, location: 'TP HCM', disciples: 0, children: [] },
            { id: 'n3-3-2', name: 'Phạm Quỳnh Anh', role: 'leaf' as const, location: 'TP HCM', disciples: 0, children: [] },
          ],
        },
      ],
    },
  ],
};

export const STATS = {
  members: 2560,
  mentors: 320,
  disciples: 1980,
  trainings: 4510,
  branches: 27,
  messages: 18900,
};

export const RANKING_DATA = [
  { rank: 1, mentor: 'Nguyễn Văn An', branch: 'Hà Nội', totalDisciples: 87 },
  { rank: 2, mentor: 'Trần Thị Bình', branch: 'TP HCM', totalDisciples: 74 },
  { rank: 3, mentor: 'Vũ Thị Phượng', branch: 'TP HCM', totalDisciples: 65 },
  { rank: 4, mentor: 'Phạm Thị Dung', branch: 'Hà Nội', totalDisciples: 58 },
  { rank: 5, mentor: 'Lê Văn Sơn', branch: 'Đà Nẵng', totalDisciples: 52 },
];

export const PIE_DATA = [
  { subject: 'Sáng thế ký 1', count: 1200, color: '#1677FF' },
  { subject: 'Giới thiệu Cựu Ước', count: 980, color: '#52C41A' },
  { subject: 'Giới thiệu Tân Ước', count: 870, color: '#FAAD14' },
  { subject: 'Thi thiên', count: 760, color: '#FF4D4F' },
  { subject: 'Khải huyền', count: 700, color: '#722ED1' },
];

export const BAR_DATA = [
  { branch: 'Hà Nội', count: 580 },
  { branch: 'TP HCM', count: 920 },
  { branch: 'Đà Nẵng', count: 310 },
  { branch: 'Cần Thơ', count: 240 },
  { branch: 'Hải Phòng', count: 380 },
];

export const LINE_DATA = [
  { month: 'T1', count: 320 },
  { month: 'T2', count: 385 },
  { month: 'T3', count: 420 },
  { month: 'T4', count: 398 },
  { month: 'T5', count: 510 },
  { month: 'T6', count: 475 },
  { month: 'T7', count: 560 },
  { month: 'T8', count: 620 },
  { month: 'T9', count: 580 },
  { month: 'T10', count: 650 },
  { month: 'T11', count: 710 },
  { month: 'T12', count: 790 },
];
