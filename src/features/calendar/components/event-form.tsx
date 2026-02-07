"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createEvent, updateEvent, type EventInput } from "@/features/calendar/actions/event-actions";
import type { Event } from "@prisma/client";

const eventColors = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ef4444", // Red
];

interface EventFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event?: Event;
    defaultDate?: Date;
}

export function EventForm({ open, onOpenChange, event, defaultDate }: EventFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<EventInput>({
        title: event?.title || "",
        description: event?.description || "",
        startTime: event?.startTime || defaultDate || new Date(),
        endTime: event?.endTime || defaultDate || new Date(),
        allDay: event?.allDay || false,
        isTimeBlock: event?.isTimeBlock || false,
        color: event?.color || eventColors[0],
    });

    const [startTimeStr, setStartTimeStr] = useState(
        format(formData.startTime, "HH:mm")
    );
    const [endTimeStr, setEndTimeStr] = useState(
        format(formData.endTime, "HH:mm")
    );

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const startDate = new Date(formData.startTime);
            const endDate = new Date(formData.endTime);

            if (!formData.allDay) {
                const [startHours, startMins] = startTimeStr.split(":").map(Number);
                const [endHours, endMins] = endTimeStr.split(":").map(Number);
                startDate.setHours(startHours, startMins, 0, 0);
                endDate.setHours(endHours, endMins, 0, 0);
            }

            const data = {
                ...formData,
                startTime: startDate,
                endTime: endDate,
            };

            if (event) {
                await updateEvent(event.id, data);
            } else {
                await createEvent(data);
            }
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save event:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{event ? "Edit Event" : "New Event"}</DialogTitle>
                    <DialogDescription>
                        {event ? "Update event details." : "Add a new event to your calendar."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Event Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Meeting, deadline, time block..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ""}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add details..."
                            rows={2}
                        />
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="allDay"
                                checked={formData.allDay}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, allDay: checked as boolean })
                                }
                            />
                            <Label htmlFor="allDay" className="text-sm">All day</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="timeBlock"
                                checked={formData.isTimeBlock}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isTimeBlock: checked as boolean })
                                }
                            />
                            <Label htmlFor="timeBlock" className="text-sm">Time block</Label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(formData.startTime, "PPP")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.startTime}
                                        onSelect={(date) =>
                                            date && setFormData({ ...formData, startTime: date, endTime: date })
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {!formData.allDay && (
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="time"
                                        value={startTimeStr}
                                        onChange={(e) => setStartTimeStr(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(formData.endTime, "PPP")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.endTime}
                                        onSelect={(date) =>
                                            date && setFormData({ ...formData, endTime: date })
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {!formData.allDay && (
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="time"
                                        value={endTimeStr}
                                        onChange={(e) => setEndTimeStr(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                            {eventColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={cn(
                                        "h-7 w-7 rounded-full transition-all",
                                        formData.color === color && "ring-2 ring-offset-2 ring-offset-background"
                                    )}
                                    style={{ backgroundColor: color, outlineColor: color }}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : event ? (
                                "Update Event"
                            ) : (
                                "Create Event"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
