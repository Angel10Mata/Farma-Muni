import { toast } from "react-toastify";

export const showToast = (
  icon: "success" | "error" | "warning" | "info",
  title: string,
  position:
    | "top"
    | "top-start"
    | "top-end"
    | "center"
    | "bottom"
    | "bottom-start"
    | "bottom-end" = "top-end",
) => {
  const toastPosition =
    position === "top" || position === "top-start" || position === "top-end"
      ? "top-center"
      : position === "center"
        ? "top-center"
        : "bottom-center";

  const opts = { position: toastPosition as "top-center" | "bottom-center", autoClose: 3000 };

  if (icon === "success") toast.success(title, opts);
  else if (icon === "error") toast.error(title, opts);
  else if (icon === "warning") toast.warn(title, opts);
  else toast.info(title, opts);
};

export const showAlert = (
  icon: "success" | "error" | "warning",
  title: string,
  text: string,
) => {
  const message = text ? `${title}: ${text}` : title;
  if (icon === "success") toast.success(message);
  else if (icon === "error") toast.error(message);
  else toast.warn(message);
};
