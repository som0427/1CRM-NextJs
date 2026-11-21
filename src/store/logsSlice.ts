import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LogsState {
  searchTerm: string;
  // Add other logs state properties here as needed
}

const initialState: LogsState = {
  searchTerm: '',
};

const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    // Add other reducers here as needed
  },
});

export const { setSearchTerm } = logsSlice.actions;
export default logsSlice.reducer;
