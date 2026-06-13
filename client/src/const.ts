export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Custom auth — login page is at /login (no Manus OAuth)
export const getLoginUrl = (_returnPath?: string) => "/login";
