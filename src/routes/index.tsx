import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { BootScreen, BrowserApp } from "@/components/browser/BrowserApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Janela — um navegador dentro do seu navegador" },
      {
        name: "description",
        content: "Janela é um navegador completo no site: abas arrastáveis, busca, favoritos, histórico e temas de vidro fosco.",
      },
      { property: "og:title", content: "Janela — um navegador dentro do seu navegador" },
      {
        property: "og:description",
        content: "Abas, favoritos, histórico e temas lindos — tudo rodando dentro de uma página.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<BootScreen />}>
      <BrowserApp />
    </ClientOnly>
  );
}
