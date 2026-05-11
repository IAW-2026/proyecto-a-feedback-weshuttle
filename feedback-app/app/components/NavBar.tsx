'use client'

import { useUser, UserButton } from "@clerk/nextjs"

export default function Navbar() {
  const { user, isSignedIn } = useUser()

  return (
    <div>
      {/* si el usuario esta logueado, mostramos su nombre 
      y el boton de user, sino mostramos un mensaje de no logueado  */}
      {isSignedIn ? (
        <>
          <p>{user.firstName}</p>
          <UserButton />
        </>
      ) : (
        <p>No logueado</p>
      )}
    </div>
  )
}