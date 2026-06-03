"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { DataProvider, useData } from "@/lib/data-context"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle2, Clock, KeyRound, UserCog, Wrench } from "lucide-react"

function DashboardHeader() {
  const router = useRouter()
  const { user } = useAuth()
  const { claims, completedWorks, dailyTasks, todayStr } = useData()
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    surname: user?.surname ?? "",
    area: user?.area ?? "",
    currentPassword: "",
    newPassword: "",
    repeatPassword: "",
  })

  useEffect(() => {
    setProfileForm((prev) => ({
      ...prev,
      name: user?.name ?? "",
      surname: user?.surname ?? "",
      area: user?.area ?? "",
    }))
  }, [user])

  const todayClaims = useMemo(
    () => claims.filter((claim) => claim.date === todayStr || claim.date.startsWith(`${todayStr}T`)),
    [claims, todayStr]
  )

  const todayWorks = useMemo(
    () => completedWorks.filter((work) => work.date === todayStr || work.date.startsWith(`${todayStr}T`)),
    [completedWorks, todayStr]
  )

  const pendingClaims = todayClaims.filter((claim) => !claim.solution?.trim())
  const activityCount = dailyTasks.length + todayClaims.length + todayWorks.length
  const notificationCount = pendingClaims.length

  const openNotification = (href: string) => {
    router.push(href)
  }

  const onSaveProfile = () => {
    if (!profileForm.name.trim() || !profileForm.surname.trim()) {
      toast.error("Completa nombre y apellido")
      return
    }

    if (profileForm.newPassword || profileForm.repeatPassword) {
      if (profileForm.newPassword.length < 4) {
        toast.error("La nueva contrasena debe tener al menos 4 caracteres")
        return
      }

      if (profileForm.newPassword !== profileForm.repeatPassword) {
        toast.error("Las contrasenas no coinciden")
        return
      }

      localStorage.setItem("passwordUpdatedAt", new Date().toISOString())
    }

    localStorage.setItem("name", profileForm.name.trim())
    localStorage.setItem("surname", profileForm.surname.trim())
    localStorage.setItem("area", profileForm.area.trim())
    toast.success("Perfil actualizado")
    setProfileOpen(false)
    window.location.reload()
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium text-foreground">
            {user?.name} {user?.surname}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{user?.area}</p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                    {notificationCount}
                  </span>
                )}
                <span className="sr-only">Notificaciones</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b border-border p-3">
                <p className="text-sm font-medium text-foreground">Notificaciones</p>
                <p className="text-xs text-muted-foreground">Avisos y accesos rapidos del dia</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {pendingClaims.length === 0 && todayWorks.length === 0 && activityCount === 0 ? (
                  <div className="p-6 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm font-medium text-foreground">Sin novedades</p>
                    <p className="text-xs text-muted-foreground">No hay registros para mostrar hoy.</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {pendingClaims.slice(0, 5).map((claim) => (
                      <button
                        key={`pending-${claim.id}`}
                        type="button"
                        onClick={() => openNotification("/dashboard/nuevo-reclamo")}
                        className="flex gap-3 border-b border-border p-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            Pendiente: {claim.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {claim.area} - {claim.claimant}
                          </p>
                        </div>
                      </button>
                    ))}

                    {todayWorks.slice(0, 3).map((work) => (
                      <button
                        key={`work-${work.id}`}
                        type="button"
                        onClick={() => openNotification("/dashboard/trabajos-realizados")}
                        className="flex gap-3 border-b border-border p-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-chart-2" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            Trabajo: {work.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{work.area}</p>
                        </div>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => openNotification("/dashboard")}
                      className="flex gap-3 p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-chart-1" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {activityCount} registros cargados hoy
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ver resumen completo del dashboard.
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <UserCog className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Modificar perfil</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="profile-name">Nombre</Label>
                  <Input
                    id="profile-name"
                    value={profileForm.name}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-surname">Apellido</Label>
                  <Input
                    id="profile-surname"
                    value={profileForm.surname}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, surname: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-area">Area</Label>
                  <Input
                    id="profile-area"
                    value={profileForm.area}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, area: event.target.value }))}
                  />
                </div>

                <div className="rounded-md border border-border p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Cambiar contrasena</p>
                  </div>
                  <div className="grid gap-3">
                    <Input
                      type="password"
                      placeholder="Contrasena actual"
                      value={profileForm.currentPassword}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                    />
                    <Input
                      type="password"
                      placeholder="Nueva contrasena"
                      value={profileForm.newPassword}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                    />
                    <Input
                      type="password"
                      placeholder="Repetir nueva contrasena"
                      value={profileForm.repeatPassword}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, repeatPassword: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary">
                    {user?.role === "ADMIN" ? "Administrador" : "Usuario"}
                  </Badge>
                  <Button onClick={onSaveProfile}>Guardar cambios</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <DataProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DataProvider>
  )
}
