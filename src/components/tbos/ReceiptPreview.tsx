'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download, X } from 'lucide-react'

export interface ReceiptData {
  id: string
  receiptNumber: string
  issueDate: string
  totalAmount: number
  paymentMethod: string
  generatedBy: string
  payment: {
    id: string
    amount: number
    currency: string
    paymentMethod: string
    referenceNumber?: string | null
    bankName?: string | null
    notes?: string | null
    recordedAt: string
  }
  student: {
    studentNumber: string
    fullName: string
    mobile?: string | null
    email?: string | null
  }
  institute: {
    name: string
    email: string
    phone: string
    city: string
    addressLine1?: string | null
  }
}

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().split('T')[0]
}

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    online: 'Online Payment',
    cheque: 'Cheque',
  }
  return map[method] || method.charAt(0).toUpperCase() + method.slice(1)
}

function ReceiptBody({ data }: { data: ReceiptData }) {
  return (
    <div className="bg-white text-black p-8 max-w-[680px] mx-auto font-sans text-sm">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-wide uppercase">
          {data.institute.name}
        </h1>
        {data.institute.addressLine1 && (
          <p className="text-xs text-gray-600 mt-1">{data.institute.addressLine1}</p>
        )}
        <p className="text-xs text-gray-600">
          {data.institute.city}{data.institute.city && data.institute.phone ? ' · ' : ''}{data.institute.phone}
        </p>
        <p className="text-xs text-gray-600">{data.institute.email}</p>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-black mb-6" />

      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold tracking-widest uppercase">Payment Receipt</h2>
      </div>

      {/* Receipt info row */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
        <div>
          <span className="text-gray-500">Receipt No:</span>{' '}
          <span className="font-mono font-semibold">{data.receiptNumber}</span>
        </div>
        <div className="text-right">
          <span className="text-gray-500">Date:</span>{' '}
          <span>{formatDate(data.issueDate)}</span>
        </div>
      </div>

      {/* Student info */}
      <div className="border border-gray-300 rounded p-4 mb-6">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Student Name:</span>{' '}
            <span className="font-semibold">{data.student.fullName}</span>
          </div>
          <div>
            <span className="text-gray-500">Student No:</span>{' '}
            <span className="font-mono">{data.student.studentNumber}</span>
          </div>
        </div>
      </div>

      {/* Payment details table */}
      <table className="w-full mb-6 text-xs">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-2 font-semibold">Description</th>
            <th className="text-right py-2 font-semibold w-40">Amount (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="py-2">Payment received</td>
            <td className="text-right py-2">{formatCurrency(data.totalAmount)}</td>
          </tr>
          {data.payment.referenceNumber && (
            <tr className="border-b border-gray-200">
              <td className="py-2 text-gray-500">Ref: {data.payment.referenceNumber}</td>
              <td></td>
            </tr>
          )}
          {data.payment.bankName && (
            <tr className="border-b border-gray-200">
              <td className="py-2 text-gray-500">Bank: {data.payment.bankName}</td>
              <td></td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <td className="py-3 font-bold text-base">Total</td>
            <td className="text-right py-3 font-bold text-base">{formatCurrency(data.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Payment method */}
      <div className="flex justify-between items-center mb-8 text-xs">
        <div>
          <span className="text-gray-500">Payment Method:</span>{' '}
          <span className="font-semibold">{formatPaymentMethod(data.paymentMethod)}</span>
        </div>
        <div className="text-gray-500">
          Generated by: {data.generatedBy}
        </div>
      </div>

      {/* Notes */}
      {data.payment.notes && (
        <div className="mb-8 text-xs">
          <span className="text-gray-500">Notes:</span> {data.payment.notes}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-300 pt-4 mt-8 text-center text-[10px] text-gray-400">
        <p>This is a computer-generated receipt. No signature is required.</p>
        <p className="mt-1">{data.institute.name} · {data.institute.email} · {data.institute.phone}</p>
      </div>
    </div>
  )
}

interface ReceiptPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ReceiptData | null
}

export default function ReceiptPreview({ open, onOpenChange, data }: ReceiptPreviewProps) {
  const handlePrint = () => {
    window.print()
  }

  // Inject print styles
  useEffect(() => {
    const id = 'receipt-print-styles'
    if (document.getElementById(id)) return

    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      @media print {
        body > *:not(#receipt-print-snapshot) {
          display: none !important;
        }
        #receipt-print-snapshot {
          display: block !important;
          position: static !important;
          width: 100% !important;
          background: white !important;
          overflow: visible !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #receipt-print-snapshot > div {
          box-shadow: none !important;
          border: none !important;
          max-width: 100% !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.getElementById(id)?.remove()
    }
  }, [])

  if (!data) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[740px] max-h-[90vh] overflow-y-auto"
          showCloseButton={false}
        >
          {/* Action buttons - hidden during print */}
          <div className="no-print flex items-center justify-between mb-2">
            <DialogHeader>
              <DialogTitle>Receipt {data.receiptNumber}</DialogTitle>
              <DialogDescription>Issued on {formatDate(data.issueDate)}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 ml-4">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="size-4 mr-1.5" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Download className="size-4 mr-1.5" />
                Download
              </Button>
            </div>
          </div>

          {/* Receipt content */}
          <ReceiptBody data={data} />

          {/* Close button at bottom - hidden during print */}
          <DialogFooter className="no-print">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="size-4 mr-1.5" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden print snapshot: invisible on screen, visible only when printing */}
      <div
        id="receipt-print-snapshot"
        style={{ display: 'none' }}
      >
        <ReceiptBody data={data} />
      </div>
    </>
  )
}