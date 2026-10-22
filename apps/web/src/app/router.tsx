import type { ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router";
import { SettingsPage } from "@/features/account/SettingsPage";
import { LandingPage } from "@/features/auth/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { OnboardingPage } from "@/features/auth/OnboardingPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { VerifyPage } from "@/features/auth/VerifyPage";
import { FacilitiesPage } from "@/features/booking/FacilitiesPage";
import { FacilityPage } from "@/features/booking/FacilityPage";
import { MyBookingsPage } from "@/features/booking/MyBookingsPage";
import { AssistantPage } from "@/features/chat/ChatWidget";
import { CommunityPage } from "@/features/community/CommunityPage";
import { EventsPage } from "@/features/community/EventsPage";
import { NeighboursPage } from "@/features/community/NeighboursPage";
import { ProfilePage } from "@/features/community/ProfilePage";
import { EcoFoodPage } from "@/features/ecofood/EcoFoodPage";
import { HomePage } from "@/features/home/HomePage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { TownCarePage } from "@/features/towncare/TownCarePage";
import { AppShell } from "./AppShell";
import { PublicOnly, RequireAdmin, RequireSession, RequireVerified, RouteError } from "./guards";

/** Pages with maps (Leaflet) or charts (Recharts), and the admin area, load on demand. */
const lazyPage = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => ({
  lazy: async () => ({ Component: (await load())[name] }),
});

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <LandingPage /> },
      {
        element: <PublicOnly />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/signup", element: <SignupPage /> },
        ],
      },
      {
        element: <RequireSession />,
        children: [
          { path: "/verify", element: <VerifyPage /> },
          { path: "/onboarding", element: <OnboardingPage /> },
        ],
      },
      {
        element: <RequireVerified />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: "/home", element: <HomePage /> },
              { path: "/community", element: <CommunityPage /> },
              { path: "/community/events", element: <EventsPage /> },
              { path: "/community/neighbours", element: <NeighboursPage /> },
              { path: "/community/u/:id", element: <ProfilePage /> },
              { path: "/towncare", element: <TownCarePage mine /> },
              { path: "/towncare/all", element: <TownCarePage /> },
              { path: "/towncare/map", ...lazyPage(() => import("@/features/towncare/ReportsMapPage"), "ReportsMapPage") },
              { path: "/towncare/mine", element: <Navigate to="/towncare" replace /> },
              { path: "/towncare/new", ...lazyPage(() => import("@/features/towncare/NewReportPage"), "NewReportPage") },
              { path: "/towncare/:id", ...lazyPage(() => import("@/features/towncare/ReportDetailPage"), "ReportDetailPage") },
              { path: "/ecofood", element: <EcoFoodPage /> },
              { path: "/ecofood/mine", element: <EcoFoodPage mine /> },
              { path: "/ecofood/new", ...lazyPage(() => import("@/features/ecofood/NewListingPage"), "NewListingPage") },
              { path: "/ecofood/impact", ...lazyPage(() => import("@/features/ecofood/ImpactPage"), "ImpactPage") },
              { path: "/ecofood/:id", ...lazyPage(() => import("@/features/ecofood/ListingDetailPage"), "ListingDetailPage") },
              { path: "/book", element: <FacilitiesPage /> },
              { path: "/book/mine", element: <MyBookingsPage /> },
              { path: "/book/:facilityId", element: <FacilityPage /> },
              { path: "/places", ...lazyPage(() => import("@/features/places/PlacesPage"), "PlacesPage") },
              { path: "/assistant", element: <AssistantPage /> },
              { path: "/notifications", element: <NotificationsPage /> },
              { path: "/settings", element: <SettingsPage /> },
              {
                element: <RequireAdmin />,
                children: [
                  { path: "/admin", ...lazyPage(() => import("@/features/admin/AdminOverviewPage"), "AdminOverviewPage") },
                  { path: "/admin/reports", ...lazyPage(() => import("@/features/admin/AdminReportsPage"), "AdminReportsPage") },
                  { path: "/admin/bookings", ...lazyPage(() => import("@/features/admin/AdminBookingsPage"), "AdminBookingsPage") },
                  {
                    path: "/admin/verifications",
                    ...lazyPage(() => import("@/features/admin/AdminVerificationsPage"), "AdminVerificationsPage"),
                  },
                  { path: "/admin/tickets", ...lazyPage(() => import("@/features/admin/AdminTicketsPage"), "AdminTicketsPage") },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", element: <RouteError /> },
    ],
  },
]);
