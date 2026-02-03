import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();

    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: activities, error } = await supabase
            .from("insurance_activity")
            .select("*")
            .eq("user_id", user.id)
            .order("viewed_at", { ascending: false })
            .limit(10);

        if (error) {
            console.error("Failed to fetch activity:", error);
            return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
        }

        return NextResponse.json({ activities });
    } catch (error) {
        console.error("Activity API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { patient_name, organization_id, organization_name, risk_level } = body;

        if (!patient_name || !organization_id) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if we already have a recent view for this patient (last 5 minutes) to avoid duplicates
        // This is optional but nice to have to prevent spamming the activity log if user refreshes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data: recentViews } = await supabase
            .from("insurance_activity")
            .select("id")
            .eq("user_id", user.id)
            .eq("patient_name", patient_name)
            .eq("organization_id", organization_id)
            .gt("viewed_at", fiveMinutesAgo)
            .limit(1);

        if (recentViews && recentViews.length > 0) {
            // Update the timestamp of the existing record instead of creating a new one
            const { error: updateError } = await supabase
                .from("insurance_activity")
                .update({ viewed_at: new Date().toISOString() })
                .eq("id", recentViews[0].id);

            if (updateError) {
                console.error("Failed to update activity:", updateError);
            }

            return NextResponse.json({ success: true, updated: true });
        }

        // Insert new activity record
        const { error } = await supabase.from("insurance_activity").insert({
            user_id: user.id,
            patient_name,
            organization_id,
            organization_name,
            risk_level,
        });

        if (error) {
            console.error("Failed to record activity:", error);
            return NextResponse.json({ error: "Failed to record activity" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Activity API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
