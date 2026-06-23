"use client"

import { useId, useMemo } from "react"
import { Input } from "@/components/ui/input"

type FreeTextOptionsInputProps = {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder?: string
  className?: string
}

export function FreeTextOptionsInput({
  value,
  onChange,
  options,
  placeholder,
  className,
}: FreeTextOptionsInputProps) {
  const listId = useId()
  const normalizedValue = value.trim().toLowerCase()
  const filteredOptions = useMemo(
    () =>
      options.filter((option) =>
        option.toLowerCase().includes(normalizedValue)
      ),
    [normalizedValue, options]
  )

  return (
    <>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        list={listId}
        className={className}
      />
      <datalist id={listId}>
        {filteredOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  )
}
