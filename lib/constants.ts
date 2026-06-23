// Areas de la empresa (editar segun necesidad)
export const AREAS = [
  "Archivo",
  "Contable",
  "Control central",
  "RRHH",
  "Control de estudio",
  "Control tecnico",
  "Diseño",
  "Locutores",
  "Noticiero",
  "Programacion",
  "Publicidad",
  "Redes",
  "Sistemas",
  "Sonido",
  "Tecnica",
  "Streaming",
  "Operadores de video",
  "Direccion",
  "Tecnica exteriores",
  "Deposito",
  "Produccion",
  "Camara",
  "Cámaras",
  "Vestuario",
  "Maquillaje",
  "Estudio",
  "Estudio cocina (Mario Pérez)",
  "Mesa de entrada",
  "Otro",
] as const

// Tipos de problema (editar segun necesidad)
export const PROBLEM_TYPES = [
  "Hardware",
  "Software",
  "Red/Conectividad",
  "Impresora",
  "Email",
  "Accesos/permisos",
  "Telefonia",
  "Inventariado",
  "Yes",
  "Otros",
] as const

// API base URL
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
