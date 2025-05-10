"use client"

import dynamic from "next/dynamic"

// Dynamically import the TreadmillScene component with no SSR
const TreadmillScene = dynamic(() => import("@/TreadmillScene"), { ssr: false })

export default function Page() {
  return <TreadmillScene />
}
