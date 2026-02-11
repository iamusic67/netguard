import { createApp } from "vue";
import * as Sentry from "@sentry/vue";
import App from "./App.vue";
import router from "./router/index.js";

import "./styles/theme.css";
import "./styles/base.css";

const app = createApp(App);

// Sentry error tracking
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    app,
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration({ router }),
    ],
    tracesSampleRate: 0.2,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      // Strip sensitive data
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
      }
      return event;
    }
  });
}

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('[NetGUARD]', err, info);
  if (sentryDsn) {
    Sentry.captureException(err, { extra: { info } });
  }
};

app.use(router);
app.mount("#app");
