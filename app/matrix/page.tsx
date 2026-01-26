import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatrixClient from "./MatrixClient";

export default async function Matrix() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <MatrixClient userEmail={user.email || ""} />;
}
