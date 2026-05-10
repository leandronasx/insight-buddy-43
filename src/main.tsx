import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register the service worker for PWA functionality
registerSW({ immediate: true });


// Ouvir mensagem do service worker para navegar
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NAVIGATE' && event.data?.url) {
      window.location.href = event.data.url;
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
