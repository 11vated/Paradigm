import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
/* eslint-disable react-refresh/only-export-components -- sonner library re-exports `toast` helper alongside Toaster component; required for consumer API. */

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
