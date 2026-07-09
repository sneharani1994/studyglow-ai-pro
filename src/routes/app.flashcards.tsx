import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  RefreshCw,
  Sparkles,
  Save,
  Trash2,
  Loader2,
  Heart,
  Search,
  History,
  Layers,
  X,
  Clock,
} from "lucide-react";
import {
  flashcardsService,
  aiService,
  notesService,
  type Flashcard,
  type Subject,
} from "@/lib/api";
import { toast } from "sonner";
import { emitAppRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/flashcards")({
  component: FlashcardsPage,
});

type Deck = Array<
  Pick<Flashcard, "front" | "back"> & {
    id?: string;
    saved?: boolean;
    is_favourite?: boolean;
    subject_id?: string | null;
    subject_name?: string | null;
  }
>;

const DRAFT_KEY = "studygpt.flashcards.draft";

function FlashcardsPage() {
  /* ─── Existing core state (preserved) ─── */
  const [saved, setSaved] = useState<Flashcard[]>([]);
  const [deck, setDeck] = useState<Deck>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [tab, setTab] = useState<"generated" | "saved">("generated");

  /* ─── New UX state ─── */
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<
    Array<{ front: string; back: string }>
  >([]);

  /* ─── Refs ─── */
  const pendingNavRef = useRef<number | null>(null);
  const totalRef = useRef(0);

  /* ─── Derived: active deck (tab-switched) ─── */
  const activeDeck: Deck = useMemo(
    () =>
      tab === "saved"
        ? saved.map((c) => ({
            id: c.id,
            front: c.front,
            back: c.back,
            saved: true,
            is_favourite: c.is_favourite,
            subject_id: c.subject_id,
            subject_name: c.subjects?.name ?? null,
          }))
        : deck,
    [tab, saved, deck],
  );

  /* ─── Derived: filtered deck (search + subject + favourites) ─── */
  const filteredDeck = useMemo(() => {
    let result = activeDeck;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q),
      );
    }
    if (tab === "saved" && subjectFilter !== "all") {
      result = result.filter((c) => c.subject_id === subjectFilter);
    }
    if (tab === "saved" && showFavouritesOnly) {
      result = result.filter((c) => c.is_favourite);
    }
    return result;
  }, [activeDeck, searchQuery, tab, subjectFilter, showFavouritesOnly]);

  const total = filteredDeck.length;
  const card = filteredDeck[idx];
  const progressPct = useMemo(
    () => (total ? Math.round(((idx + 1) / total) * 100) : 0),
    [idx, total],
  );
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    subjectFilter !== "all" ||
    showFavouritesOnly;

  // Keep totalRef in sync for keyboard handler
  totalRef.current = total;

  /* ═══════════════════════════════════════════════
     Data loading (preserved logic)
     ═══════════════════════════════════════════════ */
  const loadSaved = () =>
    flashcardsService.list().then(setSaved).catch(() => setSaved([]));

  useEffect(() => {
    loadSaved().finally(() => setLoading(false));
    notesService
      .listSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) setDeck(JSON.parse(raw) as Deck);
    } catch {
      /* ignore */
    }
  }, []);

  /* ─── Reset idx on tab / filter changes ─── */
  useEffect(() => {
    if (pendingNavRef.current !== null) {
      setIdx(pendingNavRef.current);
      setFlipped(false);
      pendingNavRef.current = null;
    } else {
      setIdx(0);
      setFlipped(false);
    }
  }, [tab, searchQuery, subjectFilter, showFavouritesOnly]);

  /* ─── Clamp idx when filteredDeck shrinks ─── */
  useEffect(() => {
    if (total > 0 && idx >= total) {
      setIdx(total - 1);
    }
  }, [total, idx]);

  /* ─── Persist draft deck to localStorage (preserved) ─── */
  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(deck));
    } catch {
      /* ignore */
    }
  }, [deck]);

  /* ─── Track recently viewed cards ─── */
  useEffect(() => {
    const currentCard = filteredDeck[idx];
    if (!currentCard) return;
    setRecentlyViewed((prev) => {
      if (prev.some((r) => r.front === currentCard.front)) return prev;
      return [
        { front: currentCard.front, back: currentCard.back },
        ...prev,
      ].slice(0, 5);
    });
    // Intentionally tracking only navigation events (idx/tab), not every state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, tab]);

  /* ─── Keyboard navigation (←/→/Space) ─── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      const t = totalRef.current;
      if (e.key === "ArrowRight") {
        setFlipped(false);
        setIdx((i) => (t ? (i + 1) % t : 0));
      } else if (e.key === "ArrowLeft") {
        setFlipped(false);
        setIdx((i) => (t ? (i - 1 + t) % t : 0));
      } else if (e.key === " " && t > 0) {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ═══════════════════════════════════════════════
     Navigation (preserved logic)
     ═══════════════════════════════════════════════ */
  const next = () => {
    setFlipped(false);
    setIdx((i) => (total ? (i + 1) % total : 0));
  };
  const prev = () => {
    setFlipped(false);
    setIdx((i) => (total ? (i - 1 + total) % total : 0));
  };
  const shuffle = () => {
    if (tab === "saved") {
      toast.info("Shuffle available on generated deck");
      return;
    }
    setDeck((d) => [...d].sort(() => Math.random() - 0.5));
    setIdx(0);
    setFlipped(false);
  };
  const restart = () => {
    setIdx(0);
    setFlipped(false);
  };

  /* ═══════════════════════════════════════════════
     Generate (preserved logic)
     ═══════════════════════════════════════════════ */
  const generate = async () => {
    const t = topic.trim();
    if (!t) {
      toast.error("Enter a topic to generate flashcards");
      return;
    }
    setBusy(true);
    try {
      const res = await aiService.generateFlashcards(t, count);
      const newDeck: Deck = res.flashcards.map((c) => ({
        front: c.front,
        back: c.back,
      }));
      setDeck(newDeck);
      setTab("generated");
      setIdx(0);
      setFlipped(false);
      toast.success(`Generated ${newDeck.length} flashcards`);
      emitAppRefresh({ source: "flashcards" });
    } catch (e: any) {
      toast.error(e?.message || "Could not generate flashcards");
    } finally {
      setBusy(false);
    }
  };

  /* ═══════════════════════════════════════════════
     Save (preserved logic, index-matching hardened)
     ═══════════════════════════════════════════════ */
  const saveOne = async () => {
    if (!card || card.saved) return;
    try {
      const created = await flashcardsService.create({
        front: card.front,
        back: card.back,
      });
      setSaved((p) => [created, ...p]);
      // Match by content so filtered-index doesn't mis-target
      const targetFront = card.front;
      const targetBack = card.back;
      setDeck((p) =>
        p.map((c) =>
          c.front === targetFront && c.back === targetBack && !c.saved
            ? { ...c, id: created.id, saved: true }
            : c,
        ),
      );
      toast.success("Saved");
      emitAppRefresh({ source: "flashcards" });
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const saveAll = async () => {
    const unsaved = deck.filter((c) => !c.saved);
    if (!unsaved.length) {
      toast.info("All cards already saved");
      return;
    }
    setBusy(true);
    try {
      const created: Flashcard[] = [];
      for (const c of unsaved) {
        created.push(
          await flashcardsService.create({ front: c.front, back: c.back }),
        );
      }
      setSaved((p) => [...created, ...p]);
      setDeck((p) => p.map((c) => (c.saved ? c : { ...c, saved: true })));
      toast.success(`Saved ${created.length} cards`);
      emitAppRefresh({ source: "flashcards" });
    } catch (e: any) {
      toast.error(e?.message || "Save all failed");
    } finally {
      setBusy(false);
    }
  };

  /* ═══════════════════════════════════════════════
     Delete (preserved logic + confirmation)
     ═══════════════════════════════════════════════ */
  const deleteSaved = async () => {
    if (!card?.id) return;
    if (!window.confirm("Delete this flashcard permanently?")) return;
    try {
      await flashcardsService.remove(card.id);
      setSaved((p) => p.filter((c) => c.id !== card.id));
      setIdx(0);
      setFlipped(false);
      toast.success("Deleted");
      emitAppRefresh({ source: "flashcards" });
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  /* ═══════════════════════════════════════════════
     Favourite (new — saved cards only)
     ═══════════════════════════════════════════════ */
  const toggleFavourite = async () => {
    if (!card?.id) return;
    try {
      const updated = await flashcardsService.update(card.id, {
        isFavourite: !card.is_favourite,
      });
      setSaved((p) => p.map((c) => (c.id === card.id ? updated : c)));
      toast.success(
        updated.is_favourite
          ? "Added to favourites"
          : "Removed from favourites",
      );
    } catch (e: any) {
      toast.error(e?.message || "Could not update favourite");
    }
  };

  /* ─── Navigate from history sidebar ─── */
  const navigateToSavedCard = (cardId: string) => {
    const cardIdx = saved.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) return;
    pendingNavRef.current = cardIdx;
    setTab("saved");
    setSearchQuery("");
    setSubjectFilter("all");
    setShowFavouritesOnly(false);
    setHistoryOpen(false);
  };

  /* ─── Clear all filters ─── */
  const clearFilters = () => {
    setSearchQuery("");
    setSubjectFilter("all");
    setShowFavouritesOnly(false);
  };

  /* ═══════════════════════════════════════════════
     History sidebar content (shared by desktop + mobile)
     ═══════════════════════════════════════════════ */
  const historyContent = (
    <div className="space-y-6">
      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-3">
            <Clock className="h-3 w-3" />
            <span>Recently Viewed</span>
          </div>
          <div className="space-y-1.5">
            {recentlyViewed.map((r, i) => (
              <div
                key={i}
                className="text-xs p-2.5 rounded-lg bg-muted/40 transition-colors"
              >
                <div className="font-medium truncate">{r.front}</div>
                <div className="text-muted-foreground/70 truncate mt-0.5">
                  {r.back}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Saved Cards */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-3">
          <Save className="h-3 w-3" />
          <span>Saved Cards</span>
          <Badge
            variant="secondary"
            className="ml-auto text-[10px] h-4 px-1.5"
          >
            {saved.length}
          </Badge>
        </div>
        {saved.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 py-4 text-center">
            No saved cards yet.
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="space-y-1.5 pr-3">
              {saved.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigateToSavedCard(c.id)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-muted/70 transition-all text-xs group border border-transparent hover:border-border/30"
                >
                  <div className="font-medium truncate group-hover:text-primary transition-colors">
                    {c.front}
                  </div>
                  <div className="text-muted-foreground/70 truncate mt-0.5">
                    {c.back}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {c.subjects?.name && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1.5"
                      >
                        {c.subjects.name}
                      </Badge>
                    )}
                    {c.is_favourite && (
                      <Heart className="h-3 w-3 text-pink-500 fill-pink-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════ */
  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative">
        {/* Decorative background orbs */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />

        {/* Page header */}
        <PageHeader
          title="Flashcards"
          description="Generate, flip, shuffle, and save AI flashcards for spaced repetition."
        />

        {/* ─── Generation toolbar ─── */}
        <Card className="glass-premium p-5 mb-6">
          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Topic</label>
              <Input
                id="flashcard-topic-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") generate();
                }}
                placeholder="e.g. Photosynthesis, JavaScript closures, WW2 causes"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Cards</label>
              <Input
                type="number"
                min={3}
                max={20}
                value={count}
                onChange={(e) =>
                  setCount(
                    Math.max(3, Math.min(20, Number(e.target.value) || 8)),
                  )
                }
                className="w-24"
              />
            </div>
            <Button
              onClick={generate}
              disabled={busy}
              className="gradient-primary-bg text-white border-0 hover:opacity-90 transition-opacity"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate
            </Button>
          </div>
        </Card>

        {/* ─── Tab bar + filter toolbar ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              size="sm"
              variant={tab === "generated" ? "default" : "outline"}
              className={cn(
                "transition-all",
                tab === "generated" &&
                  "gradient-primary-bg text-white border-0",
              )}
              onClick={() => setTab("generated")}
            >
              Generated
              <Badge variant="secondary" className="ml-2">
                {deck.length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={tab === "saved" ? "default" : "outline"}
              className={cn(
                "transition-all",
                tab === "saved" && "gradient-primary-bg text-white border-0",
              )}
              onClick={() => setTab("saved")}
            >
              Saved
              <Badge variant="secondary" className="ml-2">
                {saved.length}
              </Badge>
            </Button>
            {tab === "generated" && deck.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={saveAll}
                disabled={busy}
                className="hover:scale-105 transition-transform"
              >
                <Save className="h-4 w-4 mr-1" /> Save all
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards…"
                className="pl-8 h-8 text-xs w-40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Subject filter (saved tab only) */}
            {tab === "saved" && subjects.length > 0 && (
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Favourites toggle (saved tab only) */}
            {tab === "saved" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={showFavouritesOnly ? "default" : "outline"}
                    onClick={() =>
                      setShowFavouritesOnly(!showFavouritesOnly)
                    }
                    className={cn(
                      "h-8 px-2.5",
                      showFavouritesOnly &&
                        "gradient-primary-bg text-white border-0",
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-3.5 w-3.5",
                        showFavouritesOnly && "fill-current",
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showFavouritesOnly
                    ? "Show all cards"
                    : "Show favourites only"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* History button (mobile — hidden on lg) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHistoryOpen(true)}
                  className="h-8 px-2.5 lg:hidden"
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View history</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ─── Main content area ─── */}
        <div className="flex gap-6">
          {/* Card viewer column */}
          <div className="flex-1 min-w-0">
            {loading ? (
              /* ── Skeleton loading ── */
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="w-full aspect-[4/3] rounded-xl" />
                <div className="flex justify-center gap-2 pt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-20 rounded-md" />
                  ))}
                </div>
              </div>
            ) : !card && hasActiveFilters ? (
              /* ── No results from filters ── */
              <div className="max-w-md mx-auto text-center py-16 animate-card-enter">
                <div className="h-16 w-16 mx-auto mb-5 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No matching cards
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Try adjusting your search or filters to find what you&apos;re
                  looking for.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" /> Clear filters
                </Button>
              </div>
            ) : !card ? (
              /* ── Beautiful empty state ── */
              <div className="max-w-md mx-auto text-center py-16 animate-card-enter">
                <div className="h-20 w-20 mx-auto mb-6 rounded-2xl gradient-soft-bg flex items-center justify-center animate-float shadow-card">
                  <Layers className="h-10 w-10 text-primary/60" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {tab === "saved"
                    ? "No saved flashcards yet"
                    : "No generated deck yet"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  {tab === "saved"
                    ? "Generate some flashcards and click Save to build your collection."
                    : "Enter a topic above and click Generate to create AI-powered flashcards."}
                </p>
                {tab === "generated" && (
                  <Button
                    onClick={() =>
                      document
                        .getElementById("flashcard-topic-input")
                        ?.focus()
                    }
                    className="gradient-primary-bg text-white border-0 hover:opacity-90 transition-opacity"
                  >
                    <Sparkles className="h-4 w-4 mr-2" /> Get Started
                  </Button>
                )}
              </div>
            ) : (
              /* ── Card viewer ── */
              <div className="max-w-2xl mx-auto animate-card-enter">
                {/* Progress indicator */}
                <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary/60" />
                    Card {idx + 1} of {total}
                  </span>
                  <span className="font-medium">{progressPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-5">
                  <div
                    className="h-full gradient-primary-bg transition-all duration-500 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* 3D flip card */}
                <div style={{ perspective: "1200px" }}>
                  <button
                    onClick={() => setFlipped(!flipped)}
                    className="w-full aspect-[4/3] relative cursor-pointer group focus:outline-none"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: flipped ? "rotateY(180deg)" : undefined,
                      transition:
                        "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
                    }}
                  >
                    {/* Front face */}
                    <Card
                      className="absolute inset-0 p-8 sm:p-10 flex flex-col items-center justify-center text-center shadow-glow glass-premium group-hover:shadow-xl transition-shadow duration-300"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-4">
                        Question
                      </div>
                      <div className="text-xl sm:text-2xl font-semibold leading-snug">
                        {card.front}
                      </div>
                      <div className="text-xs text-muted-foreground/50 mt-6 flex items-center gap-1.5">
                        <RotateCw className="h-3 w-3" /> Click to reveal
                      </div>
                    </Card>

                    {/* Back face */}
                    <Card
                      className="absolute inset-0 p-8 sm:p-10 flex flex-col items-center justify-center text-center gradient-primary-bg text-white border-0 shadow-glow"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">
                        Answer
                      </div>
                      <div className="text-lg sm:text-xl leading-relaxed">
                        {card.back}
                      </div>
                    </Card>
                  </button>
                </div>

                {/* Action toolbar */}
                <div className="flex flex-wrap justify-center gap-2 mt-8">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prev}
                        className="hover:scale-105 transition-transform"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Previous card (←)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFlipped((f) => !f)}
                        className="hover:scale-105 transition-transform"
                      >
                        <RotateCw className="h-4 w-4 mr-1" /> Flip
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Flip card (Space)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={shuffle}
                        className="hover:scale-105 transition-transform"
                      >
                        <Shuffle className="h-4 w-4 mr-1" /> Shuffle
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Shuffle deck</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={restart}
                        className="hover:scale-105 transition-transform"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" /> Restart
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Go to first card</TooltipContent>
                  </Tooltip>

                  {/* Favourite (saved tab only) */}
                  {tab === "saved" && card.id && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleFavourite}
                          className={cn(
                            "hover:scale-105 transition-transform",
                            card.is_favourite &&
                              "text-pink-500 border-pink-200 hover:text-pink-600",
                          )}
                        >
                          <Heart
                            className={cn(
                              "h-4 w-4 mr-1",
                              card.is_favourite && "fill-current",
                            )}
                          />
                          {card.is_favourite ? "Unfav" : "Fav"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {card.is_favourite
                          ? "Remove from favourites"
                          : "Add to favourites"}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Regenerate (generated tab, has topic) */}
                  {tab === "generated" &&
                    deck.length > 0 &&
                    topic.trim() && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={generate}
                            disabled={busy}
                            className="hover:scale-105 transition-transform"
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Regenerate
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Regenerate with same topic
                        </TooltipContent>
                      </Tooltip>
                    )}

                  {/* Save / Delete */}
                  {tab === "generated" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={saveOne}
                          disabled={card.saved}
                          className={cn(
                            "hover:scale-105 transition-transform",
                            !card.saved &&
                              "gradient-primary-bg text-white border-0",
                          )}
                          variant={card.saved ? "outline" : "default"}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {card.saved ? "Saved" : "Save"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {card.saved ? "Already saved" : "Save this card"}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:scale-105 transition-transform hover:bg-destructive/10"
                          onClick={deleteSaved}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete this card</TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={next}
                        className="gradient-primary-bg text-white border-0 hover:opacity-90 hover:scale-105 transition-all"
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Next card (→)</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>

          {/* ─── Desktop history sidebar ─── */}
          <aside className="hidden lg:flex flex-col w-72 shrink-0">
            <Card className="glass-premium p-4 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg gradient-primary-bg flex items-center justify-center">
                  <History className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-semibold text-sm">History</span>
              </div>
              {historyContent}
            </Card>
          </aside>
        </div>

        {/* ─── Mobile history sheet ─── */}
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>History</SheetTitle>
              <SheetDescription>
                Recently viewed and saved flashcards.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">{historyContent}</div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}