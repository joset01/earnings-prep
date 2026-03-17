import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SentimentClient from "./SentimentClient";

export default async function SentimentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <SentimentClient userEmail={user.email || ""} />;
}
