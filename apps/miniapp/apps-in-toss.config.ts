import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 배포 전에 앱인토스 콘솔에 등록한 실제 appName으로 변경.
  appName: 'aimi',
  permissions: [],
  navigationBar: {
    withBackButton: false,
    withHomeButton: false,
    withTitle: false,
    transparentBackground: true,
    theme: 'light',
  },
  webView: { bounces: false, pullToRefreshEnabled: false },
  webBundleDir: 'dist',
});
