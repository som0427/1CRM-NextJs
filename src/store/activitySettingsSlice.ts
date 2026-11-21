import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ActivityInfo {
  activityId: number;
  activityName: string;
}

interface ActivitySettingsState {
  activities: ActivityInfo[];
}

const initialState: ActivitySettingsState = {
  activities: [],
};

const activitySettingsSlice = createSlice({
  name: 'activitySettings',
  initialState,
  reducers: {
    setActivities: (state, action: PayloadAction<ActivityInfo[]>) => {
      state.activities = action.payload;
    },
    clearActivities: (state) => {
      state.activities = [];
    },
  },
});

export const { setActivities, clearActivities } = activitySettingsSlice.actions;
export default activitySettingsSlice.reducer;
