import { NextResponse } from "next/server";
import { checkAndCreateNotifications } from "@/features/notifications/actions/check-notifications";

export async function POST() {
    try {
        const result = await checkAndCreateNotifications();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Notification check failed:", error);
        return NextResponse.json({ created: 0, error: "Failed" }, { status: 500 });
    }
}
