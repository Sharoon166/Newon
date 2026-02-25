"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
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
    requireTextConfirmation?: string // Text that must be typed to confirm
    confirmationLabel?: string // Label for the confirmation input
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
    requireTextConfirmation,
    confirmationLabel = "Type to confirm",
}: ConfirmationDialogProps) => {
    const [isLoading, setIsLoading] = useState(false)
    const [confirmationText, setConfirmationText] = useState("")

    const isConfirmDisabled = requireTextConfirmation 
        ? confirmationText !== requireTextConfirmation 
        : false

    const handleConfirm = async () => {
        if (isConfirmDisabled) return
        
        try {
            setIsLoading(true)
            await onConfirm()
            onOpenChange(false)
            setConfirmationText("") // Reset on success
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
                setConfirmationText("") // Reset on cancel
            }
        } else {
            onOpenChange(false)
            setConfirmationText("") // Reset on cancel
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setConfirmationText("") // Reset when closing
        }
        onOpenChange(newOpen)
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange} >
            <SheetContent side="bottom" className="sm:max-w-lg sm:rounded-lg mx-auto max-h-screen overflow-auto">
                {icon && (
                    <div className="flex justify-center py-4">
                        {icon}
                    </div>
                )}
                <SheetHeader className="text-center m-0 py-0">
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription className={cn({ "text-left text-destructive bg-destructive/10 p-2 border-l-2 border-destructive": variant === "destructive" })}>{description}</SheetDescription>
                </SheetHeader>

                {requireTextConfirmation && (
                    <div className="space-y-2 px-4">
                        <Label htmlFor="confirmation-input" className="text-sm font-medium">
                            {confirmationLabel}
                        </Label>
                        <Input
                            id="confirmation-input"
                            type="text"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder={`Type "${requireTextConfirmation}" to confirm`}
                            className={cn({
                                "border-destructive focus-visible:ring-destructive": variant === "destructive"
                            })}
                            disabled={isLoading || isProcessing}
                        />
                        <p className="text-xs text-muted-foreground">
                            Please type <span className="font-semibold">{requireTextConfirmation}</span> to confirm this action.
                        </p>
                    </div>
                )}

                <SheetFooter className="sm:justify-end">
                    <Button
                        variant={variant === "destructive" ? "destructive" : "default"}
                        onClick={handleConfirm}
                        disabled={isLoading || isProcessing || isConfirmDisabled}
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