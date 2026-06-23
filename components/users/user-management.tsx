"use client"

import { useEffect, useState, type FormEvent } from "react"
import { createUser, deleteUser, editUser, getUserByName, getUsers, type ManagedUser, type UserPayload } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { encryptPassword } from "@/lib/crypto"
import { AREAS } from "@/lib/constants"

function buildPayload(values: { name: string; surname: string; userName: string; password: string; area: string; role: "ADMIN" | "USER" }): UserPayload {
  return {
    ...values,
    password: values.password ? encryptPassword(values.password) : "",
  }
}

export function UserManagement() {
  const { toast } = useToast()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({ name: "", surname: "", userName: "", password: "", area: "Sistemas", role: "USER" as "ADMIN" | "USER" })
  const [editForm, setEditForm] = useState({ name: "", surname: "", userName: "", password: "", area: "Sistemas", role: "USER" as "ADMIN" | "USER" })
  const [editingUserName, setEditingUserName] = useState<string | null>(null)

  const showResult = (message: string, ok: boolean) => toast({ title: ok ? "Operacion exitosa" : "Operacion fallida", description: message, variant: ok ? "default" : "destructive" })

  const refreshUsers = async () => {
    setLoading("list")
    const list = await getUsers()
    setUsers(list)
    setLoading(null)
  }

  useEffect(() => {
    refreshUsers()
  }, [])

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    setLoading("create")
    const message = await createUser(buildPayload(createForm))
    showResult(message, !message.toLowerCase().includes("error"))
    setLoading(null)
    await refreshUsers()
  }

  const onClickEdit = async (userName: string) => {
    setLoading(`load-${userName}`)
    const data = await getUserByName(userName)
    if (!data) {
      showResult("No se pudo cargar el usuario", false)
      setLoading(null)
      return
    }
    setEditForm({
      name: data.name,
      surname: data.surname,
      userName: data.userName,
      password: "",
      area: data.area ?? "Sistemas",
      role: data.role,
    })
    setEditingUserName(userName)
    setLoading(null)
  }

  const onSaveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingUserName) return
    setLoading("edit")
    const message = await editUser(buildPayload(editForm))
    showResult(message, !message.toLowerCase().includes("error"))
    setLoading(null)
    setEditingUserName(null)
    await refreshUsers()
  }

  const onDelete = async (name: string) => {
    const ok = window.confirm(`Confirma eliminar a ${name}?`)
    if (!ok) return
    setLoading(`delete-${name}`)
    const message = await deleteUser(name)
    showResult(message, !message.toLowerCase().includes("error"))
    setLoading(null)
    await refreshUsers()
  }

  return (
    <Card>
      <CardHeader><CardTitle>Control de usuarios</CardTitle><CardDescription>Creacion, edicion y eliminacion (solo ADMIN)</CardDescription></CardHeader>
      <CardContent>
        <Tabs defaultValue="crear" className="space-y-4">
          <TabsList><TabsTrigger value="crear">Crear</TabsTrigger><TabsTrigger value="usuarios">Usuarios</TabsTrigger></TabsList>

          <TabsContent value="crear"><form onSubmit={onCreate} className="grid gap-3">
            <Field label="Nombre" value={createForm.name} onChange={(v) => setCreateForm((p) => ({ ...p, name: v }))} />
            <Field label="Apellido" value={createForm.surname} onChange={(v) => setCreateForm((p) => ({ ...p, surname: v }))} />
            <Field label="Usuario" value={createForm.userName} onChange={(v) => setCreateForm((p) => ({ ...p, userName: v }))} />
            <Field label="Contrasena" type="password" value={createForm.password} onChange={(v) => setCreateForm((p) => ({ ...p, password: v }))} />
            <AreaSelect value={createForm.area} onChange={(area) => setCreateForm((p) => ({ ...p, area }))} />
            <RoleSelect value={createForm.role} onChange={(role) => setCreateForm((p) => ({ ...p, role }))} />
            <Button disabled={loading === "create"} type="submit">Crear usuario</Button></form></TabsContent>

          <TabsContent value="usuarios" className="space-y-4">
            <div className="flex justify-end"><Button variant="outline" onClick={refreshUsers} disabled={loading === "list"}>Actualizar listado</Button></div>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.userName} className="rounded-md border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{u.name} {u.surname}</p>
                    <p className="text-sm text-muted-foreground">{u.userName} - {u.role}{u.area ? ` - ${u.area}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onClickEdit(u.userName)} disabled={loading === `load-${u.userName}`}>Editar</Button>
                    <Button variant="destructive" onClick={() => onDelete(u.userName)} disabled={loading === `delete-${u.userName}`}>Eliminar</Button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-muted-foreground">No hay usuarios para mostrar.</p>}
            </div>

            {editingUserName && (
              <form onSubmit={onSaveEdit} className="grid gap-3 rounded-md border p-4">
                <p className="text-sm font-medium">Editando: {editingUserName}</p>
                <Field label="Nombre" value={editForm.name} onChange={(v) => setEditForm((p) => ({ ...p, name: v }))} />
                <Field label="Apellido" value={editForm.surname} onChange={(v) => setEditForm((p) => ({ ...p, surname: v }))} />
                <Field label="Usuario" value={editForm.userName} onChange={(v) => setEditForm((p) => ({ ...p, userName: v }))} />
                <Field label="Contrasena (dejar vacia para no cambiar)" type="password" value={editForm.password} onChange={(v) => setEditForm((p) => ({ ...p, password: v }))} required={false} />
                <AreaSelect value={editForm.area} onChange={(area) => setEditForm((p) => ({ ...p, area }))} />
                <RoleSelect value={editForm.role} onChange={(role) => setEditForm((p) => ({ ...p, role }))} />
                <div className="flex gap-2">
                  <Button disabled={loading === "edit"} type="submit">Guardar cambios</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditingUserName(null)}>Cancelar</Button>
                </div>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function Field({ label, value, onChange, type = "text", required = true }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} /></div>
}

function RoleSelect({ value, onChange }: { value: "ADMIN" | "USER"; onChange: (v: "ADMIN" | "USER") => void }) {
  return <div className="grid gap-2"><Label>Rol</Label><Select value={value} onValueChange={(v) => onChange(v as "ADMIN" | "USER")}><SelectTrigger><SelectValue placeholder="Selecciona rol" /></SelectTrigger><SelectContent><SelectItem value="USER">USER</SelectItem><SelectItem value="ADMIN">ADMIN</SelectItem></SelectContent></Select></div>
}

function AreaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>Area</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona area" />
        </SelectTrigger>
        <SelectContent>
          {AREAS.map((area) => (
            <SelectItem key={area} value={area}>{area}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
