"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useData } from "@/lib/data-context"
import * as api from "@/lib/api"
import type { Claim, CompletedWork, DailyTask } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  RefreshCw,
  AlertTriangle,
  Wrench,
  ClipboardList,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
} from "lucide-react"
import { addDays, format, subDays } from "date-fns"
import { es } from "date-fns/locale"

const TYPE_CONFIG = {
  recurrente: {
    label: "Recurrente",
    className: "bg-chart-1/15 text-chart-1 border-chart-1/30",
    icon: RefreshCw,
  },
  reclamo: {
    label: "Reclamo",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    icon: AlertTriangle,
  },
  trabajo: {
    label: "Trabajo",
    className: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    icon: Wrench,
  },
} as const

type SummaryTask = {
  id: string | number
  type: "recurrente" | "reclamo" | "trabajo"
  title: string
  description: string
  area?: string
  userName: string
  date: string
  solution?: string
}

type TaskTypeFilter = SummaryTask["type"] | "pendiente" | null

const TASK_ROUTES: Record<SummaryTask["type"], string> = {
  recurrente: "/dashboard/tareas-recurrentes",
  reclamo: "/dashboard/nuevo-reclamo",
  trabajo: "/dashboard/trabajos-realizados",
}

export function DashboardSummary() {
  const router = useRouter()
  const {
    dailyTasks: currentDailyTasks,
    claims: currentClaims,
    completedWorks: currentCompletedWorks,
    todayStr,
    refreshAll,
  } = useData()

  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [historicalDailyTasks, setHistoricalDailyTasks] = useState<DailyTask[]>([])
  const [historicalClaims, setHistoricalClaims] = useState<Claim[]>([])
  const [historicalCompletedWorks, setHistoricalCompletedWorks] = useState<CompletedWork[]>([])
  const [loadingSelectedDate, setLoadingSelectedDate] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>(null)

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd")
  const selectedIsToday = selectedDateStr === todayStr

  useEffect(() => {
    if (selectedIsToday) {
      void refreshAll()
      return
    }

    let cancelled = false
    setLoadingSelectedDate(true)

    void api.getDashboardToday(selectedDateStr).then((data) => {
      if (cancelled) return

      const recurringAsDaily: DailyTask[] = (data?.recurringTasks ?? []).map((task) => ({
        id: task.id,
        userId: task.userId,
        userName: task.userName,
        date: data?.date ?? selectedDateStr,
        type: "recurrente",
        title: task.title,
        description: task.description,
      }))

      setHistoricalDailyTasks(recurringAsDaily)
      setHistoricalClaims(data?.claims ?? [])
      setHistoricalCompletedWorks(data?.completedWorks ?? [])
      setLoadingSelectedDate(false)
    })

    return () => {
      cancelled = true
    }
  }, [refreshAll, selectedDateStr, selectedIsToday])

  const dailyTasks = selectedIsToday ? currentDailyTasks : historicalDailyTasks
  const claims = selectedIsToday ? currentClaims : historicalClaims
  const completedWorks = selectedIsToday ? currentCompletedWorks : historicalCompletedWorks

  const isSelectedDate = (value: string) =>
    value === selectedDateStr || value.startsWith(`${selectedDateStr}T`)

  const recurrentTasks = useMemo<SummaryTask[]>(
    () =>
      dailyTasks
        .filter((t) => t.type === "recurrente" && isSelectedDate(t.date))
        .map((task) => ({
          id: task.id,
          type: "recurrente",
          title: task.title,
          description: task.description,
          area: task.area,
          userName: task.userName,
          date: task.date,
        })),
    [dailyTasks, selectedDateStr]
  )

  const claimTasks = useMemo<SummaryTask[]>(
    () =>
      claims
        .filter((claim) => isSelectedDate(claim.date))
        .map((claim) => ({
          id: claim.id,
          type: "reclamo",
          title: claim.title,
          description: claim.description,
          area: claim.area,
          userName: claim.userName,
          date: claim.date,
          solution: claim.solution,
        })),
    [claims, selectedDateStr]
  )

  const workTasks = useMemo<SummaryTask[]>(
    () =>
      completedWorks
        .filter((work) => isSelectedDate(work.date))
        .map((work) => ({
          id: work.id,
          type: "trabajo",
          title: work.title,
          description: work.description,
          area: work.area,
          userName: work.userName,
          date: work.date,
        })),
    [completedWorks, selectedDateStr]
  )

  const allSelectedTasks = useMemo(
    () => [...recurrentTasks, ...claimTasks, ...workTasks],
    [claimTasks, recurrentTasks, workTasks]
  )

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const typeFilteredTasks = useMemo(
    () =>
      typeFilter === "pendiente"
        ? allSelectedTasks.filter((task) => task.type === "reclamo" && !task.solution?.trim())
        : typeFilter
          ? allSelectedTasks.filter((task) => task.type === typeFilter)
          : allSelectedTasks,
    [allSelectedTasks, typeFilter]
  )

  const todayTasks = useMemo(
    () =>
      normalizedSearch
        ? typeFilteredTasks.filter((task) =>
            [
              task.title,
              task.description,
              task.area,
              task.userName,
              task.solution,
              TYPE_CONFIG[task.type].label,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch)
          )
        : typeFilteredTasks,
    [normalizedSearch, typeFilteredTasks]
  )
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [claimDetail, setClaimDetail] = useState<Claim | null>(null)

  useEffect(() => {
    const selectedTask = todayTasks.find((task) => `${task.type}-${task.id}` === openTaskId)

    if (!selectedTask || selectedTask.type !== "reclamo") {
      setClaimDetail(null)
      return
    }

    let cancelled = false
    void api.getClaimDetail(selectedTask.id).then((detail) => {
      if (!cancelled) {
        setClaimDetail(detail)
      }
    })

    return () => {
      cancelled = true
    }
  }, [openTaskId, todayTasks])

  const formattedDate = format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
  const pendingCount = allSelectedTasks.filter(
    (task) => task.type === "reclamo" && !task.solution?.trim()
  ).length

  const stats = [
    {
      title: "Recurrentes",
      type: "recurrente" as const,
      value: allSelectedTasks.filter((task) => task.type === "recurrente").length,
      icon: RefreshCw,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      title: "Reclamos",
      type: "reclamo" as const,
      value: allSelectedTasks.filter((task) => task.type === "reclamo").length,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "Trabajos",
      type: "trabajo" as const,
      value: allSelectedTasks.filter((task) => task.type === "trabajo").length,
      icon: Wrench,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      title: "Pendientes",
      type: "pendiente" as const,
      value: pendingCount,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance">
            Resumen del dia
          </h1>
          <p className="mt-1 text-base text-muted-foreground capitalize">
            {formattedDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate((date) => subDays(date, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Dia anterior</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedDate(new Date())}
            disabled={selectedIsToday}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate((date) => addDays(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Dia siguiente</span>
          </Button>
          <input
            type="date"
            value={selectedDateStr}
            onChange={(event) => {
              const value = event.target.value
              if (value) {
                setSelectedDate(new Date(`${value}T00:00:00`))
              }
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por titulo, descripcion, area o responsable"
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={`border-border/50 transition-colors ${
              typeFilter === stat.type ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <CardContent
              role="button"
              tabIndex={0}
              onClick={() => setTypeFilter((current) => (current === stat.type ? null : stat.type))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setTypeFilter((current) => (current === stat.type ? null : stat.type))
                }
              }}
              className="flex cursor-pointer items-center gap-4 p-5"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-3xl font-semibold text-card-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedIsToday ? `${stat.title} hoy` : `${stat.title} del dia`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            {typeFilter === "pendiente"
              ? "Pendientes del dia"
              : typeFilter
                ? `${TYPE_CONFIG[typeFilter].label}s del dia`
                : "Tareas del dia"}
          </CardTitle>
          {typeFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilter(null)}
              className="mt-2 w-fit"
            >
              Ver todos
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingSelectedDate ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground/40" />
              <p className="mt-3 text-base text-muted-foreground">
                Cargando tareas del dia
              </p>
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-base text-muted-foreground">
                {normalizedSearch
                  ? "No se encontraron registros con esa busqueda"
                  : "No hay tareas registradas este dia"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                {normalizedSearch
                  ? "Proba con otra palabra o limpia el buscador"
                  : "Usa las flechas o el calendario para revisar otros dias"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {todayTasks.map((task) => {
                const config = TYPE_CONFIG[task.type]
                return (
                  <div
                    key={`${task.type}-${task.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(TASK_ROUTES[task.type])}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        router.push(TASK_ROUTES[task.type])
                      }
                    }}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                  >
                    <config.icon className={`mt-0.5 h-5 w-5 shrink-0 ${
                      task.type === "recurrente" ? "text-chart-1" :
                      task.type === "reclamo" ? "text-destructive" :
                      "text-chart-2"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-medium text-card-foreground truncate">
                          {task.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-xs ${config.className}`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        Responsable: {task.userName}
                      </p>
                    </div>
                    {task.area && (
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {task.area}
                      </span>
                    )}

                    <Dialog
                      open={openTaskId === `${task.type}-${task.id}`}
                      onOpenChange={(open) => setOpenTaskId(open ? `${task.type}-${task.id}` : null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalle</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="text-xl">{task.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 text-base">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                            <p>{config.label}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                            <p>{format(new Date(task.date), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                          </div>
                          {task.area && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Area</p>
                              <p>{task.area}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Responsable</p>
                            <p>{task.userName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Descripcion</p>
                            <p className="whitespace-pre-wrap">{claimDetail?.description || task.description || "-"}</p>
                          </div>
                          {task.type === "reclamo" && (claimDetail?.images?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Capturas</p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {claimDetail?.images?.map((src, i) => (
                                  <a key={`${src}-${i}`} href={src} target="_blank" rel="noreferrer" className="block">
                                    <img
                                      src={src}
                                      alt={`Captura ${i + 1} de ${task.title}`}
                                      className="h-28 w-full rounded-md border border-border object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
