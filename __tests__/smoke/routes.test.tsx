import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const mockGetHybridMetaPayload = vi.fn();
const mockGetHybridMatchupPayload = vi.fn();
const mockGetGumGumMarketMoves = vi.fn();
const mockGetOfficialCardById = vi.fn();
const mockGetOfficialVariantsByBaseId = vi.fn();
const mockUseSearchParams = vi.fn();
const mockUseRouter = vi.fn();
const mockUseCloudSync = vi.fn();
const mockUsePreferredSpecialPrintIds = vi.fn();

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
  useRouter: () => mockUseRouter(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/components/home/HomePageClient", () => ({
  default: ({
    initialMetaIsLive,
    initialMatchupsAreLive,
  }: {
    initialMetaIsLive: boolean;
    initialMatchupsAreLive: boolean;
  }) => (
    <div data-testid="home-page-client">
      Captain&apos;s Log · meta:{String(initialMetaIsLive)} · matchups:{String(initialMatchupsAreLive)}
    </div>
  ),
}));

vi.mock("@/lib/competitive-insights", () => ({
  getHybridMetaPayload: mockGetHybridMetaPayload,
  getHybridMatchupPayload: mockGetHybridMatchupPayload,
}));

vi.mock("@/lib/gumgum-market-moves", () => ({
  getGumGumMarketMoves: mockGetGumGumMarketMoves,
}));

vi.mock("@/components/market/MarketCatalogView", () => ({
  default: () => <div data-testid="market-page">Market Catalog Smoke</div>,
}));

vi.mock("@/components/market/MarketLoadingState", () => ({
  default: () => <div>Market Loading</div>,
}));

vi.mock("@/components/market/CardDetailClient", () => ({
  default: ({ initialCard }: { initialCard: { name: string; id: string } }) => (
    <div data-testid="card-detail-page">
      {initialCard.name} · {initialCard.id}
    </div>
  ),
}));

vi.mock("@/lib/official-cards", () => ({
  getOfficialCardById: mockGetOfficialCardById,
  getOfficialVariantsByBaseId: mockGetOfficialVariantsByBaseId,
}));

vi.mock("@/components/BrandMark", () => ({
  default: ({ subtitle }: { subtitle?: string }) => (
    <div data-testid="brand-mark">{subtitle || "DevilFruit"}</div>
  ),
}));

vi.mock("@/lib/cloud/useCloudSync", () => ({
  useCloudSync: () => mockUseCloudSync(),
}));

vi.mock("@/lib/use-preferred-special-prints", () => ({
  usePreferredSpecialPrintIds: () => mockUsePreferredSpecialPrintIds(),
}));

beforeEach(() => {
  vi.resetModules();

  mockGetHybridMetaPayload.mockResolvedValue({
    source: "live",
    updatedAt: "2026-04-07T00:00:00.000Z",
    decks: [],
  });

  mockGetHybridMatchupPayload.mockResolvedValue({
    source: "live",
    updatedAt: "2026-04-07T00:00:00.000Z",
    sampleGames: 12,
    sampleLabel: "12 games",
    sampleDescription: "Smoke sample",
    comparableSample: null,
    decks: [],
  });

  mockGetGumGumMarketMoves.mockResolvedValue(null);

  mockGetOfficialCardById.mockReturnValue({
    id: "OP01-001",
    name: "Roronoa Zoro",
  });

  mockGetOfficialVariantsByBaseId.mockReturnValue([]);

  mockUseSearchParams.mockReturnValue(new URLSearchParams());

  mockUseRouter.mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  });

  mockUseCloudSync.mockReturnValue({
    user: null,
    ready: true,
    hasCloud: true,
    signIn: vi.fn(),
    signUp: vi.fn(),
    sendPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn(),
    loadDecks: vi.fn().mockResolvedValue([]),
    saveDecks: vi.fn().mockResolvedValue(undefined),
    loadCollection: vi.fn().mockResolvedValue({}),
    saveCollection: vi.fn().mockResolvedValue(undefined),
  });

  mockUsePreferredSpecialPrintIds.mockReturnValue(new Map());

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/cards/prices")) {
        return {
          ok: true,
          json: async () => ({ results: [] }),
        };
      }

      if (url.startsWith("/api/cards/variants")) {
        return {
          ok: true,
          json: async () => ({ variants: [] }),
        };
      }

      if (url.startsWith("/api/cards/special-prints")) {
        return {
          ok: true,
          json: async () => ({ results: [] }),
        };
      }

      if (url.startsWith("/api/cards")) {
        return {
          ok: true,
          json: async () => ({ results: [] }),
        };
      }

      return {
        ok: true,
        json: async () => ({}),
      };
    }),
  );
});

test("homepage route renders without crashing", async () => {
  const module = await import("../../app/page");
  const Page = module.default;

  render(await Page());

  expect(screen.getByTestId("home-page-client")).toBeTruthy();
  expect(screen.getByText(/Captain's Log/i)).toBeTruthy();
});

test("card detail route renders without crashing", async () => {
  const module = await import("../../app/cards/[id]/page");
  const Page = module.default;

  render(await Page({ params: Promise.resolve({ id: "OP01-001" }) }));

  expect(screen.getByTestId("card-detail-page")).toBeTruthy();
  expect(screen.getByText(/Roronoa Zoro/i)).toBeTruthy();
});

test("market route renders without crashing", async () => {
  const module = await import("../../app/market/page");
  const Page = module.default;

  render(<Page />);

  expect(screen.getByTestId("market-page")).toBeTruthy();
  expect(screen.getByText(/Market Catalog Smoke/i)).toBeTruthy();
});

test("deckbuilder route renders without crashing", async () => {
  const module = await import("../../app/deckbuilder/page");
  const Page = module.default;

  render(<Page />);

  expect(await screen.findByRole("heading", { name: "Deck Lab" })).toBeTruthy();
});

test("login route renders without crashing", async () => {
  const module = await import("../../app/login/page");
  const Page = module.default;

  render(<Page />);

  expect(screen.getByText("Sign in to your DevilFruitTCG vault.")).toBeTruthy();
  expect(screen.getAllByText(/Secure account access/i).length).toBeGreaterThan(0);
});
