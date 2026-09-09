export const moduleContentMaxWidth = "max-w-screen-2xl";

export const modulePageShellClass = [
  "w-full",
  moduleContentMaxWidth,
  "mx-auto flex flex-col gap-6",
  "px-3 sm:px-4 md:px-5",
  "pt-32 pb-8 md:pt-28",
  "relative mt-4 md:mt-8 min-h-screen",
].join(" ");

export const modulePageShellFixedClass = [
  "w-full",
  moduleContentMaxWidth,
  "mx-auto flex flex-col gap-6",
  "px-3 sm:px-4 md:px-5",
  "pt-32 pb-8 md:pt-28",
  "relative mt-4 md:mt-8 flex-1 min-h-0 h-screen",
].join(" ");

export const dashboardOuterClass =
  "relative z-10 w-full flex-1 px-3 sm:px-4 md:px-5 lg:px-6 pt-20 md:pt-24 pb-16 md:pb-20";

export const dashboardInnerClass = ["w-full", moduleContentMaxWidth, "mx-auto"].join(" ");

export const adminPageShellClass = [
  "space-y-8 w-full",
  moduleContentMaxWidth,
  "mx-auto px-3 sm:px-4 md:px-5 pt-32 md:pt-28",
].join(" ");

export const modulePageCenteredClass = [
  "w-full",
  moduleContentMaxWidth,
  "mx-auto flex flex-col items-center space-y-8",
  "px-3 sm:px-4 md:px-5",
  "pt-28 lg:pt-24 pb-8",
].join(" ");

export const modulePageScrollClass = [
  "flex flex-col h-[calc(100vh-4rem)] w-full",
  moduleContentMaxWidth,
  "mx-auto overflow-hidden",
  "px-3 sm:px-4 md:px-5",
  "pt-32 md:pt-36 pb-10",
].join(" ");
