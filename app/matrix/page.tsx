import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatrixClient from "./MatrixClient";

export default async function Matrix() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: companies } = await supabase
    .from("matrix_companies")
    .select("id, ticker, valuation, model, bloomberg_em, evernote")
    .order("created_at", { ascending: true });

  return (
    <MatrixClient
      userEmail={user.email || ""}
      initialCompanies={companies || []}
    />
  );
}
