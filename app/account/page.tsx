import { redirect } from "next/navigation";

type AccountPageProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = (await searchParams) || {};
  if (params.mode === "recovery") {
    redirect("/account/settings?mode=recovery");
  }
  redirect("/account/profile");
}
