export interface ActivityFormData {
  activityId: number;
  activityName: string;
  moduleType: number; // From the selected activity
  description: string;
  notes: string;
  activityDate: string;
  activityTime: string;
  location: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  reminderBefore: number; // minutes
  assignedTo: string;
  companyId?: number;
  opportunityId?: number;
  contactId?: number;
}

export const defaultActivityFormData: ActivityFormData = {
  activityId: 0,
  activityName: '',
  moduleType: 0,
  description: '',
  notes: '',
  activityDate: new Date().toISOString().split('T')[0], // Today's date
  activityTime: new Date().toTimeString().substring(0, 5), // Current time
  location: '',
  priority: 'Medium',
  status: 'Planned',
  reminderBefore: 15, // 15 minutes
  assignedTo: '',
  companyId: undefined,
  opportunityId: undefined,
  contactId: undefined,
};