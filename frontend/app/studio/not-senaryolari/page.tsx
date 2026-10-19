import type { Metadata } from "next";
import { headers } from "next/headers";
import { loadSession } from "../../../lib/api/server";
import { StudioLogin } from "../../../components/auth/StudioLogin";
import { SourceCasePage } from "../../../components/reading/SourceCasePage";
export const metadata:Metadata={title:"Not Senaryoları",robots:{index:false,follow:false}};
export default async function Page(){const session=await loadSession((await headers()).get("cookie"));if(!session.authenticated||session.profile?.role!=="owner")return <StudioLogin signedInAsMember={session.authenticated}/>;return <SourceCasePage/>;}
