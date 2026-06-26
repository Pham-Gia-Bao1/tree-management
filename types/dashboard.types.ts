
export interface DashboardOverview {
  totalUsers: number;
  totalMentors: number;
  totalMembers: number;
  totalBranches: number;
  totalCourses: number;
  activeTrainingRelations: number;
  completedTrainingRelations: number;
  pendingMentorRequests: number;
}

export interface BranchUserStat {
  branchName: string;
  total: number;
}

export interface TrainingStatusStat {
  status: string;
  total: number;
}

export interface CourseProgressStat {
  courseName: string;
  total: number;
}

export interface DashboardCharts {
  usersByBranch: BranchUserStat[];
  trainingStatus: TrainingStatusStat[];
  courseProgress: CourseProgressStat[];
}

export interface RecentMentorRequest {
  id: string;
  requesterName: string;
  status: string;
  createdAt: string;
}

export interface RecentTrainingRelation {
  id: string;
  mentorName: string;
  discipleName: string;
  courseName: string;
  status: string;
  startDate: string;
}

export interface RecentNotification {
  id: string;
  title: string;
  createdAt: string;
}

export interface DashboardData {
  overview: DashboardOverview;
  charts: DashboardCharts;
  recentMentorRequests: RecentMentorRequest[];
  recentTrainingRelations: RecentTrainingRelation[];
  recentNotifications: RecentNotification[];
}
