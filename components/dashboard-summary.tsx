"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import * as api from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { isAdmin } from "@/lib/auth"
import type { Claim, ClaimFormValues, DashboardToday } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  History,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react"
import { addDays, format, parseISO, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

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

type TaskType = "recurrente" | "reclamo" | "trabajo"
type FilterType = "todas" | TaskType | "pendientes"

type SummaryTask = {
  id: string | number
  type: TaskType
  title: string
  description: string
  area?: string
  userName: string
  date: string
  claimant?: string
  problemType?: string
  solution?: string
  images?: string[] | null
  pending?: boolean
}

type ActivityTask = SummaryTask & {
  statusLabel: string
  metaLine: string
}

type ClaimAudit = {
  editedBy?: string
  editedAt?: string
  resolvedBy?: string
  resolvedAt?: string
  editHistory?: { by: string; at: string }[]
  resolutionHistory?: { by: string; at: string }[]
}

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function matchesSelectedDate(value: string, selectedDate: string) {
  return value === selectedDate || value.startsWith(`${selectedDate}T`)
}

function sameId(a: string | number, b: string | number) {
  return String(a) === String(b)
}

function buildClaimFormValues(claim: Partial<SummaryTask & Claim>): ClaimFormValues {
  return {
    title: claim.title ?? "",
    area: claim.area ?? "",
    claimant: claim.claimant ?? "",
    problemType: claim.problemType ?? "",
    description: claim.description ?? "",
    solution: claim.solution ?? "",
    images: claim.images ?? [],
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "BUTTON" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  )
}

export function DashboardSummary() {
  const { user } = useAuth()
  const today = toDateInputValue(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [dashboard, setDashboard] = useState<DashboardToday | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>("todas")
  const [search, setSearch] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [notificationTab, setNotificationTab] = useState<"pendientes" | "actividad">("pendientes")
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [claimDetail, setClaimDetail] = useState<Claim | null>(null)
  const [solutionDraft, setSolutionDraft] = useState("")
  const [isEditingClaim, setIsEditingClaim] = useState(false)
  const [claimEditData, setClaimEditData] = useState<ClaimFormValues | null>(null)
  const [claimAudit, setClaimAudit] = useState<Record<string, ClaimAudit>>({})
  const [isSavingClaim, setIsSavingClaim] = useState(false)
  const currentUserName = user ? `${user.name} ${user.surname}` : "Usuario actual"

  useEffect(() => {
    if (!selectedDate) return

    let cancelled = false
    setLoading(true)

    void api.getDashboardToday(selectedDate).then((data) => {
      if (!cancelled) {
        setDashboard(data)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [selectedDate])

  const recurrentTasks = useMemo<SummaryTask[]>(
    () =>
      (dashboard?.recurringTasks ?? []).map((task) => ({
        id: task.id,
        type: "recurrente",
        title: task.title,
        description: task.description,
        userName: task.userName,
        date: dashboard?.date ?? selectedDate,
      })),
    [dashboard, selectedDate]
  )

  const allClaimTasks = useMemo<SummaryTask[]>(
    () =>
      (dashboard?.claims ?? [])
        .filter((claim) => matchesSelectedDate(claim.date, selectedDate))
        .map((claim) => ({
          id: claim.id,
          type: "reclamo",
          title: claim.title,
          description: claim.description,
          area: claim.area,
          userName: claim.userName,
          date: claim.date,
          claimant: claim.claimant,
          problemType: claim.problemType,
          solution: claim.solution,
          images: claim.images,
          pending: !claim.solution?.trim(),
        })),
    [dashboard, selectedDate]
  )

  const claimTasks = useMemo(
    () => allClaimTasks.filter((task) => task.pending),
    [allClaimTasks]
  )

  const workTasks = useMemo<SummaryTask[]>(
    () =>
      (dashboard?.completedWorks ?? [])
        .filter((work) => matchesSelectedDate(work.date, selectedDate))
        .map((work) => ({
          id: work.id,
          type: "trabajo",
          title: work.title,
          description: work.description,
          area: work.area,
          userName: work.userName,
          date: work.date,
        })),
    [dashboard, selectedDate]
  )

  const dayTasks = useMemo(
    () => [...recurrentTasks, ...allClaimTasks, ...workTasks],
    [allClaimTasks, recurrentTasks, workTasks]
  )

  const pendingTasks = useMemo(
    () => claimTasks,
    [claimTasks]
  )

  const activityTasks = useMemo<ActivityTask[]>(
    () =>
      dayTasks.map((task) => {
        const audit = claimAudit[String(task.id)]

        if (task.type !== "reclamo") {
          return {
            ...task,
            statusLabel: TYPE_CONFIG[task.type].label,
            metaLine: `Responsable: ${task.userName}`,
          }
        }

        const resolved = !task.pending
        const meta: string[] = [`Creado por: ${task.userName}`]

        if (audit?.editedBy) {
          meta.push(`Editado por: ${audit.editedBy}`)
        }

        if (resolved) {
          meta.push(audit?.resolvedBy ? `Resuelto por: ${audit.resolvedBy}` : "Resuelto sin registro")
        } else {
          meta.push("Pendiente de solucion")
        }

        return {
          ...task,
          statusLabel: resolved ? "Resuelto" : "Pendiente",
          metaLine: meta.join(" | "),
        }
      }),
    [claimAudit, dayTasks]
  )

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return dayTasks.filter((task) => {
      const matchesFilter =
        activeFilter === "todas" ||
        (activeFilter === "pendientes"
          ? task.type === "reclamo" && task.pending
          : activeFilter === "reclamo"
            ? task.type === "reclamo" && task.pending
            : task.type === activeFilter)

      if (!matchesFilter) return false
      if (!normalizedSearch) return true

      return [
        task.title,
        task.description,
        task.area,
        task.userName,
        task.claimant,
        task.problemType,
        task.solution,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [activeFilter, dayTasks, search])

  useEffect(() => {
    const selectedTask = dayTasks.find((task) => `${task.type}-${task.id}` === openTaskId)

    if (!selectedTask || selectedTask.type !== "reclamo") {
      setClaimDetail(null)
      setIsEditingClaim(false)
      return
    }

    let cancelled = false
    void api.getClaimDetail(selectedTask.id).then((detail) => {
      if (!cancelled) {
        setClaimDetail(detail)
        setSolutionDraft(detail?.solution ?? selectedTask.solution ?? "")
        if (detail) {
          setClaimEditData(buildClaimFormValues(detail))
        } else {
          setClaimEditData(buildClaimFormValues(selectedTask))
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [dayTasks, openTaskId])

  const openTaskDetail = (task: SummaryTask) => {
    setOpenTaskId(`${task.type}-${task.id}`)
    setSolutionDraft(task.solution ?? "")
    setIsEditingClaim(false)
  }

  const startEditClaim = (task: SummaryTask) => {
    setIsEditingClaim(true)
    setClaimEditData(buildClaimFormValues(claimDetail && sameId(claimDetail.id, task.id) ? claimDetail : task))
  }

  const resolveClaim = async (task: SummaryTask) => {
    const solution = solutionDraft.trim()

    if (!solution) {
      toast.error("Escribi la solucion aplicada")
      return
    }

    const claim =
      claimDetail && sameId(claimDetail.id, task.id)
        ? claimDetail
        : (await api.getClaimDetail(task.id)) ?? dashboard?.claims.find((item) => sameId(item.id, task.id))

    if (!claim) {
      toast.error("No se pudo cargar el reclamo")
      return
    }

    setIsSavingClaim(true)
    const updated = await api.updateClaim(claim.id, {
      title: claim.title,
      area: claim.area,
      claimant: claim.claimant,
      problemType: claim.problemType,
      description: claim.description,
      solution,
      images: claim.images ?? task.images ?? [],
    })
    setIsSavingClaim(false)

    if (!updated) {
      toast.error("Error al resolver el reclamo")
      return
    }

    const workCreated = await api.createCompletedWork(user?.id ?? claim.userId, currentUserName, {
      title: updated.title,
      area: updated.area,
      description: updated.description,
    })

    setClaimDetail(updated)
    setClaimEditData(buildClaimFormValues(updated))
    setClaimAudit((prev) => ({
      ...prev,
      [String(updated.id)]: {
        ...prev[String(updated.id)],
        resolvedBy: currentUserName,
        resolvedAt: new Date().toISOString(),
        editHistory: prev[String(updated.id)]?.editHistory ?? [],
        resolutionHistory: [
          ...(prev[String(updated.id)]?.resolutionHistory ?? []),
          { by: currentUserName, at: new Date().toISOString() },
        ],
      },
    }))
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            claims: prev.claims.map((item) => (sameId(item.id, task.id) ? updated : item)),
          }
        : prev
    )

    const freshDashboard = await api.getDashboardToday(selectedDate)
    if (freshDashboard) {
      setDashboard(freshDashboard)
    }

    setOpenTaskId(null)
    if (workCreated) {
      toast.success("Reclamo resuelto y movido a trabajos realizados")
    } else {
      toast.warning("Reclamo resuelto, pero no se pudo registrar en trabajos realizados")
    }
  }

  const saveEditedClaim = async (task: SummaryTask) => {
    const claim =
      claimDetail && sameId(claimDetail.id, task.id)
        ? claimDetail
        : (await api.getClaimDetail(task.id)) ?? dashboard?.claims.find((item) => sameId(item.id, task.id))

    if (!claim) {
      toast.error("No se pudo cargar el reclamo")
      return
    }

    const data = claimEditData ?? buildClaimFormValues(claim)

    setIsSavingClaim(true)
    const updated = await api.updateClaim(claim.id, {
      title: data.title,
      area: data.area,
      claimant: data.claimant,
      problemType: data.problemType,
      description: data.description,
      solution: data.solution,
      images: data.images ?? [],
    })
    setIsSavingClaim(false)

    if (!updated) {
      toast.error("Error al guardar los cambios")
      return
    }

    setClaimDetail(updated)
    setClaimEditData(buildClaimFormValues(updated))
    setClaimAudit((prev) => ({
      ...prev,
      [String(updated.id)]: {
        ...prev[String(updated.id)],
        editedBy: currentUserName,
        editedAt: new Date().toISOString(),
        editHistory: [
          ...(prev[String(updated.id)]?.editHistory ?? []),
          { by: currentUserName, at: new Date().toISOString() },
        ],
        resolutionHistory: prev[String(updated.id)]?.resolutionHistory ?? [],
      },
    }))
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            claims: prev.claims.map((item) => (sameId(item.id, task.id) ? updated : item)),
          }
        : prev
    )
    setIsEditingClaim(false)
    toast.success("Reclamo actualizado")
  }

  const selectedDateObject = parseISO(selectedDate || today)
  const formattedDate = format(selectedDateObject, "EEEE d 'de' MMMM, yyyy", { locale: es })

  const stats = [
    {
      key: "recurrente" as const,
      title: "Recurrentes",
      value: recurrentTasks.length,
      icon: RefreshCw,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      key: "reclamo" as const,
      title: "Reclamos",
      value: claimTasks.length,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      key: "pendientes" as const,
      title: "Pendientes",
      value: pendingTasks.length,
      icon: ClipboardList,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      key: "trabajo" as const,
      title: "Trabajos",
      value: workTasks.length,
      icon: Wrench,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
  ]

  const filterLabel =
    activeFilter === "todas"
      ? "Todas las tareas"
      : activeFilter === "pendientes"
        ? "Tareas pendientes"
        : TYPE_CONFIG[activeFilter].label
  const dayLabel = selectedDate === today ? "hoy" : "del dia"

  const goToPreviousDay = () => setSelectedDate(toDateInputValue(subDays(selectedDateObject, 1)))
  const goToNextDay = () => setSelectedDate(toDateInputValue(addDays(selectedDateObject, 1)))
  const goToToday = () => setSelectedDate(today)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance">
            Resumen del dia
          </h1>
          <p className="mt-1 text-base text-muted-foreground capitalize">{formattedDate}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Dia anterior</span>
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start gap-2 pl-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">
                  {format(selectedDateObject, "dd/MM/yyyy", { locale: es })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDateObject}
                onSelect={(date) => {
                  if (!date) return
                  setSelectedDate(toDateInputValue(date))
                  setCalendarOpen(false)
                }}
                initialFocus
              />
              <div className="flex items-center justify-between gap-2 border-t p-3">
                <Button variant="ghost" size="sm" onClick={goToToday} disabled={selectedDate === today}>
                  Hoy
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCalendarOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Dia siguiente</span>
          </Button>
          <Button variant="outline" onClick={goToToday} disabled={selectedDate === today}>
            Hoy
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {pendingTasks.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-medium text-destructive-foreground">
                    {pendingTasks.length}
                  </span>
                )}
                <span className="sr-only">Notificaciones</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[420px] p-0">
              <div className="border-b p-4">
                <p className="font-medium text-popover-foreground">Notificaciones</p>
                <p className="text-sm text-muted-foreground">Pendientes y actividad del dia</p>
              </div>
              <Tabs value={notificationTab} onValueChange={(value) => setNotificationTab(value as "pendientes" | "actividad")}>
                <div className="border-b px-2 pt-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
                    <TabsTrigger value="actividad">Actividad</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="pendientes" className="m-0">
                  <div className="max-h-80 overflow-y-auto p-2">
                    {pendingTasks.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-md p-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-chart-2" />
                        No hay reclamos pendientes
                      </div>
                    ) : (
                      pendingTasks.map((task) => (
                        <button
                          key={`notification-${task.id}`}
                          type="button"
                          onClick={() => {
                            setActiveFilter("pendientes")
                            setSearch("")
                            openTaskDetail(task)
                          }}
                          className="w-full rounded-md border border-border/50 p-3 text-left text-sm transition-colors hover:bg-muted"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-popover-foreground">{task.title}</span>
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-700"
                            >
                              Pendiente
                            </Badge>
                          </div>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {task.area ? `${task.area} - ` : ""}
                            {task.userName}
                          </span>
                          <span className="mt-2 block text-xs text-muted-foreground/80">
                            Click para ver el detalle
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="actividad" className="m-0">
                  <div className="max-h-80 overflow-y-auto p-2">
                    {activityTasks.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-md p-3 text-sm text-muted-foreground">
                        <History className="h-4 w-4 text-muted-foreground" />
                        Todavia no hay actividad para mostrar
                      </div>
                    ) : (
                      activityTasks.map((task) => (
                        <button
                          key={`activity-${task.type}-${task.id}`}
                          type="button"
                          onClick={() => {
                            setActiveFilter(task.type === "reclamo" && task.pending ? "pendientes" : task.type)
                            setSearch("")
                            openTaskDetail(task)
                          }}
                          className="w-full rounded-md border border-border/50 p-3 text-left text-sm transition-colors hover:bg-muted"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-popover-foreground">{task.title}</span>
                            <Badge
                              variant="outline"
                              className={
                                task.type === "reclamo" && !task.pending
                                  ? "border-chart-2/30 bg-chart-2/10 text-[11px] text-chart-2"
                                  : "text-[11px]"
                              }
                            >
                              {task.type === "reclamo"
                                ? task.pending
                                  ? "Pendiente"
                                  : "Resuelto"
                                : TYPE_CONFIG[task.type].label}
                            </Badge>
                          </div>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {format(new Date(task.date), "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                          <span className="mt-2 block text-xs text-muted-foreground/80">
                            {task.type === "reclamo" ? task.metaLine : `Responsable: ${task.userName}`}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Ajustes</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <p className="font-medium text-popover-foreground">Ajustes</p>
              <p className="mt-1 text-sm text-muted-foreground">Opciones rapidas del sistema</p>
              <div className="mt-4 grid gap-2">
                {isAdmin(user) ? (
                  <Button asChild variant="outline" className="justify-start gap-2">
                    <Link href="/dashboard/usuarios">
                      <Users className="h-4 w-4" />
                      Editar usuarios
                    </Link>
                  </Button>
                ) : (
                  <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                    La edicion de usuarios esta disponible para administradores.
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const active = activeFilter === stat.key

          return (
            <button
              key={stat.key}
              type="button"
              onClick={() => setActiveFilter(active ? "todas" : stat.key)}
              className="rounded-lg text-left outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className={`border-border/50 transition-colors hover:bg-muted/40 ${active ? "border-primary bg-muted/50" : ""}`}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-card-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.key === "trabajo" ? stat.title : `${stat.title} ${dayLabel}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      <Card className="border-border/50">
        <CardHeader className="gap-4 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
              {filterLabel}
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {activeFilter !== "todas" && (
                <Button variant="ghost" size="sm" onClick={() => setActiveFilter("todas")}>
                  <X className="mr-2 h-4 w-4" />
                  Quitar filtro
                </Button>
              )}
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar tarea, area o usuario"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground/40" />
              <p className="mt-3 text-base text-muted-foreground">Cargando resumen</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-base text-muted-foreground">No hay tareas para mostrar</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Ajusta el filtro, la busqueda o navega a otro dia
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTasks.map((task) => {
                const config = TYPE_CONFIG[task.type]

                return (
                  <div
                    key={`${task.type}-${task.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTaskDetail(task)}
                    onKeyDown={(event) => {
                      if (isEditableTarget(event.target)) return
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openTaskDetail(task)
                      }
                    }}
                    className="flex items-start gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <config.icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        task.type === "recurrente"
                          ? "text-chart-1"
                          : task.type === "reclamo"
                            ? "text-destructive"
                            : "text-chart-2"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-medium text-card-foreground">
                          {task.title}
                        </p>
                        <Badge variant="outline" className={`shrink-0 text-xs ${config.className}`}>
                          {config.label}
                        </Badge>
                        {task.pending && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-700"
                          >
                            Pendiente
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        Responsable: {task.userName}
                      </p>
                    </div>
                    {task.area && (
                      <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">
                        {task.area}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(event) => {
                        event.stopPropagation()
                        openTaskDetail(task)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver detalle</span>
                    </Button>

                    <Dialog
                      open={openTaskId === `${task.type}-${task.id}`}
                      onOpenChange={(open) => {
                        if (open) {
                          openTaskDetail(task)
                        } else {
                          setOpenTaskId(null)
                          setIsEditingClaim(false)
                        }
                      }}
                    >
                      <DialogContent
                        className="max-w-2xl"
                        onClickCapture={(event) => event.stopPropagation()}
                        onKeyDownCapture={(event) => event.stopPropagation()}
                      >
                        <DialogHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <DialogTitle className="text-xl">{task.title}</DialogTitle>
                              {task.type === "reclamo" && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {task.claimant ? `Reclamo de ${task.claimant}` : "Detalle del reclamo"}
                                </p>
                              )}
                            </div>
                            {task.type === "reclamo" && !isEditingClaim && (
                              <Button variant="outline" size="sm" onClick={() => startEditClaim(task)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                            )}
                          </div>
                        </DialogHeader>

                        <div className="space-y-4 text-base">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={config.className}>
                              {config.label}
                            </Badge>
                            {task.pending && (
                              <Badge
                                variant="outline"
                                className="border-amber-500/30 bg-amber-500/10 text-amber-700"
                              >
                                Pendiente
                              </Badge>
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                            <p>{format(new Date(task.date), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                          </div>

                          {task.type === "reclamo" && isEditingClaim ? (
                            <div className="grid gap-4">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                  value={claimEditData?.title ?? ""}
                                  onChange={(event) =>
                                    setClaimEditData((prev) => ({
                                      ...(prev ?? buildClaimFormValues(task)),
                                      title: event.target.value,
                                    }))
                                  }
                                  placeholder="Titulo"
                                />
                                <Input
                                  value={claimEditData?.claimant ?? ""}
                                  onChange={(event) =>
                                    setClaimEditData((prev) => ({
                                      ...(prev ?? buildClaimFormValues(task)),
                                      claimant: event.target.value,
                                    }))
                                  }
                                  placeholder="Solicitante"
                                />
                                <Input
                                  value={claimEditData?.area ?? ""}
                                  onChange={(event) =>
                                    setClaimEditData((prev) => ({
                                      ...(prev ?? buildClaimFormValues(task)),
                                      area: event.target.value,
                                    }))
                                  }
                                  placeholder="Area"
                                />
                                <Input
                                  value={claimEditData?.problemType ?? ""}
                                  onChange={(event) =>
                                    setClaimEditData((prev) => ({
                                      ...(prev ?? buildClaimFormValues(task)),
                                      problemType: event.target.value,
                                    }))
                                  }
                                  placeholder="Tipo de problema"
                                />
                              </div>
                              <Textarea
                                value={claimEditData?.description ?? ""}
                                onKeyDown={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  setClaimEditData((prev) => ({
                                    ...(prev ?? buildClaimFormValues(task)),
                                    description: event.target.value,
                                  }))
                                }
                                placeholder="Descripcion"
                                className="min-h-[120px]"
                              />
                              <Textarea
                                value={claimEditData?.solution ?? ""}
                                onKeyDown={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  setClaimEditData((prev) => ({
                                    ...(prev ?? buildClaimFormValues(task)),
                                    solution: event.target.value,
                                  }))
                                }
                                placeholder="Solucion"
                                className="min-h-[100px]"
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsEditingClaim(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={() => saveEditedClaim(task)} disabled={isSavingClaim}>
                                  <Save className="mr-2 h-4 w-4" />
                                  {isSavingClaim ? "Guardando..." : "Guardar cambios"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {task.area && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Area</p>
                                  <p>{task.area}</p>
                                </div>
                              )}
                              {task.claimant && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Solicitante</p>
                                  <p>{task.claimant}</p>
                                </div>
                              )}
                              {task.problemType && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Problema</p>
                                  <p>{task.problemType}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Responsable</p>
                                <p>{task.userName}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Descripcion</p>
                                <p className="whitespace-pre-wrap">
                                  {claimDetail?.description || task.description || "-"}
                                </p>
                              </div>
                              {task.type === "reclamo" && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Solucion</p>
                                  <p className="whitespace-pre-wrap">
                                    {claimDetail?.solution || task.solution || "Pendiente"}
                                  </p>
                                </div>
                              )}
                              {task.type === "reclamo" && task.pending && (
                                <div className="space-y-2 rounded-lg border border-border p-3">
                                  <p className="text-sm font-medium text-muted-foreground">Resolver pendiente</p>
                              <Textarea
                                value={solutionDraft}
                                onKeyDown={(event) => event.stopPropagation()}
                                onChange={(event) => setSolutionDraft(event.target.value)}
                                placeholder="Escribi la solucion aplicada"
                                className="min-h-[96px]"
                              />
                                  <div className="flex justify-end">
                                    <Button onClick={() => resolveClaim(task)} disabled={isSavingClaim}>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      {isSavingClaim ? "Guardando..." : "Guardar solucion"}
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {task.type === "reclamo" && (claimDetail?.images?.length ?? 0) > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Capturas</p>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {claimDetail?.images?.map((src, i) => (
                                      <a
                                        key={`${src}-${i}`}
                                        href={src}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block"
                                      >
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
                            </>
                          )}

                          {task.type === "reclamo" && (
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <History className="h-4 w-4" />
                                Registro del reclamo
                              </div>
                              <div className="mt-2 grid gap-1 text-sm">
                                <p>Creado por: {task.userName}</p>
                                <p>
                                  Editado por: {claimAudit[String(task.id)]?.editedBy ?? "Sin registro todavia"}
                                </p>
                                <p>
                                  Horas de edicion:{" "}
                                  {(claimAudit[String(task.id)]?.editHistory ?? []).length
                                    ? (claimAudit[String(task.id)]?.editHistory ?? [])
                                        .map((entry) =>
                                          `${format(new Date(entry.at), "dd/MM/yyyy HH:mm", { locale: es })} - ${entry.by}`
                                        )
                                        .join(" | ")
                                    : "Sin ediciones registradas"}
                                </p>
                                <p>
                                  Cantidad de ediciones:{" "}
                                  {(claimAudit[String(task.id)]?.editHistory ?? []).length}
                                </p>
                                <p>
                                  Resuelto por:{" "}
                                  {claimAudit[String(task.id)]?.resolvedBy ?? (task.pending ? "Pendiente" : "Sin registro todavia")}
                                </p>
                                <p>
                                  Hora de resolucion:{" "}
                                  {claimAudit[String(task.id)]?.resolvedAt
                                    ? format(new Date(claimAudit[String(task.id)].resolvedAt!), "dd/MM/yyyy HH:mm", { locale: es })
                                    : task.pending
                                      ? "Pendiente"
                                      : "Sin registro todavia"}
                                </p>
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
