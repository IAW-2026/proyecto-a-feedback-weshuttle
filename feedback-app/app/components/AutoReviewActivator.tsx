"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { checkAndActivatePoolsAction } from "../actions/reviews"
import Toast from "./Toast"

interface AutoReviewActivatorProps {
  userId: string
}

export default function AutoReviewActivator({ userId }: AutoReviewActivatorProps) {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  
  // Guardamos los pools que ya conocemos para no mostrar alertas repetidas
  const knownPoolsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return
    }

    // Definimos un intervalo para consultar el estado del pool periódicamente (cada 8 segundos)
    const interval = setInterval(async () => {
      try {
        const result = await checkAndActivatePoolsAction(userId)
        if (result.success) {
          const currentActivePools = result.activePrecreatedPoolIds || []

          if (isFirstLoadRef.current) {
            // En la primera carga de la página, registramos los pools que ya se iniciaron antes 
            // para no disparar alertas viejas de golpe.
            currentActivePools.forEach(id => knownPoolsRef.current.add(id))
            isFirstLoadRef.current = false
          } else {
            // Buscamos si hay algún pool nuevo que haya aparecido en estado PRECREATED
            for (const poolId of currentActivePools) {
              if (!knownPoolsRef.current.has(poolId)) {
                knownPoolsRef.current.add(poolId)
                
                // Disparamos la alerta visual
                console.log(`[AutoReviewActivator] ¡Viaje iniciado detectado! Pool ID: ${poolId}`)
                setToastMessage(`Viaje iniciado. Tu viaje con destino asignado ha comenzado.`)
                setShowToast(true)
                
                // Forzamos actualización de la vista por si cambió información
                router.refresh()
              }
            }
          }

          if (result.activatedCount > 0) {
            console.log(`[AutoReviewActivator] ¡Se activaron ${result.activatedCount} reseñas! Actualizando vista...`)
            router.refresh()
          }
        }
      } catch (error: any) {
        console.warn("[AutoReviewActivator] Advertencia en el intervalo de activación automática (posible sesión expirada o red lenta):", error?.message || error)
      }
    }, 8000) // 8 segundos para que sea un poco más responsivo en pruebas

    return () => clearInterval(interval)
  }, [userId, router, isSignedIn, isLoaded])

  return (
    <Toast
      message={toastMessage || ""}
      type="info"
      isVisible={showToast}
      onClose={() => setShowToast(false)}
    />
  )
}
