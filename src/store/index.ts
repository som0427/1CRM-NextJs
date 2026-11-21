import { configureStore } from '@reduxjs/toolkit';
import contentDeckReducer from './contentDeckSlice';
import logsReducer from './logsSlice';
import appflowReducer from './appflowSlice';
import attributeReducer from './attributeSlice';
import fieldAccessReducer from './fieldAccessSlice';
import activitySettingsReducer from './activitySettingsSlice';
import uploadCreativeReducer from './uploadCreativeSlice';

const store = configureStore({
  reducer: {
    contentDeck: contentDeckReducer,
    logs: logsReducer,
    appflow: appflowReducer,
    attribute: attributeReducer,
    fieldAccess: fieldAccessReducer,
    activitySettings: activitySettingsReducer,
    uploadCreative: uploadCreativeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
