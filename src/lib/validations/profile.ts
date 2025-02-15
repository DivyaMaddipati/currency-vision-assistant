
import * as z from "zod"

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  language: z.string(),
  emergencyContact: z.object({
    name: z.string().min(2, "Emergency contact name must be at least 2 characters"),
    relationship: z.string().min(2, "Please specify the relationship"),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
  })
})

export type ProfileFormValues = z.infer<typeof profileSchema>
