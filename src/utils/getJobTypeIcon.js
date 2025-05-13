export const getJobTypeIcon = (type = "") => {
  const name =
    typeof type === "string"
      ? type.toLowerCase()
      : type?.name?.toLowerCase?.() || "";

  if (name.includes("aerial")) return "/icons/Aerial Spraying.svg";
  if (name.includes("ground")) return "/icons/Ground Spraying.svg";
  if (name.includes("drone")) return "/icons/Drone Spraying.svg";
  if (name.includes("spray")) return "/icons/Aerial Spraying.svg";
  if (name.includes("seed")) return "/icons/Seeding.svg";
  if (name.includes("fert")) return "/icons/Fertilizing.svg";
  if (name.includes("till")) return "/icons/Tillage.svg";

  return "/icons/Custom.svg";
};
