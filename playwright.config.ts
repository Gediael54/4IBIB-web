import { defineConfig, devices } from "@playwright/test";

const SITE_PORT = 5173;
const ADMIN_PORT = 5174;

export const SITE_URL = `http://localhost:${SITE_PORT}`;
export const ADMIN_URL = `http://localhost:${ADMIN_PORT}`;

export const ADMIN_EMAIL = process.env.VITE_MOCK_ADMIN_EMAIL ?? "admin@4ibib.local";
export const ADMIN_PASSWORD = process.env.VITE_MOCK_ADMIN_PASSWORD ?? "test1234";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: SITE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "npm run dev --workspace @4ibib/site -- --mode test",
      url: SITE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe"
    },
    {
      command: "npm run dev --workspace @4ibib/admin -- --mode test",
      url: `${ADMIN_URL}/admin/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe"
    }
  ]
});
