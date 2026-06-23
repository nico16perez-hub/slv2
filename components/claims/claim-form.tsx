"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useData } from "@/lib/data-context"
import { AREAS, PROBLEM_TYPES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FreeTextOptionsInput } from "@/components/free-text-options-input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/claims/image-upload"
import { Send, Loader2 } from "lucide-react"
import { toast } from "sonner"

const schema = z.object({
  title: z.string().min(1, "El titulo es obligatorio"),
  area: z.string().min(1, "Selecciona un area"),
  claimant: z.string().min(1, "Indica la persona que reclama"),
  problemType: z.string().min(1, "Selecciona el tipo de problema"),
  description: z.string().min(1, "La descripcion es obligatoria"),
  solution: z.string().optional().default(""),
})

type FormValues = z.infer<typeof schema>

export function ClaimForm() {
  const { addClaim } = useData()
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      area: "",
      claimant: "",
      problemType: "",
      description: "",
      solution: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    addClaim({
      title: values.title,
      area: values.area,
      claimant: values.claimant,
      problemType: values.problemType,
      description: values.description,
      solution: values.solution?.trim() ?? "",
      images,
    })
    form.reset()
    setImages([])
    setIsSubmitting(false)
    toast.success("Reclamo registrado correctamente")
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base text-card-foreground">Registrar reclamo</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: PC no enciende" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="claimant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persona que reclama</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la persona" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area</FormLabel>
                    <FormControl>
                      <FreeTextOptionsInput
                        value={field.value}
                        onChange={field.onChange}
                        options={AREAS}
                        placeholder="Escribir o seleccionar area"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="problemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de problema</FormLabel>
                    <FormControl>
                      <FreeTextOptionsInput
                        value={field.value}
                        onChange={field.onChange}
                        options={PROBLEM_TYPES}
                        placeholder="Escribir o seleccionar tipo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion del problema</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe el problema reportado..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="solution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solucion aplicada</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dejar vacio para marcar como pendiente..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Capturas de pantalla
              </label>
              <ImageUpload images={images} onChange={setImages} />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto self-end"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Registrar reclamo
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
