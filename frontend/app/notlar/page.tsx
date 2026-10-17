import type { Metadata } from "next";
import { NotesPage } from "../../components/reading/NotesPage";
export const metadata:Metadata={title:"Defterim",robots:{index:false,follow:false}};
export default function Page(){return <NotesPage/>;}
