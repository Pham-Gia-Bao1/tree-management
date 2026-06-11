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