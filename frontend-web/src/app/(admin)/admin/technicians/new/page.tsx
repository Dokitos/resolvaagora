'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { TechnicianForm } from '../_components/technician-form'

export default function NewTechnicianPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/technicians" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo técnico</h1>
      </div>
      <TechnicianForm />
    </div>
  )
}
