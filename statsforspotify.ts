import type { Project } from "@/types";

export const statsforspotify: Project = {
  id: "statsforspotify",
  title: "Stats for Spotify: Music Analytics Platform",
  description:
    "Full-stack web application that tracks Spotify listening history, visualizes music taste evolution over time, and enables social music discovery with friends through real-time analytics and automated snapshots.",
  descriptionSv:
    "Full-stack webbapplikation som spårar Spotify-lyssningshistorik, visualiserar musiksmakens utveckling över tid och möjliggör social musikupptäckt med vänner genom realtidsanalys och automatiska ögonblicksbilder.",
  technologies: [
    "Next.js 16",
    "React 19",
    "TypeScript",
    "Supabase",
    "PostgreSQL",
    "Spotify API",
    "Tailwind CSS 4",
    "shadcn/ui",
    "Recharts",
    "Framer Motion",
    "TanStack React Query",
    "Vercel Analytics",
    "Row Level Security (RLS)",
    "OAuth 2.0",
    "Edge Functions",
    "Bun",
  ],
  link: "https://github.com/Berkay2002/statsforspotify",
  githubLink: "https://github.com/Berkay2002/statsforspotify",
  image: undefined,
  imageAlt: "Stats for Spotify dashboard showing top artists, tracks, and trend visualization",
  detailedDescription:
    "Production-ready music analytics platform built with Next.js 16 App Router and Supabase. Tracks users' top 50 artists, tracks, and albums across multiple time ranges (4 weeks, 6 months, all time) with automated snapshot collection respecting 24-hour intervals. Features include historical trend visualization with Recharts-powered line graphs and sparklines, color-coded rank change badges (↑5, ↓3, NEW, —), and progressive enhancement that works with or without historical data. Social features enable friend discovery through mutual Spotify followers, privacy controls (public/friends-only/private), Discord-style usernames with discriminators, and the ability to browse friends' listening history. Built with Row Level Security (RLS) ensuring users can only access their own data and authorized friend data. Includes comprehensive data management with JSON/CSV export, profile customization, and full data deletion capability for Spotify API compliance. Vercel Analytics and Speed Insights provide performance monitoring, while Framer Motion powers smooth animations and transitions. Auto-generated TypeScript types from Supabase schema ensure type safety across all database operations.",
  detailedDescriptionSv:
    "Produktionsklar musikanalysplattform byggd med Next.js 16 App Router och Supabase. Spårar användares topp 50 artister, låtar och album över flera tidsintervall (4 veckor, 6 månader, all tid) med automatisk ögonblicksinsamling som respekterar 24-timmarsintervaller. Funktioner inkluderar historisk trendvisualisering med Recharts-drivna linjediagram och sparklines, färgkodade rangändringsmärken (↑5, ↓3, NEW, —) och progressiv förbättring som fungerar med eller utan historiska data. Sociala funktioner möjliggör vänupptäckt genom ömsesidiga Spotify-följare, integritetskontroller (offentlig/endast vänner/privat), Discord-stil användarnamn med diskriminatorer och möjligheten att bläddra bland vänners lyssningshistorik. Byggd med Row Level Security (RLS) som säkerställer att användare endast kan komma åt sin egen data och auktoriserad vändata. Inkluderar omfattande datahantering med JSON/CSV-export, profilanpassning och fullständig dataradering för Spotify API-efterlevnad. Vercel Analytics och Speed Insights ger prestandaövervakning, medan Framer Motion driver smidiga animationer och övergångar. Autogenererade TypeScript-typer från Supabase-schema säkerställer typsäkerhet över alla databasoperationer.",
  features: [
    "Real-time music tracking with top 50 artists, tracks, and albums across 4-week, 6-month, and all-time ranges",
    "Automated snapshot collection on dashboard visits with 24-hour interval protection and optional scheduled Edge Function collection",
    "Historical trend visualization using Recharts with sparklines, line graphs, and color-coded rank change indicators (↑5, ↓3, NEW, —)",
    "Social friend system with mutual Spotify follower discovery, follow-back suggestions, user search, and cached follow verification to reduce API calls",
    "Privacy controls allowing users to set stats visibility (public, friends-only, or private) with Row Level Security enforcement",
    "Comprehensive data management including JSON/CSV export, profile customization, detailed statistics, and Spotify-compliant full data deletion",
    "Performance optimized with parallel data fetching, TanStack React Query caching, Server Components, Next.js Image optimization, and code splitting",
    "Modern UI with dark/light mode toggle, mobile-responsive design, Framer Motion animations, 50+ shadcn/ui components, and Vercel Analytics integration",
    "Type-safe database operations using auto-generated TypeScript types from Supabase schema with automated daily synchronization",
  ],
  featuresSv: [
    "Realtidsmusikspårning med topp 50 artister, låtar och album över 4-veckor, 6-månader och all-tid intervaller",
    "Automatisk ögonblicksinsamling vid dashboardbesök med 24-timmars intervallskydd och valfri schemalagd Edge Function-insamling",
    "Historisk trendvisualisering med Recharts med sparklines, linjediagram och färgkodade rangändringsindikatorer (↑5, ↓3, NEW, —)",
    "Socialt vänsystem med ömsesidig Spotify-följarupptäckt, följ-tillbaka-förslag, användarsökning och cachad följarverifiering för att minska API-anrop",
    "Integritetskontroller som tillåter användare att ställa in statistiksynlighet (offentlig, endast vänner eller privat) med Row Level Security-verkställighet",
    "Omfattande datahantering inklusive JSON/CSV-export, profilanpassning, detaljerad statistik och Spotify-kompatibel fullständig dataradering",
    "Prestandaoptimerad med parallell datahämtning, TanStack React Query-caching, Server Components, Next.js Image-optimering och koddelning",
    "Modernt UI med mörk/ljus lägesväxling, mobil-responsiv design, Framer Motion-animationer, 50+ shadcn/ui-komponenter och Vercel Analytics-integration",
    "Typsäkra databasoperationer med autogenererade TypeScript-typer från Supabase-schema med automatiserad daglig synkronisering",
  ],
  challenges: [
    "Managing automated snapshot collection while respecting Spotify API rate limits and avoiding excessive database writes",
    "Implementing a scalable friend system that verifies mutual Spotify followers without making redundant API calls",
    "Ensuring data privacy and security with Row Level Security across multiple user permission levels (public, friends-only, private)",
    "Visualizing ranking history with progressive enhancement that works seamlessly with or without historical data",
    "Maintaining type safety across the entire stack with database schema changes and Spotify API responses",
  ],
  challengesSv: [
    "Hantera automatisk ögonblicksinsamling samtidigt som Spotify API-gränser respekteras och överdrivna databasskrivningar undviks",
    "Implementera ett skalbart vänsystem som verifierar ömsesidiga Spotify-följare utan att göra överflödiga API-anrop",
    "Säkerställa datasekretess och säkerhet med Row Level Security över flera användarbehörighetsnivåer (offentlig, endast vänner, privat)",
    "Visualisera ranghistorik med progressiv förbättring som fungerar sömlöst med eller utan historiska data",
    "Bibehålla typsäkerhet över hela stacken med databasschemaändringar och Spotify API-svar",
  ],
  solution:
    "Implemented auto-snapshot trigger component that checks last snapshot timestamp before initiating collection, with 24-hour interval enforcement at both client and API levels. Friend system uses a cached follow verification table with configurable TTL to minimize Spotify API calls while keeping data fresh. Row Level Security policies enforce privacy settings at database level, with helper functions checking user relationships and permissions. Recharts visualizations detect presence of historical data and gracefully degrade to current-only views when snapshots are unavailable. Database types are auto-generated from Supabase schema using CLI and synchronized daily via GitHub Actions, ensuring type safety without manual maintenance.",
  solutionSv:
    "Implementerade auto-snapshot-trigger-komponent som kontrollerar senaste ögonblickstidsstämpel innan insamling initieras, med 24-timmars intervallverkställighet på både klient- och API-nivåer. Vänsystemet använder en cachad följarverifieringstabell med konfigurerbar TTL för att minimera Spotify API-anrop samtidigt som data hålls fräsch. Row Level Security-policyer verkställer integritetsinställningar på databasnivå, med hjälpfunktioner som kontrollerar användarrelationer och behörigheter. Recharts-visualiseringar detekterar närvaron av historiska data och degraderar graciöst till endast nuvarande vyer när ögonblicksbilder är otillgängliga. Databastyper autogenereras från Supabase-schema med CLI och synkroniseras dagligen via GitHub Actions, vilket säkerställer typsäkerhet utan manuellt underhåll.",
  outcome:
    "Delivered a production-ready music analytics platform with 50+ UI components, automated data collection respecting API limits, comprehensive social features with privacy controls, and full Spotify API compliance. Achieved optimal performance through parallel data fetching, React Query caching, and Server Components. Type safety maintained across entire stack with automated schema synchronization. Successfully deployed on Vercel with Analytics and Speed Insights integration, providing users with historical music taste tracking, friend discovery, and detailed listening statistics while maintaining data privacy and security through Row Level Security.",
  outcomeSv:
    "Levererade en produktionsklar musikanalysplattform med 50+ UI-komponenter, automatiserad datainsamling som respekterar API-gränser, omfattande sociala funktioner med integritetskontroller och fullständig Spotify API-efterlevnad. Uppnådde optimal prestanda genom parallell datahämtning, React Query-caching och Server Components. Typsäkerhet bibehölls över hela stacken med automatiserad schemasynkronisering. Framgångsrikt utplacerad på Vercel med Analytics och Speed Insights-integration, vilket ger användare historisk musiksmakspårning, vänupptäckt och detaljerad lyssningsstatistik samtidigt som datasekretess och säkerhet bibehålls genom Row Level Security.",
};
