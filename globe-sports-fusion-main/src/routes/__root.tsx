import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppProviders } from "@/components/AppProviders";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no",
        },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "FC d'Or" },
        { name: "format-detection", content: "telephone=no" },
        { name: "theme-color", content: "#0a0a0f" },
        { name: "screen-orientation", content: "portrait" },
        { title: "Magic" },
        {
          name: "description",
          content:
            "Football Club d'Or — analyse de matchs, paris valeur et coach IA pour les passionnés de football.",
        },
        { name: "author", content: "Football Club d'Or" },
        { property: "og:title", content: "Magic" },
        {
          property: "og:description",
          content:
            "Football Club d'Or — analyse de matchs, paris valeur et coach IA pour les passionnés de football.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: "Magic" },
        {
          name: "twitter:description",
          content:
            "Football Club d'Or — analyse de matchs, paris valeur et coach IA pour les passionnés de football.",
        },
        {
          property: "og:image",
          content:
            "https://storage.googleapis.com/gpt-engineer-file-uploads/AcAluaLwrRMKWx6MG3kT79M3AM12/social-images/social-1778153663390-IMG_9965.webp",
        },
        {
          name: "twitter:image",
          content:
            "https://storage.googleapis.com/gpt-engineer-file-uploads/AcAluaLwrRMKWx6MG3kT79M3AM12/social-images/social-1778153663390-IMG_9965.webp",
        },
        { name: "description", content: "An Edge-optimized Progressive Web App offering personalized AI, sports data, and secure voice interaction." },
        { property: "og:description", content: "An Edge-optimized Progressive Web App offering personalized AI, sports data, and secure voice interaction." },
        { name: "twitter:description", content: "An Edge-optimized Progressive Web App offering personalized AI, sports data, and secure voice interaction." },
        { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e4c72d11-742a-4c06-bd95-4dd1cf06e36b/id-preview-21ae8357--584b7507-58c7-46b8-bca5-5b692ddb2fd0.lovable.app-1778446757868.png" },
        { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e4c72d11-742a-4c06-bd95-4dd1cf06e36b/id-preview-21ae8357--584b7507-58c7-46b8-bca5-5b692ddb2fd0.lovable.app-1778446757868.png" },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        {
          rel: "icon",
          type: "image/png",
          sizes: "192x192",
          href: "/icon-192.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "512x512",
          href: "/icon-512.png",
        },
        // iPhone 13 Pro Max splash (428x926 @3x = 1284x2778)
        {
          rel: "apple-touch-startup-image",
          href: "/splash-iphone-13-pro-max-portrait.png",
          media:
            "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
        },
        {
          rel: "apple-touch-startup-image",
          href: "/splash-iphone-13-pro-max-landscape.png",
          media:
            "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)",
        },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Outlet />
      </AppProviders>
    </QueryClientProvider>
  );
}
