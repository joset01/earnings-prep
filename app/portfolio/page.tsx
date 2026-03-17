import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortfolioClient from "./PortfolioClient";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data } = await supabase
    .from("portfolio")
    .select("tickers")
    .eq("user_id", user.id)
    .single();

  return (
    <PortfolioClient
      userEmail={user.email || ""}
      initialTickers={data?.tickers ?? ""}
    />
  );
}
