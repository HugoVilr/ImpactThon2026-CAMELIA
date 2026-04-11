import { configureStore } from "@reduxjs/toolkit";
import { workspaceReducer } from "./slices";

export const setupStore = () =>
  configureStore({
    reducer: {
      workspace: workspaceReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActionPaths: ["meta.arg"],
        },
      }),
  });

export const store = setupStore();

export type AppStore = ReturnType<typeof setupStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
