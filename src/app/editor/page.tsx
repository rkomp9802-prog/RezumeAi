import type { Metadata } from "next";
import { EditorApp } from "@/components/editor/EditorApp";

export const metadata: Metadata = {
  title: "Редактор резюме",
};

export default function EditorPage() {
  return <EditorApp />;
}
