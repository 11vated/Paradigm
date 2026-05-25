// @ts-nocheck
// TODO(typing-sprint): Vendored shadcn UI primitive — not imported by the Reality OS shell. Strict-mode types deferred per AGENTS.md until the Typing Sprint converts shadcn defaults to fully typed shapes.
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}: React.ComponentProps<typeof Sonner>) => {
  const { theme = "system" } = useTheme() as { theme?: "light" | "dark" | "system" }

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
