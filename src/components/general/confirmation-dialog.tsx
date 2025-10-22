"use client"

import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { useState } from "react"

interface ConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    icon?: React.ReactNode
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void | Promise<void>
    onCancel?: () => void | Promise<void>
    isProcessing?: boolean
    variant?: "default" | "destructive"
}

const ConfirmationDialog = ({
    open,
    onOpenChange,
    icon,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isProcessing = false,
    variant = "default",
}: ConfirmationDialogProps) => {
    const [isLoading, setIsLoading] = useState(false)

    const handleConfirm = async () => {
        try {
            setIsLoading(true)
            await onConfirm()
            onOpenChange(false)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = async () => {
        if (onCancel) {
            try {
                await onCancel()
            } finally {
                onOpenChange(false)
            }
        } else {
            onOpenChange(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange} >
            <SheetContent side="bottom" className="sm:max-w-md sm:rounded-lg mx-auto">
                {icon && (
                    <div className="flex justify-center py-4">
                        {icon}
                    </div>
                )}
                <SheetHeader className="text-center m-0 py-0">
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{description}</SheetDescription>
                </SheetHeader>

                <SheetFooter className="sm:justify-end">
                    <Button
                        variant={variant === "destructive" ? "destructive" : "default"}
                        onClick={handleConfirm}
                        disabled={isLoading || isProcessing}
                    >
                        {isLoading || isProcessing ? "Processing..." : confirmText}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isLoading || isProcessing}
                        className="mr-2"
                    >
                        {cancelText}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

export { ConfirmationDialog }