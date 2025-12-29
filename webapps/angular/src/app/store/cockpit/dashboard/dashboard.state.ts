import { DashboardStats } from '../../../services/cockpit.service';

export interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  error: any;
}

export const initialDashboardState: DashboardState = {
  stats: null,
  loading: false,
  error: null
};
